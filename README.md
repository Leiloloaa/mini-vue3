# mini-vue3

##  单元测试方法

TDD 测试驱动开发

TDD(Test-Driven Development)TDD是一个开发测试代码和业务代码的工作流程，基于这个流程你可以写出具有极高测试覆盖率（通常接近90%）的代码。TDD还可以减少测试中发现比较难以定位的BUG的可能性。TDD的一般过程是：写一个测试运行这个测试，看到预期的失败编写尽可能少的业务代码，让测试通过重构代码不断重复以上过程

BDD 行为驱动开发
BDD(Behavior-Driven Development)
BDD解决的一个关键问题就是如何定义TDD或单元测试过程中的细节。一些不良的单元测试的一个常见问题是过于依赖被测试功能的实现逻辑。这通常意味着如果你要修改实现逻辑，即使输入输出没有变，通常也需要去更新测试代码。这就造成了一个问题，让开发人员对测试代码的维护感觉乏味和厌烦。BDD则通过向你展示如何测试来解决这个问题，你不需要再面向实现细节设计测试，取而代之的是面向行为来测试。

## 实现 effect 中的 track 和 trigger

```ts
// effect.spec.ts
it('effect', () => {
    // reactive 核心
    // get 收集依赖
    // set 触发依赖
    const user = reactive({
      age: 10
    })

    let nextAge
    effect(() => {
      nextAge = user.age + 1
    })
    expect(nextAge).toBe(11)

    // update
    user.age++
    expect(nextAge).toBe(12)
});

// effect.ts
let activeEffect
export class ActiveEffect {
  private _fn: any
  constructor(fn) {
    this._fn = fn
  }
  run() {
    activeEffect = this
    this._fn()
  }
}

const targetsMap = new Map()
export function track(target, key) {
  // 收集依赖
  // reactive 传入的是一个对象 {}
  // 收集关系： targetsMap 收集所有依赖 然后 每一个 {} 作为一个 depsMap
  // 再把 {} 里面的每一个变量作为 dep(set 结构) 的 key 存放所有的 fn
  let depsMap = targetsMap.get(target)
  // 不存在的时候 要先初始化
  if (!depsMap) {
    depsMap = new Map()
    targetsMap.set(target, depsMap)
  }
  let dep = depsMap.get(key)
  if (!dep) {
    dep = new Set()
    depsMap.set(key, dep)
  }

  // 要存入的是一个 fn
  // 所以要利用一个全局变量
  dep.add(activeEffect)
}

export function trigger(target, key) {
  // 触发依赖
  let depsMap = targetsMap.get(target)
  let dep = depsMap.get(key)
  for (const effect of dep) {
    effect.run()
  }
}

export function effect(fn) {
  const _effect = new ActiveEffect(fn)
  _effect.run()
}
```

## 实现 effect 中的返回的 runner、scheduler、stop 和 onStop 功能

**具体作用**：还是未知，随着深入，要联想到为什么要这么做，有什么好处？

### runner

**目的**：effect 中的 fn 返回变量或者函数

```ts
class ReactiveEffect {
   run() {
    activeEffect = this
    return this._fn()
  }
}

export function effect(fn) {
  // ReactiveEffect 构造函数（一定要用 new 关键字实现）
  const _effect = new ReactiveEffect(fn)

  _effect.run()

  // 要考虑 this 的问题 所以要使用 bind
  const runner: any = _effect.run.bind(_effect)
  // 保存
  runner.effect = _effect

  return runner
}
```

### scheduler

scheduler 的实现逻辑

1、当响应式对象第一次发生改变的时候，会执行 fn，scheduler 不会执行
2、第二次发生改变的时候，会执行性 scheduler，赋值 run 方法
3、调用 run 方法的时候，才会执行 fn

一开始不会被调用 scheduler 函数
因为 effect 中一开始是执行的是 run 方法
只有当 trigger 触发更新依赖的时候，有 scheduler 才执行

```ts
class ReactiveEffect {
  private _fn: any
  deps = []
  scheduler: Function | undefined
  constructor(fn, scheduler?: Function) {
    this._fn = fn
    // 这样实例就会有 scheduler 函数
    this.scheduler = scheduler
  }
}

type effectOptions = {
  scheduler?: Function;
  onStop?: Function;
};

// 先在 effect 中传入实例中
export function effect(fn, options: effectOptions = {}) {
  // ReactiveEffect 构造函数（一定要用 new 关键字实现）
  const _effect = new ReactiveEffect(fn, options.scheduler)
  // 考虑到后面还会有很多 options
  // 使用 Object.assign() 方法自动合并
  // _effect.onStop = options.onStop
  // Object.assign(_effect, options);
  // extend 扩展 更有可读性
  extend(_effect, options)
  _effect.run()

  const runner: any = _effect.run.bind(_effect)
  // 保存
  runner.effect = _effect

  return runner
}
```

### stop 和 onStop

使用 stop 之前，要先复习收集依赖的过程，因为 stop 是要通过 effect 去删除 deps。更新是不让它更新 fn

```ts
export function stop(runner) {
  // stop 的意义 是找要到这个实例 然后删除
  runner.effect.stop()
}

// 首先在 effect 内部 保存 runner 函数保存实例
export function effect(fn, options: effectOptions = {}) {
  // ReactiveEffect 构造函数（一定要用 new 关键字实现）
  const _effect = new ReactiveEffect(fn, options.scheduler)
  // 考虑到后面还会有很多 options
  // 使用 Object.assign() 方法自动合并
  // _effect.onStop = options.onStop
  // Object.assign(_effect, options);
  // extend 扩展 更有可读性
  extend(_effect, options)
  _effect.run()

  const runner: any = _effect.run.bind(_effect)
  // 保存
  runner.effect = _effect

  return runner
}

// 在构造函数中实现 stop 方法
class ReactiveEffect {
  private _fn: any
  deps = []
  scheduler: Function | undefined
  active = true
  onStop?: () => void
  constructor(fn, scheduler?: Function) {
    this._fn = fn
    this.scheduler = scheduler
  }
  run() {
    activeEffect = this
    return this._fn()
  }
  stop() {
    // 性能问题
    // 第一次调用 就已经清空了
    if (this.active) {
      cleanupEffect(this)
      if (this.onStop) {
        this.onStop()
      }
      this.active = false
    }
  }
}

// 为什么需要 cleanupEffect 方法
// 单测的步骤
// 编写单测
// 实现单测
// 优化代码
function cleanupEffect(effect) {
  effect.deps.forEach((dep: any) => {
    dep.delete(effect)
  });
}
```

