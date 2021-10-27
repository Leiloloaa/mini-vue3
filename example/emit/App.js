import { h } from '../../lib/my-miniVue.esm.js';
import { Foo } from './Foo.js';

export const App = {
    name: 'App',
    render() {
        return h('div', {}, [
            h('div', {}, 'App'),
            h(Foo, {
                // emit
                onAdd(a, b) {
                    console.log('onAdd', a, b);
                },
                onAddFoo(a, b) {
                    console.log('onFoo', a, b);
                }
            })
        ]);
    },
    setup() {
        return {};
    }
};