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

const version = "0.0.1";

// To dynamically load up the controller javascripts
const importMap = JSON.parse(document.querySelector("script[type='importmap']").innerText).imports;
// To remember handlers so they can be removed before leaving the page
let allHandlers = [];

// Allow for any permutation of underscores and dashes in the data parts of the DOM elements.
// No more wasting time on guessing the permutation stimulus style!

function pascalize(string) {
   return string.split('-').map(str =>
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
         const dataAttributeName = camelize(variant.replace("data", ""));
         callback(element, dataAttributeName);
      });
   });
}

// Find all declared actions for this ATV controller and add listeners for them
function findActions(container, controller, actionName, handler) {
   querySelectorAll(container, `atv-${controller}-action`, (element, dataAttributeName) => {
      const actionDefinition = element.dataset[dataAttributeName];
      let [eventName, definedActionName] = actionDefinition.split(/[-=]>/);
      if (!definedActionName) {
         definedActionName = eventName;
      }
      if (actionName !== definedActionName) {
         return;
      }
      const callback = (event) => handler(event.target, event);  // Add more stuff to this if needed in the instances
      allHandlers.push([element, eventName, callback])
      element.addEventListener(eventName, callback);
   });
}

// Find all declared targets for this ATV controller and provide them to the controller instance
function findTargets(container, controller, pascalCase) {
   let targets = {};

   querySelectorAll(container, `atv-${controller}-target`, (element) => {
      const datasetKey = `atv${pascalCase}Target`;
      const key = element.dataset[datasetKey];
      targets[key] = element;
   });

   return targets;
}

// Find the values data element and provide it to the controller instance
// Assumption-- all values are in a single data declaration, JSON encoded as a hash
function findValues(container, controller, pascalCase) {
   let values;

   querySelectorAll(container, `atv-${controller}-values`, (element) => {
      if (values) {
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
function registerController(root) {
   const name = root.dataset.atvController.replace(/_/g, '-');
   const container = root.parentNode;
   const pascalCase = pascalize(name);
   const importmapName = `controllers/${name.replace(/-/g, '_')}_atv`;

   const actualFile = importMap[importmapName];

   import(actualFile)
      .then((module) => {
         const targets = findTargets(container, name, pascalCase);
         const values = findValues(container, name, pascalCase);
         const callbacks = module.activate(targets, values, root, module);
         Object.keys(callbacks).forEach((type) => {
            findActions(container, name, type, callbacks[type]);
         });
      })
      .catch(error => {
         console.error('Loading failed:', error);
      });
}

// This needs to be called when the DOM is loaded
// TODO: Make idempotent so that we can also watch for new DOM arriving
const activate = (prefix = "atv-") => {
   querySelectorAll(document, "atv-controller", (element) => {
      registerController(element, prefix)
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

export { activate };
