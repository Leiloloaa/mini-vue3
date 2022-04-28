/*
 * @Author: Stone
 * @Date: 2022-04-26 14:57:19
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-28 09:59:49
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
          nodeTransforms: [transformExpression],
        });
        const { code } = generate(ast);
        expect(code).toMatchSnapshot();
      });
    
      it("element", () => {
        const ast: any = baseParse("<div>hi,{{message}}</div>");
        transform(ast, {
          nodeTransforms: [transformExpression,transformElement, transformText],
        });
    
        const { code } = generate(ast);
        expect(code).toMatchSnapshot();
      });
});