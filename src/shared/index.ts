/*
 * @Author: Stone
 * @Date: 2022-04-24 19:41:18
 * @LastEditors: Stone
 * @LastEditTime: 2022-04-28 11:12:59
 */
export * from './toDisplayString';

export const NOOP = () => { }

export const extend = Object.assign;

export const isObject = (value) => {
    return value !== null && typeof value === "object"
};

export const isFunction = (value) => {
    return value !== null && typeof value === "function"
};

export const isString = (value) => {
    return value !== null && typeof value === "string"
};

export const isArray = (value) => {
    return value !== null && Array.isArray(value)
};

export const hasChanged = (value, newValue) => { return !Object.is(value, newValue) };

export const isOn = (key) => {
    return /^on[A-Z]/.test(key)
};

export const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)

export const camelize = (str) => {
    // 需要将 str 中的 - 全部替换，斌且下一个要 设置成大写
    // \w 匹配字母或数字或下划线或汉字 等价于 '[^A-Za-z0-9_]'。
    // \s 匹配任意的空白符
    // \d 匹配数字
    // \b 匹配单词的开始或结束
    // ^  匹配字符串的开始
    // $  匹配字符串的结束
    // replace 第二参数是值得话就是直接替换
    // 如果是一个回调函数 那么 就可以依次的修改值
    return str.replace(/-(\w)/g, (_, c: string) => {
        return c ? c.toUpperCase() : ''
    })
}

export const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

export const toHandlerKey = (str) => {
    return str ? "on" + capitalize(str) : ''
}
