// 组件 provide 和 inject 功能
import { h, provide, inject } from '../../lib/my-miniVue.esm.js';

const Provider = {
    name: 'Provider',
    setup() {
        provide('foo', 'fooVal');
        provide('bar', 'barVal');
    },
    render() {
        return h('div', {}, [h('p', {}, 'Provider'), h(Consumer)]);
    }
};

const ProviderTwo = {
    name: 'ProviderTwo',
    setup() {
        provide('foo', 'fooTwo');
        const foo = inject('foo');

        return {
            foo
        };
    },
    render() {
        return h('div', {}, [
            h('p', {}, `ProviderTwo foo:${this.foo}`),
            h(Consumer)
        ]);
    }
};

const Consumer = {
    name: 'Consumer',
    setup() {
        const foo = inject('foo');
        const bar = inject('bar');
        // const baz = inject('baz', 'bazDefault');
        // const baz = inject('baz', () => 'bazDefaultFun');

        return {
            foo,
            bar
            // baz
        };
    },

    render() {
        // return h('div', {}, `Consumer: - ${this.foo} - ${this.bar} - ${this.baz}`);
        return h('div', {}, `Consumer: - ${this.foo} - ${this.bar}`);
    }
};

export default {
    name: 'App',
    setup() {},
    render() {
        return h('div', {}, [h('p', {}, 'apiInject'), h(Provider)]);
    }
};