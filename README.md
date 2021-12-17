# my-miniVue

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

## 优化 stop 功能（边缘 case）

**思考**

```js
it('stop', () => {
    let dummy
    const obj = reactive({ prop: 1 })
    const runner = effect(() => {
      dummy = obj.prop
    })
    obj.prop = 2
    expect(dummy).toBe(2)
    stop(runner)
    // obj.prop = 3
    // obj.prop = obj.prop + 1
    // 先触发 get 操作 再触发 set 操作
    // get 操作 会重新收集依赖
    obj.prop++
    expect(dummy).toBe(2)

    // stopped effect should still be manually callable
    runner()
    expect(dummy).toBe(3)
})  
```

## 实现 readonly、shallowReadonly、isReadonly、isReactive 和 isProxy

## 总结 isReactive、isReadonly、isProxy、isRef、unRef

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

## 实现初始化 component 主流程

**上图**

![](http://66.152.176.25:8000/home/images/miniVue/componentRender.png)

> 代码就是跟着 流程图 的命名逐一实现函数

- processComponent() 在 patch() 中执行 switch default 分支，满足 ShapeFlags.COMPONENT 条件
- mountComponent(n2,...) 首次加载组件时调用的函数
- setupComponent(instance) 建立组件实例，做一些结构初始化操作(如：props和 slots)等
- setupStatefulComponent(instance,isSSR) 创建有状态组件，执行 setup() 函数
- finishComponentSetup(instance,isSSR) 这个函数在 setupStatefulComponent() 中调用，主要做的事情是处理 SSR，没有 render 函数有 template 时调用 compile 编 译出 render 函数，兼容 2.x 的 options api
- setupRenderEffect() 通过 effect() 函数返回 instance.update 创建一个监听- 更新函数。

## 使用 rollup 打包库

- rollup 一般是用于对库的打包
- webpack 一般用于我们写应用时用的打包工具

### 安装

```js
yarn add rollup --dev
```

### 生成配置文件 rollup.config.js

```js
import typescript from '@rollup/plugin-typescript'
import pkg from './package.json'
// 天然支持 esm 语法
export default {
    input: './src/index.ts',
    output: [
        //1. cjs -> commonjs
        //2. esm
        {
            format: 'cjs',
            file: pkg.main
        },
        {
            format: 'es',
            file: pkg.module
        }
    ],
    // 代码使用 ts 写的 需要编译
    plugins: [typescript()]
}
```

### 安装解析 ts 的插件

```js
npm install @rollup/plugin-typescript --save-dev
yarn add tslib --dev
```

### 修改 package 配置文件

```json
// -c 表示指定的配置文件
"scripts": {
      "test": "jest",
      "build": "rollup -c rollup.config.js"
  },
```

### 再将 createApp 导出到 ./src/index.ts 里面

```js
// ./src/index.ts
// mini-vue 的出口
export * from './runtime-core'

// ./src/runtime-core/index.ts
// 导出的出口文件
export { createApp } from './createApp'
```

### 修改 tsconfig.json 配置文件

```json
 // commonjs -> esnext
 "module": "esnext"
```

## 实现 element 

**重点：如何在 patch 中区分 component 类型和 element 类型**

> 通过 vnode.type

```js
// console.log(vnode.type);
// object 是 component
// div 是 element

if (typeof vnode.type === 'string') {
  processElement(vnode, container)
} else if (isObject(vnode.type)) {
  processComponent(vnode, container)
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
  // instance 是组件
  // instance.vnode 是 element
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

// componentPublicInstance.ts 修改 proxy 中的 get
//  setupState
const { setupState, props } = instance
// if (Reflect.has(setupState, key)) {
//   return setupState[key]
// }

// 检测 key 是否在目标 上
if (hasOwn(setupState, key)) {
  return setupState[key]
} else if (hasOwn(props, key)) {
  return props[key]
}
```

## 实现 emit

> emit 是子组件调用父组件中的方法

**形式**

> emit 是 setup 函数中第二个对象参数

```ts
// App.js
export const App = {
    render() {
        return h(
            'div', {},
            [
                h(Foo, {
                    onAdd(a, b, c) {
                        console.log('我执行了onAdd', a, b, c);
                    },
                    onAddFoo() {
                        console.log('我执行了addFoo');
                    }
                })
            ]
        );
    },
    setup() {
        return {
            msg: 'mini-vue'
        };
    }
};
// Foo.js
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
   // bind 的第一个参数 如果是 undefined 或者 null  那么 this 就是指向 windows
  // 这样做的目的是 实现了 emit 的第一个参数 为 component 实例 这是预置入
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

## 实现 slot

**slot 用法**

```js
// 1、普通用法
// 子组件中要使用 slot，才会显示 p
// Children.vue
<template>
  <slot></slot>
  <h1>我是子组件</h1>
</template>

// Parent.vue
<Children><p>我是插槽部分<p></Children>
```

```js
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
```

```js
// 3、作用域插槽
// 能使用子组件中的变量
// Children.vue
<slot v-bind:str="data">{{ data.msg }}</slot>
const data = reactive({ msg: 123, msg2: 456 });

// Parent.vue
<Children>
  <template v-slot:default="slotProps">{{ slotProps.str.msg2 }}</template>
</Children>
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
// 粗暴实现 直接通过 this.$slots 来获取 vnode
return h('div', {}, [foo, h('div', {}, this.$slots)]);

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

export function setupComponent(instance) {
  initSlots(instance, instance.vnode.children)
}

// 初始化 slots componentSlots.ts
export function initSlots(instance, children) {
  // children is vnode
  instance.slots = children
}

```

此时，已实现单个 vnode 节点传入的时候进行渲染。需求进一步升级，如果传入多个标签呢？即由 vnode -> []，我们可以手动的将这个 [] 包裹在一个 div 里面。新建一个帮助函数 renderSlots.ts

```js
// 如果传入的是一个数组
// App.js
const foo = h(Foo, {}, [h('p', {}, '123'), h('p', {}, '456')]);
// 换成单个值后 又不能渲染了 在 renderSlots 函数中修改
// return Array.isArray(slots) ? createVNode("div", {}, slots) : slots
// 最终的办法是在初始化的时候 将 children 转换成数组

// Foo.js
const foo = h('div', {}, 'Foo')
return h('div', {}, [foo, renderSlots(this.$slots)]);

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

为了实现名称与插槽一一对应，将 array -> object，通过键值对的方式来处理。

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
export function renderSlots(slots, name) {
  const slot = slots[name]
  if (slot) {
      return createVNode("div", {}, slot)
  }
}
```

### 作用域插槽实现原理

我们只需要将 Foo.js 中的值通过 renderSlots 函数，传递出去。

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

并不是所有的 children 都有 slots

```js
// componentSlots.ts
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

## 实现 provide 和 inject

**用途**：provide 和 inject 是 vue 提供跨层级组件通信的方式

> 组件通信方式：1、props 和 emit；2、provide 和 inject；3、vuex；4、`$attrs`和`$listeners`；5、`$parent`和`$children`（vue2 常用）；6、事件中心 EventBus；

**实现**

- 祖组件通过 provide 的方式存储数据
- 子孙通过 inject 的方式取数据
- 存在哪里？？？
  - 存在实例身上，这样每个组件的 provide 就不一样
  - 使用 getCurrentInstance 来获取实例
  - 所以 provide 只能在 setup 中调用
- 如果 爷爷组件 和 父组件 的 key 重复了，那就是取父组件的 key

**保存在实例上**

```ts
// 这里涉及到修改以前的代码 第一次 patch 的时候为 null 第二次是传 instance
export function createComponentInstance(vnode, parent) {
  const component = {
    vnode,
    type: vnode.type,
    props: {},
    slots: {},
    setupState: {},
    provides: parent ? parent.provides : {}, // 获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
    parent,
    emit: () => { }
  }
  // bind 的第一个参数 如果是 undefined 或者 null  那么 this 就是指向 windows
  // 这样做的目的是 实现了 emit 的第一个参数 为 component 实例 这是预置入
  component.emit = emit.bind(null, component) as any
  return component
}
```

**实现**

```ts
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

**要点**

- 实现自定义渲染器的要素就是能够接收不同平台的创建元素
  - 不仅仅是 DOM 元素 比如 canvas 元素也是可以的
- mountElement 方法中就不能写死了
- 用户需要调用 render 的话，就定义一个 createApp
- 新创建 runtime-dom index.ts 文件，并且提供用户 可传的参数 和 默认的参数

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