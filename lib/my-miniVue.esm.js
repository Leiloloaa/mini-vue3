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

var targetsMap = new Map();
function trigger(target, type, key) {
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
    return function get(target, key, receiver) {
        var isExistInReactiveMap = function () {
            return key === "__v_raw" /* RAW */ && receiver === reactiveMap.get(target);
        };
        var isExistInReadonlyMap = function () {
            return key === "__v_raw" /* RAW */ && receiver === readonlyMap.get(target);
        };
        var isExistInShallowReadonlyMap = function () {
            return key === "__v_raw" /* RAW */ && receiver === shallowReadonlyMap.get(target);
        };
        if (key === "__v_isReactive" /* IS_REACTIVE */) {
            return !isReadonly;
        }
        else if (key === "__v_isReadonly" /* IS_READONLY */) {
            return isReadonly;
        }
        else if (isExistInReactiveMap() ||
            isExistInReadonlyMap() ||
            isExistInShallowReadonlyMap()) {
            return target;
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
    return function set(target, key, value, receiver) {
        // set 操作是会放回 true or false
        // set() 方法应当返回一个布尔值。
        // 返回 true 代表属性设置成功。
        // 在严格模式下，如果 set() 方法返回 false，那么会抛出一个 TypeError 异常。
        var res = Reflect.set(target, key, value, receiver);
        trigger(target, "get", key);
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
        console.warn("key:" + key);
        return true;
    }
};
var shallowReadonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet });

