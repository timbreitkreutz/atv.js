import { refreshTargets } from "atv/target";
import { refreshValues } from "atv/value";
import { functionify } from "atv/utilities";

// ATV/controller
//
// This is the worker bee, a controller specifically attached
// to a given dom element.

function createController(controllerManager, element) {
  const targets = {}; // Exposed to ATV controller code
  const values = {}; // Exposed to ATV controller code
  const {prefix, controllerName} = controllerManager;

  // Used to update controllers if importmap is changed to a new cache name
  const controller = {
    element,
    moduleVersion: controllerManager.version,
    prefix,
    targets,
    values
  };

  // Update or find associated targets and values
  function refresh() {
    refreshValues(controllerManager, element, values);
    refreshTargets(controllerManager, element, targets);
  }

  controller.refresh = refresh;

  refresh();

  // This is where the actual connection to the controller instance happens
  const result = controllerManager.module.connect(
    targets,
    values,
    element,
    controllerManager.outlets
  );
  controller.actions = functionify(result);
  return controller;
}

export { createController };
