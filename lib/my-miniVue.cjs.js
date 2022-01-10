'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

const extend = Object.assign;
const isObject = (value) => {
    return value !== null && typeof value === "object";
};
const isFunction = (value) => {
    return value !== null && typeof value === "function";
};
const isString = (value) => {
    return value !== null && typeof value === "string";
};
const isArray = (value) => {
    return value !== null && Array.isArray(value);
};
const hasChanged = (value, newValue) => { return !Object.is(value, newValue); };
const isOn = (key) => {
    return /^on[A-Z]/.test(key);
};
const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key);
const camelize = (str) => {
    // 需要将 str 中的 - 全部替换，斌且下一个要 设置成大写
    // \w 匹配字母或数字或下划线或汉字 等价于 '[^A-Za-z0-9_]'。
    // \s 匹配任意的空白符
    // \d 匹配数字
    // \b 匹配单词的开始或结束
    // ^  匹配字符串的开始
    // $  匹配字符串的结束
    // replace 第二参数是值得话就是直接替换
    // 如果是一个回调函数 那么 就可以依次的修改值
    return str.replace(/-(\w)/g, (_, c) => {
        return c ? c.toUpperCase() : '';
    });
};
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : '';
};

const Fragment = Symbol('Fragment');
const Text = Symbol('Text');
function createVNode(type, props, children) {
    const vnode = {
        type,
        props,
        children,
        component: null,
        key: props && props.key,
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
    const slot = slots[name];
    if (slot) {
        if (isFunction(slot)) {
            // 我们为了渲染 插槽中的 元素 主动在外层添加了一个 div -> component
            // 修改 直接变成 element -> mountChildren
            // Symbol 常量 Fragment
            return createVNode(Fragment, {}, slot(props));
        }
    }
}

let activeEffect;
let shouldTrack = false;
class ReactiveEffect {
    constructor(fn, scheduler) {
        this.deps = [];
        this.active = true;
        this._fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        // 会收集依赖
        // shouldTrack 来区分
        // 如果是 stop 的状态
        // 就不收集
        if (!this.active) {
            return this._fn();
        }
        // 否则收集
        shouldTrack = true;
        activeEffect = this;
        const result = this._fn();
        // reset 因为是全局变量
        // 处理完要还原
        shouldTrack = false;
        activeEffect = null;
        return result;
    }
    stop() {
        // 性能问题
        // 第一次调用 就已经清空了
        if (this.active) {
            cleanupEffect(this);
            if (this.onStop) {
                this.onStop();
            }
            this.active = false;
        }
    }
}
function cleanupEffect(effect) {
    effect.deps.forEach((dep) => {
        dep.delete(effect);
    });
    effect.deps.length = 0;
}
const targetsMap = new Map();
function track(target, key) {
    // 是否收集  shouldTrack 为 true 和 activeEffect 有值的时候要收集 否则就 return 出去
    if (!isTracking())
        return;
    // 收集依赖
    // reactive 传入的是一个对象 {}
    // 收集关系： targetsMap 收集所有依赖 然后 每一个 {} 作为一个 depsMap
    // 再把 {} 里面的每一个变量作为 dep(set 结构) 的 key 存放所有的 fn
    let depsMap = targetsMap.get(target);
    // 不存在的时候 要先初始化
    if (!depsMap) {
        depsMap = new Map();
        targetsMap.set(target, depsMap);
    }
    let dep = depsMap.get(key);
    if (!dep) {
        dep = new Set();
        depsMap.set(key, dep);
    }
    // 如果是单纯的获取 就不会有 activeEffect
    // 因为 activeEffect 是在 effect.run 执行的时候 才会存在
    // if (!activeEffect) return
    // 应该收集依赖
    // !! 思考 什么时候被赋值呢？
    // 触发 set 执行 fn 然后再触发 get 
    // 所以在 run 方法中
    // if (!shouldTrack) return
    // if (dep.has(activeEffect)) return
    // // 要存入的是一个 fn
    // // 所以要利用一个全局变量
    // dep.add(activeEffect)
    // // 如何通过当前的 effect 去找到 deps？
    // // 反向收集 deps
    // activeEffect.deps.push(dep)
    trackEffects(dep);
}
// 抽离 track 与 ref 公用
function trackEffects(dep) {
    if (dep.has(activeEffect))
        return;
    // 要存入的是一个 fn
    // 所以要利用一个全局变量
    dep.add(activeEffect);
    // 如何通过当前的 effect 去找到 deps？
    // 反向收集 deps
    activeEffect.deps.push(dep);
}
function isTracking() {
    return shouldTrack && activeEffect !== undefined;
}
function trigger(target, type, key) {
    // 触发依赖
    let depsMap = targetsMap.get(target);
    let dep = depsMap.get(key);
    triggerEffects(dep);
}
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect.scheduler) {
            effect.scheduler();
        }
        else {
            effect.run();
        }
    }
}
function effect(fn, options = {}) {
    // ReactiveEffect 构造函数（一定要用 new 关键字实现）
    const _effect = new ReactiveEffect(fn, options.scheduler);
    // 考虑到后面还会有很多 options
    // 使用 Object.assign() 方法自动合并
    // _effect.onStop = options.onStop
    // Object.assign(_effect, options);
    // extend 扩展 更有可读性
    extend(_effect, options);
    _effect.run();
    const runner = _effect.run.bind(_effect);
    // 保存
    runner.effect = _effect;
    return runner;
}
function stop(runner) {
    // stop 的意义 是找要到这个实例 然后删除
    runner.effect.stop();
}