## isReactive、isReadonly、isProxy、isRef、unRef

- isReactive
- isReadonly
- isProxy
- isRef
- unRef

### isReactive

> 判断是否是 isReactive 响应式对象

```js
export function isReactive(value) {
  // !! 感叹号 可以去除 undefined 的情况
  return !!value[ReactiveFlags.IS_REACTIVE]
}
```

- 只需要调用 value 的 get 方法，如果是响应式变量，那么返回一个 true；
- 如果不是 响应式变量，那么 value 身上就没有 ReactiveFlags.IS_REACTIVE 这个属性，就会使 undefined
  - 使用 !! 双感叹号转换

### isReadonly

> 判断是否是 readonly 只读属性

```js
export function isReadonly(value) {
  return !!value[ReactiveFlags.IS_READONLY]
}
```

原理同上，在 get 中返回 true

### isProxy

> 语法糖，内部还是靠前面两个实现的

```js
export function isProxy(value) {
  return isReactive(value) || isReadonly(value)
}
```

### isRef

> 判断是否是 ref 响应式变量

```js
// 创建这个 实例 的时候，__v_isRef 为 true
class RefImpl {
  public __v_isRef = true
}

// 判断这个实例上 挂载的 __v_isRef 属性
export function isRef(ref) {
  return !!ref.__v_isRef
}
```

### unRef

> 语法糖

```js
export function unRef(ref) {
  return isRef(ref) ? ref.value : ref
}
```

如果是 ref 类型，那么就返回 value 值，否则返回本身

## 实现 ref、proxyRefs、computed

### ref

**为什么要 .value?**

ref 一般声明的是变量 get 的时候 要调用 get value 方法 拿值

**为什么 reactive 定义的 不要**

reactive 声明的是对象 对象的 get 方法 参数是 target 和 key，target[key] 就是值

**实现**

都是 返回一个 class 类，然后再在这个类中添加属性

```ts
export function ref(value) {
  return new RefImpl(value)
}

class RefImpl {
  private _value: any
  dep
  private _rawValue: any;
  public __v_isRef = true
  constructor(value) {
    // 保留转换前的值
    this._rawValue = value
    this._value = convert(value)
    this.dep = new Set()
  }

  get value() {
    // 收集依赖
    trackRefValue(this)
    return this._value
  }

  set value(newValue) {
    if (hasChanged(newValue, this._rawValue)) {
      this._rawValue = newValue
      this._value = convert(newValue)
      // 触发依赖
      triggerEffects(this.dep)
    }
  }
}

function convert(value) {
  return isObject(value) ? reactive(value) : value
}

function trackRefValue(ref) {
  if (isTracking()) {
    trackEffects(ref.dep);
  }
}
```

### proxyRefs

**具体的作用**

在 template 中，自动拆箱，不用使用 .value 来获取值。内部的 get 方法是使用了 unRef 语法糖，如果是 ref 类型那么返回 .value 值，否则返回本身。

```ts
// 代理对象的属性 是 ref
// proxyRefs 是帮我们在 template 中做了 ref 的拆箱处理
// 不用加上 .value 内部使用了 unRef 语法糖
export function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // 如果是 ref 类型 就返回 .value 值 否则返回本身
      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      // 这个属性是 ref 并且新值不是 ref
      if (isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        return Reflect.set(target, key, value)
      }
    }
  })
}
```

### computed

computed 是计算属性，接收一个函数。具有懒加载属性，只有当依赖的响应式值发生改变的时候，才会触发更新。get value 中是通过实例的 dirty 属性来判断的。

```ts
class ComputedRefImpl {
  private _getter: any
  private _dirty: any = true
  private _value: any
  private _effect: ReactiveEffect
  constructor(getter) {
    this._getter = getter
    this._effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
      }
    })
  }

  get value() {
    // 要有个值来开关
    // 如果依赖的响应式发生了修改 那么这个值就得修改
    // this._dirty 就要为 true
    if (this._dirty) {
      this._value = this._effect.run()
      this._dirty = false
    }
    return this._value
  }
}

export function computed(getter) {
  return new ComputedRefImpl(getter)
}
```

## 实现 proxy 代理组件实例

**目的**

- 在 render 函数 中可以使用 setup 返回的值
- 方便用户使用 $el、$data 等获取组件实例或是 data 中的数据

**实现原理**

- 将 setup 的返回的值绑定到 render 函数
- 使用 proxy 放回实例

```js
// one
// component.js
// 在调用 setup 之前 在 instance 上 绑定 proxy
function setupStatefulComponent(instance) {
  const Component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles)
  const { setup } = Component

  if (setup) {
    const setupResult = setup()
    handleSetupResult(instance, setupResult)
  }
}
// componentPublicInstance.js
// 使用 map 集中管理 减少 if 的判断
const publicPropertiesMap = {
  $el: (i) => i.vnode.el
}

export const PublicInstanceProxyHandles = {
  get({ _: instance }, key) {
    // setupState 就是 setup 的返回值
    const { setupState } = instance
    if (Reflect.has(setupState, key)) {
      return setupState[key]
    }

    // key -> $el 或 $data 等
    // 使用 map
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  }
};

// two
// renderer.js
// 在 render 调用的地方 绑定 proxy
// 并且将 el 对象实例 保存
function setupRenderEffect(instance: any, initialVNode, container: any) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy)
  // 在子树初始化 patch 之后 将 el 保存
  patch(subTree, container)
  initialVNode.el = subTree.el
}
function mountElement(...){
  const el = vnode.el = document.createElement(vnode.type)
  ...
}
```

## 实现 shapeFlags

**作用**

> 类型判断；如果使用 object -> key 的方式，不是高效率；使用 位运算 直接把效率拉满

