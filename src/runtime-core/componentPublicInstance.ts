// 通过 map 的方式扩展

import { hasOwn } from "../shared/index";

// $el 是个 key
const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
  $props: (i) => i.props
}

export const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
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