/*global
  console, document, MutationObserver
*/
/*jslint white indent2*/

//
// ATV.js: Actions, Targets, Values
//
// Super vanilla JS / Lightweight alternative to stimulus without "class"
// overhead and binding nonsense, just the actions, targets, and values
// Also more forgiving with hyphens and underscores.

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

const version = "0.1.7";

// To dynamically load up the ATV javascripts if needed
function importMap() {
  return JSON.parse(
    document.querySelector("script[type='importmap']").innerText
  ).imports;
}

/* ----------------- HELPER FUNCTIONS ------------------ */

/* Variant in the context of ATV means either dash-case or snake_case */
const variantPattern = /[\-_]/;

function pascalize(string) {
  return string
    .split(variantPattern)
    .map((str) => str.charAt(0).toUpperCase() + str.slice(1))
    .join("");
}

function dasherize(string) {
  return string.replace(/_/g, "-");
}

const deCommaPattern = /,[\s+]/;

/* The following methods returns combinations of the given list
 * connected with dashes and underscores.  For many examples see
 * test/system/unit_test.rb
 */
function allVariants(...words) {
  const parts = words.filter((arg) => Boolean(arg));
  if (parts.length === 0) {
    return [];
  }
  return dashVariants(...parts).flatMap((string) => [string, `${string}s`]);
}

function dashVariants(firstWord, ...words) {
  function dashOrUnderscore(input) {
    const string = input || "";
    if (variantPattern.test(string)) {
      return [dasherize(string), string.replace(/-/g, "_")];
    }
    return [string];
  }
  const first = dashOrUnderscore(firstWord);
  if (words.length < 1) {
    return first;
  }
  return dashVariants(...words).flatMap((str2) =>
    first.flatMap((str1) => [`${str1}-${str2}`, `${str1}_${str2}`])
  );
}

/* Returns a list of selectors to use for given name list */
function variantSelectors(container, ...words) {
  return allVariants("data", ...words).flatMap((variant) =>
    Array.from(container.querySelectorAll(`[${variant}]`)).map((element) => [
      element,
      variant
    ])
  );
}

/* JSON is parsed aggressively and relies on "try" */
function errorReport(ex) {
  if (ex?.message?.includes("JSON")) {
    return;
  }
  console.error(`ATV: ${ex}`);
}

/*
 * Gets all action declarations for an element, returns an array of structures.
 */
function actionsFor(prefix, element, onlyEvent = null) {
  let result = [];
  const paramSeparator = /[()]/;

  // Parse a single action part, controller is passed in
  // if derived from the attribute key
  function parseAction(action, controller) {
    let method;
    let parameters = [];
    let [event, rightSide] = action.split(/[\s]*[\-=]>[\s]*/);

    // Figure out what to do with the part on the right of the "=> blah#blah"
    if (rightSide) {
      let [innerController, methodCall] = rightSide.split("#");
      if (methodCall) {
        controller = innerController;
      } else {
        methodCall = innerController;
      }
      method = methodCall;
    } else {
      method = event;
    }
    const [methodName, params] = method.split(paramSeparator);
    if (params) {
      method = methodName;
      parameters = params.split(deCommaPattern);
      try {
        parameters = JSON.parse(`[${params}]`);
      } catch (ex) {
        errorReport(ex);
      }
      event = event.split("(")[0];
    }
    // Sometimes we only care about a given event name passed in.
    if (onlyEvent && event !== onlyEvent) {
      return;
    }
    if (!controller) {
      controller = method;
      method = event;
    }
    result.push({
      controller: dasherize(controller),
      event,
      method,
      parameters
    });
  }

  // Split on commas as long as they are not inside parameter lists.
  function actionSplit(string, callback) {
    let paramDepth = 0;
    let accumulator = [];
    Array.from(string).forEach(function (char) {
      if (char === "," && paramDepth === 0) {
        callback(accumulator.join("").trim());
        accumulator = [];
        return;
      }
      accumulator.push(char);
      if (char === "(") {
        paramDepth += 1;
      } else if (char === ")") {
        paramDepth -= 1;
      }
    });
    const last = accumulator.join("").trim();
    if (paramDepth !== 0) {
      console.error(`badly formed parameters: ${string}`);
    }
    if (last) {
      callback(last);
    }
  }

  element.getAttributeNames().forEach(function (name) {
    const unqualified = new RegExp(`^data[_-]${prefix}[_-]?action[s]?`);
    const qualified = new RegExp(
      `^data[_-]${prefix}[_-]?(.*[^-_])[_-]?action[s]?`
    );

    let controller;
    let matched = name.match(qualified);
    if (matched) {
      controller = matched[1];
    } else {
      controller = null;
      matched = name.match(unqualified);
    }
    if (!matched) {
      return;
    }
    let list = element.getAttribute(name);
    if (list) {
      try {
        list = JSON.parse(list).join(",");
      } catch (ex) {
        errorReport(ex);
      }
      actionSplit(list, (action) => parseAction(action, controller));
    }
  });
  return result;
}

