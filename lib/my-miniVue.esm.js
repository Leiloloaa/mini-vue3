var extend = Object.assign;
var isObject = function (value) {
    return value !== null && typeof value === "object";
};
var isString = function (value) {
    return value !== null && typeof value === "string";
};
var isArray = function (value) {
    return value !== null && Array.isArray(value);
};
var isOn = function (key) {
    return /^on[A-Z]/.test(key);
};
var hasOwn = function (val, key) { return Object.prototype.hasOwnProperty.call(val, key); };

var targetsMap = new Map();
function trigger(target, key) {
    // 触发依赖
    var depsMap = targetsMap.get(target);
    var dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (var _i = 0, dep_1 = dep; _i < dep_1.length; _i++) {
        var effect_1 = dep_1[_i];
        if (effect_1.scheduler) {
            effect_1.scheduler();
        }
        else {
            effect_1.run();
        }
    }
}

// 缓存 首次创建即可
var get = createGetter();
var set = createSetter();
var readonlyGet = createGetter(true);
var shallowReadonlyGet = createGetter(true, true);
// 1、reactive 和 readonly 逻辑相似 抽离代码
// 2、使用高阶函数 来区分是否要 track
function createGetter(isReadonly, shallow) {
    if (isReadonly === void 0) { isReadonly = false; }
    if (shallow === void 0) { shallow = false; }
    return function get(target, key) {
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        var res = Reflect.get(target, key);
        // Proxy 要和 Reflect 配合使用
        // Reflect.get 中 receiver 参数，保留了对正确引用 this（即 admin）的引用，该引用将 Reflect.get 中正确的对象使用传递给 get
        // 不管 Proxy 怎么修改默认行为，你总可以在 Reflect 上获取默认行为
        // 如果为 true 就直接返回
        if (shallow) {
            return res;
        }
        // 如果 res 是 Object
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        // set 操作是会放回 true or false
        // set() 方法应当返回一个布尔值。
        // 返回 true 代表属性设置成功。
        // 在严格模式下，如果 set() 方法返回 false，那么会抛出一个 TypeError 异常。
        var res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
var mutableHandlers = {
    get: get,
    set: set
};
var readonlyHandles = {
    get: readonlyGet,
    set: function (target, key, value) {
        console.warn("key:" + key);
        return true;
    }
};
var shallowReadonlyHandles = extend({}, readonlyHandles, { get: shallowReadonlyGet });

function reactive(raw) {
    return createActiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createActiveObject(raw, readonlyHandles);
}
function shallowReadonly(raw) {
    return createActiveObject(raw, shallowReadonlyHandles);
}
function createActiveObject(raw, baseHandlers) {
    if (!isObject(raw)) {
        console.log('不是一个对象');
    }
    return new Proxy(raw, baseHandlers);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

// 通过 map 的方式扩展
// $el 是个 key
var publicPropertiesMap = {
    $el: function (i) { return i.vnode.el; }
};
var PublicInstanceProxyHandlers = {
    get: function (_a, key) {
        var instance = _a._;
        //  setupState
        var setupState = instance.setupState, props = instance.props;
        // if (Reflect.has(setupState, key)) {
        //   return setupState[key]
        // }
        // 检测 key 是否在目标 上
        if (hasOwn(setupState, key)) {
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
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
        props: {},
        setupState: {}
    };
    return component;
}
function setupComponent(instance) {
    // todo 
    // initSlots()
    initProps(instance, instance.vnode.props);
    // console.log(instance);
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
        var setupResult = setup(shallowReadonly(instance.proxy));
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
        // onClick 、 onMouseenter 等等这些的共同特征
        // 以 on 开头 + 一个大写字母
        if (isOn(key)) {
            var event_1 = key.slice(2).toLowerCase();
            el.addEventListener(event_1, val);
        }
        else {
            el.setAttribute(key, val);
        }
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
