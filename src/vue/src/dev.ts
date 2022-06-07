import { initCustomFormatter } from '@vue/runtime-dom'

export function initDev() {
  // 如果是 __BROWSER__ 浏览器环境
  // if (__BROWSER__) {
  //   // 如果不是 esm bundler 打包器
  //   if (!__ESM_BUNDLER__) {
  //     console.info(
  //       `You are running a development build of Vue.\n` +
  //         `Make sure to use the production build (*.prod.js) when deploying for production.`
  //     )
  //   }

  //   initCustomFormatter()
  // }
  initCustomFormatter()
}
