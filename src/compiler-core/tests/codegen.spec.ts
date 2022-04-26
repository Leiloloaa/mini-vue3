/*
 * @Author: Stone
 * @Date: 2022-04-26 14:57:19
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-26 15:01:42
 */
import { generate } from "../src/codegen";
import { baseParse } from "../src/parse";
import { transform } from "../src/transform";

describe("codegen", () => {
  it("string", () => {
    const ast = baseParse("hi");
    transform(ast);
    const { code } = generate(ast);
    // 这是生成快照  如果需要更新快照 运行命令后面加上 -u
    expect(code).toMatchSnapshot();
  });
});