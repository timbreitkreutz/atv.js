/*jslint white*/
import { camelize } from "atv/utilities";
import { outOfScope, friendlySelector } from "atv/element-finder";
import { pluralize } from "atv/pluralize";
import { stateMap } from "atv/state-map";

// ATV Targets
//
// Responsible for keeping track of all the targets on the page

const targetMatchers = {};
const targetSelectors = {};
const allConnectedTargets = stateMap();

function refreshTargets(controller) {
  const { actions, controllerName, prefix, targets } = controller;
  if (!actions) {
    return;
  }
  const rootElement = controller.element;
  let matcherKey = controllerName;
  if (prefix) {
    matcherKey = `${prefix}-${controllerName}`;
  }
  const liveList = new Set();

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

  function updateTargets(element) {
    if (outOfScope(element, rootElement, controllerName, prefix)) {
      return;
    }
    element.getAttributeNames().forEach(function (attributeName) {
      if (dataMatcher().test(attributeName)) {
        const parsed = element.getAttribute(attributeName);
        parsed.split(/[\s]*,[\s]*/).forEach(function (key) {
          liveList.add(element);
          if (allConnectedTargets.get(controller, element, key)) {
            return;
          }
          const pluralKey = pluralize(key);
          if (targets[pluralKey]?.includes(element)) {
            return;
          }
          allConnectedTargets.set(controller, element, key, true);
          targets[key] = element;
          if (!targets[pluralKey]) {
            targets[pluralKey] = [];
          }
          targets[pluralKey].push(element);
          const connectAction = `${camelize(key)}TargetConnected`;
          if (actions[connectAction]) {
            actions[connectAction](element);
          }
        });
      }
    });
  }
  updateTargets(rootElement);
  rootElement.querySelectorAll(dataSelector()).forEach(updateTargets);

  // prune out targets no longer there.
  if (targets) {
    Object.keys(targets).forEach(function (key) {
      const pluralKey = pluralize(key);
      const targetList = targets[pluralKey];
      if (!Array.isArray(targetList)) {
        return;
      }
      targetList.forEach(function (element) {
        if (!liveList.has(element)) {
          allConnectedTargets.destroy(controller, element, key);
          if (targets[pluralKey].length === 0) {
            delete targets[pluralKey];
            delete targets[key];
          } else {
            const index = targets[pluralKey].indexOf(element);
            targets[pluralKey].splice(index, 1);
            if (targets[key] === element) {
              targets[key] = targets[pluralKey][0];
            }
          }
          const disconnectAction = `${camelize(key)}TargetDisconnected`;
          if (actions[disconnectAction]) {
            actions[disconnectAction](element);
          }
        }
      });
    });
  }
}

export { refreshTargets };
