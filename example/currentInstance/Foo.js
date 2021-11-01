import { h, getCurrentInstance } from "../../lib/my-miniVue.esm.js";

export const Foo = {
    name: "Foo",
    setup() {
        const instance = getCurrentInstance();
        console.log("Foo:", instance);
        return {};
    },
    render() {
        return h("div", {}, "foo");
    },
};