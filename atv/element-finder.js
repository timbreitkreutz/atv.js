/*jslint white*/
/*global document*/
import { attributesFor, dasherize, deCommaPattern } from "atv/utilities";
import { allControllerNames } from "atv/importmap";

// ATVs selector logic

function rawSelector(prefix, type) {
  let dashPrefix = "";
  if (prefix) {
    dashPrefix = `${prefix}-`;
  }
  return ["data-", dashPrefix, type].join("");
}

function allControllerElements(prefix) {
  const result = [];
  const selector = rawSelector(prefix, "controller");
  const elements = Array.from(
    document.body.querySelectorAll(friendlySelector(selector))
  );
  elements.forEach(function (element) {
    allVariants(selector).forEach(function (variant) {
      const value = element.getAttribute(variant);
      if (value) {
        value.split(/[\s,]+/).forEach(function (controllerName) {
          result.push([controllerName.replace(/_/g, "-"), element]);
        });
      }
    });
  });
  return result;
}

function allActionElements(prefix) {
  const result = new Set();

  function collectActions(selector) {
    Array.from(
      document.body.querySelectorAll(friendlySelector(selector))
    ).forEach(function (element) {
      element.getAttributeNames().forEach(function (attributeName) {
        if (/^data.*actions?$/.test(attributeName)) {
          result.add(element);
        }
      });
    });
  }
  collectActions(rawSelector(prefix, "action"));
  allControllerNames.forEach(function (controllerName) {
    collectActions(rawSelector(prefix, `${controllerName}-action`));
  });
  return Array.from(result);
}

function controllerSelector(prefix) {
  return `[${rawSelector(prefix, "controller")}]`;
}

function outOfScope(element, rootElement, controllerName, prefix) {
  if (!element || element.nodeType === "BODY") {
    return true;
  }
  const closestRoot = element.closest(controllerSelector(prefix));
  if (!closestRoot) {
    return true;
  }
  let out = false;
  attributesFor(closestRoot, "controller").forEach(function (attr) {
    const list = attr.split(deCommaPattern).map((str) => dasherize(str));
    if (list.includes(controllerName)) {
      out = !(closestRoot === rootElement);
    } else {
      out = outOfScope(
        closestRoot.parentNode,
        rootElement,
        controllerName,
        prefix
      );
    }
  });
  return out;
}

const variantRegex = new RegExp("([^_-]+)[-_]?(.*)");
const startRegex = new RegExp("^[-_]");

function allVariants(selector) {
  if (!selector) {
    return [];
  }
  const variants = new Set();
  function addVariants(prefix, remainder) {
    if (remainder) {
      const match = remainder.match(variantRegex);
      if (match) {
        const first = match[1];
        const rest = match[2];
        addVariants(`${prefix}-${first}`, rest);
        addVariants(`${prefix}_${first}`, rest);
        return;
      }
    }
    const result = prefix.replace(startRegex, "");
    variants.add(result);
    variants.add(`${result}s`);
  }
  addVariants("", selector);
  return Array.from(variants);
}

function friendlySelector(selector) {
  return allVariants(selector)
    .map((item) => `[${item}]`)
    .join(",");
}

export {
  allActionElements,
  allControllerElements,
  allVariants,
  controllerSelector,
  friendlySelector,
  outOfScope
};
