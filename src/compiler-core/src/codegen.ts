import { isString } from "../../shared"
import { NodeTypes } from "./ast"
import { CREATE_ELEMENT_VNODE, helperMapName, TO_DISPLAY_STRING } from "./runtimeHelpers"

/*
 * @Author: Stone
 * @Date: 2022-04-26 14:57:37
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:40:49
 */
export function generate(ast) {
    // 实现功能的步骤
    // 1、先知道要达到的效果
    // 2、任务拆分实现
    // 3、优化提取代码
    const context = createCodegenContext()
    const { push } = context

    genFunctionPreamble(ast, context)

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
        },
        helper(key) {
            return `_${helperMapName[key]}`
        }
    }
    return context
}

function genNode(node: any, context) {
    // 这里之前只处理 text 之后还需要处理别的类型 使用一个 switch
    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context)
            break;
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
        case NodeTypes.ELEMENT:
            genElement(node, context)
            break
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context)
            break
        default:
            break;
    }
    // const { push } = context
    // push(`'${node.content}'`)
}

function genFunctionPreamble(ast: any, context) {
    const { push } = context
    const VueBinging = "Vue"
    // const helpers = ["toDisplayString"] // 帮助函数 后期需要实现 修改写在一个 helper 里面
    const aliasHelper = (s) => `${helperMapName[s]}:_${helperMapName[s]}` // 别名 带下划线
    if (ast.helpers.length > 0) {
        push(`const { ${ast.helpers.map(aliasHelper).join(", ")}} = ${VueBinging}`)
    }
    push("\n")
    push("return ")
}

function genText(node: any, context: any) {
    const { push } = context
    push(`'${node.content}'`)
}

function genInterpolation(node: any, context: any) {
    const { push, helper } = context
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(")")
}

function genExpression(node: any, context: any) {
    const { push } = context
    push(`'${node.content}'`)
}

function genElement(node, context) {
    const { push, helper } = context
    const { tag, children, props } = node
    // console.log('children', children)
    //   [ { type: 3, content: 'h1,' },
    //     { type: 0, content: { type: 1, content: 'message' } }
    //   ]
    // push(`${helper(CREATE_ELEMENT_VNODE)}("${tag}"), null, "hi," + _toDisplayString(_ctx.message)`)
    // element 里面的 children 一个一个拼接 循环遍历
    // const child = children[0]
    push(`${helper(CREATE_ELEMENT_VNODE)}(`)
    // for (let i = 0; i < children.length; i++) {
    //     const child = children[i];
    //     genNode(child, context)
    // }
    genNodeList(genNullable([tag, props, children]), context)
    // genNode(children, context)
    push(")")
}

function genNodeList(nodes, context) {
    const { push } = context
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (isString(node)) {
            push(node)
        } else {
            genNode(node, context)
        }
        if (i < nodes.length - 1) {
            push(", ")
        }
    }
}

function genNullable(args) {
    return args.map((arg) => arg || "null")
}

function genCompoundExpression(node: any, context: any) {
    const { push } = context
    const { children } = node
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (isString(child)) {
            push(child)
        } else {
            genNode(child, context)
        }
    }
}
