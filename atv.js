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

const version = "0.0.12";

// To dynamically load up the ATV javascripts
const importMap = JSON.parse(document.querySelector("script[type='importmap']").innerText).imports;
// To remember handlers so they can be removed before leaving the page
let allHandlers = [];

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
function outOfScope(element, atv, name) {
  // There should only be one of these. Behavior undefined if it finds more than one permutation.
  const closestAtv = element.closest("[data-atv-controller]", "[data-atv_controller]", "[data_atv-controller]", "[data_atv_controller]");
  let outOfScope = false;
  controllersFor(closestAtv).forEach((controller) => {
    if (controller === name) {
      outOfScope = !(closestAtv === atv);
    }
  })
  return outOfScope;
}

// Find all declared actions for this ATV controller and add listeners for them
function findActions(atv, name, actionName, handler) {
  function registerAction(element, definition) {
    if (outOfScope(element, atv, name)) {
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
    allHandlers.push([element, eventName, callback])
    element.addEventListener(eventName, callback);
  }

  querySelectorAll(atv, `atv-${name}-action`, (element, dataAttributeName) => {
    const definition = element.dataset[dataAttributeName];
    if (definition) {
      registerAction(element, definition);
    }
    // TODO: else error
  });

  querySelectorAll(atv, `atv-${name}-actions`, (element, dataAttributeName) => {
    const definitions = element.dataset[dataAttributeName];
    if (definitions) {
      JSON.parse(definitions).forEach((definition) => {
        registerAction(element, definition);
      });
    } // TODO: else error
  });
}

// Find all declared targets for this ATV and provide them to the ATV instance
function findTargets(atv, name, pascalCase) {
  const container = atv.parentNode;
  let targets = {};

  querySelectorAll(container, `atv-${name}-target`, (element) => {
    if (outOfScope(element, atv, name)) {
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
function findValues(atv, name, pascalCase) {
  let container = atv.parentNode;
  let values;

  querySelectorAll(container, `atv-${name}-values`, (element) => {
    if (values || outOfScope(element, atv, name)) {
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

// Gather the context for this instance, provide it to the controller instance
function registerController(atv) {
  controllersFor(atv).forEach((name) => {
    const pascalCase = pascalize(name);
    let importmapName = `${name}_atv`;
    Object.keys(importMap).forEach((source) => {
      if (source.replace(/_/g, "-").includes(`${name}-atv`)) {
        importmapName = importMap[source];
      }
    });
    import(importmapName)
      .then((module) => {
        const targets = findTargets(atv, name, pascalCase);
        const values = findValues(atv, name, pascalCase);
        let callbacks = module.activate(targets, values, atv, module);
        if (typeof callbacks === 'function') {
          callbacks = callbacks();
        }
        Object.keys(callbacks).forEach((type) => {
          findActions(atv, name, type, callbacks[type]);
        });
      })
      .catch(error => {
        console.error('Loading failed:', error);
      });
  });
}

// This needs to be called when the DOM is loaded
// TODO: Make idempotent so that we can also watch for new DOM arriving
const activate = () => {
  querySelectorAll(document, "atv-controller", (element) => {
    registerController(element);
  })
};

// In case someone has a SPA, remove all event listeners
// TODO: use a better listener than "unload" when we go to Turbo land
window.addEventListener("unload", () => {
  allHandlers.forEach(([element, type, callback]) => {
    element.removeEventListener(type, callback);
  });
  allHandlers = [];
});

export {
  activate
};
