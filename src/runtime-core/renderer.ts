import { Fragment, Text } from './vnode';
import { isOn } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlag";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from './createApp';
import { effect } from '../reactivity/effect';

export function createRenderer(options) {
  const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options

  function render(vnode, container) {
    // patch 的作用就是循环遍历
    // 同时判断是一个 function 或者是一个 Object
    // TODO patch 作用？
    // 如果是一个 function 
    // 如果是一个 Object 对象就直接插入到上下文对象中
    patch(null, vnode, container, null)
  }

  function patch(n1, n2: any, container: any, parentComponent) {
    const { type, shapeFlag } = n2
    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break;
      case Text:
        processText(n1, n2, container)
        break;
      default:
        // 通过 vnode.type 的类型判断
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n1, n2, container, parentComponent)
        }
        break;
    }
  }

  // 处理 新建 或者 更新
  function processComponent(n1, n2: any, container: any, parentComponent) {
    mountComponent(n2, container, parentComponent)
  }

  function mountComponent(initialVNode: any, container: any, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent)

    // 初始化组件
    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container)
  }

  function setupRenderEffect(instance: any, initialVNode, container: any) {
    effect(() => {
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));

        patch(null, subTree, container, instance);

        initialVNode.el = subTree.el;

        instance.isMounted = true;
      } else {
        console.log("update");
        const { proxy } = instance;
        const subTree = instance.render.call(proxy);
        const prevSubTree = instance.subTree;
        instance.subTree = subTree;

        patch(prevSubTree, subTree, container, instance);
      }
    });
  }

  // 处理 Element
  function processElement(n1, n2: any, container: any, parentComponent) {
    // 如果 n1 不存在就是新建 否则是更新
    if (!n1) {
      mountElement(n2, container, parentComponent);
    } else {
      patchElement(n1, n2, container);
    }
  }

  function patchElement(n1, n2, container) {
    console.log("n1", n1);
    console.log("n2", n2);

    // 新老节点
    const oldProps = n1.props || {}
    const newProps = n2.props || {}

    // n1 是老的虚拟节点 上有 el 在 mountElement 有赋值
    // 同时 要赋值 到 n2 上面 因为 mountElement 只有初始
    const el = (n2.el = n1.el)

    patchProps(el, oldProps, newProps)
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

  function mountElement(vnode: any, container: any, parentComponent) {
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
      mountChildren(vnode, el, parentComponent)
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
    hostInsert(el, container);
  }

  function mountChildren(vnode: any, container: any, parentComponent) {
    vnode.children.forEach((v) => {
      patch(null, v, container, parentComponent)
    });
  }

  function processFragment(n1, n2: any, container: any, parentComponent) {
    // 通过 mountChildren 去依次遍历
    mountChildren(n2, container, parentComponent)
  }

  function processText(n1, n2: any, container: any) {
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