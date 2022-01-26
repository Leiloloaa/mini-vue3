import { NodeTypes } from "./ast";

export function baseParse(content) {
  const context = createParserContext(content)

  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any = []

  let node
  if (context.source.startsWith('{{')) {
    node = parseInterpolation(context)
  }

  nodes.push(node)

  return nodes
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
  context.source = context.source.slice(openDelimiter.length);

  const rawContentLength = closeIndex - openDelimiter.length
  const rawContent = context.source.slice(0, rawContentLength)
  const content = rawContent.trim()

  context.source = context.source.slice(rawContentLength + closeDelimiter.length);

  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content
    }
  }
}

function createRoot(children) {
  return { children }
}

function createParserContext(content) {
  return {
    source: content
  }
}
