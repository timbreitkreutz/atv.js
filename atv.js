/*global
  console, document, MutationObserver
*/
/*jslint white*/

//
// ATV.js: Actions, Targets, Values
//
// Super vanilla JS / Lightweight alternative to stimulus without "class"
// overhead and binding nonsense, just the actions, targets, and values
// Also more forgiving with hyphens and underscores.

// The MIT License (MIT)

// Copyright (c) 2024-2025 Timothy Breitkreutz

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

const version = "0.2.0";

// HELPERS

const allSystemEventNames = new Set();

['a', 'input', 'window', 'div', 'button', 'textarea'].forEach(elementName => {
  const element = document.createElement(elementName);
  for (var prop in element) {
    if (prop.startsWith('on')) {
      allSystemEventNames.add(prop.slice(2));
    }
  }
});

console.log(`all system events ${Array.from(allSystemEventNames)}`);

function importMap() {
  return JSON.parse(
    document.querySelector("script[type='importmap']").innerText
  ).imports;
}

// HANDLERS -- these span applications

function createHandler(eventName, element) {
  return function(event) {
    console.log(`HANDLER ${eventName}/${element.nodeName}/${element.id}`);
    console.log(event);
  }
}

const allEventHandlers = new Map();

function registerHandler(element, eventName) {
  if (!allEventHandlers.get(element)) {
    allEventHandlers.set(element, new Map);
  }
  const elementHandlers = allEventHandlers.get(element);
  if (!elementHandlers.has(eventName)) {
    const handler = createHandler(eventName, element);
    elementHandlers.set(eventName, handler);
    element.addEventListener(eventName, handler);
    console.log(`created ${eventName}`);
  } else {
    console.log(`found ${eventName}`);
  }
  return elementHandlers.get(eventName);
}

// CONTROLLERS


function createApplication(prefix) {
  const data = prefix ? `data-${prefix}` : "data";
  const root = document.body;
  let actionSelector;

  // Gather all controllers from the importmap and add their names to the action finder selector
  function initializeControllers() {
    let actionSelectors = [`[${data}-action]`, `[${data}-actions]`];

    const matcher = RegExp(`^controllers\/(.*)[_-]?${prefix}$`);
    Object.keys(importMap()).forEach(function(key) {
      const match = key.match(matcher);
      if (match && match[1]) {
        const name = match[1].replace(/[_-]$/, "").split("/").join("--").replace("_", "-");
        actionSelectors.push(`[${data}-${name}-action]`);
        actionSelectors.push(`[${data}-${name}-actions]`);
      }
    });

    actionSelector = Object.freeze(actionSelectors.join(","));
    console.log(`ACTION SELECTOR is ${actionSelector}`);
  }

  // For a given element and dataset entry, look for an event listener and set one up
  // if necessary
  function registerElementEvent(element, datum) {
    const definition = element.dataset[datum];
    let eventName = definition;
    if (/[=-]>/.test(definition)) {
      eventName = definition.split(/[-_]>/)[0];
    }
    if (!allSystemEventNames.has(eventName)) {
      console.warn(`Unknown event name: ${eventName}, assuming 'click'`);
      eventName = "click";
    }
    console.log(`register ${eventName} ${element}`);
    registerHandler(element, eventName);
  }

  function registerEvents(element) {
    for (var datum in element.dataset) {
      if (/Actions?$/.test(datum)) {
        registerElementEvent(element, datum);
      }
    }
  }

  // Look for all actions within the element and its children
  function initializeActors(root) {
    root.querySelectorAll(actionSelector).forEach(registerEvents);
  }

  const observerCallback = function(mutationList, observer) {
    let actionAttributeChanged = new Set;
    let newChildren = new Set;

    for (const mutation of mutationList) {
      const element = mutation.target;
      if (mutation.type === "childList") {
        debugger;
        if (element.querySelector(actionSelector)) {

          newChildren.add(element);
        }
      } else if (mutation.type === "attributes") {
        if (mutation.attributeName.startsWith(data)) {
          actionAttributeChanged.add(element);
        }
      }
    }
    actionAttributeChanged.forEach((element) => registerEvents(element));
    newChildren.forEach((element) => initializeActors(element));
  };

  const observer = new MutationObserver(observerCallback);

  window.addEventListener("load", function() {
    observer.observe(root, {
      attributes: true,
      characterData: false,
      childList: true,
      subtree: true
    })
  });

  const application = function () {
    return {
      refresh: function() {
        console.log(`REFRESH APP ${prefix}`);
        initializeControllers();
        initializeActors(document.body);
      }
    }
  }
  return application();
}

const applications = new Map();

function applicationFor(prefix) {
  if (!applications.has(prefix)) {
    applications.set(prefix, createApplication(prefix));
  }
  return applications.get(prefix);
}

// APPLICATIONS

// An application is an instance of ATV defined by its prefix

function activate(prefix = "atv") {
  applicationFor(prefix, document.body).refresh();
}

export { activate, version };

