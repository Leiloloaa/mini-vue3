export const extend = Object.assign;

export const isObject = (value) => {
  return value !== null && typeof value === "object"
};

export const isString = (value) => {
  return value !== null && typeof value === "string"
};

export const isArray = (value) => {
  return value !== null && Array.isArray(value)
};


export const hasChanged = (value, newValue) => { return !Object.is(value, newValue) };