// 通过 map 的方式扩展
// $el 是个 key
const publicPropertiesMap = {
  $el: (i) => i.vnode.el
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    //  setupState
    const { setupState } = instance
    if (key in setupState) {
      return setupState[key]
    }

    // key -> $el
    // if (key === "$el") {
    //   return instance.vnode.el
    // }

    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
    
    // setup -> options data
    // $data
  }
};