import { isReadonly, shallowReadonly } from "../reactive";

describe("shallowReadonly", () => {
  test("should not make non-reactive properties reactive", () => {
    // shallowReadonly 只有表层是 readonly 响应式对象、
    // 适用于 程序优化
    // 避免所有的对象都是响应式对象
    const props = shallowReadonly({ n: { foo: 1 } });
    expect(isReadonly(props)).toBe(true);
    expect(isReadonly(props.n)).toBe(false);
  });

  it("should call console.warn when set", () => {
    console.warn = jest.fn();
    const user = shallowReadonly({
      age: 10,
    });

    user.age = 11;
    expect(console.warn).toHaveBeenCalled();
  });
});