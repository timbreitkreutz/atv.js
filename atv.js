/*global
  console, document, MutationObserver, HTMLElement
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

const version = "0.1.7";

// To dynamically load up the ATV javascripts if needed
function importMap() {
  return JSON.parse(
    document.querySelector("script[type='importmap']").innerText
  ).imports;
}

/* Variant in the context of ATV means either dash-case or snake_case */
const variantPattern = /[-_]/;

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

/* The following methods take variable arguments (no ... for now
 * for backward compatibility) and return combinations of the list
 * connected with dashes and underscores.  For many examples see
 * test/system/unit_test.rb
 */
function allVariants() {
  const words = Array.from(arguments).filter((arg) => Boolean(arg));
  if (words.length === 0) {
    return [];
  }
  const variants = dashVariants.apply(null, words);
  return variants.flatMap((string) => [string, `${string}s`]);
}

function dashVariants() {
  function dashAndUnderscores(input) {
    const string = input || "";
    if (variantPattern.test(`${string}`)) {
      return [dasherize(string), string.replace(/-/g, "_")];
    }
    return [string];
  }
  const words = Array.from(arguments);
  const first = dashAndUnderscores(words[0]);
  if (words.length < 2) {
    return first;
  }
  return dashVariants.apply(null, words.slice(1)).flatMap(function (str2) {
    return first.flatMap(function (str1) {
      return [`${str1}-${str2}`, `${str1}_${str2}`];
    });
  });
}

