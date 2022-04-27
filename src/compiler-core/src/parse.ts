import { NodeTypes } from "./ast";

const enum TagType {
    Start,
    End
}

export function baseParse(content) {
    const context = createParserContent(content)
    return createRoot(parseChildren(context, []))
}

function parseChildren(context, ancestors) {
    const nodes: any = []
    while (!isEnd(context, ancestors)) {
        let node
        const s = context.source;
        if (s.startsWith('{{')) {
            node = parseInterpolation(context)
        } else if (s[0] === "<") {
            // 需要用正则表达判断
            // <div></div>
            // /^<[a-z]/i/
            if (/[a-z]/i.test(s[1])) {
                node = parseElement(context, ancestors);
            }
        }
        if (!node) {
            node = parseText(context);
        }

        nodes.push(node)
    }
    return nodes
}

function isEnd(context, ancestors) {
    // 1、source 有值的时候
    // 2、当遇到结束标签的时候
    const s = context.source;
    if (s.startsWith('</')) {
        for (let i = ancestors.length - 1; i >= 0; i--) {
            const tag = ancestors[i].tag;
            if (startsWithEndTagOpen(s, tag)) {
                return true;
            }
        }
    }
    return !s;
}

function startsWithEndTagOpen(source, tag) {
    // 以左括号开头才有意义 并且 还需要转换为小写比较
    return (
        source.startsWith("</") &&
        source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
    );
}

function parseText(context) {
    const endToken = ['{{', '</'] // 停止的条件 如果同时存在 那么这个 index 要尽量的靠左 去最小的
    let endIndex = context.source.length // 停止的索引
    for (let i = 0; i < endToken.length; i++) {
        const index = context.source.indexOf(endToken[i])
        if (index !== -1 && endIndex > index) {
            endIndex = index
        }
    }

    // 解析文本 之前是 从头截取到尾部 但真是的环境是文本后面会有其它类型的 element 所以要指明停止的位置
    const content = parseTextData(context, endIndex)

    console.log('content -------', content);

    return {
        type: NodeTypes.TEXT,
        content
    }
}

function parseTextData(context, length) {
    const content = context.source.slice(0, length)

    advanceBy(context, length)
    return content
}

function parseElement(context, ancestors) {
    // 解析标签
    const element: any = parseTag(context, TagType.Start)
    ancestors.push(element)
    // 获取完标签后 需要把内部的 元素保存起来 需要用递归的方式去遍历内部的 element
    element.children = parseChildren(context, ancestors)
    ancestors.pop()

    // 这里要判断一下 开始标签和结束标签是否是一致的 不能直接消费完就 return
    if (startsWithEndTagOpen(context.source, element.tag)) {
        parseTag(context, TagType.End)
    } else {
        throw new Error(`缺少结束标签:${element.tag}`)
    }

    return element
}

function parseTag(context, type) {
    // <div></div>
    // 匹配解析
    // 推进
    const match: any = /^<\/?([a-z]*)/i.exec(context.source)
    const tag = match[1]
    // 获取完后要推进
    advanceBy(context, match[0].length)
    advanceBy(context, 1);

    if (type === TagType.End) return
    return {
        type: NodeTypes.ELEMENT,
        tag
    }
}

function parseInterpolation(context) {
    // {{message}}
    // 拿出来定义的好处就是 如果需要更改 改动会很小
    const openDelimiter = '{{'
    const closeDelimiter = '}}'

    // 我们要知道关闭的位置
    // indexOf 表示 检索 }} 从 2 开始
    const closeIndex = context.source.indexOf(
        closeDelimiter,
        openDelimiter.length
    )

    // 删除 前两个字符串
    // context.source = context.source.slice(openDelimiter.length)
    advanceBy(context, openDelimiter.length)

    // 内容的长度就等于 closeIndex - openDelimiter 的长度
    const rawContentLength = closeIndex - openDelimiter.length
    const rawContent = parseTextData(context, rawContentLength)
    const content = rawContent.trim()

    // 然后还需要把这个字符串给删了 模板是一个字符串 要接着遍历后面的内容
    // context.source = context.source.slice(rawContentLength + closeDelimiter.length);
    advanceBy(context, closeDelimiter.length)

    return {
        type: NodeTypes.INTERPOLATION,
        content: {
            type: NodeTypes.SIMPLE_EXPRESSION,
            content
        }
    }
}

function advanceBy(context, length) {
    context.source = context.source.slice(length);
}

function createRoot(children) {
    return { children, type: NodeTypes.ROOT }
}

function createParserContent(content) {
    return {
        source: content
    }
}