function attributeKeysFor(element, type) {
  if (!element || !element.getAttributeNames) {
    return [];
  }
  const regex = new RegExp(`${type}s?$`, "i");
  return element.getAttributeNames().filter((name) => regex.test(name));
}

// Returns a list of attributes for the type (controller, target, action, etc.)
function attributesFor(element, type) {
  return attributeKeysFor(element, type).map((name) =>
    element.getAttribute(name)
  );
}

const allControllerNames = new Set();
const allEventListeners = new Map();
const allTargets = new Map();
let allControllers = new Map();

// The three maps above all have the same structure: prefix
// first (atv, etc.), then element, then a Map of those things.
function findOrInitalize(map, prefix, element, initial = null) {
  if (!map.has(prefix)) {
    map.set(prefix, new Map());
  }
  if (!map.get(prefix).has(element)) {
    map.get(prefix).set(element, initial ?? new Map());
  }
  return map.get(prefix).get(element);
}

/* Look for the controllers in the importmap or just try to load them */
function withModule(name, callback) {
  let importmapName = `${name}_atv`;
  const map = importMap();
  Object.keys(map).forEach(function (source) {
    if (dasherize(source).includes(`/${name}-atv`)) {
      importmapName = map[source]; // There should only be one
    }
  });
  import(importmapName)
    .then(function (module) {
      callback(module);
    })
    .catch(function (ex) {
      console.error(`Loading ${importmapName} failed:`, ex);
    });
}

/* ----------------- Main Activation Function ------------------ */