```js
// shapeFlag.ts
// 修改 左移 乘以2 右移 除以2
export const enum ShapeFlags {
  ELEMENT = 1,// 0001
  STATEFUL_COMPONENT = 1 << 1,// 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
};

// patch.js
function patch(vnode: any, container: any) {
  const { shapeFlag } = vnode
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container)
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

// vnode.js
export function createVNode(type, props?, children?) {
  const vnode = {
    type,
    props,
    children,
    shapeFlag: getShapeFlag(type),
    el: null
  }

  // children
  if (isString(children)) {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  return vnode
}

function getShapeFlag(type) {
  return isString(type) ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}
```

## 实现注册事件功能

```js
// App.js
render() {
      window.self = this;
      // ui
      return h(
          'div', {
              id: 'root',
              class: ['red', 'hard'],
              onClick() {
                  console.log('click');
              },
              onMousedown() {
                  console.log('onmousedown');
              }
          }
      );
  },
```

传入的事件是形式 on + 大写开头的事件

挂载 element 的时候，判断 props 的这个 key 是否是以 on 开头，然后再注册事件

```js
// renderer.ts
function mountElement(vnode: any, container: any) {
  const el = vnode.el = document.createElement(vnode.type)
  // children
  const { children, shapeFlag } = vnode
  // 可能是 string 也可能是 array
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el)
  }

  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    // 具体 click -> 通用
    // on + Event name
    // onMousedown
    if (isOn(key)) {
      const event = key.slice(2).toLocaleLowerCase()
      el.addEventListener(event, val);
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}
```

## 实现 props

**要点**

- setup 中传入 props
- render 函数中能直接通过 this.xxx 来调用 props 的值
- props 是 shallowReadonly 类型

**根据要素一一实现**

```js
// 找到调用 setup 的地方 setupStatefulComponent
// component.ts
export function setupComponent(instance) {
  initProps(instance, instance.vnode.props)
  // TODO
  // initSlots

  setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
  const Component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles)
  const { setup } = Component

  if (setup) {
    // 传入 实例的 props
    const setupResult = setup(shallowReadonly(instance.props))
    handleSetupResult(instance, setupResult)
  }
}

// componentProps.ts
export function initProps(instance, rawProps) {
  instance.props = rawProps || {}
  // attrs
}
```

## 实现 emit

> emit 是子组件调用父组件中的方法

**形式**

> emit 是 setup 函数中第二个对象参数

```ts
export const Foo = {
    setup(props, { emit }) {
        const emitAdd = () => {
            emit('add', 1, 2);
            emit('add-foo', 3, 4);
        };
        return { emitAdd };
    },
    render() {
        const btn = h(
            'button', {
                onClick: this.emitAdd
            },
            'emitAdd'
        );
        const foo = h('p', {}, 'foo');
        return h('div', {}, [foo, btn]);
    }
};
```

**实现**

```ts
// component.js
export function createComponentInstance(vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    emit: () => { }
  }

  // TODO 为什么？？？
  component.emit = emit.bind(null, component) as any
  return component
}

function setupStatefulComponent(instance) {
  const Component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles)
  const { setup } = Component

  if (setup) {
    const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
    handleSetupResult(instance, setupResult)
  }
}

// componentEmit.ts
export function emit(instance, event, ...args) {
  // instance.props -> event
  const { props } = instance

  // TPP
  // 先去写一个 特定 的行为 -> 重构成通用的行为
  // add -> Add
  // add-foo -> AddFoo
  // const camelize = (str) => {
  //   (str).replace(/-(\w)/g, (_, c: string) => {
  //     return c ? c.toUpperCase() : ''
  //   })
  // }

  // const capitalize = (str) => {
  //   return str.charAt(0).toUpperCase() + str.slice(1)
  // }

  // const toHandlerKey = (str) => {
  //   return str ? "on" + capitalize(str) : ''
  // }

  const handler = props[toHandlerKey(camelize(event))]

  handler && handler(...args)
}
```

## 实现 slot 插槽

**slot 用法**

```vue
// 1、普通用法
// 子组件中要使用 slot，才会显示 p
// Children.vue
<template>
  <slot></slot>
  <h1>我是子组件</h1>
</template>

// Parent.vue
<Children><p>我是插槽部分<p></Children>

// 2、具名插槽
// 在 子组件中 给插槽增加 name
// 父组件 通过 v-slot 传入
// Children.vue
<template>
  <slot name="header"></slot>
  <h1>我是子组件</h1>
  <slot name="footer"></slot>
</template>

// Parent.vue
<Children>
  <template v-slot:header>我是头部</template>
  <template v-slot:footer>我是尾部</template>
</Children>

// 3、作用域插槽
// 能使用子组件中的变量
// Children.vue
<slot v-bind:str="data">{{ data.msg }}</slot>
const data = reactive({ msg: 123, msg2: 456 });

// Parent.vue
<Children><template v-slot:default="slotProps">{{ slotProps.str.msg2 }}</template></Children>
```

咱们知道用法后，就往下关注实现的原理

### 普通用法实现原理

```js
// App.js render 函数
const app = h('div', {}, 'App');
// 原先是 h(Foo) 在 children 中添加了一个 p 标签
const foo = h(Foo, {}, h('p', {}, '123'));
return h('div', {}, [app, foo]);
// Foo.js render 函数
// 渲染 children 的时候 里面必须是 vnode
// 如果是数组需要转换
// 粗暴处理 能实现
// return h('div', {}, [foo, h('div', {}, this.$slots)]);

// 实现 this.$slots 这是提供给用户的
// 修改 componentPublicInstance.ts
const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots
}

// 创建组件实例时 添加 slots
const component = {
  vnode,
  type: vnode.type,
  setupState: {},
  props: {},
  slots: {},
  emit: () => { }
}

// 如果传入的是一个数组
// App.js
// const foo = h(Foo, {}, [h('p', {}, '123'), h('p', {}, '456')]);
// 换成单个值后 又不能渲染了 在 renderSlots 函数中修改
// return Array.isArray(slots) ? createVNode("div", {}, slots) : slots
// 最终的办法是在初始化的时候 将 children 转换成数组
// !! 普通使用
// const foo = h(Foo, {}, h('p', {}, '123'));
// return h('div', {}, [app, foo]);

// 优化 创建 renderSlots.ts
export function renderSlots(slots, name, props) {
  return createVNode("div", {}, slot(props))
}

// 初始化 slots componentSlots.ts
export function initSlots(instance, children) {
  // children is vnode
  // instance.slots = children

  // children is array
  instance.slots = Array.isArray(children) ? children : [children]
}
```

