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

const version = "0.0.14";

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
  if (element.dataset.atvController) {
    list = element.dataset.atvController;
  } else {
    list = element.dataset.atv_controller;
  }
  if (list) {
    return list.replace(/_/g, '-').split(/[,\s]+/);
  } else {
    return [];
  }
}

// To allow for nesting controllers
function outOfScope(element, root, name) {
  // There should only be one of these. Behavior undefined if it finds more than one permutation.
  const closestAtv = element.closest("[data-atv-controller]", "[data-atv_controller]", "[data_atv-controller]", "[data_atv_controller]");
  let outOfScope = false;
  controllersFor(closestAtv).forEach((controller) => {
    if (controller === name) {
      outOfScope = !(closestAtv === root);
    }
  })
  return outOfScope;
}

// Find all declared actions for this ATV controller and add listeners for them
function findActions(root, name, actionName, handler) {
  let handlers = [];
  function registerAction(element, definition) {
    if (outOfScope(element, root, name)) {
      return;
    }
    const closestAtv = element.closest(`[data-atv-controller="${name}"`, `[data-atv-controller="${name.replace(/-/g, '_')}"]`);

    const [action, args] = definition.split(/[()]/);
    let [eventName, definedActionName] = action.split(/[-=]>/);

    if (!definedActionName) {
      definedActionName = eventName;
    }
    if (actionName !== definedActionName) {
      return;
    }
    const callback = (event) => handler(event.target, event, args?.split(",")); // Add more stuff to this if needed in the instances
    handlers.push([element, eventName, callback]);
    element.addEventListener(eventName, callback);
  }

  querySelectorAll(root, `atv-${name}-action`, (element, dataAttributeName) => {
    const definition = element.dataset[dataAttributeName];
    if (definition) {
      registerAction(element, definition);
    }
    // TODO: else error
  });

  querySelectorAll(root, `atv-${name}-actions`, (element, dataAttributeName) => {
    const definitions = element.dataset[dataAttributeName];
    if (definitions) {
      JSON.parse(definitions).forEach((definition) => {
        registerAction(element, definition);
      });
    } // TODO: else error
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
};

function createController(root, name, module) {
  let controller = {
    root: root,
    actions: {}
  }
  const pascalCase = pascalize(name);

  controller.targets = findTargets(root, name, pascalCase);
  controller.values = findValues(root, name, pascalCase);
  let callbacks = module.activate(controller.targets, controller.values, root, module);
  if (typeof callbacks === 'function') {
    callbacks = callbacks();
  }
  Object.keys(callbacks).forEach((type) => {
    controller.actions[type] = findActions(root, name, type, callbacks[type]);
  });

  atvRoots.get(root).push(controller);
}

// Gather the context for this instance, provide it to the controller instance
function registerController(root) {
  controllersFor(root).forEach((name) => {
    let importmapName = `${name}_atv`;
    Object.keys(importMap).forEach((source) => {
      if (source.replace(/_/g, "-").includes(`${name}-atv`)) {
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
    controllers.forEach((controller) => {
      const actions = controller.actions;
      Object.keys(actions).forEach((action) => {
        const handlers = actions[action];
        handlers.forEach((handler) => {
          // console.log("removing event listener:")
          // console.log(handler);
          handler[0].removeEventListener(handler[1], handler[2]);
        });
      });
    });
  });
  atvRoots = new Map;
}

// This needs to be called when the DOM is loaded
// TODO: Make idempotent so that we can also watch for new DOM arriving
const activate = () => {
  cleanup();
  querySelectorAll(document, "atv-controller", (root) => {
    atvRoots.set(root, []);
    registerController(root);
  })
};


export {
  activate
};
