export function shouldUpdateComponent(prevVNode, nextVNode) {
  // 只有 props 发生了改变才需要更新
  const { props: prevProps } = prevVNode
  const { props: nextProps } = nextVNode

  for (const key in nextProps) {
    if (nextProps[key] != prevProps[key]) {
      return true
    }
  }
  return false
}