### 具名插槽实现原理

```js
// App.js
// object key
// 从 array -> object
const foo = h(
    Foo, {}, {
        header: h('p', {}, '123'),
        footer: h('p', {}, '456')
    }
);

// Foo.js
// 获取到要渲染的元素、
// 获取到渲染的位置
return h('div', {}, [
    renderSlots(this.$slots, 'header'),
    foo,
    renderSlots(this.$slots, 'footer')
]);

// 修改 renderSlots
export function renderSlots(slots, name, ) {
  const slot = slots[name]
  if (slot) {
      return createVNode("div", {}, slot)
  }
}
```

### 作用域插槽实现原理

```js
// App.js
// 这个 age 是 Foo 组件内部的插槽
// 变成一个 fn 然后传入值
const foo = h(
    Foo, {}, {
        // 解构 age 因为 传进来的是个 对象
        header: ({ age }) => h('p', {}, '123，年龄' + age),
        footer: () => h('p', {}, '456')
    }
);
return h('div', {}, [app, foo]);

// Foo.js
// 意思是将 Foo 组件中的变量传出去
const age = 18;
return h('div', {}, [
    renderSlots(this.$slots, 'header', { age }),
    foo,
    renderSlots(this.$slots, 'footer')
]);

// 修改 renderSlots
import { createVNode } from "../vnode";

export function renderSlots(slots, name, props) {

  const slot = slots[name]

  if (slot) {
    if (typeof slot === 'function') {
      // 直接调用
      return createVNode("div", {}, slot(props))
    }
  }
}

// 修改初始化 slots
import { ShapeFlags } from "../shared/shapeFlag";

export function initSlots(instance, children) {
    normalizeObjectSlots(children, instance.slots)
}

function normalizeObjectSlots(children, slots) {
  for (const key in children) {
    const value = children[key];
    // slots[key] = Array.isArray(value) ? value : [value]   
    // slots[key] = normalizeSlotValue(value)
    // 修改 当 是一个 函数的时候 直接调用
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}
```

### 优化初始化 slots 过程

```js
// componentSlots.ts
// 优化 并不是所有的 children 都有 slots
// 通过 位运算 来处理
const { vnode } = instance
if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
  normalizeObjectSlots(children, instance.slots)
}

// 再修改 vnode.ts
// 组件类型 + children 是 object 就有 slot
if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
  if (isObject(children)) {
    vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
  }
}

// 添加 SLOT_CHILDREN
export const enum ShapeFlags {
  ELEMENT = 1,// 0001
  STATEFUL_COMPONENT = 1 << 1,// 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
  SLOT_CHILDREN = 1 << 4, // 10000
};
```

## 实现 Fragment 和 TextNode

```js
// vnode.ts Symbol 变量
export const Fragment = Symbol('Fragment');
export const Text = Symbol('Text');
```

**实现 Fragment**

上回说到，咱们为了实现 children 是数组的情况，在 renderSlots 中 创建虚拟 dom 的时候，手动添加了 div 作为 component，然后再去遍历其 children。显然这是不可行的。通过关键字 Fragment 去直接 mountChildren （遍历其子元素）

```js
// 修改 renderSlots.ts
export function renderSlots(slots, name, props) {

  const slot = slots[name]

  if (slot) {
    if (typeof slot === 'function') {
      // 直接调用
      // 实际上这种写法会多了一个 div
      // 我们通过一个 Fragment 来判断，然后直接 遍历 children
      return createVNode(Fragment, {}, slot(props))
    }
  }
}

// 修改 renderer.ts 中的 patch 方法
// 可能之后会有很多 type 类型 所以用 switch 进行选择
function patch(vnode: any, container: any) {
  const { type, shapeFlag } = vnode
  switch (type) {
    case Fragment:
      processFragment(vnode, container)
      break;
    default:
      // 通过 vnode.type 的类型判断
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container)
      }
      break;
  }
}

function processFragment(vnode: any, container: any) {
  // 通过 mountChildren 去依次遍历
  mountChildren(vnode, container)
}

function mountChildren(vnode: any, container: any) {
  vnode.children.forEach((v) => {
    patch(v, container)
  });
}
```

**实现静态文本节点**

如果是 text 是静态节点，外层是不用任何标签的，直接通过 document.createTextNode('text') 创建，再添加到 container 中

```js
// App.js
const foo = h(
        Foo, {}, {
            // 解构 age 因为 传进来的是个 对象
            header: ({ age }) => [
                h('p', {}, '123，年龄' + age),
                createTextVNode('你好啊！')
            ],
            footer: () => h('p', {}, '456')
        }
    );

// 修改 vnode.ts 增加 createTextVNode
export function createTextVNode(text: string) {
  return createVNode(Text, {}, text)
}

// 修改 renderer.ts 中的 patch 方法
function patch(vnode: any, container: any) {
  const { type, shapeFlag } = vnode
  switch (type) {
    case Fragment:
      processFragment(vnode, container)
      break;
    case Text:
      processText(vnode, container)
      break;
    default:
      // 通过 vnode.type 的类型判断
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container)
      }
      break;
  }
}

function processText(vnode: any, container: any) {
  // 挂载 text 静态文本 vnode.children
  // console.log(vnode.children);
  const { children } = vnode
  const textNode = vnode.el = document.createTextNode(children)
  container.append(textNode)
}
```

## 实现 getCurrentInstance

**用法**

getCurrentInstance 允许访问内部组件实例

```ts
import { getCurrentInstance } from 'vue'

const MyComponent = {
  setup() {
    const internalInstance = getCurrentInstance()

    internalInstance.appContext.config.globalProperties // access to globalProperties
  }
}
```

**实现**

- 在 setup 函数内，找到 setup 调用的地方
- 调用 getCurrentInstance 是返回一个实例对象，创建一个全局的变量临时保存
- 每个组件的实例对象都不同

