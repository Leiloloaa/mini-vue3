var extend = Object.assign;
var isObject = function (value) {
    return value !== null && typeof value === "object";
};
var isFunction = function (value) {
    return value !== null && typeof value === "function";
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
var camelize = function (str) {
    // 需要将 str 中的 - 全部替换，斌且下一个要 设置成大写
    // \w 匹配字母或数字或下划线或汉字 等价于 '[^A-Za-z0-9_]'。
    // \s 匹配任意的空白符
    // \d 匹配数字
    // \b 匹配单词的开始或结束
    // ^  匹配字符串的开始
    // $  匹配字符串的结束
    // replace 第二参数是值得话就是直接替换
    // 如果是一个回调函数 那么 就可以依次的修改值
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
        // vnode.shapeFlag =   vnode.shapeFlag | ShapeFlags.TEXT_CHILDREN
        // | 两位都为 0 才为 0
        // 0100 | 0100 = 0100
        vnode.shapeFlag |= 4 /* TEXT_CHILDREN */;
    }
    else if (isArray(children)) {
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
    // string -> div -> element
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

function emit(instance, event) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    var props = instance.props;
    // TPP
    // 先去实现 特定行为，然后再重构成 通用行为
    // add -> Add -> onAdd
    // add-foo -> addFoo -> onAddFoo
    // const camelize = (str) => {
    // 需要将 str 中的 - 全部替换，斌且下一个要 设置成大写
    // \w 匹配字母或数字或下划线或汉字 等价于 '[^A-Za-z0-9_]'。
    // \s 匹配任意的空白符
    // \d 匹配数字
    // \b 匹配单词的开始或结束
    // ^  匹配字符串的开始
    // $  匹配字符串的结束
    // replace 第二参数是值得话就是直接替换
    // 如果是一个回调函数 那么 就可以依次的修改值
    //   return str.replace(/-(\w)/g, (_, c: string) => {
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
}

// 通过 map 的方式扩展
// $el 是个 key
var publicPropertiesMap = {
    $el: function (i) { return i.vnode.el; },
    $slots: function (i) { return i.slots; }
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

function initSlots(instance, children) {
    // array
    // instance.slots = Array.isArray(children) ? children : [children]
    // object
    // const slots = {}
    // for (const key in children) {
    //   const value = children[key];
    //   slots[key] = Array.isArray(value) ? value : [value]
    // }
    // instance.slots = slots
    // const slots = {}
    // for (const key in children) {
    //   const value = children[key];
    //   slots[key] = (props) => normalizeSlotValue(value(props))
    // }
    // instance.slots = slots
    // 优化 并不是所有的 children 都有 slots
    // 通过 位运算 来处理
    var vnode = instance.vnode;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
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
    return isArray(value) ? value : [value];
}

function createComponentInstance(vnode) {
    var component = {
        vnode: vnode,
        type: vnode.type,
        props: {},
        slots: {},
        setupState: {},
        emit: function () { }
    };
    // bind 的第一个参数 如果是 undefined 或者 null  那么 this 就是指向 windows
    // 这样做的目的是 实现了 emit 的第一个参数 为 component 实例 这是预置入
    component.emit = emit.bind(null, component);
    return component;
}
function setupComponent(instance) {
    initSlots(instance, instance.vnode.children);
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
        setCurrentInstance(instance);
        // 返回一个 function 或者是 Object
        // 如果是 function 则认为是 render 函数
        // 如果是 Object 则注入到当前组件的上下文中
        var setupResult = setup(shallowReadonly(instance.proxy), { emit: instance.emit });
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
    // 需要返回实例
    return currentInstance;
}
// 赋值时 封装函数的好处
// 我们可以清晰的知道 谁调用了 方便调试
function setCurrentInstance(instance) {
    currentInstance = instance;
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
    var type = vnode.type, shapeFlag = vnode.shapeFlag;
    // 根据 type 来渲染
    // console.log(type);
    // Object
    // div/p -> String
    // Fragment
    // Text
    switch (type) {
        case Fragment:
            processFragment(vnode, container);
            break;
        case Text:
            processText(vnode, container);
            break;
        default:
            // 0001 & 0001 -> 0001
            if (shapeFlag & 1 /* ELEMENT */) {
                processElement(vnode, container);
            }
            else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                processComponent(vnode, container);
            }
            break;
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
function processFragment(vnode, container) {
    // 此时，拿出 vnode 中的 children
    var children = vnode.children;
    mountChildren(children, container);
}
function processText(vnode, container) {
    // console.log(vnode);
    // 文本内容 在 children 中
    var children = vnode.children;
    // 创建文本节点
    var textNode = vnode.el = document.createTextNode(children);
    // 挂载到容器中
    container.append(textNode);
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

function renderSlots(slots, name, props) {
    var slot = slots[name];
    if (slot) {
        if (isFunction(slot)) {
            // 我们为了渲染 插槽中的 元素 主动在外层添加了一个 div -> component
            // 修改 直接变成 element -> mountChildren
            // Symbol 常量 Fragment
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

export { createApp, createTextVNode, getCurrentInstance, h, renderSlots };
