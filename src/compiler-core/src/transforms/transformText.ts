import { NodeTypes } from "../ast";
import { isText } from "../utils";

/*
 * @Author: Stone
 * @Date: 2022-04-27 15:58:33
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:41:50
 */
export function transformText(node) {
    // 实现一个 compose 类型的节点
    // 目的是将 element 类型下的 chilren + 起来(注意 是一个接一个的)
    if (node.type === NodeTypes.ELEMENT) {

        return () => {
            const { children } = node

            let currentContainer
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j];
                        if (isText(next)) {
                            if (!currentContainer) {
                                currentContainer = children[i] = {
                                    type: NodeTypes.COMPOUND_EXPRESSION,
                                    children: [child]
                                }
                            }
                            currentContainer.children.push(" + ")
                            currentContainer.children.push(next)
                            children.splice(j, 1)
                            j--
                        } else {
                            currentContainer = undefined
                            break
                        }
                    }
                }
            }
        }
    }
}