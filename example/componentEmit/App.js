import { h } from '../../lib/my-miniVue.esm.js';
import { Foo } from './Foo.js';

export const App = {
    name: 'App',
    render() {
        return h('div', {}, [h('div', {}, 'App'), h(Foo, {}, {

        })]);
    },
    setup() {
        return {};
    }
};