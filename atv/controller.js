/*jslint white*/
import { refreshTargets } from "atv/target";
import { refreshValues } from "atv/value";
import { functionify } from "atv/utilities";

// ATV Controller
//
// This is the worker bee, a controller specifically attached
// to a given dom element.

function createController(controllerManager, element) {
  const targets = {}; // Exposed to ATV controller code
  const values = {}; // Exposed to ATV controller code
  const { controllerName, prefix } = controllerManager;

  // Used to update controllers if importmap is changed to a new cache name
  const controller = {
    controllerName,
    element,
    moduleVersion: controllerManager.version,
    prefix,
    targets,
    values
  };

  // Update or find associated targets and values
  controller.refresh = function () {
    refreshValues(controllerManager, element, values);
    refreshTargets(controller);
  };

  // First pass, controllers and events
  controller.refresh();

  controller.disconnect = function () {
    if (controller.actions?.disconnect) {
      controller.actions.disconnect();
    }
  };

  // This is where the actual connection to the controller instance happens
  const result = controllerManager.module.connect(
    targets,
    values,
    element,
    controllerManager.outlets
  );
  controller.actions = functionify(result);

  // Second pass, with actions
  controller.refresh();

  return controller;
}

export { createController };
