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

    // TODO 为啥？？？ 还没太搞懂
    console.log(provides);
    console.log('---');
    console.log(parentProvides);
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