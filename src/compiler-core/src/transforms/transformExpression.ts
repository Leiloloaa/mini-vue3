import { NodeTypes } from "../ast"

/*
 * @Author: Stone
 * @Date: 2022-04-27 14:52:31
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 15:02:45
 */
export function transformExpression(node) {
    if (node.type === NodeTypes.INTERPOLATION) {
        node.content = processExpression(node.content)
    }
}

function processExpression(node) {
    node.content = `_ctx.${node.content}`
    return node
}