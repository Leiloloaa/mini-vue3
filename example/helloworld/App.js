import { h } from '../../lib/guide-mini-vue.esm.js'

export const App = {
    // 在 .vue 文件中是
    // 在 template 中写
    // 然后编译成 render 函数执行
    render() {
        return h("div", "hi，mini-vue")
    },
    setup() {
        return {
            msg: 'mini-msg'
        }
    }
}