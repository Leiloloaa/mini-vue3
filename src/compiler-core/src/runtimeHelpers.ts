/*
 * @Author: Stone
 * @Date: 2022-04-27 14:24:20
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:36:18
 */
export const TO_DISPLAY_STRING = Symbol('toDisplayString')
export const CREATE_ELEMENT_VNODE = Symbol('createElementVNode');

// Symbol 定义的变量不可以遍历 所以转一下
export const helperMapName = {
    [TO_DISPLAY_STRING]: 'toDisplayString',
    [CREATE_ELEMENT_VNODE]: 'createElementVNode'
}