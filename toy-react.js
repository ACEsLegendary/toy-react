const RENDER_TO_DOM = Symbol("render to dom")

class ElementWrapper {
    constructor(type) {
        this.element = document.createElement(type)
    }
    setAttribute(name, value) {
        if (name === 'className') {
            name = 'class'
        }
        if (name.match(/^on([\s\S]+)/)) {
            let eventName = RegExp.$1.replace(/[\s\S]/, c => c.toLowerCase());
            this.element.addEventListener(eventName, value)
        } else {
            this.element.setAttribute(name, value)
        }
    }
    appendChild(component) {
        let range = document.createRange();
        range.setStart(this.element, this.element.childNodes.length)
        range.setEnd(this.element, this.element.childNodes.length)
        component[RENDER_TO_DOM](range)
    }

    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.element)
    }
}

class TextNodeWrapper {
    constructor(content) {
        this.element = document.createTextNode(content);
    }
    [RENDER_TO_DOM](range) {
        range.deleteContents();
        range.insertNode(this.element)
    }
}

export class Component {
    constructor() {
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

    rerender() {
        this[RENDER_TO_DOM](this._range);
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        this.render()[RENDER_TO_DOM](this._range)
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