```ts
// 在 component.ts 中创建函数
// 因为是与组件有关 所以在 components.ts 中
let currentInstance = null
export function getCurrentInstance() {
  return currentInstance
}

function setupStatefulComponent(instance) {
  const Component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles)
  const { setup } = Component

  if (setup) {
    // 赋值
    currentInstance = instance
    const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
    // 还原
    currentInstance = null
    handleSetupResult(instance, setupResult)
  }
}
```

如果是 直接赋值 这样组件一多 调试时 就可能不清楚谁修改的，改成函数的话，就知道调用来源是谁了！

```ts
function setupStatefulComponent(instance) {
  const Component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandles)
  const { setup } = Component

  if (setup) {
    // 赋值
    setCurrentInstance(instance)
    const setupResult = setup(shallowReadonly(instance.props), { emit: instance.emit })
    // 还原
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

function setCurrentInstance(value){
   currentInstance = value
}
```

## 实现 provide/inject 功能

**用法**

provide/inject 是提供了多层级的通信方式，祖孙隔层级传递。

**实现**

```js
// component.ts
// 实例上保存数据
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {},
    props: {},
    slots: {},
    provides: parent ? parent.provides : {}, // 一开始是初始化，然后父级存在，就是取父级的
    parent, // 存储父级component
    emit: () => { }
  }

  component.emit = emit.bind(null, component) as any
  return component
}

// 新增 apiInject.ts
import { getCurrentInstance } from "./component";

// provide-inject 提供了组件之间跨层级传递数据 父子、祖孙 等
export function provide(key, value) {
  // 存储
  // 想一下，数据应该存在哪里？
  // 如果是存在 最外层的 component 中，里面组件都可以访问到了
  // 接着就要获取组件实例 使用 getCurrentInstance，所以 provide 只能在 setup 中使用
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    let { provides } = currentInstance
    const parentProvides = currentInstance.parent.provides
    // 如果当前组件的 provides 等于 父级组件的 provides
    // 是要 通过 原型链 的方式 去查找
    // Object.create() 方法创建一个新对象，使用现有的对象来提供新创建的对象的 __proto__
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }
    provides[key] = value
  }
}

export function inject(key, defaultValue: any) {
  // 取出
  // 从哪里取？若是 祖 -> 孙，要获取哪里的？？
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides
    if (key in parentProvides) {
      return parentProvides[key]
    } else if (defaultValue) {
      if (typeof defaultValue === 'function') {
        return defaultValue()
      }
      return defaultValue
    }
  }
  return currentInstance.provides[key]
}
```

## 实现自定义渲染器 customRenderer

**如果一个框架想要实现实现跨端的功能，那么渲染器本身不能依赖任何平台下特有的接口**

**要点**

- 实现自定义渲染器的要素就是能够接收不同平台的创建元素
- 在 mountElement 方法中就不能写死了
- 用户还需要调用 render 的话，就返回一个 createApp
- 在 runtime-dom index.ts 中提供用户可传的参数 和 默认的参数

**步骤**

```ts
// 修改 renderer.ts 文件
// 使用闭包 createRenderer 函数 包裹所有的函数
export function createRenderer(options) {
  const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options
  // ...
  function mountElement(vnode: any, container: any, parentComponent) {
    // const el = vnode.el = document.createElement(vnode.type)
    // canvas
    // new Element()
    const el = (vnode.el = hostCreateElement(vnode.type));
    // children
    const { children, shapeFlag } = vnode
    // 可能是 string 也可能是 array
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode, el, parentComponent)
    }
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      // 具体 click -> 通用
      // on + Event name
      // onMousedown
      // if (isOn(key)) {
      //   const event = key.slice(2).toLocaleLowerCase()
      //   el.addEventListener(event, val);
      // } else {
      //   el.setAttribute(key, val)
      // }
      hostPatchProp(el, key, val);
    }
    // canvas 添加元素
    // el.x = 10
    // container.append(el)
    // canvas 中添加元素是 addChild()
    hostInsert(el, container);
  }
  // ...
}
```

```ts
// 修改 createApp.ts
// 因为 render 函数被包裹了所以 调用 createApp 的时候要传入 render
import { createVNode } from "./vnode"

// 创建组件实例
export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      // mount 是起到 挂载的作用
      mount(rootContainer) {
        // 创建虚拟 dom
        const vnode = createVNode(rootComponent)
        // 然后再通过 render 函数渲染
        render(vnode, rootContainer)
      }
    }
  }
}

// renderer.ts
export function createRenderer(options) {
  // ...
  return {
    createApp: createAppAPI(render)
  }
}
```

**重点步骤**

```ts
// 新增 runtime-dom index.ts 文件
import { createRenderer } from "..";
import { isOn } from "../shared";

function createElement(type) {
  return document.createElement(type)
}

function patchProp(el, key, val) {
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, val);
  } else {
    el.setAttribute(key, val)
  }
}

function insert(el, parent) {
  parent.append(el)
}

// 调用 renderer.ts 中的 createRenderer
// 可以自行传入，有默认值
const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert
})

// 这样用户就可以正常的使用 createApp 了
export function createApp(...args) {
  return renderer.createApp(...args)
}

// 并且让 runtime-core 作为 runtime-dom 的子级
export * from '../runtime-core';
```

## 更新逻辑

```ts
// reactivity index 导出 ref
export { ref, proxyRefs } from './ref';
// 项目入口 ./src/index.ts 导出
export * from "./reactivity"
```

然后结合例子 就能 将例子运行起来了 然后还需要 处理 setup 返回得值 拆箱

```ts
// runtime-core component.ts
function handleSetupResult(instance: any, setupResult: any) {
  // TODO function
  if (isObject(setupResult)) {
    // 拆箱
    instance.setupState = proxyRefs(setupResult)
  }
  finishComponentSetup(instance)
}
```

页面能正常显示了 就要修改 patch 逻辑

