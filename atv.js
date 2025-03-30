/*global
  console, document, MutationObserver, window
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

function gatherAllSystemEventNames() {
  const element = document.createElement("input");
  const htmlDivElement = Object.getPrototypeOf(element);
  const htmlElement = Object.getPrototypeOf(htmlDivElement);
  Object.keys(htmlElement).forEach(function (property) {
    if (property.startsWith("on")) {
      allSystemEventNames.add(property.slice(2));
    }
  });
}
gatherAllSystemEventNames();

console.log(`all system events ${Array.from(allSystemEventNames)}`);

function importMap() {
  return JSON.parse(
    document.querySelector("script[type='importmap']").innerText
  ).imports;
}

// HANDLERS -- these span applications

const applications = new Map();

function createHandler(eventName, element) {
  return function (event) {
    console.log(`HANDLER ${eventName}/${element.nodeName}/${element.id}`);
    console.log(event);
    Array.from(applications.values()).forEach((application) =>
      application.handleEvent(eventName, element, event)
    );
  };
}

const allEventHandlers = new Map();

function registerHandler(element, eventName) {
  if (!allEventHandlers.get(element)) {
    allEventHandlers.set(element, new Map());
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
  let data = `data-${prefix}`;
  data = data.replace(/-$/, "");
  const root = document.body;
  let controllerNames = new Set();
  let actionSelector;

  // Gather all controllers from the importmap and add their names
  // to the action finder selector
  function initializeControllers() {
    let actionSelectors = [`[${data}-action]`, `[${data}-actions]`];

    const matcher = new RegExp(`^controllers\/(.*)[_-]?${prefix}$`);
    Object.keys(importMap()).forEach(function (key) {
      const match = key.match(matcher);
      if (match && match[1]) {
        const name = match[1]
          .replace(/[_\-]$/, "")
          .split("/")
          .join("--")
          .replace("_", "-");
        actionSelectors.push(`[${data}-${name}-action]`);
        actionSelectors.push(`[${data}-${name}-actions]`);
        controllerNames.add(name);
      }
    });

    actionSelector = Object.freeze(actionSelectors.join(","));
    console.log(`ACTION SELECTOR is ${actionSelector}`);
  }

  // For a given element and dataset entry, look for an event
  // listener and set one up if necessary
  function registerElementEvent(element, datum) {
    const definition = element.dataset[datum];
    let eventName = definition;
    if (/[=\-]>/.test(definition)) {
      eventName = definition.split(/[\-=]>/)[0];
    }
    if (!allSystemEventNames.has(eventName)) {
      console.warn(`Unknown event name: ${eventName}, assuming 'click'`);
      eventName = "click";
    }
    console.log(`register ${eventName} ${element}`);
    registerHandler(element, eventName);
  }

  function registerEvents(element) {
    Object.keys(element.dataset).forEach(function (datum) {
      if (/Actions?$/.test(datum)) {
        registerElementEvent(element, datum);
      }
    });
  }

  // Look for all actions within the element and its children
  function initializeActors(root) {
    root.querySelectorAll(actionSelector).forEach(registerEvents);
  }

  const observerCallback = function (mutationList) {
    let actionAttributeChanged = new Set();
    let newChildren = new Set();

    mutationList.forEach(function (mutation) {
      const element = mutation.target;
      if (mutation.type === "childList") {
        if (element.querySelector(actionSelector)) {
          newChildren.add(element);
        }
      } else if (mutation.type === "attributes") {
        if (mutation.attributeName.startsWith(data)) {
          actionAttributeChanged.add(element);
        }
      }
    });
    actionAttributeChanged.forEach((element) => registerEvents(element));
    newChildren.forEach((element) => initializeActors(element));
  };

  const observer = new MutationObserver(observerCallback);

  window.addEventListener("load", function () {
    observer.observe(root, {
      attributes: true,
      characterData: false,
      childList: true,
      subtree: true
    });
  });

  function handleEvent(eventName, element, event) {
    console.log(`Application ${prefix} handling ${eventName}`);
    console.log(element);
    console.log(event);
  }

  function refresh() {
    console.log(`REFRESH APP ${prefix}`);
    initializeControllers();
    initializeActors(document.body);
  }

  const application = function () {
    return {
      handleEvent,
      refresh
    };
  };
  return application();
}

function applicationFor(prefix) {
  if (!applications.has(prefix)) {
    applications.set(prefix, createApplication(prefix));
  }
  return applications.get(prefix);
}

/*
 * Gets all action declarations for an element, returns an array of structures.
 */
