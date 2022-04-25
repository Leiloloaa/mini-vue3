/*
 * @Author: Stone
 * @Date: 2022-04-25 17:19:33
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-25 17:38:11
 */
import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";

describe("transform", () => {
    it("happy path", () => {
        const ast = baseParse("<div>hi,{{message}}</div>");

        // 使用插件的方式 修改指定的内容
        const plugin = (node) => {
            if (node.type === NodeTypes.TEXT) {
                node.content = node.content + " mini-vue";
            }
        };

        transform(ast, {
          nodeTransforms: [plugin],
        });

        const nodeText = ast.children[0].children[0];
        expect(nodeText.content).toBe("hi, mini-vue");
    });
});