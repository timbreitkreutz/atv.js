/*jslint white*/
import { createControllerManager } from "atv/controller-manager";
import { loadImportmap } from "atv/importmap";
import { stateMap } from "atv/state-map";

// ATV Application
//
// Maintain list of applications in this top-level module
//
// An application is identified by its "prefix"-- default "atv"
// This allows for avoiding name collisions *and* independent apps on
// the same page.

function createApplication(prefix) {
  const application = {};
  const manager = createControllerManager(prefix);

  application.activate = function () {
    loadImportmap(manager.refresh);
  };
  application.manager = manager;

  return application;
}

const applications = stateMap("applications");

function activate(prefix = "atv") {
  prefix = `${prefix}`;
  applications.initialize(prefix, function () {
    const application = createApplication(prefix);
    application.activate();
    return application;
  });
}

export { activate };