function actionsFor(prefix, element) {
  function parseActions(input, defaultController) {
    const tokens = input.match(/(=>|->|[\w]+[\-\w]+[\w]|\S)/g);
    let ii = 0;

    function parse() {
      const actions = [];
      while (ii < tokens.length) {
        console.log(`-----${peek()} ${ii}`);
        actions.push(parseAction());
        if (peek() === ",") {
          ii += 1;
        }
      }
      return actions;
    }

    function parseAction() {
      const event = consume();
      if (peek() === "=>" || peek() === "->") {
        consume();
      }
      let controller = defaultController;

      if (peek(1) === "#") {
        console.log("x2");
        controller = consume();
        consume("#");
      }

      let method = "";

      if (/^[\w]+[\-\w]+[\w]+$/.test(peek())) {
        method = consume();
      } else {
        method = event;
      }

      if (!controller) {
        controller = method;
        method = event;
      }

      controller = controller.replace(/_/g, "-");

      let parameters = [];
      if (peek() === "(") {
        parameters = parseParams();
      }

      return {
        controller,
        event,
        method,
        parameters
      };
    }

    function parseParams() {
      consume("(");
      const params = [];
      let param = "";
      let braceCount = 0;
      let inString = false;
      let stringChar = "";

      while (ii < tokens.length) {
        const token = consume();

        if (/["']/.test(token) && !inString) {
          inString = true;
          stringChar = token;
        } else if (token === stringChar && inString) {
          inString = false;
          stringChar = "";
        }

        if (!inString) {
          if ((token === "," || token === ")") && braceCount === 0) {
            params.push(sanitize(param));
            param = "";
            if (token === ")") {
              break;
            }
          } else {
            if (token === "(") {
              braceCount += 1;
            }
            if (token === ")") {
              braceCount -= 1;
            }
            param += token;
          }
        } else {
          param += token;
        }
      }

      if (param) {
        params.push(sanitize(param.trim()));
      }

      return params;
    }

    function sanitize(param) {
      param = param.trim();
      if (/^-?\d*[.]?\d+$/.test(param)) {
        return Number(param);
      }
      const length = param.length;
      const first = param.charAt[0];
      if (/["']/.test(first) && !param.endsWith(first)) {
        return param;
      }
      return param.substring(1, length - 1);
    }

    function consume(expected) {
      const token = peek();
      ii += 1;
      if (expected && token !== expected) {
        console.log(`Expected ${expected} but found ${token}`);
      }
      return token;
    }

    function peek(offset = 0) {
      const token = tokens[ii + offset];
      if (!token) {
        return "";
      }
      return token;
    }

    return parse();
  }

  const dataRegex = new RegExp(`^data[_-]${prefix}(.*)[-_]actions?`);
  let result = [];

  element.getAttributeNames().forEach(function (name) {
    console.log(`attribute: ${name}`);

    const match = name.match(dataRegex);

    if (!match) {
      return;
    }
    const controller = match[1].replace(/[_]/g, "-").replace(/^[\-]/, "");
    const content = element.getAttribute(name);
    if (content.startsWith("[")) {
      try {
        JSON.parse(content).forEach(function (part) {
          result = result.concat(parseActions(part, controller));
        });
      } catch {
        console.error("Malformed JSON");
      }
      return;
    }
    result = result.concat(parseActions(content, controller));
  });
  return result;
}

// APPLICATIONS

// An application is an instance of ATV defined by its prefix

function activate(prefix = "atv") {
  applicationFor(prefix).refresh();
}

export { activate, version };
