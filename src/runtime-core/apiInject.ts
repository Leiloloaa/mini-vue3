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