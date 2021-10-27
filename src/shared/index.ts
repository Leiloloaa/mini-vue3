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