```ts
// 修改 patch 逻辑
// 再增加其它几个函数的参数 初始就传 null
function patch(n1, n2, container: any, parentComponent) {
  const { type, shapeFlag } = n2
  switch (type) {
    case Fragment:
      processFragment(n1, n2, container, parentComponent)
      break;
    case Text:
      processText(n1, n2, container)
      break;
    default:
      // 通过 vnode.type 的类型判断
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, parentComponent)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container, parentComponent)
      }
      break;
  }
}

// 修改 processElement
function processElement(n1, n2: any, container: any, parentComponent) {
  if (!n1) {
    mountElement(n2, container, parentComponent);
  } else {
    patchElement(n1, n2, container);
  }
}
```

使用 effect 让其变成响应式 并且增加一个变量 表示是否为初始

```ts
// 修改 renderer.ts 中的 setupRenderEffect 函数
function setupRenderEffect(instance: any, initialVNode, container: any) {
  effect(() => {
    // 是否为 init
    if (!instance.isMounted) {
      console.log("init");
      const { proxy } = instance;
      const subTree = (instance.subTree = instance.render.call(proxy));

      patch(null, subTree, container, instance);

      initialVNode.el = subTree.el;

      instance.isMounted = true;
    } else {
      console.log("update");
      const { proxy } = instance;
      const subTree = instance.render.call(proxy);
      const prevSubTree = instance.subTree;
      instance.subTree = subTree;

      patch(prevSubTree, subTree, container, instance);
    }
  });
}
```

修改 tsconfig.json => "target": "es2016" 如果是 es5 for of 方法就会有问题，断点调试后 发现不会进入这个 for 循环

```ts
export function triggerEffects(dep) {
  // debugger
  // es5 模式下 不会进来
  // 要修改 tsconfig.json 文件 改为 es2016
  for (const effect of dep) {
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
```

## 更新 element 的 props

![](http://66.152.176.25:8000/home/images/diff/props.png)

**常见的更新 props 逻辑**

1、old value 值 改变了，就需要复用节点，只改变值
2、props 变为 null 或者是 undefined，就是删除
3、如果 props 中的属性不存在了，就直接移除

```ts
// 首先因为每次修改 响应式都会处理 element
// 在 processElement 的时候就会判断
// 如果是传入的 n1 存在 那就是新建 否则是更新
// 更新 patchElement 又得进行两个节点的对比
function processElement(n1, n2: any, container: any, parentComponent) {
  // 如果 n1 不存在就是新建 否则是更新
  if (!n1) {
    mountElement(n2, container, parentComponent);
  } else {
    patchElement(n1, n2, container);
  }
}

function patchElement(n1, n2, container) {
  console.log("n1", n1);
  console.log("n2", n2);

  // 新老节点
  const oldProps = n1.props || {}
  const newProps = n2.props || {}

  // n1 是老的虚拟节点 上有 el 在 mountElement 有赋值
  // 同时 要赋值 到 n2 上面 因为 mountElement 只有初始
  const el = (n2.el = n1.el)

  patchProps(el, oldProps, newProps)
}

// 比较 主要是三种情况
function patchProps(el, oldProps: any, newProps: any) {
  // 比较新老节点 不等于才处理 这属于健壮比较逻辑
  if (oldProps !== newProps) {
    for (const key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]
      // 拿到每一项之后 去比较
      // 首先要拿到 el
      if (prevProp !== nextProp) {
        hostPatchProp(el, key, prevProp, nextProp);
      }
    }

    // 处理 undefined 和 null 的情况
    if (oldProps !== {}) {
      for (const key in oldProps) {
        if (!(key in newProps)) {
          hostPatchProp(el, key, oldProps[key], null)
        }
      }
    }
  }
}
```

然后需要修改 runtime-dom 中的 hostPatchProp

```ts
// 如果不存在就要删除 否则替换 prop
function patchProp(el, key, prevVal, nextVal) {
  if (isOn(key)) {
    const event = key.slice(2).toLocaleLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}
```

## 更新 children 前奏 

![](http://66.152.176.25:8000/home/images/diff/children1.png)

如上图所示，一般有四种情况，前三种比较好处理，最后一种就需要考虑到性能!

**增加 patchChildren 函数**

```ts
function patchChildren(n1, n2, container, parentComponent) {
  // 主要有四种情况
  // text => array
  // array => text
  // text => new text
  // array => new array
  // TODO 通过什么来知道子组件的类型呢？
  // 通过 shapeFlag 可以知道
  const prevShapeFlag = n1.shapeFlag
  const c1 = n1.children
  const { shapeFlag } = n2
  const c2 = n2.children
  // 如果 现在是 text
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 卸载
      unmountChildren(n1.children)
    }
    // 如果内容不等
    if (c1 !== c2) {
      // 渲染接口
      hostSetElementText(container, c2);
    }
  } else {
    // 如果 现在是 array
    if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(container, "");
      mountChildren(c2, container, parentComponent);
    }
  }
}

function unmountChildren(children) {
  for (let i = 0; i < children.length; i++) {
    const el = children[i].el;
    // 移除
    hostRemove(el)
  }
}
```

其中涉及到 卸载组件 unmountChildren 函数、hostSetElementText 渲染函数 这个我们统一放置在 runtime-dom 中、hostRemove 也是一样

**runtime-dom**

```ts
function remove(child) {
  // 拿到父级节点 然后删除子节点
  // 调用原生 dom 删除节点
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}

function setElementText(el, text) {
  el.textContent = text;
}

const renderer: any = createRenderer({
  createElement,
  patchProp,
  insert,
  remove,
  setElementText
})
```

## 双端对比

**举个🌰**

![image.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a7c5ec73ef524371a72f8b5bf96fbd20~tplv-k3u1fbpfcp-watermark.image?)

如图所示，变化无非有以下三种：

- 移动，c、d、e 位置不一样了
- 删除，f 不存在了
- 新增，e 是新加的

那么，我们要怎样确定那些元素变动了呢？又是从哪个元素开始变动的？

**任务拆解**

- 确定左边开始变动的位置 => 左序遍历
- 确定右边开始变动的位置 => 右序遍历

Vue 提供了一种方案 => 双端对比算法，也就是咱们开头说的左右互博，具体的看下图：

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4dde9376a25749be97f8b8770d3d7355~tplv-k3u1fbpfcp-watermark.image?)

三个指针 i、e1、e2，i 表示从左边开始变动的位置，e1 和 e2 分别表示新老节点从右边开始变动的位置。通过循环 new tree 的节点，来确定变动位置，最终我们会得如图所示的结果：

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/de97c29726fb4b3aa651b2b140d8db59~tplv-k3u1fbpfcp-watermark.image?)

