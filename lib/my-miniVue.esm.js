// 通过 map 的方式扩展
// $el 是个 key
var publicPropertiesMap = {
    $el: function (i) { return i.vnode.el; }
};
var PublicInstanceProxyHandlers = {
    get: function (_a, key) {
        var instance = _a._;
        //  setupState
        var setupState = instance.setupState;
        if (key in setupState) {
            return setupState[key];
        }
        // key -> $el
        // if (key === "$el") {
        //   return instance.vnode.el
        // }
        var publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
        // setup -> options data
        // $data
    }
};

function createComponentInstance(vnode) {
    var component = {
        vnode: vnode,
        type: vnode.type,
        setupState: {}
    };
    return component;
}
function setupComponent(instance) {
    // todo 
    // initProps()
    // initSlots()
    // 初始化一个有状态的 component
    // 有状态的组件 和 函数组件
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    // 调用 setup 然后 拿到返回值
    // type 就是 app 对象
    var Component = instance.type;
    // ctx
    instance.proxy = new Proxy({
        _: instance
    }, PublicInstanceProxyHandlers);
    // 解构 setup
    var setup = Component.setup;
    if (setup) {
        // 返回一个 function 或者是 Object
        // 如果是 function 则认为是 render 函数
        // 如果是 Object 则注入到当前组件的上下文中
        var setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // TODO function
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    var Component = instance.type;
    instance.render = Component.render;
}

function render(vnode, container) {
    // 只需要调用 patch 方法
    // 方便后续的递归处理
    patch(vnode, container);
}
function patch(vnode, container) {
    // TODO 去处理组件
    // 判断什么类型
    // 是 element 那么就应该去处理 element
    // 如何区分是 element 还是 component 类型???
    // console.log(vnode.type);
    // object 是 component
    // div 是 element
    // debugger
    var shapeFlag = vnode.shapeFlag;
    // 0001 & 0001 -> 0001
    if (shapeFlag & 1 /* ELEMENT */) {
        processElement(vnode, container);
    }
    else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        processComponent(vnode, container);
    }
}
function processElement(vnode, container) {
    // 初始化
    mountElement(vnode, container);
}
function processComponent(vnode, container) {
    // 挂载组件
    mountComponent(vnode, container);
}
function mountComponent(initialVNode, container) {
    // 创建组件实例
    // 这个实例上面有很多属性
    var instance = createComponentInstance(initialVNode);
    // 初始化
    setupComponent(instance);
    // 调用 render 函数
    setupRenderEffect(instance, initialVNode, container);
}
function mountElement(vnode, container) {
    // const el = document.createElement("div")
    // string 或 array
    // el.textContent = "hi , minivue"
    // el.setAttribute("id", "root")
    // document.body.append(el)
    // 这里的 vnode -> element -> div
    var el = vnode.el = document.createElement(vnode.type);
    var children = vnode.children, shapeFlag = vnode.shapeFlag;
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(children, el);
    }
    // props
    var props = vnode.props;
    for (var key in props) {
        var val = props[key];
        el.setAttribute(key, val);
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.forEach(function (v) {
        patch(v, container);
    });
}
function setupRenderEffect(instance, initialVNode, container) {
    var proxy = instance.proxy;
    // 虚拟节点树
    // 一开始是创建在 instance 上
    // 在这里就绑定 this
    var subTree = instance.render.call(proxy);
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
    // 所有的 element -> mount
    initialVNode.el = subTree.el;
}

var isString = function (value) {
    return value !== null && typeof value === "string";
};
var isArray = function (value) {
    return value !== null && Array.isArray(value);
};

function createVNode(type, props, children) {
    var vnode = {
        type: type,
        props: props,
        children: children,
        shapeFlag: getShapeFlag(type),
        el: null
    };
    // children
    if (isString(children)) {
        // vnode.shapeFlag =   vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
        // | 两位都为 0 才为 0
        // 0100 | 0100 = 0100
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    return vnode;
}
function getShapeFlag(type) {
    // string -> div -> element
    return isString(type) ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
}

function createApp(rootComponent) {
    return {
        mount: function (rootContainer) {
            // 转换成 vdom
            // component -> vnode
            // 所有的逻辑操作 都会基于 vnode 做处理
            var vnode = createVNode(rootComponent);
            // !! bug render 是将虚拟 dom 渲染到 rootComponent 中
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
