/* global document, window, console */

//
// ATV.js: Actions, Targets, Values
//
// Super vanilla JS / Lightweight alternative to stimulus
// without "class" overhead and binding nonsense, just the actions, targets, and values
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

const version = "0.0.22";

// To dynamically load up the ATV javascripts
const importMap = JSON.parse(document.querySelector("script[type='importmap']").innerText).imports;
// To remember handlers so they can be removed before leaving the page
let atvRoots = new Map;

// Allow for any permutation of underscores and dashes in the data parts of the DOM elements.
// No more wasting time on guessing the permutation stimulus style!

function pascalize(string) {
  return string.split(/[-_]/).map(str =>
    str.charAt(0).toUpperCase() + str.slice(1)
  ).join('');
}

function camelize(string) {
  const pascalized = pascalize(string);
  return pascalized.charAt(0).toLowerCase() + pascalized.slice(1);
}

function querySelectorAll(container, selector, callback) {
  function allPermutations(name, permutation, prefix = null) {
    const words = name.split(/[-_]/);
    if (words.length < 2) {
      if (prefix) {
        permutation(`${prefix}-${name}`);
        permutation(`${prefix}_${name}`);
      } else {
        permutation(name);
      }
      return;
    }
    if (prefix) {
      allPermutations(words.slice(1).join('-'), permutation, `${prefix}-${words[0]}`)
      allPermutations(words.slice(1).join('-'), permutation, `${prefix}_${words[0]}`)
      return;
    }
    allPermutations(words.slice(1).join('-'), permutation, `${words[0]}`)
  }

  allPermutations(`data-${selector}`, (variant) => {
    container.querySelectorAll(`[${variant}]`).forEach((element) => {
      const dataAttributeName = camelize(variant.replace(/^data-/, ""));
      callback(element, dataAttributeName, variant);
    });
  });
}

function controllersFor(element) {
  let list;
  if (element.dataset) {
    if (element.dataset.atvController) {
      list = element.dataset.atvController;
    } else {
      list = element.dataset.atv_controller;
    }
  }
  if (list) {
    return list.replace(/_/g, '-').split(/[,\s]+/);
  } else {
    return [];
  }
}

const atvControllerSelector = "[data-atv-controller],[data-atv_controller],[data_atv-controller],[data_atv_controller]";

// To allow for nesting controllers
function outOfScope(element, root, name) {
  // There should only be one of these. Behavior undefined if it finds more than one permutation.
  const closestRoot = element.closest(atvControllerSelector);
  let outOfScope = false;
  controllersFor(closestRoot).forEach((controller) => {
    if (controller === name) {
      outOfScope = !(closestRoot === root);
    }
  })
  return outOfScope;
}

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

let jsonParseArray = function(string) {
  if (/^[\[{]/.test(string)) {
    return JSON.parse(string);
  }
  return string.split(/[,]+/).map((str) => str.trim());
};

// Parses out actions:
// "requestedEvent->controller#actionName(args)" => requestedEvent, actionName, controller, args
// "click" => click, click, null, null
let parseActions = function(string) {
  const definitions = jsonParseArray(string);
  return definitions.map(function(definition) {
    let [requestedEvent, fullAction] = definition.split(/[-=]>/);
    if (!fullAction) {
      fullAction = requestedEvent;
      requestedEvent = requestedEvent.split(/[#(),]/)[0];
    }
    console.log(definition, requestedEvent, fullAction);
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
      args = args.split(",")
    }
    return [requestedEvent, actionName, controller, args];
  });
}

// Find all declared actions for this ATV controller and add listeners for them
function findActions(root, name, actionName, handler) {
  let handlers = [];
  function registerAction(element, definitions) {
    parseActions(definitions).forEach((definition) => {
      const [requestedEvent, definedActionName, controller, args] = definition;
      if (controller && controller !== name) {
        return;
      }
      if (actionName !== definedActionName) {
        return;
      }
      if (outOfScope(element, root, name)) {
        return;
      }
      const callback = (event) => handler(event.target, event, args); // Add more stuff to this if needed in the instances
      handlers.push([element, requestedEvent, callback]);
      element.addEventListener(requestedEvent, callback);
    });
  }

  querySelectorAll(root, `atv-${name}-action`, (element, dataAttributeName) => {
    const definitions = `["${element.dataset[dataAttributeName]}"]`;
    if (definitions) {
      registerAction(element, definitions);
    }
    // TODO: else error
  });

  querySelectorAll(root, `atv-${name}-actions`, (element, dataAttributeName) => {
    const definitions = element.dataset[dataAttributeName];
    if (definitions) {
      registerAction(element, definitions);
    } // TODO: else error
  });

  // sequences 
  function buildSequence(element, dataAttributeName) {
    function invokeNext(sequence, forEvent) {
      return function(event) {
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

        const atvControllerElement = containingNamedController(event.target, controller);
        if (!atvControllerElement) {
          return invokeNext(remainder, forEvent)(event);
        }

        // Execute conditions
        const actions = atvRoots.get(atvControllerElement)[controller]?.actions;
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
        return invokeNext(remainder, forEvent)(event);;
      };
    }

    const actionList = element.dataset[dataAttributeName];
    if (!actionList) {
      return;
    }
    const sequence = parseActions(actionList);
    const eventList = new Set;
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
        handlers.push([element, forEvent, callback]);
        element.addEventListener(forEvent, callback);
      }
    });
  }
  querySelectorAll(root, 'atv-actions', (element, dataAttributeName) => {
    buildSequence(element, dataAttributeName);
  });
  querySelectorAll(root, 'atv-action', (element, dataAttributeName) => {
    buildSequence(element, dataAttributeName);
  });
  return handlers;
}