接下来，咱们具体的看下左序遍历和右序遍历的实现方式。

### 左序遍历

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b9d16241db4148cf9ec13fa7ed6c6b65~tplv-k3u1fbpfcp-watermark.image?)

咱们的目的是要确定 i 的位置，首先得清楚循环条件，什么时候该退出循环。因为新老节点都是`数组`，所以 `i` 要小于或等于 `e1(老节点的最后一位)` 和 `e2(新节点的最后一位)`，代码如下：

```js
// 比较函数 c1 为老的虚拟节点 c2 为新的虚拟节点
// c 为 children 的简写，e 为 element 的简写
function patchKeyedChildren(c1, c2){
    const len2 = c2.length // 后面多次用到，提取
    // 定义三个指针
    let i = 0  // 从新的节点开始
    let e1 = c1.length - 1 // 老的最后一个 索引值
    let e2 = len2 - 1 // 新的最后一个 索引值
    // 移动 i 指针
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSomeVNodeType(n1, n2)) {
        // ... 在循环的比较此节点内的节点
        // patch
      } else {
        break;
      }
      i++;
    }
    // 粗略的比较，实际对比要更复杂
    function isSomeVNodeType(n1, n2) {
      // 对比节点是否相等 可以通过 type 和 key
      return n1.type === n2.type && n1.key === n2.key
    }
}
```

左序算法，我们主要做了以下几件事：

- 循环 i ，拿到 c1[i] 和 c2[i]
- 如果相等，就继续循环比较，对比到头，全都一样的，就 i++，移动指针
- 如果不相等，就结束比较，停止移动指针

左边变动的位置确定后，接下来就确定右边变动的位置，这就是任务分解。接下来咱们看下右序遍历是如何实现的呢？

### 右序遍历

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/638102b21cde4c3a8057b5045cf9df50~tplv-k3u1fbpfcp-watermark.image?)

咱们从右边开始遍历，那循环条件是什么呢？是不是也只需要 i <= e1 和 i <= e2 就行了呀！i 的位置确定了，临界值无非是 i = e1 或 i = e2 的情况。e1 和 e2 分别是老节点和新节点的最后一个的索引值，实现代码如下：

```js
function patchKeyedChildren(c1, c2){
    const len2 = c2.length 
    let i = 0  // 从新的节点开始
    let e1 = c1.length - 1 // 老的最后一个 索引值
    let e2 = len2 - 1 // 新的最后一个 索引值
    // 左序遍历
    while (i <= e1 && i <= e2) {
      ...
      i++;
    }
    // 右序遍历
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSomeVNodeType(n1, n2)) {
        // ... 在循环的比较此节点内的节点
        // patch
      } else {
        break;
      }
      e1--;
      e2--;
    }
    // 粗略的比较，实际对比要更复杂
    function isSomeVNodeType(n1, n2) {
      // 对比节点是否相等 可以通过 type 和 key
      return n1.type === n2.type && n1.key === n2.key
    }
}
```

细看代码，右序遍历其实就是拿到老节点和新节点的最后一个值对比，相等的话，e1--、e2-- 往前移动，不相等就停止移动。

## diff 处理中间乱序

思考一下，新老节点对比无非是以下三种情况：

- 1、新的比老的长 => 增加
- 2、新的比老的短 => 删除
- 3、新的和老的一样长 => 移动或增加或删除

老的虚拟节点有对应的真实 DOM，也就是已经渲染过的节点。而新的虚拟节点是一个对象，我们需要做的的就是`新老虚拟节点对比`，得出最小的差异，去更新真实的 DOM。

**前情回顾**

- i 表示左序遍历 新节点与老节点对比 变动的位置 初始值为 0
- e1 表示右序遍历 老节点与新节点对比 变动的位置 初始值为 老节点最后一位的索引值
- e2 表示右序遍历 新节点与老节点对比 变动的位置 初始值为 新节点最后一位的索引值

用代码表示

```js
if(i>e1){
  // 新的比老的长
  ...
}else if(i>e2){
  // 新的比老的短
  ...
}else{
  // 一样长
}
```

### 新的虚拟节点比老的虚拟节点长
新的节点更长，需要增加节点，所以循环的条件就是 i > e1 并且 i 是小于或等于 e2。

增加有两种情况，如图所示：

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/10aae6a641f44bd0ac4eb327a16cc900~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5450c68fc0d04077836a48780f395790~tplv-k3u1fbpfcp-watermark.image?)

代码实现：

```js
// c1 是老节点树
// c2 是新节点树 
// len2 = c2.length -1 
if (i > e1) {
  if (i <= e2) {
    // 左侧 可以直接加在末尾
    // 右侧的话 我们就需要引入一个 概念 锚点 的概念
    // 通过 anchor 锚点 我们将新建的元素插入的指定的位置
    const nextPos = e2 + 1
    // 如果 e2 + 1 大于 c2 的 length 那就是最后一个 否则就是最先的元素
    // 锚点是一个 元素
    const anchor = nextPos < len2 ? c2[nextPos].el : null
    while (i <= e2) {
      // 再往深层的比较节点
      // patch
      i++
    }
  }
}
```

### 老的虚拟节点比新的虚拟节点长

老的更长所以是删除节点，循环的条件就是 i <= e1，i 是从左侧开始变动的位置，e1 则是从右侧开始变动的位置。但是也两种情况，如下图所示：

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/257112e6f99a4b31b67c58baf049a96a~tplv-k3u1fbpfcp-watermark.image?)

