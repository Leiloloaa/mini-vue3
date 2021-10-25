import typescript from '@rollup/plugin-typescript'
import pkg from './package.json'
// 天然支持 esm 语法
export default {
    input: './src/index.ts',
    output: [
        //1. cjs -> commonjs
        //2. esm
        {
            format: 'cjs',
            file: pkg.main
        },
        {
            format: 'es',
            file: pkg.module
        }
    ],
    // 代码使用 ts 写的 需要编译
    plugins: [typescript()]
}