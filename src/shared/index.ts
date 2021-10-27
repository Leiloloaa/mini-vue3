export const extend = Object.assign;

export const isObject = (value) => {
  return value !== null && typeof value === "object";
};

export const isString = (value) => {
  return value !== null && typeof value === "string";
};

export const hasChanged = (val, newValue) => {
  return !Object.is(val, newValue);
};

export const isOn = (key) => {
  return /^on[A-Z]/.test(key)
}

export const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)

export const camelize = (str) => {
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