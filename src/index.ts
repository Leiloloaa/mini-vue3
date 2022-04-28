/*
 * @Author: Stone
 * @Date: 2022-04-24 19:41:18
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-28 11:17:33
 */
// mini-vue 的出口
export * from './runtime-dom';

// baseCompile 是返回一个 {code} 达不到效果，因为我们想要的是 render 函数，所以需要一个函数处理一下
import { baseCompile } from './compiler-core/src';
import * as runtimerDOM from './runtime-core';
import { registerRuntimerCompiler } from './runtime-dom';

function compileToFunction(template) {
    const { code } = baseCompile(template)
    // 想要的 render 函数其实也依赖了一些 Vue 内部的函数 所以要想一个策略 直接把这个 render 函数返回出去就可以放在组件中使用了
    // import { toDisplayString as _toDisplayString, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"
    // export function render(_ctx, _cache, $props, $setup, $data, $options) {
    //     return (_openBlock(), _createElementBlock("div", null, "Hello World," + _toDisplayString(_ctx.message), 1 /* TEXT */))
    // }
    const render = new Function("Vue", code)(runtimerDOM)
    return render
}

// 这个函数一开始就会执行
registerRuntimerCompiler(compileToFunction)