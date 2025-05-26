/*jslint white*/
/*global document, console, MutationObserver */
import {
  allControllerElements,
  controllerSelector,
  friendlySelector
} from "atv/element-finder";
import { createController } from "atv/controller";
import { refreshEvents } from "atv/event";

// ATV/controller-manager
//
// Reponsible for managing all the instances of a given controller type,
// E.g. <div data-atv-controller="my-controller">:
// There will be one "manager" for "my" with the prefix "atv", responsible
// for care and feeding of the controllers (worker bees).
//

const allControllers = new Map();

function elementKey(prefix, controllerName) {
  return `${prefix}:${controllerName}`;
}

function createControllerManager(prefix) {
  const selector = controllerSelector(prefix);
  const managers = {};
  let watchingDom = false;

  let log = () => undefined;
  if (document.querySelector(friendlySelector(`data-${prefix}-report`))) {
    log = (message) => console.log(`ATV (${prefix}): ${message}`);
  }

  // Find outlets (provided to atv controllers as fourth connect parameter)
  function outlets(selector, controllerName, callback) {
    document.querySelectorAll(selector).forEach(function (element) {
      const controllerList = allControllers.get(element);
      if (!controllerList) {
        return;
      }
      const key = elementKey(prefix, controllerName);
      const controller = controllerList[key];
      if (controller) {
        callback(controller);
      }
    });
  }

  // This public function receives a set of ES6 modules from
  // the importmap loader
  function refresh(moduleDefinitions) {
    let controllerCount = 0;

    function refreshModule({ controllerName, module, version }) {
      const manager = managers[controllerName];
      if (!manager || manager.version !== version) {
        const staleControllers = manager?.controllers;
        if (staleControllers) {
          staleControllers.forEach(function (controller) {
            controller.disconnect();
          });
        }

        // Manager structure
        managers[controllerName] = {
          controllerName,
          controllers: new Map(),
          module,
          outlets,
          prefix,
          selector,
          version
        };
      }
    }

    function addOrUpdateControllers() {
      const liveList = new Map();
      allControllerElements(prefix).forEach(function ([
        controllerName,
        element
      ]) {
        const manager = managers[controllerName];
        if (!manager) {
          console.error(`ATV: Missing module: ${prefix}/${controllerName}`);
          return;
        }
        let controller = manager.controllers.get(element);
        if (controller?.disconnect) {
          controller.disconnect();
          controller = undefined;
        }
        const key = elementKey(prefix, controllerName);
        if (!controller) {
          const newController = createController(manager, element);
          manager.controllers.set(element, newController);
          if (!allControllers.has(element)) {
            allControllers.set(element, {});
          }
          if (!allControllers.get(element)[key]) {
            allControllers.get(element)[key] = newController;
          }
        }
        if (!liveList.has(element)) {
          liveList.set(element, {});
        }
        liveList.get(element)[key] = true;
        controllerCount += 1;
      });
      allControllers.keys().forEach(function (element) {
        Object.keys(allControllers.get(element)).forEach(function (key) {
          if (!key.startsWith(`${prefix}:`)) {
            return;
          }
          if (liveList.get(element) && liveList.get(element)[key]) {
            return;
          }
          const controller = allControllers.get(element)[key];
          const disconnector = controller?.actions?.disconnect;
          if (disconnector) {
            controller.actions?.disconnect();
          }
          allControllers.get(element)[key] = undefined;
        });
      });
    }

    function refreshApplication() {
      addOrUpdateControllers();
      refreshEvents(prefix);
    }

    function setupDomWatcher() {
      if (watchingDom) {
        return;
      }
      watchingDom = true;
      const observer = new MutationObserver(refreshApplication);
      observer.observe(document.body, { childList: true, subtree: true });
      document.documentElement.addEventListener("turbo:load", function () {
        refreshApplication();
        watchingDom = false;
        setupDomWatcher();
      });
    }

    moduleDefinitions.forEach(refreshModule);
    refreshApplication();
    setupDomWatcher();
    const managerCount = Object.keys(managers).length;
    log(`Activated: Managers: ${managerCount} Controllers: ${controllerCount}`);
  }
  return { refresh };
}

// Find the container contrller by prefix and name for element
function controllerFor(prefix, controllerName, element) {
  if (!element || element === document.body) {
    return;
  }
  const controllerMap = allControllers.get(element);
  const key = elementKey(prefix, controllerName);
  if (controllerMap && controllerMap[key]) {
    return controllerMap[key];
  }
  return controllerFor(prefix, controllerName, element.parentNode);
}

export { controllerFor, createControllerManager };
