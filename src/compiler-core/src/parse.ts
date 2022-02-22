import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End
}

export function baseParse(content) {
  const context = createParserContent(content)

  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []
  let node
  const s = context.source;
  if (s.startsWith('{{')) {
    node = parseInterpolation(context)
  } else if (/^<[a-z]*/i.test(s)) {
    // 需要用正则表达判断
    // <div></div>
    // /^<[a-z]/i/
    node = parseElement(context);
  }

  nodes.push(node)

  return nodes
}

function parseElement(context) {
  // 解析标签
  const element = parseTag(context, TagType.Start)

  parseTag(context, TagType.End)

  return element
}

function parseTag(context, type) {
  // <div></div>
  // 匹配解析
  // 推进
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)
  const tag = match[1]
  // 获取完后要推进
  advanceBy(context, match[0].length + 1)

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
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()

  // 然后还需要把这个字符串给删了 模板是一个字符串 要接着遍历后面的内容
  // context.source = context.source.slice(rawContentLength + closeDelimiter.length);
  advanceBy(context, rawContentLength + closeDelimiter.length)

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content
    }
  }
}

function advanceBy(context, length) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return { children }
}

function createParserContent(content) {
  return {
    source: content
  }
}