// 缓存 首次创建即可
const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);
// 1、reactive 和 readonly 逻辑相似 抽离代码
// 2、使用高阶函数 来区分是否要 track
function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
        const isExistInReactiveMap = () => key === "__v_raw" /* RAW */ && receiver === reactiveMap.get(target);
        const isExistInReadonlyMap = () => key === "__v_raw" /* RAW */ && receiver === readonlyMap.get(target);
        const isExistInShallowReadonlyMap = () => key === "__v_raw" /* RAW */ && receiver === shallowReadonlyMap.get(target);
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
        const res = Reflect.get(target, key);
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
        if (!isReadonly) {
            track(target, key);
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
        const res = Reflect.set(target, key, value, receiver);
        trigger(target, "get", key);
        return res;
    };
}
const mutableHandlers = {
    get,
    set
};
const readonlyHandlers = {
    get: readonlyGet,
    set(target, key) {
        console.warn(`key:${key}`);
        return true;
    }
};
const shallowReadonlyHandlers = extend({}, readonlyHandlers, { get: shallowReadonlyGet });

const reactiveMap = new WeakMap();
const readonlyMap = new WeakMap();
const shallowReadonlyMap = new WeakMap();
function reactive(target) {
    return createReactiveObject(target, reactiveMap, mutableHandlers);
}
function readonly(target) {
    return createReactiveObject(target, readonlyMap, readonlyHandlers);
}
function shallowReadonly(target) {
    return createReactiveObject(target, shallowReadonlyMap, shallowReadonlyHandlers);
}
function isReactive(value) {
    // 触发 get 操作 就可以判断 value.xxx 就会触发
    // value["is_reactive"] get 就可以获取到 is_reactive
    // 如果传过来的不是 proxy 值，所以就不会去调用 get 方法
    // 也没挂载 ReactiveFlags.IS_REACTIVE 属性 所以是 undefined
    // 使用 !! 转换成 boolean 值就可以了
    return !!value["__v_isReactive" /* IS_REACTIVE */];
}
function isReadonly(value) {
    return !!value["__v_isReadonly" /* IS_READONLY */];
}
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function createReactiveObject(target, proxyMap, baseHandlers) {
    if (!isObject(target)) {
        console.log('不是一个对象');
    }
    // 核心就是 proxy
    // 目的是可以侦听到用户 get 或者 set 的动作
    // 如果命中的话就直接返回就好了 不需要每次都重新创建
    // 使用缓存做的优化点
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }
    const proxy = new Proxy(target, baseHandlers);
    // 把创建好的 proxy 给存起来
    proxyMap.set(target, proxy);
    return proxy;
}