/* Returns a list of selectors to use for given name list */
function variantSelectors() {
  const results = [];
  const container = arguments[0];
  const words = ["data"].concat(
    Array.from(arguments)
      .slice(1)
      .filter((str) => Boolean(str))
  );
  const variants = allVariants.apply(null, words);
  variants.forEach(function (variant) {
    container.querySelectorAll(`[${variant}]`).forEach(function (element) {
      results.push([element, variant]);
    });
  });
  return results;
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
  let actions = [];

  // Parse a single action part, controller is passed in
  // if derived from the attribute key
  function parseAction(action, controller) {
    let method;
    let parameters = [];
    let [event, call] = action.split(/[\s]*[-=]>[\s]*/);

    if (call) {
      let [innerController, methodCall] = call.split("#");
      if (methodCall) {
        controller = innerController;
      } else {
        methodCall = innerController;
      }
      method = methodCall;
    } else {
      method = event;
    }
    const [methodName, params] = method.split(/[()]/);
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
    if (onlyEvent && event !== onlyEvent) {
      return;
    }
    if (!controller) {
      controller = method;
      method = event;
    }
    actions.push({
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
  return actions;
}

let allControllers = new Map();
let allEventListeners = new Map();

// Returns a list of attributes for the type (controller, target, action, etc.)
function attributesFor(element, type) {
  if (!element || !element.getAttributeNames) {
    return [];
  }
  const regex = new RegExp(`${type}s?$`, "i");
  let list = [];
  element.getAttributeNames().forEach(function (attribute) {
    if (regex.test(attribute)) {
      list.push(element.getAttribute(attribute));
    }
  });
  return list;
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

/* --- Main activation function --- */
function activate(prefix = "atv") {
  if (allControllers.has(prefix)) {
    return;
  }
  allControllers.set(prefix, new Map());
  const root = document.body;
  // Provide selector for any controllers given a prefix
  const controllersSelector = Array.from(
    allVariants("data", prefix, "controller")
  )
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

  // Find all declared targets for this ATV and provide them to the ATV instance
  function findTargets(root, name) {
    const container = root.parentNode;
    let targets = {};

    variantSelectors(container, prefix, name, "target").forEach(
      function (item) {
        const [element, variant] = item;
        if (outOfScope(element, root, name)) {
          return;
        }
        const key = element.getAttribute(variant);

        const allKey = `all${pascalize(key)}`;
        const pluralKey = `${key}s`;

        if (targets[allKey]) {
          targets[allKey].push(element);
          targets[pluralKey].push(element);
        } else if (targets[key]) {
          targets[allKey] = [targets[key], element];
          targets[pluralKey] = [targets[key], element];
          delete targets[key];
        } else {
          targets[key] = element;
        }
      }
    );

    return targets;
  }

  // Find the values data element and provide it to the ATV instance
  function findValues(element, name) {
    let values = {};
    Array.from(allVariants("data", prefix, name, "value")).forEach(
      function (variant) {
        const data = element.getAttribute(variant);
        if (data) {
          try {
            Object.assign(values, JSON.parse(data));
          } catch (ex) {
            try {
              Object.assign(values, JSON.parse(`{${data}}`));
            } catch (ex2) {
              errorReport(ex2);
            }
            errorReport(ex);
          }
        }
      }
    );
    return values;
  }

  /** Controller factory */
  function createController(root, name) {
    let actions;
    let targets;
    let values;

    function getActions() {
      return actions;
    }

    function registerActions(root, name) {
      const controllers = allControllers.get(prefix).get(root);

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
        let events = new Set();
        // Build the list of distinct events
        list.forEach((action) => events.add(action.event));
        // Make one handler for each event type
        events.forEach(function (eventName) {
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
            return invokeNext(event, actions.slice(1));
          }

          const handler = (event) => invokeNext(event, list);
          function cleanup() {
            element.removeEventListener(eventName, handler);
          }
          const signature = {
            cleanup,
            element,
            eventName,
            handler,
            name,
            prefix
          };
          let elementActions = allEventListeners.get(element);

          if (!elementActions) {
            elementActions = [signature];
          } else {
            elementActions.push(signature);
          }
          allEventListeners.set(element, elementActions);
          element.addEventListener(eventName, handler);
        });
      });
    }

    /** Call this to populate a new controller */
    function refresh() {
      return withModule(name, function (module) {
        targets = findTargets(root, name);
        values = findValues(root, name);
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
        registerActions(root, name);
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
    if (!allControllers.get(prefix)) {
      allControllers.set(prefix, new Map());
    }
    if (!allControllers.get(prefix).has(root)) {
      allControllers.get(prefix).set(root, new Map());
    }

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

  function findControllers(root) {
    if (!allControllers.get(prefix)) {
      allControllers.set(prefix, new Map());
    }
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

  findControllers(root);

  const observer = new MutationObserver(domWatcher);

  function controllerBySelectorAndName(selector, name, callback) {
    document.querySelectorAll(selector).forEach(function (element) {
      let controller = allControllers.get(prefix)?.get(element)?.get(name);
      if (controller) {
        callback({
          actions: controller.getActions()
        });
      }
    });
  }

  function domWatcher(records, observer) {
    function cleanup(node) {
      if (!node.querySelectorAll) {
        return;
      }
      if (
        node.nodeName === "BODY" ||
        node.nodeName === "HTML" ||
        node.nodeName === "#document"
      ) {
        observer.disconnect();
        if (allEventListeners) {
          allEventListeners.forEach((element) =>
            element.forEach((listener) => listener.cleanup())
          );
          allEventListeners = new Map();
        }
        allControllers = new Map();
        return;
      }
      function cleanNode(element) {
        const listeners = allEventListeners.get(element);
        if (listeners) {
          listeners.forEach((listener) => listener.cleanup());
        }
        const controllers = allControllers.get(prefix).get(element);
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
      node.querySelectorAll(controllersSelector).forEach(cleanNode);
      cleanNode(node);
    }
    records.forEach(function (mutation) {
      if (mutation.type === "childList") {
        const removed = Array.from(mutation.removedNodes).filter(
          (node) => node instanceof HTMLElement
        );
        removed.forEach((node) => cleanup(node));
      }
    });
    records.forEach(function (mutation) {
      if (mutation.type === "childList") {
        const added = Array.from(mutation.addedNodes).filter(
          (node) => node instanceof HTMLElement
        );
        added.forEach((node) => findControllers(node));
      }
    });
  }

  const config = { childList: true, subtree: true };
  observer.observe(document, config);
}

export { activate, version };
