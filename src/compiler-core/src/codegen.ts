/*
 * @Author: Stone
 * @Date: 2022-04-26 14:57:37
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-26 15:20:36
 */
export function generate(ast) {
    // 实现功能的步骤
    // 1、先知道要达到的效果
    // 2、任务拆分实现
    // 3、优化提取代码
    const context = createCodegenContext()
    const { push } = context
    push("return ")

    const functionName = "render"
    const args = ["_ctx", "_cache"]
    const signature = args.join(", ")

    push(`function ${functionName}(${signature}){`)
    push("return ")
    genNode(ast.codegenNode, context)
    push("}")

    return {
        code: context.code
    }
}

function createCodegenContext() {
    const context = {
        code: "",
        push(source) {
            context.code += source
        }
    }
    return context
}

function genNode(node, context) {
    const { push } = context
    push(`'${node.content}'`)
}