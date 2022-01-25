import { h, renderSlots } from '../../lib/mini-vue3.esm.js';
export const Foo = {
  setup() {
    return {};
  },
  render() {
    const foo = h('p', {}, 'foo');
    // 渲染 Foo .vnode children 中拿到 插槽 然后添加，通过 this.$slots 的方式返回
    // console.log(this.$slots);
    // !! 普通用法
    // 渲染 children 的时候 里面必须是 vnode
    // 如果是数组需要转换
    // 粗暴处理 能实现
    // return h('div', {}, [foo, h('div', {}, this.$slots)]);
    // 实际上是封装成一个函数
    // renderSlots

    // !! 具名插槽
    // 获取到要渲染的元素、
    // 获取到渲染的位置
    // return h('div', {}, [
    //     renderSlots(this.$slots, 'header'),
    //     foo,
    //     renderSlots(this.$slots, 'footer')
    // ]);

    // !! 作用域插槽
    // 意思是将 Foo 组件中的变量传出去
    const age = 18;
    return h('div', {}, [
      renderSlots(this.$slots, 'header', { age }),
      foo,
      renderSlots(this.$slots, 'footer')
    ]);
  }
};
