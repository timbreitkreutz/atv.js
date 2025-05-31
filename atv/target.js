/*jslint white*/
import { outOfScope, friendlySelector } from "atv/element-finder";
import { pluralize } from "atv/pluralize";

// ATV Targets
//
// Responsible for keeping track of all the targets on the page

const targetMatchers = {};
const targetSelectors = {};

function refreshTargets(controllerManager, rootElement, targets) {
  const controllerName = controllerManager.controllerName;
  const prefix = controllerManager.prefix;
  let matcherKey = controllerName;
  if (prefix) {
    matcherKey = `${prefix}-${controllerName}`;
  }

  function dataMatcher() {
    if (!targetMatchers[matcherKey]) {
      const friendlyName = controllerName.replace(/-/g, "[-_]");
      let parts = ["data[-_]", prefix];
      if (prefix) {
        parts.push(`[-_]${friendlyName}[-_]target[s]?`);
      }
      targetMatchers[matcherKey] = new RegExp(parts.join(""));
    }
    return targetMatchers[matcherKey];
  }

  function dataSelector() {
    if (!targetSelectors[matcherKey]) {
      targetSelectors[matcherKey] = friendlySelector(
        `data-${matcherKey}-target`
      );
    }
    return targetSelectors[matcherKey];
  }

  Object.keys(targets).forEach(function (key) {
    delete targets[key];
  });

  function updateTargets(element) {
    if (outOfScope(element, rootElement, controllerName, prefix)) {
      return;
    }
    element.getAttributeNames().forEach(function (attributeName) {
      if (dataMatcher().test(attributeName)) {
        const parsed = element.getAttribute(attributeName);
        parsed.split(/[\s]*,[\s]*/).forEach(function (key) {
          const pluralKey = pluralize(key);
          if (targets[pluralKey]?.includes(element)) {
            return;
          }
          targets[key] = element;
          if (!targets[pluralKey]) {
            targets[pluralKey] = [];
          }
          targets[pluralKey].push(element);
        });
      }
    });
  }
  updateTargets(rootElement);
  rootElement.querySelectorAll(dataSelector()).forEach(updateTargets);
}

export { refreshTargets };
