/*
 * @Author: Stone
 * @Date: 2022-04-26 14:57:19
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-27 18:39:21
 */
import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";
import { transformExpression } from "../src/transforms/transformExpression";
import { transformElement } from './../src/transforms/transformElement';
import { transformText } from './../src/transforms/transformText';

describe("codegen", () => {
    it("string", () => {
        const ast = baseParse("hi");
        transform(ast);
        const { code } = generate(ast);
        // 这是生成快照  如果需要更新快照 运行命令后面加上 -u
        expect(code).toMatchSnapshot();
    });

    it("interpolation", () => {
        const ast = baseParse("{{message}}");
        transform(ast, {
            nodeTransforms: [transformExpression]
        });
        const { code } = generate(ast);
        expect(code).toMatchSnapshot();
    });

    it("element", () => {
        const ast = baseParse("<div></div>");
        transform(ast, {
            nodeTransforms: [transformElement]
        });
        const { code } = generate(ast);
        expect(code).toMatchSnapshot();
    });

    it("union", () => {
        const ast:any = baseParse("<div>h1,{{message}}</div>");
        transform(ast, {
            nodeTransforms: [transformExpression, transformElement, transformText]
        });
        console.log('ast -----', ast);

        const { code } = generate(ast);
        expect(code).toMatchSnapshot();
    });
});