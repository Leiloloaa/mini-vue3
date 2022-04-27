/*
 * @Author: Stone
 * @Date: 2022-04-27 18:41:36
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:41:36
 */
import { NodeTypes } from "./ast";

export function isText(node) {
    return (
        node.type === NodeTypes.TEXT || node.type === NodeTypes.INTERPOLATION
    );
}