function emit(instance, event, ...args) {
    const { props } = instance;
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
    const handler = props[toHandlerKey(camelize(event))];
    handler && handler(...args);
}

function initProps(instance, rawProps) {
    instance.props = rawProps || {};
}

// 通过 map 的方式扩展
// $el 是个 key
const publicPropertiesMap = {
    $el: (i) => i.vnode.el,
    $slots: (i) => i.slots,
    $props: (i) => i.props
};
const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
        //  setupState
        const { setupState, props } = instance;
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
        const publicGetter = publicPropertiesMap[key];
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
    const { vnode } = instance;
    if (vnode.shapeFlag & 16 /* SLOT_CHILDREN */) {
        normalizeObjectSlots(children, instance.slots);
    }
}
function normalizeObjectSlots(children, slots) {
    for (const key in children) {
        const value = children[key];
        // slots[key] = Array.isArray(value) ? value : [value]   
        // slots[key] = normalizeSlotValue(value)
        // 修改 当 是一个 函数的时候 直接调用
        slots[key] = (props) => normalizeSlotValue(value(props));
    }
}
function normalizeSlotValue(value) {
    return isArray(value) ? value : [value];
}

// 用于存储所有的 effect 对象
function createDep(effects) {
    const dep = new Set(effects);
    return dep;
}

// 1 true '1'
// get set
// 而 proxy -》只能监听对象
// 我们包裹一个 对象 
// Impl 表示一个接口的缩写
class RefImpl {
    constructor(value) {
        this.__v_isRef = true;
        // 存储一个新值 用于后面的对比
        this._rawValue = value;
        // value -> reactive
        // 看看 value 是不是 对象
        this._value = convert(value);
        this.dep = createDep();
    }
    // 属性访问器模式
    get value() {
        // 确保调用过 run 方法 不然 dep 就是 undefined
        // if (isTracking()) {
        //   trackEffects(this.dep)
        // }
        trackRefValue(this);
        return this._value;
    }
    set value(newValue) {
        // 一定是先修改了 value
        // newValue -> this._value 相同不修改
        // if (Object.is(newValue, this._value)) return
        // hasChanged
        // 改变才运行
        // 对比的时候 object
        // 有可能 this.value 是 porxy 那么他们就不会相等
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue;
            this._value = convert(newValue);
            triggerEffects(this.dep);
        }
    }
}
function convert(value) {
    return isObject(value) ? reactive(value) : value;
}
function trackRefValue(ref) {
    if (isTracking()) {
        trackEffects(ref.dep);
    }
}
function ref(value) {
    return new RefImpl(value);
}
function isRef(ref) {
    return !!ref.__v_isRef;
}
// 语法糖 如果是 ref 就放回 .value 否则返回本身
function unRef(ref) {
    return isRef(ref) ? ref.value : ref;
}
function proxyRefs(objectWithRefs) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            // get 如果获取到的是 age 是个 ref 那么就返回 .value
            // 如果不是 ref 就直接返回本身
            return unRef(Reflect.get(target, key));
        },
        set(target, key, value) {
            // value 是新值
            // 如果目标是 ref 且替换的值不是 ref
            if (isRef(target[key]) && !isRef(value)) {
                return target[key].value = value;
            }
            else {
                return Reflect.set(target, key, value);
            }
        }
    });
}

class ComputedRefImpl {
    constructor(getter) {
        this._dirty = true;
        this._effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
            }
        });
    }
    get value() {
        // get 调用完一次就锁上
        // 当依赖的响应式对象的值发生改变的时候
        // effect
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}
// getter 是一个函数
function computed(getter) {
    return new ComputedRefImpl(getter);
}

