import { Fragment, Text } from './vnode';
import { createComponentInstance, setupComponent } from "./component"
import { ShapeFlags } from "../shared/shapeFlags"
import { createAppAPI } from './createApp';
import { effect } from '../reactivity/effect';
import { shouldUpdateComponent } from './componentUpdateUtils';
import { queueJobs } from './scheduler';

// 使用闭包 createRenderer 函数 包裹所有的函数
export function createRenderer(options) {
    const {
        createElement: hostCreateElement,
        patchProp: hostPatchProp,
        insert: hostInsert,
        remove: hostRemove,
        setElementText: hostSetElementText
    } = options

    function render(vnode, container) {
        // 只需要调用 patch 方法
        // 方便后续的递归处理
        patch(null, vnode, container, null, null)
    }

    function patch(n1, n2: any, container: any, parentComponent, anchor) {
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
                processFragment(n1, n2, container, parentComponent, anchor)
                break;
            case Text:
                processText(n1, n2, container)
                break;
            default:
                // 0001 & 0001 -> 0001
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent, anchor)
                }
                break;
        }
    }

    // 首先因为每次修改 响应式都会处理 element
    // 在 processElement 的时候就会判断
    // 如果是传入的 n1 存在 那就是新建 否则是更新
    // 更新 patchElement 又得进行两个节点的对比
    function processElement(n1, n2, container, parentComponent, anchor) {
        if (!n1) {
            // 初始化
            mountElement(n2, container, parentComponent, anchor)
        } else {
            patchElement(n1, n2, container, parentComponent, anchor)
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

        // 处理
        patchChildren(n1, n2, el, parentComponent, anchor)
        patchProps(el, oldProps, newProps)
    }

    function patchChildren(n1, n2, container, parentComponent, anchor) {
        // 常见有四种情况
        // array => text
        // text => array
        // text => text
        // array => array
        // 如何知道类型呢？ 通过 shapeFlag
        const prevShapeFlag = n1.shapeFlag
        const c1 = n1.children
        const { shapeFlag } = n2
        const c2 = n2.children
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 1、要卸载原来的组件
                unmountChildren(n1.children)
                // 2、将 text 挂载上去
            }
            if (c1 !== c2) {
                hostSetElementText(container, c2)
            }
        } else {
            // 现在是 array 的情况 之前是 text
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 1、原先的 text 清空
                hostSetElementText(container, '')
                // 2、挂载现在的 array
                mountChildren(c2, container, parentComponent, anchor)
            } else {
                // 都是数组的情况就需要
                patchKeyedChildren(c1, c2, container, parentComponent, anchor)
            }
        }
    }

    function patchKeyedChildren(c1, c2, container, parentComponent, parentAnchor) {
        const len2 = c2.length
        // 需要定义三个指针
        let i = 0  // 从新的节点开始
        let e1 = c1.length - 1 // 老的最后一个 索引值
        let e2 = len2 - 1 // 新的最后一个 索引值

        function isSomeVNodeType(n1, n2) {
            // 对比节点是否相等 可以通过 type 和 key
            return n1.type === n2.type && n1.key === n2.key
        }

        debugger
        // 左侧对比 移动 i 指针
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            } else {
                break;
            }
            i++;
        }
        // 右侧对比 移动 e1 和 e2 指针
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSomeVNodeType(n1, n2)) {
                patch(n1, n2, container, parentComponent, parentAnchor);
            } else {
                break;
            }
            e1--;
            e2--;
        }
        // 对比完两侧后 就要处理以下几种情况
        // 新的比老的多 创建
        if (i > e1) {
            if (i <= e2) {
                // 左侧 可以直接加在末尾
                // 右侧的话 我们就需要引入一个 概念 锚点 的概念
                // 通过 anchor 锚点 我们将新建的元素插入的指定的位置
                const nextPos = e2 + 1
                // 如果 e2 + 1 大于 c2 的 length 那就是最后一个 否则就是最先的元素
                // 锚点是一个 元素
                const anchor = nextPos < len2 ? c2[nextPos].el : null
                while (i <= e2) {
                    patch(null, c2[i], container, parentComponent, anchor)
                    i++
                }
            }
        } else if (i > e2) {
            // 老的比新的多 删除
            // e1 就是 老的 最后一个
            while (i <= e1) {
                hostRemove(c1[i].el);
                i++;
            }
        } else {
            // 乱序部分
            // 遍历老节点 然后检查在新的里面是否存在
            // 方案一 同时遍历新的 时间复杂度 O(n*n)
            // 方案二 新的节点建立一个映射表 时间复杂度 O(1) 只要根据 key 去查是否存在
            // 为了性能最优 选则方案二
            let s1 = i // i 是停止的位置 差异开始的地方
            let s2 = i

            // 如果新的节点少于老的节点，当遍历完新的之后，就不需要再遍历了
            // 通过一个总数和一个遍历次数 来优化
            // 要遍历的数量
            const toBePatched = e2 - s2 + 1
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
            // 确定是否需要移动 只要后一个索引值小于前一个 就需要移动
            let moved = false
            let maxNewIndexSoFar = 0
            // 赋值
            for (let i = 0; i < toBePatched; i++) {
                newIndexToOldIndexMap[i] = 0
            }

            // 建立新节点的映射表
            const keyToNewIndexMap = new Map()
            // 循环 e2
            for (let i = s2; i <= e2; i++) {
                const nextChild = c2[i];
                keyToNewIndexMap.set(nextChild.key, i)
            }

            // 循环 e1
            for (let i = s1; i <= e1; i++) {
                const prevChild = c1[i];

                if (patched >= toBePatched) {
                    hostRemove(prevChild.el)
                    continue
                }

                let newIndex
                if (prevChild.key !== null) {
                    // 用户输入 key
                    newIndex = keyToNewIndexMap.get(prevChild.key)
                } else {
                    // 用户没有输入 key
                    for (let j = s2; j < e2; j++) {
                        if (isSomeVNodeType(prevChild, c2[j])) {
                            newIndex = j;
                            break;
                        }
                    }
                }

                if (newIndex === undefined) {
                    hostRemove(prevChild.el)
                } else {
                    if (newIndex >= maxNewIndexSoFar) {
                        maxNewIndexSoFar = newIndex
                    } else {
                        moved = true
                    }

                    // 实际上是等于 i 就可以 因为 0 表示不存在 所以 定义成 i + 1
                    newIndexToOldIndexMap[newIndex - s2] = i + 1

                    // 存在就再次深度对比
                    patch(prevChild, c2[newIndex], container, parentComponent, null)
                    // patch 完就证明已经遍历完一个新的节点
                    patched++
                }
            }

            // 获取最长递增子序列
            const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []

            let j = increasingNewIndexSequence.length - 1
            // 倒序的好处就是 能够确定稳定的位置
            // ecdf
            // cdef
            // 如果是从 f 开始就能确定 e 的位置
            // 从最后开始就能依次确定位置
            for (let i = toBePatched; i >= 0; i--) {
                const nextIndex = i + s2
                const nextChild = c2[nextIndex]
                const anchor = nextIndex + 1 < len2 ? c2[nextIndex + 1].el : null
                if (newIndexToOldIndexMap[i] === 0) {
                    patch(null, nextChild, container, parentComponent, anchor)
                } else if (moved) {
                    if (j < 0 || i !== increasingNewIndexSequence[j]) {
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
            hostRemove(children[i].el)
        }
    }

    function patchProps(el, oldProps, newProps) {
        // 常见的有三种情况
        // 值改变了 => 删除
        // 值变成了 null 或 undefined  => 删除
        // 增加了 => 增加
        if (oldProps !== newProps) {
            for (const key in newProps) {
                const prevProp = oldProps[key]
                const nextProp = newProps[key]
                if (prevProp !== nextProp) {
                    hostPatchProp(el, key, prevProp, nextProp)
                }
            }
        }

        // 处理值 变成 null 或 undefined 的情况
        // 新的就不会有 所以遍历老的 oldProps 看是否存在于新的里面
        if (oldProps !== {}) {
            for (const key in oldProps) {
                if (!(key in newProps)) {
                    hostPatchProp(el, key, oldProps[key], null)
                }
            }
        }
    }

    function processComponent(n1, n2: any, container: any, parentComponent, anchor) {
        if (!n1) {
            // 挂载组件
            mountComponent(n2, container, parentComponent, anchor)
        } else {
            // 更新组件
            updateComponent(n1, n2)
        }
    }

    function updateComponent(n1, n2) {
        // 更新实际上只需要想办法 调用 render 函数 然后再 patch 去更新
        // instance 从哪里来呢？ 在挂载阶段 我们会生成 instance 然后挂载到 虚拟dom 上
        // n2 没有 所以要赋值
        const instance = n2.component = n1.component

        // 只有但子组件的 props 发生了改变才需要更新
        if (shouldUpdateComponent(n1, n2)) {
            // 然后再把 n2 设置为下次需要更新的 虚拟 dom
            instance.next = n2
            instance.update()
        } else {
            n2.el = n1.el
            n2.vnode = n2
        }
    }


    function mountComponent(initialVNode, container, parentComponent, anchor) {
        // 创建组件实例
        // 这个实例上面有很多属性
        const instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent)

        // 初始化
        setupComponent(instance)

        // 调用 render 函数
        setupRenderEffect(instance, initialVNode, container, anchor)
    }

    function mountElement(vnode: any, container: any, parentComponent, anchor) {
        // const el = document.createElement("div")
        // string 或 array
        // el.textContent = "hi , mini-vue"
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
            mountChildren(children, el, parentComponent, anchor)
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
            hostPatchProp(el, key, null, val)
        }

        // 修改三 canvas 添加元素
        // el.x = 10
        // container.append(el)
        // canvas 中添加元素是 addChild()
        // container.append(el)
        hostInsert(el, container, anchor)
    }

    function mountChildren(children, container, parentComponent, anchor) {
        children.forEach((v) => {
            patch(null, v, container, parentComponent, anchor)
        })
    }

    function setupRenderEffect(instance, initialVNode, container, anchor) {
        // 将 effect 放在 instance 实例身上
        instance.update = effect(() => {
            if (!instance.isMount) {
                console.log('init');
                const { proxy } = instance
                // 虚拟节点树
                // 一开始是创建在 instance 上
                // 在这里就绑定 this
                const subTree = instance.subTree = instance.render.call(proxy, proxy)
                // vnode -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance, null)
                // 所有的 element -> mount
                initialVNode.el = subTree.el
                instance.isMount = true
            } else {
                console.log('update');
                // next 是下一个 要更新的 vnode 是老的
                const { next, vnode } = instance
                if (next) {
                    next.el = vnode.el
                    updateComponentPreRender(instance, next);
                }

                const { proxy } = instance
                // 当前的虚拟节点树
                const subTree = instance.render.call(proxy, proxy)
                // 老的虚拟节点树
                const prevSubTree = instance.subTree
                instance.subTree = subTree
                patch(prevSubTree, subTree, container, instance, anchor)
            }
        }, {
            scheduler() {
                queueJobs(instance.update)
            }
        })
    }

    function processFragment(n1, n2: any, container: any, parentComponent, anchor) {
        // 此时，拿出 vnode 中的 children
        mountChildren(n2.children, container, parentComponent, anchor)
    }

    function processText(n1, n2: any, container: any) {
        // console.log(vnode);
        // 文本内容 在 children 中
        const { children } = n2
        // 创建文本节点
        const textNode = n2.el = document.createTextNode(children)
        // 挂载到容器中
        container.append(textNode);
    }

    //  为了让用户又能直接使用 createApp 所以导出一个 createApp
    return {
        createApp: createAppAPI(render)
    }
}

function updateComponentPreRender(instance, nextVNode) {
    instance.vnode = nextVNode
    instance.next = null

    // 然后就是更新 props
    // 这里只是简单的赋值
    instance.props = nextVNode.props
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