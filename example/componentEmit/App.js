import { h } from '../../lib/mini-vue3.esm.js';
import { Foo } from './Foo.js';

export const App = {
  name: 'App',
  render() {
    return h('div', {}, [h('div', {}, 'App'), h(Foo, {}, {})]);
  },
  setup() {
    return {};
  }
};
