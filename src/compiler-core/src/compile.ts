/*
 * @Author: Stone
 * @Date: 2022-04-28 10:23:39
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-28 10:42:46
 */

import { generate } from "./codegen";
import { baseParse } from "./parse";
import { transform } from "./transform";
import { transformElement } from "./transforms/transformElement";
import { transformExpression } from "./transforms/transformExpression";
import { transformText } from "./transforms/transformText";

// compile 统一的出口 后面通过调用 baseCompile 生成 render
export function baseCompile(template) {
    const ast: any = baseParse(template);
    transform(ast, {
        nodeTransforms: [transformExpression, transformElement, transformText],
    });

    return generate(ast);
}