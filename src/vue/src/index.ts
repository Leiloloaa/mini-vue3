// This entry is the "full-build" that includes both the runtime
// and the compiler, and supports on-the-fly compilation of the template option.
import { initDev } from "./dev";
import { compile, CompilerOptions, CompilerError } from "@vue/compiler-dom";
import {
  registerRuntimeCompiler,
  RenderFunction,
  warn,
} from "@vue/runtime-dom";
import * as runtimeDom from "@vue/runtime-dom";
import { isString, NOOP, generateCodeFrame, extend } from "@vue/shared";
// import { InternalRenderFunction } from 'packages/runtime-core/src/component'
type InternalRenderFunction = {
  // (
  //   ctx: ComponentPublicInstance,
  //   cache: ComponentInternalInstance['renderCache'],
  //   // for compiler-optimized bindings
  //   $props: ComponentInternalInstance['props'],
  //   $setup: ComponentInternalInstance['setupState'],
  //   $data: ComponentInternalInstance['data'],
  //   $options: ComponentInternalInstance['ctx']
  // ): VNodeChild
  _rc?: boolean; // isRuntimeCompiled

  // __COMPAT__ only
  _compatChecked?: boolean; // v3 and already checked for v2 compat
  _compatWrapped?: boolean; // is wrapped for v2 compat
};

// 入口文件流程
// 1、依赖注入编译函数至 runtime registerRuntimeCompile(compileToFunction)
// 2、runtime 调用编译函数 compileToFunction
// 3、调用 compile 函数对模板进行解析，并返回 code
//    a. 先 parse 解析成 AST 语树
//    b. 再通过 transform 解析成 JavaScript（转换 v-on、v-if、v-for 等指令 ）
//    c. 再通过 generate 解析成 code
// 4、将 code 作为参数传入 Function 的构造函数中，并且将生成的函数赋值给 render 变量
// 5、将 render 函数作为编译结果返回

const __DEV__ = true; // dev 环境，自己加的

if (__DEV__) {
  initDev();
}

// 编译缓存 Object.create(null) 创建了一个空对象 用途：缓存已经编译过的模板
const compileCache: Record<string, RenderFunction> = Object.create(null);

// vue 的入口文件
function compileToFunction(
  template: string | HTMLElement,
  options?: CompilerOptions
): RenderFunction {
  // 如果不是 String 先处理一下 可忽略
  if (!isString(template)) {
    if (template.nodeType) {
      template = template.innerHTML;
    } else {
      __DEV__ && warn(`invalid template option: `, template);
      return NOOP;
    }
  }

  const key = template;
  // 添加缓存 存在就直接返回 不存在就是还需要进行编译
  const cached = compileCache[key];
  if (cached) return cached;

  if (template[0] === "#") {
    const el = document.querySelector(template);
    if (__DEV__ && !el) {
      warn(`Template element not found or is empty: ${template}`);
    }
    // __UNSAFE__
    // Reason: potential execution of JS expressions in in-DOM template.
    // The user must make sure the in-DOM template is trusted. If it's rendered
    // by the server, the template should not contain any user data.
    template = el ? el.innerHTML : ``;
  }

  // code 就是从 compile 返回的对象解构出来的
  const { code } = compile(
    template,
    extend(
      {
        hoistStatic: true,
        onError: __DEV__ ? onError : undefined,
        onWarn: __DEV__ ? (e) => onError(e, true) : NOOP,
      } as CompilerOptions,
      options
    )
  );

  function onError(err: CompilerError, asWarning = false) {
    const message = asWarning
      ? err.message
      : `Template compilation error: ${err.message}`;
    const codeFrame =
      err.loc &&
      generateCodeFrame(
        template as string,
        err.loc.start.offset,
        err.loc.end.offset
      );
    warn(codeFrame ? `${message}\n${codeFrame}` : message);
  }

  // The wildcard import results in a huge object with every export
  // with keys that cannot be mangled, and can be quite heavy size-wise.
  // In the global build we know `Vue` is available globally so we can avoid
  // the wildcard object.
  const render =
    // __GLOBAL__ ? new Function(code)() : new Function("Vue", code)(runtimeDom)
    // Vue3 可以支持自定义渲染器，即自定义传入不同的平台的 api，runtimeDom 是适用于 web
    new Function("Vue", code)(runtimeDom) as RenderFunction;

  // mark the function as runtime compiled
  (render as InternalRenderFunction)._rc = true;

  return (compileCache[key] = render);
}

registerRuntimeCompiler(compileToFunction);

export { compileToFunction as compile };
export * from "@vue/runtime-dom";
