import { Fragment, Text } from './vnode';
import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../shared/shapeFlags"
import { createAppAPI } from './createApp';
import { effect } from '..';

// 使用闭包 createRenderer 函数 包裹所有的函数
export function createRenderer(options) {
  const { createElement: hostCreateElement, patchProp: hostPatchProp, insert: hostInsert } = options

  function render(vnode, container) {
    // 只需要调用 patch 方法
    // 方便后续的递归处理
    patch(null, vnode, container, null)
  }

  function patch(n1, n2: any, container: any, parentComponent) {
    // TODO 去处理组件
    // 判断什么类型
    // 是 element 那么就应该去处理 element
    // 如何区分是 element 还是 component 类型???
    // console.log(vnode.type);
    // object 是 component
    // div 是 element

    // debugger

    const { type, shapeFlag } = n2
    // 根据 type 来渲染
    // console.log(type);
    // Object
    // div/p -> String
    // Fragment
    // Text
    switch (type) {
      case Fragment:
        processFragment(n2, container, parentComponent)
        break;
      case Text:
        processText(n2, container)
        break;
      default:
        // 0001 & 0001 -> 0001
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          processComponent(n2, container, parentComponent)
        }
        break;
    }
  }

  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      // 初始化
      mountElement(n2, container, parentComponent)
    } else {
      patchElement(n1, n2, container, parentComponent)
    }
  }

  function patchElement(n1, n2, container, parentComponent) {
    console.log('n1', n1);
    console.log(n2);
  }


  function processComponent(vnode: any, container: any, parentComponent) {
    // 挂载组件
    mountComponent(vnode, container, parentComponent)
  }

  function mountComponent(initialVNode, container, parentComponent) {
    // 创建组件实例
    // 这个实例上面有很多属性
    const instance = createComponentInstance(initialVNode, parentComponent)

    // 初始化
    setupComponent(instance)

    // 调用 render 函数
    setupRenderEffect(instance, initialVNode, container)
  }

  function mountElement(vnode: any, container: any, parentComponent) {
    // const el = document.createElement("div")
    // string 或 array
    // el.textContent = "hi , minivue"
    // el.setAttribute("id", "root")
    // document.body.append(el)
    // 这里的 vnode -> element -> div

    // 自定义渲染器
    // 修改一 hostCreateElement
    // canvas 是 new Element()
    // const el = vnode.el = document.createElement(vnode.type)
    const el = vnode.el = hostCreateElement(vnode.type)
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(children, el, parentComponent)
    }

    // 修改二 hostPatchProp
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      // onClick 、 onMouseenter 等等这些的共同特征
      // 以 on 开头 + 一个大写字母
      // if (isOn(key)) {
      //   const event = key.slice(2).toLowerCase()
      //   el.addEventListener(event, val);
      // } else {
      //   el.setAttribute(key, val)
      // }
      hostPatchProp(el, key, val)
    }

    // 修改三 canvas 添加元素
    // el.x = 10
    // container.append(el)
    // canvas 中添加元素是 addChild()
    // container.append(el)
    hostInsert(el, container)
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent)
    })
  }

  function setupRenderEffect(instance, initialVNode, container) {
    effect(() => {
      if (!instance.isMount) {
        console.log('init');
        const { proxy } = instance
        // 虚拟节点树
        // 一开始是创建在 instance 上
        // 在这里就绑定 this
        const subTree = instance.subTree = instance.render.call(proxy)
        // vnode -> patch
        // vnode -> element -> mountElement
        patch(null, subTree, container, instance)
        // 所有的 element -> mount
        initialVNode.el = subTree.el
        instance.isMount = true
      } else {
        console.log('update');
        const { proxy } = instance
        // 当前的虚拟节点树
        const subTree = instance.render.call(proxy)
        // 老的虚拟节点树
        const prevSubTree = instance.subTree
        instance.subTree = subTree
        patch(prevSubTree, subTree, container, instance)
      }
    })
  }

  function processFragment(vnode: any, container: any, parentComponent) {
    // 此时，拿出 vnode 中的 children
    const { children } = vnode
    mountChildren(children, container, parentComponent)
  }

  function processText(vnode: any, container: any) {
    // console.log(vnode);
    // 文本内容 在 children 中
    const { children } = vnode
    // 创建文本节点
    const textNode = vnode.el = document.createTextNode(children)
    // 挂载到容器中
    container.append(textNode);
  }

  //  为了让用户又能直接使用 createApp 所以导出一个 createApp
  return {
    createApp: createAppAPI(render)
  }
}