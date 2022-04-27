import { CREATE_ELEMENT_VNODE } from "./runtimeHelpers";

/*
 * @Author: Stone
 * @Date: 2022-04-24 19:41:18
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:42:07
 */
export const enum NodeTypes {
    INTERPOLATION,
    SIMPLE_EXPRESSION,
    ELEMENT,
    TEXT,
    ROOT,
    COMPOUND_EXPRESSION
}

export function createVNodeCall(context, tag, props, children) {
    context.helper(CREATE_ELEMENT_VNODE);

    return {
        type: NodeTypes.ELEMENT,
        tag,
        props,
        children,
    };
}
