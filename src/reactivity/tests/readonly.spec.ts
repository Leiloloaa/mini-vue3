import { isReactive, isReadonly, reactive, readonly } from "../reactive";

describe('readonly', () => {
  it('should make nested values readonly', () => {
    const original = { foo: 1, bar: { baz: 2 } };
    const wrapped = readonly(original);
    const obj = reactive({ foo: 1 })
    expect(wrapped).not.toBe(original);
    expect(isReadonly(wrapped)).toBe(true);
    expect(isReadonly(original)).toBe(false);
    expect(isReactive(obj)).toBe(true);
    expect(wrapped.foo).toBe(1);
  });

  it('should call console.warn when set', () => {
    console.warn = jest.fn();
    const user = readonly({
      age: 10
    });

    user.age = 11;
    expect(console.warn).toHaveBeenCalled();
  });

  it('test', () => {
    const original: any = { foo: 1, bar: { baz: 2 } };
    const temp = reactive(original);
    original.add = 3;
    expect(temp.add).toBe(3)
  });
})