// Find all declared targets for this ATV and provide them to the ATV instance
function findTargets(root, name, pascalCase) {
  const container = root.parentNode;
  let targets = {};

  querySelectorAll(container, `atv-${name}-target`, (element) => {
    if (outOfScope(element, root, name)) {
      return;
    }
    const datasetKey = `atv${pascalCase}Target`;
    const key = element.dataset[datasetKey];
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
// Assumption-- all values are in a single data declaration, JSON encoded as a hash
function findValues(root, name, pascalCase) {
  let container = root.parentNode;
  let values;

  querySelectorAll(container, `atv-${name}-values`, (element) => {
    if (values || outOfScope(element, root, name)) {
      return;
    }
    const datasetKey = `atv${pascalCase}Values`;
    const data = element.dataset[datasetKey];
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
    root: root,
    name: name,
    actions: {},
    handlers: {}
  }
  const pascalCase = pascalize(name);

  controller.targets = findTargets(root, name, pascalCase);
  controller.values = findValues(root, name, pascalCase);
  controller.actions
  let callbacks = module.connect(controller.targets, controller.values, root, findControllers);
  if (typeof callbacks === 'function') {
    callbacks = callbacks();
  }
  Object.keys(callbacks).forEach((type) => {
    controller.actions[type] = callbacks[type];
    if (type === "disconnect") {
      controller.disconnect = callbacks[type];
    } else {
      controller.handlers[type] = findActions(root, name, type, callbacks[type])
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
        createController(root, name, module)
      })
      .catch(error => {
        console.error('Loading failed:', error);
      });
  });
}

function cleanup() {
  atvRoots.forEach((controllers) => {
    Object.keys(controllers).forEach((name) => {
      cleanupController(controllers, name);
    });
  });
  atvRoots = new Map;
}

let activated = false;

function domWatcher(mutationList, _observer) {
  if (!activated) {
    return;
  }
  let atvRemoved = false;
  let nodeToRegister = new Set;
  for (const mutation of mutationList) {
    if (mutation.type === "childList") {
      mutation.removedNodes.forEach((node) => {
        if (atvRemoved || !node.querySelector) {
          return;
        }
        if (node.dataset) {
          if (node.dataset.atvController || node.dataset.atv_controller) {
            atvRemoved = true;
            return;
          }
        }
        const atv = node.querySelector(atvControllerSelector);
        if (atv) {
          atvRemoved = true;
          return;
        }
      })
      if (atvRemoved) {
        break;
      }
      mutation.addedNodes.forEach((node) => {
        if (!node.parentNode?.querySelector) {
          return;
        }
        const atv = node.parentNode.querySelector(atvControllerSelector);
        if (atv) {
          nodeToRegister.add(node);
        }
      })
    }
    if (mutation.type === "attributes") {
      const attributeName = mutation.attributeName;
      if (attributeName) {
        if (/^data[-_]atv/i.test(attributeName)) {
          const node = mutation.target.closest(atvControllerSelector);
          if (node) {
            nodeToRegister.add(node);
          }
        }
      }
    }
  }

  if (atvRemoved) {
    activate(true);
    return;
  }
  let addedCount = 0;
  nodeToRegister.forEach((node) => {
    registerController(node);
    addedCount += 1;
  });
  console.log(`ATV: ${atvRoots.size} DOM elements activated / ${addedCount} added. (activate)`)
}
const observer = new MutationObserver(domWatcher);
const config = { attributes: true, childList: true, subtree: true };
let domWatcherActive = false;

const activate = (reactivate = false) => {
  if (reactivate) {
    activated = false;
    cleanup();
  } else if (activated) {
    return;
  }
  let addedCount = 0;
  document.querySelectorAll(atvControllerSelector).forEach((root) => {
    registerController(root);
    addedCount += 1;
  })
  console.log(`ATV: ${atvRoots.size} DOM elements activated / ${addedCount} added. (activate)`)
  activated = true;
  if (!domWatcherActive) {
    observer.observe(document, config);
    domWatcherActive = true;
  }
};

export {
  activate
};
