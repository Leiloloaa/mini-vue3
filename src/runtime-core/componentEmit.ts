import { camelize, toHandlerKey } from "../shared/index";

export function emit(instance, event, ...args) {
  // instance.props -> event
  const { props } = instance

  // TPP
  // 先去写一个 特定 的行为 -> 重构成通用的行为
  // add -> Add
  // add-foo -> AddFoo
  // const camelize = (str) => {
  //   return (str).replace(/-(\w)/g, (_, c: string) => {
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