function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        next: null,
        props: {},
        slots: {},
        setupState: {},
        provides: parent ? parent.provides : {},
        parent,
        isMount: false,
        subTree: {},
        emit: () => { }
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
    const Component = instance.type;
    // ctx
    instance.proxy = new Proxy({
        _: instance
    }, PublicInstanceProxyHandlers);
    // 解构 setup
    const { setup } = Component;
    if (setup) {
        setCurrentInstance(instance);
        // 返回一个 function 或者是 Object
        // 如果是 function 则认为是 render 函数
        // 如果是 Object 则注入到当前组件的上下文中
        const setupResult = setup(shallowReadonly(instance.proxy), { emit: instance.emit });
        setCurrentInstance(null);
        handleSetupResult(instance, setupResult);
    }
}
function handleSetupResult(instance, setupResult) {
    // TODO function
    if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult);
    }
    finishComponentSetup(instance);
}
function finishComponentSetup(instance) {
    const Component = instance.type;
    instance.render = Component.render;
}
let currentInstance = null;
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
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent.provides;
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
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent.provides;
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
const createAppAPI = (render) => {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer) {
                // 转换成 vdom
                // component -> vnode
                // 所有的逻辑操作 都会基于 vnode 做处理
                const vnode = createVNode(rootComponent);
                // !! bug render 是将虚拟 dom 渲染到 rootComponent 中
                render(vnode, rootContainer);
            }
        };
    };
};

