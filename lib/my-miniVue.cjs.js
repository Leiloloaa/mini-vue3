'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var extend = Object.assign;
var isObject = function (value) {
    return value !== null && typeof value === "object";
};
var isString = function (value) {
    return value !== null && typeof value === "string";
};
var isOn = function (key) {
    return /^on[A-Z]/.test(key);
};
var hasOwn = function (val, key) { return Object.prototype.hasOwnProperty.call(val, key); };
var camelize = function (str) {
    return str.replace(/-(\w)/g, function (_, c) {
        return c ? c.toUpperCase() : '';
    });
};
var capitalize = function (str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
var toHandlerKey = function (str) {
    return str ? "on" + capitalize(str) : '';
};

var Fragment = Symbol('Fragment');
var Text = Symbol('Text');
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
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= 8 /* ARRAY_CHILDREN */;
    }
    // 组件类型 + children 是 object 就有 slot
    if (vnode.shapeFlag & 2 /* STATEFUL_COMPONENT */) {
        if (isObject(children)) {
            vnode.shapeFlag |= 16 /* SLOT_CHILDREN */;
        }
    }
    return vnode;
}
function getShapeFlag(type) {
    return isString(type) ? 1 /* ELEMENT */ : 2 /* STATEFUL_COMPONENT */;
}
function createTextVNode(text) {
    return createVNode(Text, {}, text);
}

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

var get = createGetter(); // 全局缓存 get
var set = createSetter(); // 全局缓存 set
var readonlyGet = createGetter(true);
var shallowReadonlyGet = createGetter(true, true);
// 高阶函数，返回一个 return
function createGetter(isReadonly, shallow) {
    if (isReadonly === void 0) { isReadonly = false; }
    if (shallow === void 0) { shallow = false; }
    return function get(target, key) {
        if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        var res = Reflect.get(target, key);
        if (shallow) {
            return res;
        }
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter() {
    return function set(target, key, value) {
        var res = Reflect.set(target, key, value);
        trigger(target, key);
        return res;
    };
}
var mutableHandlers = {
    get: get,
    set: set
};
var readonlyHandlers = {
    get: readonlyGet,
    set: function (target, key) {
        console.warn("key :\"" + String(key) + "\" set \u5931\u8D25\uFF0C\u56E0\u4E3A target \u662F readonly \u7C7B\u578B", target);
        return true;
    }
};
var shallowReadonlyHandlers = extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
});

function reactive(raw) {
    return createReactiveObject(raw, mutableHandlers);
}
function readonly(raw) {
    return createReactiveObject(raw, readonlyHandlers);
}
function shallowReadonly(raw) {
    return createReactiveObject(raw, shallowReadonlyHandlers);
}
// 抽离 new proxy 生成createReactiveObject
// target = raw ；baseHandles 类别
function createReactiveObject(target, baseHandles) {
    if (!isObject(target)) {
        console.log('必须是一个对象');
        return target;
    }
    return new Proxy(target, baseHandles);
}

function emit(instance, event) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    // instance.props -> event
    var props = instance.props;
    // TPP
    // 先去写一个 特定 的行为 -> 重构成通用的行为
    // add -> Add
    // add-foo -> AddFoo
    // const camelize = (str) => {
    //   return (str).replace(/-(\w)/g, (_, c: string) => {
    //     return c ? c.toUpperCase() : ''
    //   })
    // }
    // const capitalize = (str) => {
    //   return str.charAt(0).toUpperCase() + str.slice(1)
    // }
    // const toHandlerKey = (str) => {
    //   return str ? "on" + capitalize(str) : ''
    // }
    var handler = props[toHandlerKey(camelize(event))];
    handler && handler.apply(void 0, args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
    // attrs
}

var publicPropertiesMap = {
    $el: function (i) { return i.vnode.el; },
    $slots: function (i) { return i.slots; }
};
var PublicInstanceProxyHandles = {
    get: function (_a, key) {
        var instance = _a._;
        // setupState 就是 setup 的返回值
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
        // key -> $el 或 $data 等
        // 使用 map
        var publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    }
};

