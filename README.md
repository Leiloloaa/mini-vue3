# my-miniVue

TDD 测试驱动开发

TDD(Test-Driven Development)TDD是一个开发测试代码和业务代码的工作流程，基于这个流程你可以写出具有极高测试覆盖率（通常接近90%）的代码。TDD还可以减少测试中发现比较难以定位的BUG的可能性。TDD的一般过程是：写一个测试运行这个测试，看到预期的失败编写尽可能少的业务代码，让测试通过重构代码不断重复以上过程


BDD
BDD(Behavior-Driven Development)
BDD解决的一个关键问题就是如何定义TDD或单元测试过程中的细节。一些不良的单元测试的一个常见问题是过于依赖被测试功能的实现逻辑。这通常意味着如果你要修改实现逻辑，即使输入输出没有变，通常也需要去更新测试代码。这就造成了一个问题，让开发人员对测试代码的维护感觉乏味和厌烦。BDD则通过向你展示如何测试来解决这个问题，你不需要再面向实现细节设计测试，取而代之的是面向行为来测试。

> 实现Vue3核心逻辑

## 初步实现 effect 中的 track 和 trigger

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