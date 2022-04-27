import { createVNodeCall, NodeTypes } from "../ast";

/*
 * @Author: Stone
 * @Date: 2022-04-27 15:23:00
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:43:06
 */
export function transformElement(node, context) {
    if (node.type === NodeTypes.ELEMENT) {

        return () => {
            // 中间处理层

            // tag
            const vnodeTag = `'${node.tag}'`

            // props
            let vnodeProps

            // children
            const { children } = node
            let vnodeChildren = children[0]
            node.codegenNode = createVNodeCall(
                context,
                vnodeTag,
                vnodeProps,
                vnodeChildren
            );
        }

    }
}
