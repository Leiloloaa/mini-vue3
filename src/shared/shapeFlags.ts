// 使用 对象 -> key 的方式固然能实现，当是不够高效
// 计算机最高效的是 位运算 都不用浏览器转换代码
// const ShapeFlags = {
//   element: 0,
//   stateful_component: 0,
//   text_children: 0,
//   array_children: 0
// }

// => 修改 左移 乘以2 右移 除以2k
export const enum ShapeFlags {
  ELEMENT = 1,// 0001
  STATEFUL_COMPONENT = 1 << 1,// 0010
  TEXT_CHILDREN = 1 << 2, // 0100
  ARRAY_CHILDREN = 1 << 3, // 1000
  SLOT_CHILDREN = 1 << 4, // 10000
};

// 修改
// 如果 vnode-> stateful_component set == 1
// ShapeFlags.stateful_component = 1

// 判断
// if(ShapeFlags.element)

// 对象和 key 的方式 不够高效
// 通过 位运算的方式解决 高效问题
// 0000
// 0001 element
// 0010 stateful
// 0100 text
// 1000 array

// 1010 表示 stateful 和 array

// | 或 两位都为0 才为0
// & 与 两位都为1 才为1

// 修改
//   0000
// | 0001
// =>0001

// 查找
//   0001
// & 0001
// =>0001 