// 使用闭包 createRenderer 函数 包裹所有的函数
function createRenderer(options) {
    const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert, remove: hostRemove, setElementText: hostSetElementText } = options;
    function render(vnode, container) {
        // 只需要调用 patch 方法
        // 方便后续的递归处理
        patch(null, vnode, container, null, null);
    }
    function patch(n1, n2, container, parentComponent, anchor) {
        // TODO 去处理组件
        // 判断什么类型
        // 是 element 那么就应该去处理 element
        // 如何区分是 element 还是 component 类型???
        // console.log(vnode.type);
        // object 是 component
        // div 是 element
        // debugger
        const { type, shapeFlag } = n2;
        // 根据 type 来渲染
        // console.log(type);
        // Object
        // div/p -> String
        // Fragment
        // Text
        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent, anchor);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                // 0001 & 0001 -> 0001
                if (shapeFlag & 1 /* ELEMENT */) {
                    processElement(n1, n2, container, parentComponent, anchor);
                }
                else if (shapeFlag & 2 /* STATEFUL_COMPONENT */) {
                    processComponent(n1, n2, container, parentComponent, anchor);
                }
                break;
        }
    }
    // 首先因为每次修改 响应式都会处理 element
    // 在 processElement 的时候就会判断
    // 如果是传入的 n1 存在 那就是新建 否则是更新
    // 更新 patchElement 又得进行两个节点的对比
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化
            mountElement(n2, container, parentComponent, anchor);
        }
        else {
            patchElement(n1, n2, container, parentComponent, anchor);
        }
    }
    function patchElement(n1, n2, container, parentComponent, anchor) {
        console.log("n1", n1);
        console.log("n2", n2);
        // 新老节点
        const oldProps = n1.props || {};
        const newProps = n2.props || {};
        // n1 是老的虚拟节点 上有 el 在 mountElement 有赋值
        // 同时 要赋值 到 n2 上面 因为 mountElement 只有初始
        const el = (n2.el = n1.el);
        // 处理
        patchChildren(n1, n2, el, parentComponent, anchor);
        patchProps(el, oldProps, newProps);
    }
    function patchChildren(n1, n2, container, parentComponent, anchor) {
        // 常见有四种情况
        // array => text
        // text => array
        // text => text
        // array => array
        // 如何知道类型呢？ 通过 shapeFlag
        const prevShapeFlag = n1.shapeFlag;
        const c1 = n1.children;
        const { shapeFlag } = n2;
        const c2 = n2.children;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            if (prevShapeFlag & 8 /* ARRAY_CHILDREN */) {
                // 1、要卸载原来的组件
                unmountChildren(n1.children);
                // 2、将 text 挂载上去
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        else {
            // 现在是 array 的情况 之前是 text
            if (prevShapeFlag & 4 /* TEXT_CHILDREN */) {
                // 1、原先的 text 清空
                hostSetElementText(container, '');
                // 2、挂载现在的 array
                mountChildren(c2, container, parentComponent, anchor);
            }
            else {
                // 都是数组的情况就需要
                patchKeyedChildren(c1, c2, container, parentComponent, anchor);
            }
        }
    }
    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const len2 = c2.length;
        // 需要定义三个指针
        let i = 0; // 从新的节点开始
        let e1 = c1.length - 1; // 老的最后一个 索引值
        let e2 = len2 - 1; // 新的最后一个 索引值
        function isSomeVNodeType(n1, n2) {
            // 对比节点是否相等 可以通过 type 和 key
            return n1.type === n2.type && n1.key === n2.key;
        }
        debugger;
        // 左侧对比 移动 i 指针
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            i++;
        }
        // 右侧对比 移动 e1 和 e2 指针
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            }
            else {
                break;
            }
            e1--;
            e2--;
        }
        // 对比完两侧后 就要处理以下几种情况
        // 新的比老的多 创建
        if (i > e1) {
            if (i <= e2) {
                // 左侧 可以直接加在末尾
                // 右侧的话 我们就需要引入一个 概念 锚点 的概念
                // 通过 anchor 锚点 我们将新建的元素插入的指定的位置
                const nextPos = e2 + 1;
                // 如果 e2 + 1 大于 c2 的 length 那就是最后一个 否则就是最先的元素
                // 锚点是一个 元素
                const anchor = nextPos < len2 ? c2[nextPos].el : null;
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor);
                    i++;
                }
            }
        }
        else if (i > e2) {
            // 老的比新的多 删除
            // e1 就是 老的 最后一个
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        }
        else {
            // 乱序部分
            // 遍历老节点 然后检查在新的里面是否存在
            // 方案一 同时遍历新的 时间复杂度 O(n*n)
            // 方案二 新的节点建立一个映射表 时间复杂度 O(1) 只要根据 key 去查是否存在
            // 为了性能最优 选则方案二
            let s1 = i; // i 是停止的位置 差异开始的地方
            let s2 = i;
            // 如果新的节点少于老的节点，当遍历完新的之后，就不需要再遍历了
            // 通过一个总数和一个遍历次数 来优化
            // 要遍历的数量
            const toBePatched = e2 - s2 + 1;
            // 已经遍历的数量
            let patched = 0;
            // 建立新节点的映射表
            const keyToNewIndexMap = new Map();
            // 新建一个定长数组(需要变动的长度) 性能是最好的 来确定新老之间索引关系 我们要查到最长递增的子序列 也就是索引值
            const newIndexToOldIndexMap = new Array(toBePatched);
            // 确定是否需要移动 只要后一个索引值小于前一个 就需要移动
            let moved = false;
            let maxNewIndexSoFar = 0;
            // 赋值
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0;
            }
            // 循环 e2
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i);
            }
            // 循环 e1
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];
                if (patched >= toBePatched) {
                    hostRemove(prevChild.el);
                    continue;
                }
                let newIndex;
                if (prevChild.key !== null) {
                    // 用户输入 key
                    newIndex = keyToNewIndexMap.get(prevChild.key);
                }
                else {
                    // 用户没有输入 key
                    for (let j = s2; j < e2; j++) {
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }
                if (newIndex === undefined) {
                    hostRemove(prevChild.el);
                }
                else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex;
                    }
                    else {
                        moved = true;
                    }
                    // 实际上是等于 i 就可以 因为 0 表示不存在 所以 定义成 i + 1
                    newIndexToOldIndexMap[newIndex - s2] = i + 1;
                    // 存在就再次深度对比
                    patch(prevChild, c2[newIndex], container, parentComponent, null);
                    // patch 完就证明已经遍历完一个新的节点
                    patched++;
                }
            }
            // 获取最长递增子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : [];
            let j = increasingNewIndexSequence.length - 1;
            // 倒序的好处就是 能够确定稳定的位置
            // ecdf
            // cdef
            // 如果是 从 f 开始就能确定 e 的位置
            // 从最后开始就能依次确定位置
            for (let i = toBePatched; i >= 0; i--) {
                const nextIndex = i + s2;
                const nextChild = c2[nextIndex];
                const anchor = nextIndex + 1 < len2 ? c2[nextIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor);
                }
                else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
                        // 移动位置 调用 insert
                        hostInsert(nextChild.el, container, anchor);
                    }
                    else {
                        j++;
                    }
                }
            }
        }
    }
    function unmountChildren(children) {
        for (let i = 0; i < children.length; i++) {
            hostRemove(children[i].el);
        }
    }
    function patchProps(el, oldProps, newProps) {
        // 常见的有三种情况
        // 值改变了 => 删除
        // 值变成了 null 或 undefined  => 删除
        // 增加了 => 增加
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp);
                }
            }
        }
        // 处理值 变成 null 或 undefined 的情况
        // 新的就不会有 所以遍历老的 oldProps 看是否存在于新的里面
        if (oldProps !== {}) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null);
                }
            }
        }
    }
    function processComponent(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 挂载组件
            mountComponent(n2, container, parentComponent, anchor);
        }
        else {
            // 更新组件
            updateComponent(n1, n2);
        }
    }
    function updateComponent(n1, n2) {
        // 更新实际上只需要想办法 调用 render 函数 然后再 patch 去更新
        // instance 从哪里来呢？ 在挂载阶段 我们会生成 instance 然后挂载到 虚拟dom 上
        // n2 没有 所以要赋值
        const instance = n2.component = n1.component;
        // 然后再把 n2 设置为下次需要更新的 虚拟 dom
        instance.next = n2;
        instance.update();
    }
    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 创建组件实例
        // 这个实例上面有很多属性
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent);
        // 初始化
        setupComponent(instance);
        // 调用 render 函数
        setupRenderEffect(instance, initialVNode, container, anchor);
    }
    function mountElement(vnode, container, parentComponent, anchor) {
        // const el = document.createElement("div")
        // string 或 array
        // el.textContent = "hi , mini-vue"
        // el.setAttribute("id", "root")
        // document.body.append(el)
        // 这里的 vnode -> element -> div
        // 自定义渲染器
        // 修改一 hostCreateElement
        // canvas 是 new Element()
        // const el = vnode.el = document.createElement(vnode.type)
        const el = vnode.el = hostCreateElement(vnode.type);
        const { children, shapeFlag } = vnode;
        if (shapeFlag & 4 /* TEXT_CHILDREN */) {
            el.textContent = children;
        }
        else if (shapeFlag & 8 /* ARRAY_CHILDREN */) {
            mountChildren(children, el, parentComponent, anchor);
        }
        // 修改二 hostPatchProp
        // props
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            // onClick 、 onMouseenter 等等这些的共同特征
            // 以 on 开头 + 一个大写字母
            // if (isOn(key)) {
            //   const event = key.slice(2).toLowerCase()
            //   el.addEventListener(event, val);
            // } else {
            //   el.setAttribute(key, val)
            // }
            hostPatchProp(el, key, null, val);
        }
        // 修改三 canvas 添加元素
        // el.x = 10
        // container.append(el)
        // canvas 中添加元素是 addChild()
        // container.append(el)
        hostInsert(el, container, anchor);
    }
    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor);
        });
    }
    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 将 effect 放在 instance 实例身上
        instance.update = effect(() => {
            if (!instance.isMount) {
                console.log('init');
                const { proxy } = instance;
                // 虚拟节点树
                // 一开始是创建在 instance 上
                // 在这里就绑定 this
                const subTree = instance.subTree = instance.render.call(proxy);
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance, null);
                // 所有的 element -> mount
                initialVNode.el = subTree.el;
                instance.isMount = true;
            }
            else {
                console.log('update');
                // next 是下一个 要更新的 vnode 是老的
                const { next, vnode } = instance;
                if (next) {
                    next.el = vnode.el;
                    updateComponentPreRender(instance, next);
                }
                const { proxy } = instance;
                // 当前的虚拟节点树
                const subTree = instance.render.call(proxy);
                // 老的虚拟节点树
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                patch(prevSubTree, subTree, container, instance, anchor);
            }
        });
    }
    function processFragment(n1, n2, container, parentComponent, anchor) {
        // 此时，拿出 vnode 中的 children
        mountChildren(n2.children, container, parentComponent, anchor);
    }
    function processText(n1, n2, container) {
        // console.log(vnode);
        // 文本内容 在 children 中
        const { children } = n2;
        // 创建文本节点
        const textNode = n2.el = document.createTextNode(children);
        // 挂载到容器中
        container.append(textNode);
    }
    //  为了让用户又能直接使用 createApp 所以导出一个 createApp
    return {
        createApp: createAppAPI(render)
    };
}
function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    // 然后就是更新 props
    // 这里只是简单的赋值
    instance.props = nextVNode.props;
}
function getSequence(arr) {
    const p = arr.slice();
    const result = [0];
    let i, j, u, v, c;
    const len = arr.length;
    for (i = 0; i < len; i++) {
        const arrI = arr[i];
        if (arrI !== 0) {
            j = result[result.length - 1];
            if (arr[j] < arrI) {
                p[i] = j;
                result.push(i);
                continue;
            }
            u = 0;
            v = result.length - 1;
            while (u < v) {
                c = (u + v) >> 1;
                if (arr[result[c]] < arrI) {
                    u = c + 1;
                }
                else {
                    v = c;
                }
            }
            if (arrI < arr[result[u]]) {
                if (u > 0) {
                    p[i] = result[u - 1];
                }
                result[u] = i;
            }
        }
    }
    u = result.length;
    v = result[u - 1];
    while (u-- > 0) {
        result[u] = v;
        v = p[v];
    }
    return result;
}

