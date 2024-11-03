/* global document, window, console */

//
// ATV.js: Actions, Targets, Values
//
// Super vanilla JS / Lightweight alternative to stimulus without "class"
// overhead and binding nonsense, just the actions, targets, and values
// Also as underscore/hyphen indifferent as possible to ease the learning curve

// The MIT License (MIT)

// Copyright (c) 2024 Timothy Breitkreutz

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

const version = "0.0.23";

// To dynamically load up the ATV javascripts
const importMap = JSON.parse(
  document.querySelector("script[type='importmap']").innerText
).imports;

// Allow for any permutation of underscores and dashes in the data parts
// of the DOM elements. No more wasting time on guessing the permutation
// stimulus style!

/* General functions, not tied to a specific activation */

const permutationPattern = /[\-_]/;
const deCommaPattern = /,[\s+]/;

function pascalize(string) {
  return string
    .split(permutationPattern)
    .map((str) => str.charAt(0).toUpperCase() + str.slice(1))
    .join("");
}

function camelize(string) {
  const pascalized = pascalize(string);
  return pascalized.charAt(0).toLowerCase() + pascalized.slice(1);
}

function allPermutations(name, callback, prefix = null) {
  const words = name.split(permutationPattern);
  if (words.length < 2) {
    if (prefix) {
      callback(`${prefix}-${name}`);
      callback(`${prefix}_${name}`);
    } else {
      callback(name);
    }
    return;
  }
  if (prefix) {
    allPermutations(
      words.slice(1).join("-"),
      callback,
      `${prefix}-${words[0]}`
    );
    allPermutations(
      words.slice(1).join("-"),
      callback,
      `${prefix}_${words[0]}`
    );
    return;
  }
  allPermutations(words.slice(1).join("-"), callback, `${words[0]}`);
}

function querySelectorAll(container, selector, callback) {
  allPermutations(`data-${selector}`, (variant) => {
    container.querySelectorAll(`[${variant}]`).forEach((element) => {
      const dataAttributeName = camelize(variant.replace(/^data-/, ""));
      callback(element, dataAttributeName, variant);
    });
  });
}

