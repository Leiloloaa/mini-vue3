export function initSlots(instance, children) {
  // array
  // instance.slots = Array.isArray(children) ? children : [children]

  // object
  // const slots = {}
  // for (const key in children) {
  //   const value = children[key];
  //   slots[key] = Array.isArray(value) ? value : [value]
  // }
  // instance.slots = slots


  const slots = {}
  for (const key in children) {
    const value = children[key];
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
  instance.slots = slots

}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}