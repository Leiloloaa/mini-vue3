import { h } from '../../lib/my-miniVue.esm.js'

export const App = {
    // 在 .vue 文件中是
    // 在 template 中写
    // 然后编译成 render 函数执行
    render() {
        return h(
            "div", {
                id: "root",
                class: ["red", "hard"]
            },
            // string
            // "hi，mini-vue"
            // Array
            [h("p", { class: "red" }, "hi red")]
        )
    },
    setup() {
        return {
            msg: 'mini-msg'
        }
    }
}