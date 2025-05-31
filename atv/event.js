/*jslint white*/
import { allActionElements } from "atv/element-finder";
import { distinctEventNamesFor, act } from "atv/action";
import { stateMap } from "atv/state-map";

// ATV Event Handlers

const allHandlers = stateMap();

function refreshHandler(prefix, element, eventName) {
  if (allHandlers.get(prefix, element, eventName)) {
    return;
  }
  const handler = function (event) {
    act(prefix, element, eventName, event);
  };
  allHandlers.set(prefix, element, eventName, () => handler);
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
