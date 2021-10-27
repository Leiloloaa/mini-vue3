import { isOn } from "../shared/index";
import { ShapeFlags } from "../shared/shapeFlag";
import { createComponentInstance, setupComponent } from "./component"

export function render(vnode, container) {
  // patch 的作用就是循环遍历
  // 同时判断是一个 function 或者是一个 Object
  // TODO patch 作用？
  // 如果是一个 function 
  // 如果是一个 Object 对象就直接插入到上下文对象中
  patch(vnode, container)
}

function patch(vnode: any, container: any) {

  const { shapeFlag } = vnode
  // 通过 vnode.type 的类型判断
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container)
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

// 处理 新建 或者 更新
function processComponent(initialVNode: any, container: any) {
  mountComponent(initialVNode, container)
}

function mountComponent(initialVNode: any, container: any) {
  const instance = createComponentInstance(initialVNode)

  // 初始化组件
  setupComponent(instance)
  setupRenderEffect(instance, initialVNode, container)
}

function setupRenderEffect(instance: any, initialVNode, container: any) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy)
  // 在子树初始化 patch 之后 将 el 保存
  patch(subTree, container)
  initialVNode.el = subTree.el
}

function processElement(vnode: any, container: any) {
  mountElement(vnode, container)
}

function mountElement(vnode: any, container: any) {
  const el = vnode.el = document.createElement(vnode.type)
  // children
  const { children, shapeFlag } = vnode
  // 可能是 string 也可能是 array
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode, el)
  }

  // props
  const { props } = vnode
  for (const key in props) {
    const val = props[key]
    // 具体 click -> 通用
    // on + Event name
    // onMousedown
    if (isOn(key)) {
      const event = key.slice(2).toLocaleLowerCase()
      el.addEventListener(event, val);
    } else {
      el.setAttribute(key, val)
    }
  }

  container.append(el)
}

function mountChildren(vnode: any, container: any) {
  vnode.children.forEach((v) => {
    patch(v, container)
  });
}

