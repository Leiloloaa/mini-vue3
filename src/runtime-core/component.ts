/*
 * @Author: Stone
 * @Date: 2022-04-24 19:41:18
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-28 11:00:06
 */
import { proxyRefs } from '../reactivity';
import { shallowReadonly } from "../reactivity/reactive";
import { isObject } from './../shared/index';
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";

export function createComponentInstance(vnode, parent) {
    const component = {
        vnode,
        type: vnode.type,
        next: null, // 表示下一个要更新的 vnode
        props: {},
        slots: {},
        setupState: {},
        provides: parent ? parent.provides : {}, // 获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
        parent,
        isMount: false,
        subTree: {}, // 更新了 要挂载老的树
        emit: () => { }
    }
    // bind 的第一个参数 如果是 undefined 或者 null  那么 this 就是指向 windows
    // 这样做的目的是 实现了 emit 的第一个参数 为 component 实例 这是预置入
    component.emit = emit.bind(null, component) as any
    return component
}

export function setupComponent(instance) {
    initSlots(instance, instance.vnode.children)
    initProps(instance, instance.vnode.props)
    // console.log(instance);

    // 初始化一个有状态的 component
    // 有状态的组件 和 函数组件
    setupStatefulComponent(instance)
}

function setupStatefulComponent(instance) {
    // 调用 setup 然后 拿到返回值
    // type 就是 app 对象
    const Component = instance.type

    // ctx
    instance.proxy = new Proxy({
        _: instance
    }, PublicInstanceProxyHandlers)

    // 解构 setup
    const { setup } = Component

    if (setup) {
        setCurrentInstance(instance)
        // 返回一个 function 或者是 Object
        // 如果是 function 则认为是 render 函数
        // 如果是 Object 则注入到当前组件的上下文中
        const setupResult = setup(shallowReadonly(instance.proxy), { emit: instance.emit })
        setCurrentInstance(null)

        handleSetupResult(instance, setupResult)
    }
}

function handleSetupResult(instance, setupResult: any) {
    // TODO function

    if (isObject(setupResult)) {
        instance.setupState = proxyRefs(setupResult)
    }

    finishComponentSetup(instance)
}

function finishComponentSetup(instance: any) {
    const Component = instance.type

    // template => render 函数
    // 我们之前是直接调用 render 函数，但是用户不会传入 render 函数，只会传入 template
    // 所以我们需要调用 compile，但是又不能直接再 runtime-core 里面调用
    // 因为这样会形成强依赖关系 Vue3 支持单个包拆分使用 包之间不能直接引入模块的东西
    // Vue 可以只存在运行时，就不需要 compiler-core
    // 使用 webpack 或者 rollup 打包工具的时候，在运行前先把 template 编译成 render 函数
    // 线上运行的时候就可以直接跑这个 runtime-core 就行了，这样包就更小
    // Vue 给出的解决方案就是，先导入到 Vue 里面，然后再使用。这样就没有了强依赖关系
    if (compiler && !Component.render) {
        // 如果 compiler 存在并且 用户 没有传入 render 函数，如果用户传入的 render 函数，那么它的优先级会更高
        if(Component.template){
            Component.render = compiler(Component.template)
        }
    }
    instance.render = Component.render
}

let currentInstance = null
export function getCurrentInstance() {
    // 需要返回实例
    return currentInstance
}

// 赋值时 封装函数的好处
// 我们可以清晰的知道 谁调用了 方便调试
export function setCurrentInstance(instance) {
    currentInstance = instance;
}

let compiler;
export function registerRuntimerCompiler(_compiler) {
    compiler = _compiler
}