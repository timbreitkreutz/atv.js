/*global
  console, document, MutationObserver
*/

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

const version = "0.1.1";

// To dynamically load up the ATV javascripts
const importMap = JSON.parse(
  document.querySelector("script[type='importmap']").innerText
).imports;

/* --- General functions, not tied to a specific activation --- */

/* Variant in the context of ATV means either dash-case or snake_case */
const variantPattern = /[-_]/;

function pascalize(string) {
  return string
    .split(variantPattern)
    .map((str) => str.charAt(0).toUpperCase() + str.slice(1))
    .join("");
}

function camelize(string) {
  const pascalized = pascalize(string.toLowerCase());
  return pascalized.charAt(0).toLowerCase() + pascalized.slice(1);
}

const deCommaPattern = /,[\s+]/;

function jsonParseArray(string) {
  if (/^[[{]/.test(string)) {
    return JSON.parse(string);
  }
  return string.split(deCommaPattern).map((str) => str.trim());
}

/* Takes a string, invokes callback for each variation of
 * underscores and dashes */
function allVariants(name, callback, prefix = null) {
  const words = name.split(variantPattern);
  if (words.length < 2) {
    if (prefix) {
      callback(`${prefix}-${name}`);
      callback(`${prefix}_${name}`);
    } else {
      callback(name);
    }
    return;
  }
  const remainder = words.slice(1).join("-");
  if (prefix) {
    allVariants(remainder, callback, `${prefix}-${words[0]}`);
    allVariants(remainder, callback, `${prefix}_${words[0]}`);
  } else {
    allVariants(remainder, callback, `${words[0]}`);
  }
}

/* Invokes callback for each element found with the
 * data attribute set */
function selectVariants(container, dataAttribute, callback) {
  allVariants(`data-${dataAttribute}`, function (variant) {
    container.querySelectorAll(`[${variant}]`).forEach(function (element) {
      let dataAttributeName = variant.replace(/^data-/, "");
      if (!element.dataset[dataAttributeName]) {
        dataAttributeName = camelize(dataAttributeName);
      }
      callback(element, dataAttributeName, variant);
    });
  });
}

/* Parses actions in the data attributes:
 * "requestedEvent->controller#actionName(args)" =>
 *      requestedEvent, actionName, controller, args
 * "click" => click, click, null, null
 */
let parseActions = function (dataAttribute) {
  const definitions = jsonParseArray(dataAttribute);
  return definitions.map(function (definition) {
    let [requestedEvent, fullAction] = definition.split(/[-=]>/);
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

/* Extracts the value of the given data attribute from the element */
function dataFor(element, name) {
  if (!element?.dataset) {
    return;
  }
  let result = element.getAttribute(`data-${name}`);
  if (!result) {
    allVariants(name, function (variant) {
      if (!result) {
        result = element.dataset[variant];
      }
    });
  }
  return result;
}

/* Keep track of which namespaces have been activated already */
let activated = new Set();

/* --- Main activation function --- */
function activate(prefix = "atv") {
  const observer = new MutationObserver(domWatcher);
  if (prefix && !/-$/.test(prefix)) {
    prefix = `${prefix}-`;
  }
  if (activated.has(prefix)) {
    return;
  }

  let atvRoots = new Map(); // contains all the ATV controller state

  // Find any names of controllers attached to given element
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
  allVariants(`data-${prefix}controller`, function (variant) {
    selectors.push(`[${variant}]`);
  });
  const atvControllerSelector = selectors.join(",");

  // To allow for nesting controllers:
  // skip if it's not the nearest enclosing controller
  function outOfScope(element, root, name) {
    // There should only be one of these.
    // Behavior undefined if it finds more than one variant.
    const closestRoot = element.closest(atvControllerSelector);
    let out = false;
    controllersFor(closestRoot).forEach(function (controller) {
      if (controller === name) {
        out = !(closestRoot === root);
      }
    });
    return out;
  }

  // Find the nearest named controller for an element
  function controllerFor(element, name) {
    const closestRoot = element.closest(atvControllerSelector);
    if (!closestRoot) {
      return undefined;
    }
    let foundRoot;
    controllersFor(closestRoot).forEach(function (controller) {
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
    return controllerFor(closestRoot.parentNode, name);
  }

  let sequences = new Set();

  // Find all declared actions for an ATV controller and add listeners
  function findActions(root, name, actionName, handler) {
    let actionHandlers = [];
    function registerAction(element, definitions) {
      parseActions(definitions).forEach(function (definition) {
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
        const callback = function (event) {
          return handler(event.target, event, args);
        };
        actionHandlers.push([element, requestedEvent, callback]);
        element.addEventListener(requestedEvent, callback);
      });
    }

    // First ATV-style, with the controller name in the attribute name, singular
    selectVariants(
      root,
      `${prefix}${name}-action`,
      function (element, dataAttributeName) {
        const definitions = `["${element.dataset[dataAttributeName]}"]`;
        if (definitions) {
          registerAction(element, definitions);
        } else {
          console.error(`Malformed action: ${name}/${dataAttributeName}`);
        }
      }
    );

    // Next ATV-style, with the controller name in the attribute name, multiple
    selectVariants(
      root,
      `${prefix}${name}-actions`,
      function (element, dataAttributeName) {
        const definitions = element.dataset[dataAttributeName];
        if (definitions) {
          registerAction(element, definitions);
        } else {
          console.error(`Malformed actions: ${name}/${dataAttributeName}`);
        }
      }
    );

    // Stimulus-style action definition (including sequences)
    function buildSequence(element, dataAttributeName) {
      const actionList = element.dataset[dataAttributeName];

      // Invoke dynamically each time, this checks the return value to
      // decide each time whether to continue.
      function invokeNext(sequence, forEvent) {
        // Inner function is an event handler and will be hooked into the DOM
        return function (event) {
          // We are done if the sequence list is used up.
          const definition = sequence[0];
          if (!definition) {
            return false;
          }

          // Don't execute if it's for a different action
          const [requestedEvent, action, controller, args] = definition;
          const remainder = sequence.slice(1);
          if (!controller || requestedEvent !== forEvent) {
            return invokeNext(remainder, forEvent)(event);
          }

          // Skip if this isn't connecting to the "in scope" controller
          const atvControllerElement = controllerFor(event.target, controller);
          if (!atvControllerElement) {
            return invokeNext(remainder, forEvent)(event);
          }

          // Actually run it here
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

          // Finally send it along if there were no actions there.
          return invokeNext(remainder, forEvent)(event);
        };
      }

      if (!actionList) {
        return;
      }
      const sequence = parseActions(actionList);
      const eventList = new Set();
      sequence.forEach(function (definition) {
        eventList.add(definition[0]);
      });
      eventList.forEach(function (forEvent) {
        let found = false;
        sequence.forEach(function (definition) {
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
    ["", "s"].forEach(function (plural) {
      selectVariants(
        root,
        `${prefix}action${plural}`,
        function (element, dataAttributeName) {
          if (sequences.has(element)) {
            return;
          }
          sequences.add(element);
          buildSequence(element, dataAttributeName);
        }
      );
    });
    return actionHandlers;
  }

  // Find all declared targets for this ATV and provide them to the ATV instance
  function findTargets(root, name) {
    const container = root.parentNode;
    let targets = {};

    selectVariants(container, `${prefix}${name}-target`, function (element) {
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
    selectVariants(container, valuePattern, function (element) {
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
    Object.keys(handlers).forEach(function (key) {
      const entries = handlers[key];
      entries.forEach(function (entry) {
        entry[0].removeEventListener(entry[1], entry[2]);
      });
    });

    if (controller.disconnect) {
      controller.disconnect();
      controller.disconnect = undefined;
    }
  }

  function findControllers(selector, type, callback) {
    document.querySelectorAll(selector).forEach(function (element) {
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
    Object.keys(callbacks).forEach(function (type) {
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
    controllersFor(root).forEach(function (name) {
      let importmapName = `${name}_atv`;
      Object.keys(importMap).forEach(function (source) {
        if (source.replace(/_/g, "-").includes(`/${name}-atv`)) {
          importmapName = importMap[source];
        }
      });
      import(importmapName)
        .then(function (module) {
          createController(root, name, module);
        })
        .catch(function (error) {
          console.error("Loading failed:", error);
        });
    });
  }

  // Cleans up all state for given prefix
  function cleanup() {
    observer.disconnect();
    atvRoots.forEach(function (controllers) {
      Object.keys(controllers).forEach(function (name) {
        cleanupController(controllers, name);
      });
    });
    atvRoots = new Map();
    activated.delete(prefix);
  }

  // Optional console output mainly for development
  const quiet = !document.querySelector(`[data-${prefix}report="true"]`);
  function report(type, addedCount) {
    if (quiet || addedCount < 1) {
      return;
    }
    console.log(
      [
        `${prefix}controllers: ${atvRoots.size} present`,
        `${addedCount} added. (${type})`,
        `v${version}`
      ].join(" / ")
    );
  }

  function domWatcher(mutationList) {
    if (!activated.has(prefix)) {
      return;
    }
    let atvRemoved = false;
    mutationList.forEach(function (mutation) {
      if (atvRemoved) {
        return;
      }
      if (mutation.type === "childList") {
        mutation.removedNodes.forEach(function (node) {
          if (atvRemoved || !node.querySelector) {
            return;
          }
          const data = dataFor(node, `${prefix}controller`);
          if (data) {
            atvRemoved = true;
            return;
          }
          const atv = node.querySelector(atvControllerSelector);
          if (atv) {
            atvRemoved = true;
            return;
          }
        });
      }
    });

    // Always cleanup and restart if something is removed
    if (atvRemoved) {
      cleanup();
      activate(prefix);
      return;
    }

    // New nodes can be more safely added to an existing setup
    let addedNodes = new Set();
    mutationList.forEach(function (mutation) {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach(function (node) {
          if (!node.parentNode?.querySelector) {
            return;
          }
          node.parentNode
            .querySelectorAll(atvControllerSelector)
            .forEach(function (controller) {
              if (!addedNodes.has(controller) && !atvRoots.has(controller)) {
                registerController(controller);
                addedNodes.add(controller);
              }
            });
        });
      }
    });

    if (addedNodes.size > 0) {
      report("mutation", addedNodes.size);
    }
  }

  let addedCount = 0;
  document.querySelectorAll(atvControllerSelector).forEach(function (root) {
    registerController(root);
    addedCount += 1;
  });

  report("activate", addedCount);

  activated.add(prefix);
  const config = { childList: true, subtree: true };
  observer.observe(document, config);
}

export { activate };
