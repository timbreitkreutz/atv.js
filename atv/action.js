/*jslint white*/
import { controllerFor } from "atv/controller-manager";
import { dataPrefix } from "atv/utilities";
import { parseActions } from "atv/action-parser";

function actionSequence(prefix, element) {
  const matcher = new RegExp(`${dataPrefix(prefix)}[-_](.*)[_-]?actions?$`);

  let parsed = [];

  element.getAttributeNames().forEach(function (attributeName) {
    const match = attributeName.match(matcher);
    if (match) {
      const defaultController = match[1].replace(/[\-_]$/, "");
      const concatenate = function (action) {
        parsed = parsed.concat(parseActions(action, defaultController));
      };
      const attribute = element.getAttribute(attributeName);
      if (attribute.startsWith("[")) {
        JSON.parse(attribute).forEach(concatenate);
      } else {
        concatenate(attribute);
      }
    }
  });
  return parsed;
}

function distinctEventNamesFor(prefix, element) {
  let result = new Set();
  actionSequence(prefix, element).forEach(function (action) {
    if (action?.eventName) {
      result.add(action.eventName);
    }
  });
  return Array.from(result);
}

// Respond to an event
function act(prefix, element, incomingEventName, event) {
  let finished = false;
  actionSequence(prefix, element).forEach(function ({
    controllerName,
    eventName,
    method,
    parameters
  }) {
    if (finished || eventName !== incomingEventName) {
      return;
    }
    const controller = controllerFor(prefix, controllerName, element);
    if (controller && controller.actions[method]) {
      if (!controller.actions[method](event.target, event, parameters)) {
        finished = true;
      }
    }
  });
}

export { act, actionSequence, distinctEventNamesFor };
