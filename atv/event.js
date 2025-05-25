/*jslint white*/
import { distinctEventNamesFor, act } from "atv/action";
import { allActionElements } from "atv/element-finder";

// ATV
const allHandlers = new Map();

function refreshHandler(prefix, element, eventName) {
  if (!allHandlers.get(element)) {
    allHandlers.set(element, {});
  }
  if (allHandlers.get(element)[eventName]) {
    return;
  }
  const handler = function (event) {
    act(prefix, element, eventName, event);
  };
  allHandlers.get(element)[eventName] = handler;
  element.addEventListener(eventName, handler);
}

function refreshEvents(prefix) {
  allActionElements(prefix).forEach(function (element) {
    distinctEventNamesFor(prefix, element).forEach(function (eventName) {
      refreshHandler(prefix, element, eventName);
    });
  });
}

export { refreshEvents };