function activate(prefix = "atv") {
  if (allControllers.has(prefix)) {
    return;
  }
  const root = document.body;

  // Provide selector for any controllers given a prefix

  const controllersSelector = allVariants("data", prefix, "controller")
    .map((selector) => `[${selector}]`)
    .join(",");

  // To allow for nesting controllers:
  // skip if it's not the nearest enclosing controller
  function outOfScope(element, root, name) {
    if (!element || element.nodeType === "BODY") {
      return true;
    }
    const closestRoot = element.closest(controllersSelector);
    if (!closestRoot) {
      return true;
    }
    let out = false;
    attributesFor(closestRoot, "controller").forEach(function (attr) {
      const list = attr.split(deCommaPattern).map((str) => dasherize(str));
      if (list.includes(name)) {
        out = !(closestRoot === root);
      } else {
        out = outOfScope(closestRoot.parentNode, root, name);
      }
    });
    return out;
  }

  // Optional console output mainly for development
  const quiet = !document.querySelector(`[data-${prefix}-report="true"]`);
  function report(count, type, action) {
    if (quiet || count < 1) {
      return;
    }
    console.log(
      [
        [
          "ATV:",
          `(${prefix})`,
          type,
          `[${Number(allControllers.get(prefix)?.size)}]`
        ].join(" "),
        `${action}: ${count}`,
        `v${version}`
      ].join(" / ")
    );
  }

  /* ----------------- Controller Factory ------------------ */

  function createController(root, name) {
    let actions;
    let targets = {};
    let values = {};
    allControllerNames.add(name);

    function getActions() {
      return actions;
    }

    function registerActions(root) {
      const controllers = findOrInitalize(allControllers, prefix, root);

      let elements = new Set();
      function collectElements(item) {
        const [element] = item;
        elements.add(element);
      }
      variantSelectors(root, prefix, name, "action").forEach(collectElements);
      variantSelectors(root, prefix, "action").forEach(collectElements);

      // Find each element that has this type of controller
      Array.from(elements).forEach(function (element) {
        // Get action definitions
        const list = actionsFor(prefix, element);
        // Collect the events
        const eventNames = new Set(list.map((action) => action.event));
        // Make one handler for each event type
        eventNames.forEach(function (eventName) {
          const firstForEvent = list.find(
            (action) => action.event === eventName
          );
          if (firstForEvent?.controller !== name) {
            return;
          }

          function invokeNext(event, actions) {
            if (actions.length < 1) {
              return;
            }
            const action = actions[0];
            if (
              action.event === eventName &&
              !outOfScope(element, root, action.controller)
            ) {
              const callbacks = controllers.get(action.controller).getActions();
              const callback = callbacks[action.method];
              if (callback) {
                const result = callback(event.target, event, action.parameters);
                if (result === false) {
                  return;
                }
              }
            }
            if (actions.length > 1) {
              return invokeNext(event, actions.slice(1));
            }
          }

          const handler = (event) => invokeNext(event, list);
          const events = findOrInitalize(allEventListeners, prefix, element);
          if (events.get(eventName)) {
            return;
          }
          element.addEventListener(eventName, handler);
          events.set(eventName, handler);
        });
      });
    }

    // Update the in-memory controller from the DOM
    function refresh() {
      function refreshTargets(root, middle) {
        const addedTargets = {};
        function collectionKeys(key) {
          return [`all${pascalize(key)}`, `${key}s`];
        }

        variantSelectors(root.parentNode, prefix, name, "target").forEach(
          function (item) {
            const [element, variant] = item;
            element
              .getAttribute(variant)
              .split(deCommaPattern)
              .forEach(function (key) {
                const [allKey, pluralKey] = collectionKeys(key);
                if (
                  targets[key] === element ||
                  (targets[allKey] && targets[allKey].includes(element)) ||
                  outOfScope(element, root, name)
                ) {
                  return;
                }
                if (targets[allKey]) {
                  targets[allKey].push(element);
                  targets[pluralKey].push(element);
                } else if (targets[key]) {
                  targets[allKey] = [targets[key], element];
                  targets[pluralKey] = [targets[key], element];
                  // delete targets[key];
                } else {
                  targets[key] = element;
                }
                if (!addedTargets[key]) {
                  addedTargets[key] = [];
                }
                addedTargets[key].push(element);
              });
          }
        );
        middle();
        // This part needs to happen after the controller "activate".
        Object.keys(addedTargets).forEach(function (key) {
          const connectedCallback = actions[`${key}TargetConnected`];
          if (connectedCallback) {
            addedTargets[key].forEach(connectedCallback);
          }
          const disconnectedCallback = actions[`${key}TargetDisconnected`];
          if (disconnectedCallback) {
            addedTargets[key].forEach(function (element) {
              findOrInitalize(allTargets, prefix, element, []).push(
                function () {
                  const [allKey, pluralKey] = collectionKeys(key);
                  let index = targets[allKey]?.indexOf(element);
                  if (index) {
                    targets[allKey].splice(index, 1);
                  }
                  index = targets[pluralKey]?.indexOf(element);
                  if (index) {
                    targets[pluralKey].splice(index, 1);
                  }
                  if (targets[key] === element) {
                    if (targets[allKey]) {
                      targets[key] = targets[allKey][0];
                    } else {
                      delete targets[allKey];
                    }
                  }
                  disconnectedCallback(element);
                }
              );
            });
          }
        });
      }

      function refreshValues(element) {
        allVariants("data", prefix, name, "value").forEach(function (variant) {
          const data = element.getAttribute(variant);
          if (!data) {
            return;
          }
          [data, `{${data}}`].forEach(function (json) {
            try {
              Object.assign(values, JSON.parse(json));
            } catch (ex) {
              errorReport(ex);
            }
          });
        });
      }

      // Note that with module includes a promise return so this part finishes
      // asynchronously.
      withModule(name, function (module) {
        refreshTargets(root, function () {
          refreshValues(root);
          const invoked = module.connect(
            targets,
            values,
            root,
            controllerBySelectorAndName
          );
          // Allow for returning an collection of actions or
          // a function returning a collection of actions
          if (typeof invoked === "function") {
            actions = invoked();
          } else {
            actions = invoked;
          }
          registerActions(root);
        });
      });
    }

    /** The public controller object */
    const controller = Object.freeze({
      getActions,
      refresh
    });
    return controller;
  }

  function registerControllers(root) {
    findOrInitalize(allControllers, prefix, root);

    attributesFor(root, "controller").forEach(function (attribute) {
      attribute.split(deCommaPattern).forEach(function (controllerName) {
        const name = dasherize(controllerName);
        const controller =
          allControllers.get(prefix).get(root).get(name) ||
          createController(root, name);
        controller.refresh();
        allControllers.get(prefix).get(root).set(name, controller);
      });
    });
  }

  function updateControllers(root) {
    let initialCount = Number(allControllers.get(prefix)?.size);
    const elements = new Set();
    if (root.matches(controllersSelector)) {
      elements.add(root);
    }
    root
      .querySelectorAll(controllersSelector)
      .forEach((element) => elements.add(element));
    elements.forEach(registerControllers);

    report(
      allControllers.get(prefix).size - initialCount,
      "controllers",
      "found"
    );
  }

  updateControllers(root);

  const observer = new MutationObserver(domWatcher);

  /* --- Provided to client code to talk to other controllers --- */
  function controllerBySelectorAndName(selector, name, callback) {
    document.querySelectorAll(selector).forEach(function (element) {
      let controller = findOrInitalize(allControllers, prefix, element)?.get(
        name
      );
      if (controller) {
        callback({
          actions: controller.getActions()
        });
      }
    });
  }

  /* ------------ React to DOM changes for this prefix --------------- */

  function domWatcher(records, observer) {
    function cleanup(node) {
      // Hard reset
      if (
        node.nodeName === "BODY" ||
        node.nodeName === "HTML" ||
        node.nodeName === "#document"
      ) {
        observer.disconnect();
        allControllers = new Map();
        return;
      }
      // Inner DOM reset
      function cleanTargets(element) {
        if (element && element.children.length > 0) {
          Array.from(element.children).forEach(cleanTargets);
        }
        const disconnectors = allTargets.get(prefix)?.get(element);
        if (disconnectors) {
          disconnectors.forEach((callback) => callback());
          disconnectors.splice(0, disconnectors.length);
        }
      }
      function cleanActions(element) {
        const controllers = findOrInitalize(allControllers, prefix, element);
        if (controllers) {
          controllers.forEach(function (controller) {
            const disconnect = controller.getActions().disconnect;
            if (disconnect) {
              disconnect();
            }
          });
          allControllers.get(prefix).delete(element);
        }
      }
      cleanTargets(node);
      node.querySelectorAll(controllersSelector).forEach(cleanActions);
      cleanActions(node);
    }

    function controllerFor(element, name) {
      if (!element || element === document.body) {
        return;
      }
      return (
        findOrInitalize(allControllers, prefix, element)?.get(name) ||
        controllerFor(element.parentNode, name)
      );
    }

    function updateTargets(element) {
      Array.from(allControllerNames).forEach(function (name) {
        controllerFor(element, name)?.refresh();
        variantSelectors(element, prefix, name, "target").forEach(
          function (item) {
            controllerFor(item[0], name)?.refresh();
          }
        );
      });
    }

    function HTMLElements(node) {
      return Boolean(node.classList);
    }
    records.forEach(function (mutation) {
      if (mutation.type === "childList") {
        Array.from(mutation.removedNodes)
          .filter(HTMLElements)
          .forEach((node) => cleanup(node));
      }
    });
    records.forEach(function (mutation) {
      if (mutation.type === "childList") {
        Array.from(mutation.addedNodes)
          .filter(HTMLElements)
          .forEach(function (node) {
            updateTargets(node);
            updateControllers(node);
          });
      }
    });
  }

  const config = { childList: true, subtree: true };
  observer.observe(document, config);
}

export { activate, version };