function jsonParseArray(string) {
  if (/^[\[{]/.test(string)) {
    return JSON.parse(string);
  }
  return string.split(deCommaPattern).map((str) => str.trim());
}

// Parses out actions:
// "requestedEvent->controller#actionName(args)" =>
//      requestedEvent, actionName, controller, args
// "click" => click, click, null, null
let parseActions = function (string) {
  const definitions = jsonParseArray(string);
  return definitions.map(function (definition) {
    let [requestedEvent, fullAction] = definition.split(/[\-=]>/);
    if (!fullAction) {
      fullAction = requestedEvent;
      requestedEvent = requestedEvent.split(/[#(),]/)[0];
    }
    let [controller, innerAction] = fullAction.split("#");
    if (!innerAction) {
      innerAction = controller;
      controller = undefined;
    }
    let [actionName, args] = innerAction.split(/[()]/);
    if (!actionName) {
      actionName = requestedEvent;
    }
    if (args) {
      args = args.split(deCommaPattern);
    }
    return [requestedEvent, actionName, controller, args];
  });
};

function dataFor(element, name) {
  if (!element.dataset) {
    return;
  }
  let result = element.dataset[name] || element.dataset[camelize(name)];
  if (!result) {
    allPermutations(name, (perm) => {
      if (!result) {
        result = element.dataset[perm];
      }
    });
  }
  return result;
}

const activate = (prefix = "atv-", reactivate = false) => {
  let atvRoots = new Map();
  let activated = false;
  const observer = new MutationObserver(domWatcher);

  // Find any controlles attached to element
  function controllersFor(element) {
    const list = dataFor(element, `${prefix}controller`);
    if (list) {
      return list.replace(/_/g, "-").split(deCommaPattern);
    } else {
      return [];
    }
  }

  // Calculate selector for all controlers
  let selectors = [];
  allPermutations(`data-${prefix}controller`, (perm) => {
    selectors.push(`[${perm}]`);
  });
  const atvControllerSelector = selectors.join(",");

  // To allow for nesting controllers:
  // skip if it's not the nearest enclosing controller
  function outOfScope(element, root, name) {
    // There should only be one of these.
    // Behavior undefined if it finds more than one permutation.
    const closestRoot = element.closest(atvControllerSelector);
    let out = false;
    controllersFor(closestRoot).forEach((controller) => {
      if (controller === name) {
        out = !(closestRoot === root);
      }
    });
    return out;
  }

  // Find the nearest named controller for an element
  function containingNamedController(element, name) {
    const closestRoot = element.closest(atvControllerSelector);
    if (!closestRoot) {
      return undefined;
    }
    let foundRoot;
    controllersFor(closestRoot).forEach((controller) => {
      if (foundRoot) {
        return;
      }
      if (controller === name) {
        foundRoot = closestRoot;
        return;
      }
    });
    if (foundRoot) {
      return foundRoot;
    }
    return containingNamedController(closestRoot.parentNode, name);
  }

  // Find all declared actions for an ATV controller and add listeners
  function findActions(root, name, actionName, handler) {
    let actionHandlers = [];
    function registerAction(element, definitions) {
      parseActions(definitions).forEach((definition) => {
        const [requestedEvent, definedActionName, controller, args] =
          definition;
        if (controller && controller !== name) {
          return;
        }
        if (actionName !== definedActionName) {
          return;
        }
        if (outOfScope(element, root, name)) {
          return;
        }
        const callback = (event) => handler(event.target, event, args);
        actionHandlers.push([element, requestedEvent, callback]);
        element.addEventListener(requestedEvent, callback);
      });
    }

    querySelectorAll(
      root,
      `${prefix}${name}-action`,
      (element, dataAttributeName) => {
        const definitions = `["${element.dataset[dataAttributeName]}"]`;
        if (definitions) {
          registerAction(element, definitions);
        } else {
          console.error(`Malformed action: ${name}/${dataAttributeName}`);
        }
      }
    );

    querySelectorAll(
      root,
      `${prefix}${name}-actions`,
      (element, dataAttributeName) => {
        const definitions = element.dataset[dataAttributeName];
        if (definitions) {
          registerAction(element, definitions);
        } else {
          console.error(`Malformed actions: ${name}/${dataAttributeName}`);
        }
      }
    );

    // Stimulus-style action definition (inculding sequences)
    function buildSequence(element, dataAttributeName) {
      function invokeNext(sequence, forEvent) {
        return function (event) {
          // Complete condition
          const definition = sequence[0];
          if (!definition) {
            return false;
          }

          // Skip conditions
          const [requestedEvent, action, controller, args] = definition;
          const remainder = sequence.slice(1);
          if (!controller || requestedEvent !== forEvent) {
            return invokeNext(remainder, forEvent)(event);
          }

          const atvControllerElement = containingNamedController(
            event.target,
            controller
          );
          if (!atvControllerElement) {
            return invokeNext(remainder, forEvent)(event);
          }

          // Execute conditions
          const actions =
            atvRoots.get(atvControllerElement)[controller]?.actions;
          if (actions) {
            const func = actions[action];
            if (func) {
              const result = func(event.target, event, args);
              if (result) {
                return invokeNext(remainder, forEvent)(event);
              }
              return false;
            }
          }
          return invokeNext(remainder, forEvent)(event);
        };
      }

      const actionList = element.dataset[dataAttributeName];
      if (!actionList) {
        return;
      }
      const sequence = parseActions(actionList);
      const eventList = new Set();
      sequence.forEach((definition) => {
        eventList.add(definition[0]);
      });
      eventList.forEach((forEvent) => {
        let found = false;
        sequence.forEach((definition) => {
          const [requestedEvent] = definition;
          if (forEvent !== requestedEvent) {
            return;
          }
          found = true;
        });
        if (found) {
          const callback = invokeNext(sequence, forEvent);
          actionHandlers.push([element, forEvent, callback]);
          element.addEventListener(forEvent, callback);
        }
      });
    }
    querySelectorAll(root, `${prefix}actions`, (element, dataAttributeName) => {
      buildSequence(element, dataAttributeName);
    });
    querySelectorAll(root, `${prefix}action`, (element, dataAttributeName) => {
      buildSequence(element, dataAttributeName);
    });
    return actionHandlers;
  }

  // Find all declared targets for this ATV and provide them to the ATV instance
  function findTargets(root, name) {
    const container = root.parentNode;
    let targets = {};

    querySelectorAll(container, `${prefix}${name}-target`, (element) => {
      if (outOfScope(element, root, name)) {
        return;
      }
      const targetPattern = `${prefix}${name}-target`;
      const key = dataFor(element, targetPattern);
      const allKey = `all${pascalize(key)}`;

      if (targets[allKey]) {
        targets[allKey].push(element);
      } else if (targets[key]) {
        targets[allKey] = [targets[key], element];
        delete targets[key];
      } else {
        targets[key] = element;
      }
    });

    return targets;
  }

  // Find the values data element and provide it to the ATV instance
  // Assumption:
  //   all values are in a single data declaration, JSON encoded as a hash
  function findValues(root, name) {
    let container = root.parentNode;
    let values;

    const valuePattern = `${prefix}${name}-values`;
    querySelectorAll(container, valuePattern, (element) => {
      if (values || outOfScope(element, root, name)) {
        return;
      }
      const data = dataFor(element, valuePattern);
      if (data) {
        values = JSON.parse(data);
      }
    });

    return values;
  }

  function cleanupController(controllers, name) {
    const controller = controllers[name];
    const handlers = controller.handlers;
    Object.keys(handlers).forEach((key) => {
      const entries = handlers[key];
      entries.forEach((entry) => {
        entry[0].removeEventListener(entry[1], entry[2]);
      });
    });

    if (controller.disconnect) {
      controller.disconnect();
      controller.disconnect = undefined;
    }
  }

  function findControllers(selector, type, callback) {
    document.querySelectorAll(selector).forEach((element) => {
      const root = atvRoots.get(element);
      if (root && root[type]) {
        callback(root[type]);
      }
    });
  }

  function createController(root, name, module) {
    let controllers = atvRoots.get(root);
    if (!controllers) {
      controllers = {};
    }
    if (controllers[name]) {
      cleanupController(controllers, name);
    }

    let controller = {
      actions: {},
      handlers: {},
      name: name,
      root: root
    };

    controller.targets = findTargets(root, name);
    controller.values = findValues(root, name);
    let callbacks = module.connect(
      controller.targets,
      controller.values,
      root,
      findControllers
    );
    if (typeof callbacks === "function") {
      callbacks = callbacks();
    }
    Object.keys(callbacks).forEach((type) => {
      controller.actions[type] = callbacks[type];
      if (type === "disconnect") {
        controller.disconnect = callbacks[type];
      } else {
        controller.handlers[type] = findActions(
          root,
          name,
          type,
          callbacks[type]
        );
      }
    });

    controllers[name] = controller;
    atvRoots.set(root, controllers);
  }

  // Gather the context for this instance, provide it to the controller instance
  function registerController(root) {
    controllersFor(root).forEach((name) => {
      let importmapName = `${name}_atv`;
      Object.keys(importMap).forEach((source) => {
        if (source.replace(/_/g, "-").includes(`/${name}-atv`)) {
          importmapName = importMap[source];
        }
      });
      import(importmapName)
        .then((module) => {
          createController(root, name, module);
        })
        .catch((error) => {
          console.error("Loading failed:", error);
        });
    });
  }

  function cleanup() {
    observer.disconnect();
    atvRoots.forEach((controllers) => {
      Object.keys(controllers).forEach((name) => {
        cleanupController(controllers, name);
      });
    });
    atvRoots = new Map();
  }

  function report(type, addedCount) {
    if (addedCount < 1) {
      return;
    }
    console.log(
      [
        `${prefix}controllers: ${atvRoots.size} present`,
        `${addedCount} added. (${type})`
      ].join(" / ")
    );
  }

  function domWatcher(mutationList, _observer) {
    if (!activated) {
      return;
    }
    let atvRemoved = false;
    mutationList.forEach((mutation) => {
      if (atvRemoved) {
        return;
      }
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach((node) => {
          if (atvRemoved || !node.querySelector) {
            return;
          }
          if (node.dataset) {
            const data = dataFor(node, `${prefix}controller`);
            if (data) {
              atvRemoved = true;
              return;
            }
          }
          const atv = node.querySelector(atvControllerSelector);
          if (atv) {
            atvRemoved = true;
            return;
          }
        });
      }
    });

    if (atvRemoved) {
      cleanup();
      activate(prefix);
      return;
    }

    let addedCount = 0;
    mutationList.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (!node.parentNode?.querySelector) {
            return;
          }
          node.parentNode
            .querySelectorAll(atvControllerSelector)
            .forEach((controller) => {
              if (!atvRoots.has(controller)) {
                registerController(controller);
                addedCount += 1;
              }
            });
        });
      }
    });

    if (addedCount > 0) {
      report("mutation", addedCount);
    }
  }

  let addedCount = 0;
  document.querySelectorAll(atvControllerSelector).forEach((root) => {
    registerController(root);
    addedCount += 1;
  });

  report("activate", addedCount);

  activated = true;
  const config = { childList: true, subtree: true };
  observer.observe(document, config);
};

export { activate };
