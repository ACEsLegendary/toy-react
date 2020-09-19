const RENDER_TO_DOM = Symbol("render to dom")


export class Component {
    constructor(type) {
        this.type = type;
        this.props = Object.create(null);
        this.children = [];
    }

    setAttribute(name, value) {
        this.props[name] = value;
    }

    appendChild(component) {
        this.children.push(component)
    }

    setState(newState) {
        if (this.state === null || typeof this.state !== 'object') {
            this.state = newState;
            this.rerender();
            return;
        }
        let mergeState = (oldState, newState) => {
            for (let p in newState) {
                if (p === null || typeof p !== 'object') {
                    oldState[p] = newState[p]
                } else {
                    mergeState(oldState[p], newState[p])
                }
            }
        }
        mergeState(this.state, newState);
        this.rerender();
    }

    get vdom() {
        return this.render().vdom;
    }
    get vchildren() {
        return this.children.map(child => child.vdom);
    }


    rerender() {
        this[RENDER_TO_DOM](this._range);
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        this.render()[RENDER_TO_DOM](this._range)
    }
}

class ElementWrapper extends Component {
    constructor(type) {
        super(type)
        this.type = type;
    }

    get vdom() {
        return this;
    }

    [RENDER_TO_DOM](range) {
        range.deleteContents();
        let element = document.createElement(this.type);
        for (let name in this.props) {
            let value = this.props[name]
            if (name === 'className') {
                name = 'class'
            }
            if (name.match(/^on([\s\S]+)/)) {
                let eventName = RegExp.$1.replace(/[\s\S]/, c => c.toLowerCase());
                element.addEventListener(eventName, value)
            } else {
                element.setAttribute(name, value)
            }
        }
        for (let child of this.children) {
            let childRange = document.createRange();
            childRange.setStart(element, element.childNodes.length)
            childRange.setEnd(element, element.childNodes.length)
            child[RENDER_TO_DOM](childRange)
        }
        range.insertNode(element)
    }
}

class TextNodeWrapper extends Component {
    constructor(content) {
        super(content)
        this.type = '#text';
        this.content = content;
    }

    get vdom() {
        return this;
    }

    [RENDER_TO_DOM](range) {
        range.deleteContents();
        let element = document.createTextNode(this.content);
        range.insertNode(element)
    }
}


export function createElement(type, config, ...children) {
    let e;
    if (typeof type === 'string') {
        e = new ElementWrapper(type);
    } else {
        e = new type;
    }
    for (let p in config) {
        e.setAttribute(p, config[p]);
    }
    let insertChildren = (children) => {
        for (let child of children) {
            if (child === null) {
                continue
            }
            if (typeof child === 'string' || typeof child === 'number') {
                child = new TextNodeWrapper(child);
            }
            if (typeof child === 'object' && child instanceof Array) {
                insertChildren(child)
            } else {
                e.appendChild(child)
            }
        }
    }
    insertChildren(children)
    return e;
}

export function render(component, parentElement) {
    let range = document.createRange();
    range.setStart(parentElement, parentElement.children.length)
    range.setEnd(parentElement, parentElement.children.length)
    range.deleteContents()
    component[RENDER_TO_DOM](range);
}
