/*jslint white*/
/*global document, MutationObserver*/
import { underscore } from "atv/utilities";

// ATV/importmap
//
// Responsible for finding all the available ATV controllers
// in the importmaps. Also provides a global list of all
// controller type names

const importMapSelector = "script[type='importmap']";
const allControllerNames = new Set();

function importMap() {
  return JSON.parse(document.querySelector(importMapSelector).innerText)
    .imports;
}

// This method is called first upon activation (booting) of ATV
// for a given prefix. The callback receives a set of fully
// instantiated ES6 modules and will complete initialization.
function loadImportmap(complete) {
  const importMapper = new RegExp(`^controllers\/(.*)[-_]atv$`);
  const moduleDefinitions = [];

  function reloadModules() {
    const map = importMap();
    const moduleLoaderPromises = [];

    Object.keys(map).forEach(function (source) {
      const matched = source.match(importMapper);
      if (!matched) {
        return;
      }
      const controllerName = matched[1]
        .split("/")
        .join("--")
        .replace(underscore, "-");
      allControllerNames.add(controllerName);
      moduleLoaderPromises.push(
        new Promise(function (resolve) {
          import(source).then(function (module) {
            const version = `${map[source]}`;
            moduleDefinitions.push({
              controllerName,
              module,
              version
            });
            resolve(module);
          });
        })
      );
    });

    Promise.allSettled(moduleLoaderPromises).then(() =>
      complete(moduleDefinitions)
    );
  }

  // This watcher is just for the importmap header script itself.
  function setupDomWatcher() {
    const observer = new MutationObserver(reloadModules);
    observer.observe(document.querySelector(importMapSelector), {
      childList: true,
      subtree: true
    });
  }

  reloadModules();
  setupDomWatcher();
}

export { allControllerNames, loadImportmap };
