function createComponentInstance(vnode) {
    var component = {
        vnode: vnode,
        type: vnode.type
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

function render(vnode, rootComponent) {
    // 只需要调用 patch 方法
    // 方便后续的递归处理
    patch(vnode);
}
function patch(vnode, rootComponent) {
    // TODO 去处理组件
    // 判断什么类型
    // 是 element 那么就应该去处理 element
    // 如何区分是 element 还是 component 类型???
    // processElement()
    processComponent(vnode);
}
function processComponent(vnode, rootComponent) {
    // 挂载组件
    mountComponent(vnode);
}
function mountComponent(vnode, rootComponent) {
    // 创建组件实例
    // 这个实例上面有很多属性
    var instance = createComponentInstance(vnode);
    // 初始化
    setupComponent(instance);
    // 调用 render 函数
    setupRenderEffect(instance);
}
function setupRenderEffect(instance, rootComponent) {
    // 虚拟节点树
    var subTree = instance.render();
    // vnode -> patch
    // vnode -> element -> mountElement
    patch(subTree);
}

function createVNode(type, props, children) {
    var vnode = {
        type: type,
        props: props,
        children: children
    };
    return vnode;
}

function createApp(rootComponent) {
    return {
        mount: function (rootContainer) {
            // 转换成 vdom
            // component -> vnode
            // 所有的逻辑操作 都会基于 vnode 做处理
            var vnode = createVNode(rootComponent);
            render(vnode);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

export { createApp, h };