function createElement(type) {
    return document.createElement(type);
}
function patchProp(el, key, prevVal, nextVal) {
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    }
    else {
        if (nextVal === undefined || nextVal === null) {
            el.removeAttribute(key);
        }
        else {
            el.setAttribute(key, nextVal);
        }
    }
}
function insert(child, parent, anchor) {
    // insertBefore 是把指定的元素添加到指定的位置
    // 如果没有传入 anchor 那就相当于 append(child)
    parent.insertBefore(child, anchor || null);
}
function remove(child) {
    // 拿到父级节点 然后删除子节点
    // 调用原生 dom 删除节点
    const parent = child.parentNode;
    if (parent) {
        parent.removeChild(child);
    }
}
function setElementText(el, text) {
    el.textContent = text;
}
// 调用 renderer.ts 中的 createRenderer
const renderer = createRenderer({
    createElement,
    patchProp,
    insert,
    remove,
    setElementText
});
// 这样用户就可以正常的使用 createApp 了
function createApp(...args) {
    return renderer.createApp(...args);
}

exports.computed = computed;
exports.createApp = createApp;
exports.createRenderer = createRenderer;
exports.createTextVNode = createTextVNode;
exports.effect = effect;
exports.getCurrentInstance = getCurrentInstance;
exports.h = h;
exports.inject = inject;
exports.isProxy = isProxy;
exports.isReactive = isReactive;
exports.isReadonly = isReadonly;
exports.isRef = isRef;
exports.provide = provide;
exports.proxyRefs = proxyRefs;
exports.reactive = reactive;
exports.readonly = readonly;
exports.ref = ref;
exports.renderSlots = renderSlots;
exports.shallowReadonly = shallowReadonly;
exports.stop = stop;
exports.unRef = unRef;
