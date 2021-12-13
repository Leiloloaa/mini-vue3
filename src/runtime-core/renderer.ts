import { Fragment, Text } from './vnode';
import { isOn } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlag";
import { createComponentInstance, setupComponent } from "./component"
import { createAppAPI } from './createApp';

export function createRenderer(options) {
  const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options

  function render(vnode, container) {
    // patch 的作用就是循环遍历
    // 同时判断是一个 function 或者是一个 Object
    // TODO patch 作用？
    // 如果是一个 function 
    // 如果是一个 Object 对象就直接插入到上下文对象中
    patch(vnode, container, null)
  }

  function patch(vnode: any, container: any, parentComponent) {
    const { type, shapeFlag } = vnode
    switch (type) {
      case Fragment:
        processFragment(vnode, container, parentComponent)
        break;
      case Text:
        processText(vnode, container)
        break;
      default:
        // 通过 vnode.type 的类型判断
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(vnode, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(vnode, container, parentComponent)
        }
        break;
    }
  }

  // 处理 新建 或者 更新
  function processComponent(initialVNode: any, container: any, parentComponent) {
    mountComponent(initialVNode, container, parentComponent)
  }

  function mountComponent(initialVNode: any, container: any, parentComponent) {
    const instance = createComponentInstance(initialVNode, parentComponent)

    // 初始化组件
    setupComponent(instance)
    setupRenderEffect(instance, initialVNode, container)
  }

  function setupRenderEffect(instance: any, initialVNode, container: any) {
    const { proxy } = instance
    const subTree = instance.render.call(proxy)
    // 在子树初始化 patch 之后 将 el 保存
    patch(subTree, container, instance)
    initialVNode.el = subTree.el
  }

  function processElement(vnode: any, container: any, parentComponent) {
    mountElement(vnode, container, parentComponent)
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
      hostPatchProp(el, key, val);
    }

    // canvas 添加元素
    // el.x = 10

    // container.append(el)
    // canvas 中添加元素是 addChild()
    hostInsert(el, container);
  }

  function mountChildren(vnode: any, container: any, parentComponent) {
    vnode.children.forEach((v) => {
      patch(v, container, parentComponent)
    });
  }

  function processFragment(vnode: any, container: any, parentComponent) {
    // 通过 mountChildren 去依次遍历
    mountChildren(vnode, container, parentComponent)
  }

  function processText(vnode: any, container: any) {
    // 挂载 text 静态文本 vnode.children
    // console.log(vnode.children);
    const { children } = vnode
    const textNode = vnode.el = document.createTextNode(children)
    container.append(textNode)
  }

  return {
    createApp: createAppAPI(render)
  }
}