![image.png](https://p9-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/22ea952ac6194113b6d27d711802a9dc~tplv-k3u1fbpfcp-watermark.image?)

```js
if (i > e2) {
  // 老的比新的多 删除
  // e1 就是 老的 最后一个
  while (i <= e1) {
    // 移除元素
    hostRemove(c1[i].el);
    i++;
  }
} 
```

### 新老节点一样长，处理中间乱序部分

![image.png](https://p6-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4622ce3f2072405c85b848a0feaccc97~tplv-k3u1fbpfcp-watermark.image?)

我们根据这个例子来讨论，是不是只需要删除 e 和增加 y？cd 的位置相对稳定，重复利用即可！

既然两个节点树长度是一样的，我们可以通过遍历老节点，然后同时遍历新节点，检查是否在新的里面存在，此时时间复杂度为 O(n*n)；显然不是最优，为了优化性能，我们可以为新的节点建立一个映射表，只要根据 key 去查是否存在；

如下图，我们得知变动元素在老节点中的索引分别是 c:2 d:3 e:4

![image.png](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d6abdd7677c94492af02dee456d29994~tplv-k3u1fbpfcp-watermark.image?)

```js
let s1 = i // i 是停止的位置 差异开始的地方
let s2 = i
// 建立新节点的映射表
const keyToNewIndexMap = new Map()

// 循环 e2
for (let i = s2; i <= e2; i++) {
  const nextChild = c2[i]; // c2 是新节点
  keyToNewIndexMap.set(nextChild.key, i)
}
```

映射表如下

```js
{
  'y':2,
  'c':3,
  'd':4
}
```

建立完映射表之后，我们在循环 e1（因为 e1 是老节点，我们所有的步骤都是为了减少 dom 的操作，所以我们要对比新老节点，改动其实是在 e1，对照 e2 改 e1），

```js
// 循环 e1
for (let i = s1; i <= e1; i++) {
  const prevChild = c1[i]; // c1 是老节点

  let newIndex // 临时变量索引
  // 这里先只做简单的 key 值判断是否为同一个
  if (prevChild.key !== null) {
    // 用户输入了 key 那么 newIndex 就等于 映射表中 对应的索引值
    newIndex = keyToNewIndexMap.get(prevChild.key)
  } else {
    // 用户没有输入 key
    for (let j = s2; j < e2; j++) {
      if (isSomeVNodeType(prevChild, c2[j])) {
        // 如果相同的话 newIndex 就等于 老节点中的索引值 也就是 此时的 j
        newIndex = j;
        break;
      }
    }
  }
  
  // 上面几行代码所做的事情就是 拿到 新节点 在 老节点 对应的 索引值
  // 有两种情况 undefined 或 有值
  if (newIndex === undefined) {
    // 新节点中不存在老节点的话 就可以直接删除此元素了 
    hostRemove(prevChild.el)
  } else {
      // 存在就在次深层次的比较
      // patch  => prevChild 和 c2[newIndex]
  }
}
```

上方的代码，咱们可以优化一下

```js
// 如果新的节点少于老的节点，当遍历完新的之后，就不需要再遍历了
// 通过一个总数和一个遍历次数 来优化
// 要遍历的数量
const toBePatched = e2 - s2 + 1
// 已经遍历的数量
let patched = 0
// 建立新节点的映射表
const keyToNewIndexMap = new Map()
// 新建一个定长数组(需要变动的长度) 性能是最好的 来确定新老之间索引关系 我们要查到最长递增的子序列 也就是索引值
const newIndexToOldIndexMap = new Array(toBePatched)
// 确定是否需要移动 只要后一个索引值小于前一个 就需要移动
let moved = false
let maxNewIndexSoFar = 0

// 循环 e1
for (let i = s1; i <= e1; i++) {
  const prevChild = c1[i];

  if (patched >= toBePatched) {
    hostRemove(prevChild.el)
    continue
  }

  let newIndex
  if (prevChild.key !== null) {
    // 用户输入 key
    newIndex = keyToNewIndexMap.get(prevChild.key)
  } else {
    // 用户没有输入 key
    for (let j = s2; j < e2; j++) {
      if (isSomeVNodeType(prevChild, c2[j])) {
        newIndex = j;
        break;
      }
    }
  }

  if (newIndex === undefined) {
    hostRemove(prevChild.el)
  } else {
    if (newIndex >= maxNewIndexSoFar) {
      maxNewIndexSoFar = newIndex
    } else {
      moved = true
    }

    // 实际上是等于 i 就可以 因为 0 表示不存在 所以 定义成 i + 1
    newIndexToOldIndexMap[newIndex - s2] = i + 1

    // 存在就再次深度对比
    patch(prevChild, c2[newIndex], container, parentComponent, null)
    // patch 完就证明已经遍历完一个新的节点
    patched++
  }
}
```

到这一步，咱们就只剩调用最长递增子序列，来使调整尽可能少。

```js
// 获取最长递增子序列 getSequence
const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []

let j = increasingNewIndexSequence.length - 1
// 倒序的好处就是 能够确定稳定的位置
// ecdf
// cdef
// 如果是 从 f 开始就能确定 e 的位置
// 从最后开始就能依次确定位置
for (let i = toBePatched; i >= 0; i--) {
  const nextIndex = i + s2
  const nextChild = c2[nextIndex]
  const anchor = nextIndex + 1 < len2 ? c2[nextIndex + 1].el : null
  if (newIndexToOldIndexMap[i] === 0) {
    patch(null, nextChild, container, parentComponent, anchor)
  } else if (moved) {
    if (j < 0 || i !== increasingNewIndexSequence[j]) {
      // 移动位置 调用 insert
      hostInsert(nextChild.el, container, anchor)
    } else {
      j++
    }
  }
}
```

## 更新组件

组件和 element 都是有相应的 patch，所以在 processComponent 我们要区分 init 和 update，新增 updateComponent。如何更新？
无非是调用 render 然后在 patch 再去更新组件中的值；

我们将 effect 挂载到 instance 上，然后 process 处理更新的时候使用 instance.update 函数就可以；再将 instance 加到 虚拟节点 的上

更新的时候我们还需要更新 props， next 表示下次要更新的节点

## nextTick 函数

```js
// 做视图更新的时候 只需要渲染一次 就能达到这个效果
// 当同步任务都执行完之后，再执行微任务
for (let i = 0; i < 100; i++) {
	console.log("update");
	count.value = i;
}
```

将更新 从同步改成了异步，所以 effect 包裹的 render 函数 不能立即执行，可以通过 scheduler 去控制