function initSlots(instance, children) {
    // 优化 并不是所有的 children 都有 slots
    // 通过 位运算 来处理
    var vnode = instance.vnode;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
    // children is array
    // instance.slots = Array.isArray(children) ? children : [children]
    // children is object
    // const slots = {}
    // for (const key in children) {
    //   const value = children[key];
    // slots[key] = Array.isArray(value) ? value : [value]   
    //   slots[key] = normalizeSlotValue(value)
    // }
    // instance.slots = slots
}
function normalizeObjectSlots(children, slots) {
    var _loop_1 = function (key) {
        var value = children[key];
        // slots[key] = Array.isArray(value) ? value : [value]   
        // slots[key] = normalizeSlotValue(value)
        // 修改 当 是一个 函数的时候 直接调用
        slots[key] = function (props) { return normalizeSlotValue(value(props)); };
    };
    for (var key in children) {
        _loop_1(key);
    }
}
function normalizeSlotValue(value) {
    return Array.isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    var component = {
        vnode: vnode,
        type: vnode.type,
        setupState: {},
        props: {},
        slots: {},
        emit: function () { }
    };
    // TODO 为什么？？？
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initProps(instance, instance.vnode.props);
    // 把虚拟节点的 slots 赋值给 component
    initSlots(instance, instance.vnode.children);
    setupStatefulComponent(instance);
}
function setupStatefulComponent(instance) {
    var Component = instance.type;
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles);
    var setup = Component.setup;
    if (setup) {
        setCurrentInstance(instance);
        var setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // TODO function
    if (isObject(setupResult)) {
        instance.setupState = setupResult;
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    var Component = instance.type;
    instance.render = Component.render;
}
var currentInstance = null;
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(value) {
    currentInstance = value;
}

function render(vnode, container) {
    // patch 的作用就是循环遍历
    // 同时判断是一个 function 或者是一个 Object
    // TODO patch 作用？
    // 如果是一个 function 
    // 如果是一个 Object 对象就直接插入到上下文对象中
    patch(vnode, container);
}
function patch(vnode, container) {
    var type = vnode.type, shapeFlag = vnode.shapeFlag;
    switch (type) {
        case Fragment:
            processFragment(vnode, container);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            // 通过 vnode.type 的类型判断
            if (shapeFlag & 1 /* ELEMENT */) {
                processElement(vnode, container);
            }
            else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                processComponent(vnode, container);
            }
            break;
    }
}
// 处理 新建 或者 更新
function processComponent(initialVNode, container) {
    mountComponent(initialVNode, container);
}
function mountComponent(initialVNode, container) {
    var instance = createComponentInstance(initialVNode);
    // 初始化组件
    setupComponent(instance);
    setupRenderEffect(instance, initialVNode, container);
}
function setupRenderEffect(instance, initialVNode, container) {
    var proxy = instance.proxy;
    var subTree = instance.render.call(proxy);
    // 在子树初始化 patch 之后 将 el 保存
    patch(subTree, container);
    initialVNode.el = subTree.el;
}
function processElement(vnode, container) {
    mountElement(vnode, container);
}
function mountElement(vnode, container) {
    var el = vnode.el = document.createElement(vnode.type);
    // children
    var children = vnode.children, shapeFlag = vnode.shapeFlag;
    // 可能是 string 也可能是 array
    if (shapeFlag & 4 /* TEXT_CHILDREN */) {
        el.textContent = children;
    }
    else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
        mountChildren(vnode, el);
    }
    // props
    var props = vnode.props;
    for (var key in props) {
        var val = props[key];
        // 具体 click -> 通用
        // on + Event name
        // onMousedown
        if (isOn(key)) {
            var event_1 = key.slice(2).toLocaleLowerCase();
            el.addEventListener(event_1, val);
        }
        else {
            el.setAttribute(key, val);
        }
    }
    container.append(el);
}
function mountChildren(vnode, container) {
    vnode.children.forEach(function (v) {
        patch(v, container);
    });
}
function processFragment(vnode, container) {
    // 通过 mountChildren 去依次遍历
    mountChildren(vnode, container);
}
function processText(vnode, container) {
    // 挂载 text 静态文本 vnode.children
    // console.log(vnode.children);
    var children = vnode.children;
    var textNode = vnode.el = document.createTextNode(children);
    container.append(textNode);
}

// 创建组件实例
function createApp(rootComponent) {
    return {
        // mount 是起到 挂载的作用
        mount: function (rootContainer) {
            // 创建虚拟 dom
            var vnode = createVNode(rootComponent);
            // 然后再通过 render 函数渲染
            render(vnode, rootContainer);
        }
    };
}

function h(type, props, children) {
    return createVNode(type, props, children);
}

function renderSlots(slots, name, props) {
    var slot = slots[name];
    if (slot) {
        if (typeof slot === 'function') {
            // 直接调用
            // 实际上这种写法会多了一个 div
            // 我们通过一个 Fragment 来判断，然后直接 遍历 children
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

exports.createApp = createApp;
exports.createTextVNode = createTextVNode;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.renderSlots = renderSlots;
