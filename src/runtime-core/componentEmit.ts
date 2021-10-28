import { camelize, toHandlerKey } from "../shared/index"

export function emit(instance, event, ...args) {
  const { props } = instance

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

  const handler = props[toHandlerKey(camelize(event))]
  handler && handler(...args)
}