var reactiveMap = new WeakMap();
var readonlyMap = new WeakMap();
var shallowReadonlyMap = new WeakMap();
function reactive(target) {
    return createReactiveObject(target, reactiveMap, mutableHandlers);
}
function readonly(target) {
    return createReactiveObject(target, readonlyMap, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyMap, shallowReadonlyHandlers);
}
function createReactiveObject(target, proxyMap, baseHandlers) {
    if (!isObject(target)) {
        console.log('不是一个对象');
    }
    // 核心就是 proxy
    // 目的是可以侦听到用户 get 或者 set 的动作
    // 如果命中的话就直接返回就好了 不需要每次都重新创建
    // 使用缓存做的优化点
    var existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    var proxy = new Proxy(target, baseHandlers);
    // 把创建好的 proxy 给存起来
    proxyMap.set(target, proxy);
    return proxy;
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

function createComponentInstance(vnode, parent) {
    var component = {
        vnode: vnode,
        type: vnode.type,
        props: {},
        slots: {},
        setupState: {},
        provides: parent ? parent.provides : {},
        parent: parent,
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

// provide-inject 提供了组件之间跨层级传递数据 父子、祖孙 等
function provide(key, value) {
    // 存储
    // 想一下，数据应该存在哪里？
    // 如果是存在 最外层的 component 中，里面组件都可以访问到了
    // 接着就要获取组件实例 使用 getCurrentInstance，所以 provide 只能在 setup 中使用
    var currentInstance = getCurrentInstance();
    if (currentInstance) {
        var provides = currentInstance.provides;
        var parentProvides = currentInstance.parent.provides;
        // 如果当前组件的 provides 等于 父级组件的 provides
        // 是要 通过 原型链 的方式 去查找
        // Object.create() 方法创建一个新对象，使用现有的对象来提供新创建的对象的 __proto__
        // 这里要解决一个问题
        // 当父级 key 和 爷爷级别的 key 重复的时候，对于子组件来讲，需要取最近的父级别组件的值
        // 那这里的解决方案就是利用原型链来解决
        // provides 初始化的时候是在 createComponent 时处理的，当时是直接把 parent.provides 赋值给组件的 provides 的
        // 所以，如果说这里发现 provides 和 parentProvides 相等的话，那么就说明是第一次做 provide(对于当前组件来讲)
        // 我们就可以把 parent.provides 作为 currentInstance.provides 的原型重新赋值
        // 至于为什么不在 createComponent 的时候做这个处理，可能的好处是在这里初始化的话，是有个懒执行的效果（优化点，只有需要的时候在初始化）
        // 首先咱们要知道 初始化 的时候 子组件 的 provides 就是父组件的 provides
        // currentInstance.parent.provides 是 爷爷组件
        // 当两个 key 值相同的时候要取 最近的 父组件的
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    // 取出
    // 从哪里取？若是 祖 -> 孙，要获取哪里的？？
    var currentInstance = getCurrentInstance();
    if (currentInstance) {
        var parentProvides = currentInstance.parent.provides;
        if (key in parentProvides) {
            return parentProvides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === 'function') {
                return defaultValue();
            }
            return defaultValue;
        }
    }
    return currentInstance.provides[key];
}

// 因为 render 函数被包裹了 所以 调用 createApp 的时候传入 render
// 为了让用户又能直接使用 createApp 所以 前往 renderer 导出一个 createApp
var createAppAPI = function (render) {
    return function createApp(rootComponent) {
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
    };
};

// 使用闭包 createRenderer 函数 包裹所有的函数
function createRenderer(options) {
    var hostCreateElement = options.createElement, hostPatchProp = options.patchProp, hostInsert = options.insert;
    function render(vnode, container) {
        // 只需要调用 patch 方法
        // 方便后续的递归处理
        patch(vnode, container, null);
    }
    function patch(vnode, container, parentComponent) {
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
                processFragment(vnode, container, parentComponent);
                break;
            case Text:
                processText(vnode, container);
                break;
            default:
                // 0001 & 0001 -> 0001
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(vnode, container, parentComponent);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(vnode, container, parentComponent);
                }
                break;
        }
    }
    function processElement(vnode, container, parentComponent) {
        // 初始化
        mountElement(vnode, container, parentComponent);
    }
    function processComponent(vnode, container, parentComponent) {
        // 挂载组件
        mountComponent(vnode, container, parentComponent);
    }
    function mountComponent(initialVNode, container, parentComponent) {
        // 创建组件实例
        // 这个实例上面有很多属性
        var instance = createComponentInstance(initialVNode, parentComponent);
        // 初始化
        setupComponent(instance);
        // 调用 render 函数
        setupRenderEffect(instance, initialVNode, container);
    }
    function mountElement(vnode, container, parentComponent) {
        // const el = document.createElement("div")
        // string 或 array
        // el.textContent = "hi , minivue"
        // el.setAttribute("id", "root")
        // document.body.append(el)
        // 这里的 vnode -> element -> div
        // 自定义渲染器
        // 修改一 hostCreateElement
        // canvas 是 new Element()
        // const el = vnode.el = document.createElement(vnode.type)
        var el = vnode.el = hostCreateElement(vnode.type);
        var children = vnode.children, shapeFlag = vnode.shapeFlag;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent);
        }
        // 修改二 hostPatchProp
        // props
        var props = vnode.props;
        for (var key in props) {
            var val = props[key];
            // onClick 、 onMouseenter 等等这些的共同特征
            // 以 on 开头 + 一个大写字母
            // if (isOn(key)) {
            //   const event = key.slice(2).toLowerCase()
            //   el.addEventListener(event, val);
            // } else {
            //   el.setAttribute(key, val)
            // }
            hostPatchProp(el, key, val);
        }
        // 修改三 canvas 添加元素
        // el.x = 10
        // container.append(el)
        // canvas 中添加元素是 addChild()
        // container.append(el)
        hostInsert(el, container);
    }
    function mountChildren(vnode, container, parentComponent) {
        vnode.forEach(function (v) {
            patch(v, container, parentComponent);
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
        patch(subTree, container, instance);
        // 所有的 element -> mount
        initialVNode.el = subTree.el;
    }
    function processFragment(vnode, container, parentComponent) {
        // 此时，拿出 vnode 中的 children
        var children = vnode.children;
        mountChildren(children, container, parentComponent);
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
    //  为了让用户又能直接使用 createApp 所以导出一个 createApp
    return {
        createApp: createAppAPI(render)
    };
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, val) {
    if (isOn(key)) {
        var event_1 = key.slice(2).toLowerCase();
        el.addEventListener(event_1, val);
    }
    else {
        el.setAttribute(key, val);
    }
}
function insert(el, parent) {
    parent.append(el);
}
// 调用 renderer.ts 中的 createRenderer
var renderer = createRenderer({
    createElement: createElement,
    patchProp: patchProp,
    insert: insert
});
// 这样用户就可以正常的使用 createApp 了
function createApp() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return renderer.createApp.apply(renderer, args);
}

export { createApp, createRenderer, createTextVNode, getCurrentInstance, h, inject, provide, renderSlots };
