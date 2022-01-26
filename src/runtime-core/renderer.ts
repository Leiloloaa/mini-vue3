import { Fragment, Text } from './vnode';
import { isOn } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlag";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from './createApp';
import { effect } from '../reactivity/effect';
import { shouldUpdateComponent } from './componentUpdateUtils';

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options

  function render(vnode, container) {
    // patch 的作用就是循环遍历
    // 同时判断是一个 function 或者是一个 Object
    // TODO patch 作用？
    // 如果是一个 function 
    // 如果是一个 Object 对象就直接插入到上下文对象中
    patch(null, vnode, container, null, null)
  }

  function patch(n1, n2: any, container: any, parentComponent, anchor) {
    const { type, shapeFlag } = n2
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break;
      case Text:
        processText(n1, n2, container, anchor)
        break;
      default:
        // 通过 vnode.type 的类型判断
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break;
    }
  }

  // 处理 新建 或者 更新
  function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
    if (!n1) {
      mountComponent(n2, container, parentComponent, anchor)
    } else {
      // 更新组件
      updateComponent(n1, n2);
    }
  }

  function updateComponent(n1, n2) {
    // 更新实际上只需要想办法 调用 render 函数 然后再 patch 去更新
    // instance 从哪里来呢？ 在挂载阶段 我们会生成 instance 然后挂载到 虚拟dom 上
    // n2 没有 所以要赋值
    const instance = n2.component = n1.component;

    // 不是每次都需要更新 只有 props 变了才更新
    if (shouldUpdateComponent(n1, n2)) {
      // 然后再把 n2 设置为下次需要更新的 虚拟 dom
      instance.next = n2
      instance.update()
    } else {
      n2.el = n1.el
      n2.vnode = n2
    }
  }

  function mountComponent(initialVNode: any, container: any, parentComponent, anchor) {
    // 为了更新 所以 加上了 component 属性
    const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent)

    // 初始化组件
    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  function setupRenderEffect(instance: any, initialVNode, container: any, anchor) {
    // 将 effect 放在 instance 实例身上
    instance.update = effect(() => {
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));
        patch(null, subTree, container, instance, null);
        initialVNode.el = subTree.el;
        instance.isMounted = true;
      } else {
        console.log("update");
        const { next, vnode, proxy } = instance;
        // 存在就要 更新
        if (next) {
          next.el = vnode.el;
          updateComponentPreRender(instance, next);
        }
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance, anchor);
      }
    });
  }

  function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode;
    instance.next = null;
    // 然后就是更新 props
    // 这里只是简单的赋值
    instance.props = nextVNode.props;
  }

  // 处理 Element
  function processElement(n1, n2: any, container: any, parentComponent, anchor) {
    // 如果 n1 不存在就是新建 否则是更新
    if (!n1) {
      mountElement(n2, container, parentComponent, anchor);
    } else {
      patchElement(n1, n2, container, parentComponent, anchor);
    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    console.log("n1", n1);
    console.log("n2", n2);

    // 新老节点
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // n1 是老的虚拟节点 上有 el 在 mountElement 有赋值
    // 同时 要赋值 到 n2 上面 因为 mountElement 只有初始
    const el = (n2.el = n1.el)
    patchChildren(n1, n2, el, parentComponent, anchor)
    patchProps(el, oldProps, newProps)
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
    // 主要有四种情况
    // text => array
    // array => text
    // text => new text
    // array => new array
    // TODO 通过什么来知道子组件的类型呢？
    // 通过 shapeFlag 可以知道
    const prevShapeFlag = n1.shapeFlag
    const c1 = n1.children
    const { shapeFlag } = n2
    const c2 = n2.children
    // 如果 现在是 text
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 原先是数组的情况
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 卸载
        unmountChildren(n1.children)
      }
      // 如果内容不等
      if (c1 !== c2) {
        hostSetElementText(container, c2);
      }
    } else {
      // 如果 原先是 text 现在是 array
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(container, "");
        mountChildren(c2, container, parentComponent, anchor);
      } else {
        // 新旧都是 array 就需要 diff
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
    // 因为后面用到了 c2.length 所以提取出来变成一个常量
    const len2 = c2.length
    // 双端对比需要 3 个指针
    let i = 0
    let e1 = c1.length - 1
    let e2 = len2 - 1
    function isSomeVnodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key
    }
    // debugger;
    // 左侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]
      if (isSomeVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break;
      }
      i++
    }

    // 右侧对比
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSomeVnodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor);
      }
      else {
        break;
      }
      e1--;
      e2--;
    }

    // 左右侧对比完后，就要处理了
    if (i > e1) {
      if (i <= e2) {
        // 我们要找到一个 锚点 不会动的
        const nextPos = e2 + 1
        // 最后一个为 null 就可以了
        const anchor = nextPos < len2 ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 中间乱序部分
      // 遍历老节点 然后检查在新的里面是否存在
      // 方案一 同时遍历新的 时间复杂度 o(n*n)
      // 方案二 新的节点建立一个映射表 时间复杂度 o(1) 只需要根据 key 去查是否存在
      // 记录差异开始的位置 i 是索引
      let s1 = i
      let s2 = i

      // 思考：为什么要建立映射表
      // diff 的意义在与 减少 dom 操作
      // 老的节点是 dom 元素 而新的节点是个对象
      // 实际上我们还是操作老的 dom
      // 映射表的意义在于我们可以快速的根据老节点的 key 来快速查到它在新的节点里面是哪个位置，然后对比位置关系再操作

      // 建立映射表
      const keyToNewIndexMap = new Map()
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i]
        keyToNewIndexMap.set(nextChild.key, i)
      }

      // 优化遍历
      // 循环 e1 老节点
      // 如果新的节点少于老的节点 那么遍历完新的节点后 就不需要再遍历了
      const toBePatched = e2 - s2 + 1 // 索引值 所以需要+1
      // 已经遍历的数量
      let patched = 0

      // 拆分问题 => 获取最长递增子序列
      // abcdefg -> 老
      // adecdfg -> 新
      // 1.确定新老节点之间的关系 新的元素在老的节点中的索引 e:4,c:2,d:3
      // newIndexToOldIndexMap 的初始值是一个定值数组，初始项都是 0，newIndexToOldIndexMap = [0,0,0] => [5,3,4] 加了1 因为 0 是有意义的。
      // 递增的索引值就是 [1,2]
      // 2.最长的递增子序列 [1,2] 对比 ecd 这个变动的序列
      // 利用两个指针 i 和 j
      // i 去遍历新的索引值 ecd [0,1,2] j 去遍历 [1,2]
      // 如果 i!=j 那么就是需要移动 

      // 新建一个定长数组(需要变动的长度) 性能是最好的 来确定新老之间索引关系 我们要查到最长递增的子序列 也就是索引值
      const newIndexToOldIndexMap = new Array(toBePatched)
      // 赋值
      for (let i = 0; i < toBePatched; i++) {
        newIndexToOldIndexMap[i] = 0
      }

      for (let i = s1; i <= e1; i++) {
        const prevChild = c1[i]

        if (patched >= toBePatched) {
          // 说明已经遍历完了 在挨个删除
          hostRemove(prevChild.el)
          continue // 后面的就不会执行了
        }

        // 需要一个临时变量
        // 它的作用是告诉我们老节点的元素是否在新的里面
        let newIndex

        // 有两种情况
        if (prevChild.key !== null) {
          // 用户输入了 key
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 没有输入 key
          // 只有通过遍历的方式 去对比 两个节点是否相同
          for (let j = s2; j <= e2; j++) {
            if (isSomeVnodeType(prevChild, c2[j])) {
              // 如果相同的话 说明找到了
              newIndex = j
              break
            }
          }
        }

        // 上面几行代码所做的事情就是 拿到 新节点 在 老节点 对应的 索引值
        // 有两种情况 undefined 或 有值
        if (newIndex === undefined) {
          // 新节点不存在老节点的话 删除
          hostRemove(prevChild.el)
        } else {
          // 实际上是等于 i 就可以 因为 0 表示不存在 所以 定义成 i + 1
          newIndexToOldIndexMap[newIndex - s2] = i + 1

          // 节点存在 不代表它的 props 或者它的子节点 是一样的
          patch(prevChild, c2[newIndex], container, parentComponent, null)

          // patch 完就证明已经遍历完一个新的节点
          patched++
        }
      }

      // 获取最长递增子序列
      const increasingNewIndexSequence = getSequence(newIndexToOldIndexMap)
      let j = increasingNewIndexSequence.length - 1
      // 倒序的好处就是 能够确定稳定的位置
      // ecdf
      // cdef
      // 如果是从 f 开始就能确定 e 的位置
      // 从最后开始就能依次确定位置
      for (let i = toBePatched; i >= 0; i--) {
        const nextIndex = i + s2 // i 初始值是要遍历的长度 s2 是一开始变动的位置 加起来就是索引值
        const nextChild = c2[nextIndex]
        // 锚点 => 位置
        const anchor = nextIndex + 1 < len2 ? c2[nextIndex + 1].el : null
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, parentComponent, anchor)
        } else {
          if (i !== increasingNewIndexSequence[j]) {
            // 移动位置 调用 insert
            hostInsert(nextChild.el, container, anchor)
          } else {
            j++
          }
        }
      }
    }
  }

  function unmountChildren(children) {
    for (let i = 0; i < children.length; i++) {
      const el = children[i].el;
      // 移除
      hostRemove(el)
    }
  }

  function patchProps(el, oldProps: any, newProps: any) {
    // 比较新老节点 不等于才处理 这属于健壮比较逻辑
    if (oldProps !== newProps) {
      for (const key in newProps) {
        const prevProp = oldProps[key]
        const nextProp = newProps[key]
        // 拿到每一项之后 去比较
        // 首先要拿到 el
        if (prevProp !== nextProp) {
          hostPatchProp(el, key, prevProp, nextProp);
        }
      }

      // 处理 undefined 和 null 的情况
      if (oldProps !== {}) {
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  function mountElement(vnode: any, container: any, parentComponent, anchor) {
    // const el = vnode.el = document.createElement(vnode.type)
    // canvas
    // new Element()
    const el = (vnode.el = hostCreateElement(vnode.type));

    // children
    const { children, shapeFlag } = vnode
    // 可能是 string 也可能是 array
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el, parentComponent, anchor)
    }

    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      // 具体 click -> 通用
      // on + Event name
      // onMousedown
      // if (isOn(key)) {
      //   const event = key.slice(2).toLocaleLowerCase()
      //   el.addEventListener(event, val);
      // } else {
      //   el.setAttribute(key, val)
      // }
      hostPatchProp(el, key, null, val);
    }

    // canvas 添加元素
    // el.x = 10

    // container.append(el)
    // canvas 中添加元素是 addChild()
    hostInsert(el, container, anchor);
  }

  function mountChildren(children: any, container: any, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor)
    });
  }

  function processFragment(n1, n2: any, container: any, parentComponent, anchor) {
    // 通过 mountChildren 去依次遍历
    mountChildren(n2.children, container, parentComponent, anchor)
  }

  function processText(n1, n2: any, container: any, anchor) {
    // 挂载 text 静态文本 vnode.children
    // console.log(vnode.children);
    const { children } = n2
    const textNode = n2.el = document.createTextNode(children)
    container.append(textNode)
  }

  return {
    createApp: createAppAPI(render)
  }
}

function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}