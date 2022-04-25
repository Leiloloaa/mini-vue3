// options 提供了更动态的传参方式
export function transform(root, options) {
    // 任务拆分
    // 1 遍历 - 深度优先遍历 和 广度优先遍历
    // 2 修改 test content

    // 创建上下文本
    const context = createTransformConetext(root, options)
    traverseNode(root, context)
}

function createTransformConetext(root: any, options: any) :any{
    const context = {
        root,
        nodeTransforms: options.nodeTransforms || [] // 插件列表
    }
    return context
}

function traverseNode(node: any, context) {
    const nodeTransforms = context.nodeTransforms
    for (let i = 0; i < nodeTransforms.length; i++) {
        const transform = nodeTransforms[i];
        transform(node)
    }
    traverseChildren(node, context)
}

function traverseChildren(node: any, context: any) {
    const children = node.children
    if (children) {
        for (let i = 0; i < children.length; i++) {
            const node = children[i];
            traverseNode(node, context)
        }
    }
}

