import { NodeTypes } from "../src/ast";
import { baseParse } from "../src/parse";

describe('Parse', () => {
  // interpolation 插值表达式
  describe('interpolation', () => {
    test('simple interpolation', () => {
      // 我们要做的就是 输入一个插值表达式 然后解析出中间的值
      // 要解析 {{ 和 }} 确定中间的位置 并且去除 空格
      const ast = baseParse("{{message}}")

      // type 和 content 是抽象语法树特定的格式
      expect(ast.children[0]).toStrictEqual({
        type: NodeTypes.INTERPOLATION,
        content: {
          type: NodeTypes.SIMPLE_EXPRESSION,
          content: "message"
        }
      })
    });
  })
})