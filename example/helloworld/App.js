import { h } from '../../lib/my-miniVue.esm.js'

window.self = null
export const App = {
    // 在 .vue 文件中是
    // 在 template 中写
    // 然后编译成 render 函数执行
    render() {
        window.self = this
        return h(
            "div", {
                id: "root",
                class: ["red", "hard"]
            },
            // string
            // this.$el -> get root element
            // 这个 msg 是我们调用 setup 返回的 msg
            // 实现思路：将 setup 返回的值 绑定到 render 函数的 this 上
            // proxy 是方便用户能够便捷的 获取组件的实例 不用说 this.setup.xxx

            // 在组件中创建一个 代理对象 - 初始化
            // 调用 render 绑定 代理对象 到 this 上
            "hi，mini-vue" + this.msg
            // Array
            // [h("p", { class: "red" }, "hi red")]
        )
    },
    setup() {
        return {
            msg: 'haha'
        }
    }
}