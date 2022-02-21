import { Text } from './../../runtime-core/vnode';
import { NodeTypes } from "./ast";

const enum TagType {
  Start,
  End
}

export function baseParse(content) {
  const context = createParserContext(content)

  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []

  let node
  // 重构 提取变量
  const s = context.source;
  // 判断类型
  if (s.startsWith('{{')) {
    node = parseInterpolation(context)
  } else if (/^<[a-z]*/i.test(s)) {
    // 需要用正则表达判断
    // <div></div>
    // /^<[a-z]/i/
    node = parseElement(context);
  } else {
    node = parseText(context)
  }

  nodes.push(node)

  return nodes
}

function parseText(context) {
  // 解析文本
  const content = parseTextData(context, context.source.length)

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
  const openDelimiter = '{{'
  const closeDelimiter = '}}'

  // indexOf 表示 检索 }} 从 2 开始
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  )

  // 直接把 前两个字符给删除
  advanceBy(context, openDelimiter.length)
  // context.source = context.source.slice(openDelimiter.length);

  const rawContentLength = closeIndex - openDelimiter.length
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()

  advanceBy(context, rawContentLength + closeDelimiter.length)
  // context.source = context.source.slice(rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content
    }
  }
}

// 推进模板字符
function advanceBy(context: any, length: any) {
  context.source = context.source.slice(length);
}

function createRoot(children) {
  return { children }
}

function createParserContext(content) {
  return {
    source: content
  }
}
