import {
    h,
    ref,
    getCurrentInstance,
    nextTick,
} from "../../lib/my-miniVue.esm.js";

export default {
    name: "App",
    setup() {
        const count = ref(1);
        const instance = getCurrentInstance();

        function onClick() {
            // 做视图更新的时候 只需要渲染一次 就能达到这个效果
            // 当同步任务都执行完之后，再执行微任务
            for (let i = 0; i < 100; i++) {
                console.log("update");
                count.value = i;
            }

            debugger;
            console.log(instance);
            nextTick(() => {
                console.log(instance);
            });

            // await nextTick()
            // console.log(instance)
        }

        return {
            onClick,
            count,
        };
    },
    render() {
        const button = h("button", { onClick: this.onClick }, "update");
        const p = h("p", {}, "count:" + this.count);

        return h("div", {}, [button, p]);
    },
};