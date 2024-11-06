/*global
  console, document, window
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

const _version = "0.0.26";

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

function selectPermutations(container, selector, callback) {
  allPermutations(`data-${selector}`, function (variant) {
    container.querySelectorAll(`[${variant}]`).forEach(function (element) {
      let dataAttributeName = variant.replace(/^data-/, "");
      if (!element.dataset[dataAttributeName]) {
        dataAttributeName = camelize(dataAttributeName);
      }
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
  let result = element.dataset[name];
  if (!result) {
    result = element.dataset[camelize(name)];
  }
  if (!result) {
    allPermutations(name, function (perm) {
      if (!result) {
        result = element.dataset[perm];
      }
    });
  }
  return result;
}

function activate(prefix = "atv-") {
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
  allPermutations(`data-${prefix}controller`, function (perm) {
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
    controllersFor(closestRoot).forEach(function (controller) {
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
    return containingNamedController(closestRoot.parentNode, name);
  }

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

    selectPermutations(
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

    selectPermutations(
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
    selectPermutations(
      root,
      `${prefix}actions`,
      function (element, dataAttributeName) {
        buildSequence(element, dataAttributeName);
      }
    );
    selectPermutations(
      root,
      `${prefix}action`,
      function (element, dataAttributeName) {
        buildSequence(element, dataAttributeName);
      }
    );
    return actionHandlers;
  }

  // Find all declared targets for this ATV and provide them to the ATV instance
  function findTargets(root, name) {
    const container = root.parentNode;
    let targets = {};

    selectPermutations(
      container,
      `${prefix}${name}-target`,
      function (element) {
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
      }
    );

    return targets;
  }

  // Find the values data element and provide it to the ATV instance
  // Assumption:
  //   all values are in a single data declaration, JSON encoded as a hash
  function findValues(root, name) {
    let container = root.parentNode;
    let values;

    const valuePattern = `${prefix}${name}-values`;
    selectPermutations(container, valuePattern, function (element) {
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

  function cleanup() {
    observer.disconnect();
    atvRoots.forEach(function (controllers) {
      Object.keys(controllers).forEach(function (name) {
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

  function domWatcher(mutationList) {
    if (!activated) {
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

  activated = true;
  const config = { childList: true, subtree: true };
  observer.observe(document, config);
}

export { activate };
