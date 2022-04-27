/*
 * @Author: Stone
 * @Date: 2022-04-25 17:19:47
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 14:39:32
 */

import { NodeTypes } from "./ast"
import { TO_DISPLAY_STRING } from "./runtimeHelpers"

// options 提供了更动态的传参方式
export function transform(root, options = {}) {
    // 任务拆分
    // 1 遍历 - 深度优先遍历 和 广度优先遍历
    // 2 修改 test content

    // 创建上下文本
    const context = createTransformConetext(root, options)
    traverseNode(root, context)
    createRootCodegen(root)

    root.helpers = [...context.helpers.keys()]
    console.log('root.helpers',root.helpers)
}

function createTransformConetext(root: any, options: any): any {
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [], // 插件列表
        helpers: new Map(),
        helper(key) {
            context.helpers.set(key, 1)
        }
    }
    return context
}

function traverseNode(node: any, context) {
    const nodeTransforms = context.nodeTransforms
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        transform(node)
    }

    switch (node.type) {
        case NodeTypes.INTERPOLATION:
            context.helper(TO_DISPLAY_STRING)
            break;
        case NodeTypes.ROOT:
        case NodeTypes.ELEMENT:
            traverseChildren(node, context)
            break;
        default:
            break;
    }
}

function traverseChildren(node: any, context: any) {
    const children = node.children
    for (let i = 0; i < children.length; i++) {
        const node = children[i];
        traverseNode(node, context)
    }
}

function createRootCodegen(root: any) {
    root.codegenNode = root.children[0]
}