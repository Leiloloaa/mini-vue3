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