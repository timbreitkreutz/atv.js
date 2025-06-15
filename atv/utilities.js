/*jslint white*/

// ATV Various Utilities

const deCommaPattern = /,[\s+]/;
const isNumber = new RegExp("^-?\\d*[.]?\\d+$");
const isQuote = new RegExp("[\"']");
const isWord = new RegExp("\\w+");
const underscore = new RegExp("[_]", "g");
const trailingDash = new RegExp("[-_]$");

function attributesFor(element, type) {
  return attributeKeysFor(element, type).map(function (name) {
    return element.getAttribute(name);
  });
}

function attributeKeysFor(element, type) {
  if (!element || !element.getAttributeNames) {
    return [];
  }
  const regex = new RegExp(`${type}s?$`, "i");
  return element.getAttributeNames().filter((name) => regex.test(name));
}

function dasherize(string) {
  return string.replace(/_/g, "-");
}

function dataPrefix(prefix) {
  if (prefix) {
    return `data-${prefix}`;
  }
  return "data";
}

function functionify(value) {
  if (typeof value === "function") {
    return value();
  }
  return value;
}

export {
  attributesFor,
  dasherize,
  dataPrefix,
  deCommaPattern,
  functionify,
  isNumber,
  isQuote,
  isWord,
  trailingDash,
  underscore
};
