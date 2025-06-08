/*jslint white*/
/*global document, console, MutationObserver */
import {
  allControllerElements,
  controllerSelector,
  friendlySelector
} from "atv/element-finder";
import { createController } from "atv/controller";
import { refreshEvents } from "atv/event";
import { stateMap } from "atv/state-map";

// ATV Controller Manager
//
// Reponsible for managing all the instances of a given controller type,
// E.g. <div data-atv-controller="my-controller">:
// There will be one "manager" for "my" with the prefix "atv", responsible
// for care and feeding of the controllers (worker bees).

const allControllers = stateMap();

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
      const controller = allControllers.get(prefix, element, controllerName);
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
      const liveList = stateMap();
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
        if (!controller) {
          const newController = createController(manager, element);
          manager.controllers.set(element, newController);
          allControllers.set(prefix, element, controllerName, newController);
        }
        liveList.set(element, controllerName, true);
        controllerCount += 1;
      });
      allControllers
        .get(prefix)
        ?.keys()
        ?.forEach(function (element) {
          allControllers
            .get(prefix, element)
            ?.keys()
            ?.forEach(function (controllerName) {
              if (liveList.get(element, controllerName)) {
                return;
              }
              const controller = allControllers.destroy(
                prefix,
                element,
                controllerName
              );
              const disconnector = controller?.actions?.disconnect;
              if (disconnector) {
                disconnector();
              }
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

// Find the container controller by prefix and name for element
function controllerFor(prefix, element, controllerName) {
  if (element === undefined) {
    return;
  }
  const controller = allControllers.get(prefix, element, controllerName);
  if (controller) {
    return controller;
  }
  return controllerFor(prefix, element.parentNode, controllerName);
}

export { controllerFor, createControllerManager };
