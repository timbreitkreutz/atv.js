const dashUnderscore = new RegExp("[_\\-]$", "g");
const deCommaPattern = /,[\s+]/;
const endsWithAtv = new RegExp("/-atv$/");
const isNumber = new RegExp("^-?\\d*[.]?\\d+$");
const isQuote = new RegExp("[\"']");
const isWord = new RegExp("\\w+");
const underscore = new RegExp("[_]", "g");
const variantPattern = /[\-_]/;

function dasherize(string) {
  return string.replace(/_/g, "-");
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function attributeKeysFor(element, type) {
  if (!element || !element.getAttributeNames) {
    return [];
  }
  const regex = new RegExp(`${type}s?$`, "i");
  return element.getAttributeNames().filter((name) => regex.test(name));
}

function attributesFor(element, type) {
  return attributeKeysFor(element, type).map((name) =>
    element.getAttribute(name)
  );
}

function dataPrefix(prefix) {
  if (prefix) {
    return `data-${prefix}`;
  }
  return "data";
}

function debounce(func, timeout = 300) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(function () { 
      func(...args); 
    }, timeout);
  };
}

function functionify(value) {
  if (typeof value === "function") {
    return value();
  }
  return value;
}

export {
  attributesFor,
  capitalize,
  dashUnderscore,
  dasherize,
  dataPrefix,
  debounce,
  deCommaPattern,
  endsWithAtv,
  functionify,
  isNumber,
  isQuote,
  isWord,
  underscore,
  variantPattern
};
