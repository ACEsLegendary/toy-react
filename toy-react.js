const RENDER_TO_DOM = Symbol("render to dom")

function replaceContent(node, range) {
    range.insertNode(node);
    range.setStartAfter(node);
    range.deleteContents();
    range.setStartBefore(node);
    range.setEndAfter(node);
}

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
            this.update();
            return;
        }
        const mergeState = (oldState, newState) => {
            for (let p in newState) {
                if (p === null || typeof p !== 'object') {
                    oldState[p] = newState[p]
                } else {
                    mergeState(oldState[p], newState[p])
                }
            }
        }
        mergeState(this.state, newState);
        this.update();
    }

    get vdom() {
        this.vchildren = this.children && this.children.map(child => child.vdom);
        // has render, which means custom component, render it
        return this.render ? this.render().vdom : this;
    }

    update() {
        const isSameNode = (oldNode, newNode) => {
            if (oldNode.type !== newNode.type) {
                return false;
            }
            if (Object.keys(newNode.props).length !== Object.keys(oldNode.props).length) {
                return false;
            }
            if (Object.keys(newNode.props)
                .some(name => newNode.props[name] !== oldNode.props[name])) {
                return false;
            }
            if (newNode.type === '#text') {
                if (newNode.content != oldNode.content) {
                    return false;
                }
            }
            return true;
        }
        const update = (oldNode, newNode) => {
            // type,props, children
            // #text content
            if (!isSameNode(oldNode, newNode)) {
                newNode[RENDER_TO_DOM](oldNode._range);
                return;
            }
            newNode._range = oldNode._range;
            const newChildren = newNode.vchildren;
            const oldChildren = oldNode.vchildren;
            let tailRange= oldChildren && oldChildren[oldChildren.length -1]._range;
            newChildren && newChildren.forEach((newChild, index) => {
                const oldChild = oldChildren[index];
                if (oldChild) {
                    update(oldChild, newChild)
                } else {
                    let range = document.createRange();
                    range.setStart(tailRange.endContainer,tailRange.endOffset);
                    range.setEnd(tailRange.endContainer,tailRange.endOffset);
                    newChild[RENDER_TO_DOM](range);
                    tailRange =range;
                }
            });
        }
        const vdom = this.vdom;
        update(this._vdom, vdom);
        this._vdom = vdom;
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        this._vdom = this.vdom;
        this._vdom[RENDER_TO_DOM](this._range)
    }
}

class ElementWrapper extends Component {
    constructor(type) {
        super(type)
        this.type = type;
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
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
        if (!this.vchildren) {
            this.vchildren = this.children.map(child => child.vdom);
        }
        for (let child of this.vchildren) {
            let childRange = document.createRange();
            childRange.setStart(element, element.childNodes.length)
            childRange.setEnd(element, element.childNodes.length)
            child[RENDER_TO_DOM](childRange)
        }
        replaceContent(element, range);
    }
}

class TextNodeWrapper extends Component {
    constructor(content) {
        super(content)
        this.type = '#text';
        this.content = content;
    }

    [RENDER_TO_DOM](range) {
        this._range = range;
        const element = document.createTextNode(this.content);
        replaceContent(element, range);
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
