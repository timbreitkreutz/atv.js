/*global document, console, MutationObserver */
/*jslint white*/
//
// ATV.js: Actions, Targets, Values
//
// Super vanilla JS / Lightweight alternative to stimulus without "class"
// overhead and binding nonsense, just the actions, targets, and values
// Also more forgiving with hyphens and underscores.

// The MIT License (MIT)

// Copyright (c) 2025 Timothy Breitkreutz

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

const version = "0.2.2";
// ----------- atv/action-parser.js -----------
//
// A recursive-descent parser for ATV actions

const actionMap = stateMap();
const tokenizer = new RegExp("(=>|->|[\\w]+[\\-\\w]+[\\w]|\\S)", "g");

function parseActions(input, defaultController) {
  if (actionMap.get(input, defaultController)) {
    return actionMap.get(input, defaultController);
  }
  const tokens = input.match(tokenizer);
  let ii = 0;

  function parse() {
    const actions = [];
    while (ii < tokens.length) {
      actions.push(parseAction());
      if (peek() === ",") {
        ii += 1;
      }
    }
    return actions;
  }

  function parseAction() {
    let eventName = consume();
    let method;
    let theController = defaultController;

    const nextToken = peek();
    if (
      nextToken === "(" ||
      nextToken === "," ||
      isWord.test(nextToken) ||
      !nextToken
    ) {
      method = eventName;
      theController = defaultController;
    } else if (nextToken === "->" || nextToken === "=>") {
      consume(); // ->
      if (peek(1) === "#") {
        theController = consume();
        consume(); // #
        method = consume();
      } else if (defaultController) {
        theController = defaultController;
        method = consume();
      } else {
        theController = consume();
        method = eventName;
      }
    }
    if (!theController) {
      console.error("No controller specified");
      return;
    }

    return {
      controllerName: theController.replace(underscore, "-"),
      eventName: eventName || method,
      method,
      parameters: parseParameters()
    };
  }

  function parseParameters() {
    const params = [];
    if (peek() !== "(") {
      return params;
    }
    consume("(");
    let param = "";
    let braceCount = 0;
    let inString = false;
    let stringChar = "";

    while (ii < tokens.length) {
      const token = consume();

      if (isQuote.test(token) && !inString) {
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
    if (isNumber.test(param)) {
      return Number(param);
    }
    const length = param.length;
    const first = param.charAt[0];
    if (isQuote.test(first) && !param.endsWith(first)) {
      return param;
    }
    return param.substring(1, length - 1);
  }

  function consume(expected) {
    const token = peek();
    ii += 1;
    if (expected && token !== expected) {
      console.error(`Expected ${expected} but found ${token}`);
    }
    return token;
  }

  function peek(offset = 0) {
    return tokens[ii + offset];
  }

  const result = parse();
  actionMap.set(input, defaultController, result);
  return result;
}

// ----------- atv/action.js -----------
//
// Responsible for processing ATV actions

function actionSequence(prefix, element) {
  const matcher = new RegExp(`${dataPrefix(prefix)}[-_](.*)[_-]?actions?$`);

  let parsed = [];

  element.getAttributeNames().forEach(function (attributeName) {
    const match = attributeName.match(matcher);
    if (match) {
      const defaultController = match[1].replace(/[\-_]$/, "");
      const concatenate = function (action) {
        parsed = parsed.concat(parseActions(action, defaultController));
      };
      const attribute = element.getAttribute(attributeName);
      if (attribute.startsWith("[")) {
        JSON.parse(attribute).forEach(concatenate);
      } else {
        concatenate(attribute);
      }
    }
  });
  return parsed;
}

function distinctEventNamesFor(prefix, element) {
  let result = new Set();
  actionSequence(prefix, element).forEach(function (action) {
    if (action?.eventName) {
      result.add(action.eventName);
    }
  });
  return Array.from(result);
}

// Respond to an event
function act(prefix, element, incomingEventName, event) {
  let finished = false;
  actionSequence(prefix, element).forEach(function ({
    controllerName,
    eventName,
    method,
    parameters
  }) {
    if (finished || eventName !== incomingEventName) {
      return;
    }
    const controller = controllerFor(prefix, element, controllerName);
    if (controller && controller.actions[method]) {
      if (!controller.actions[method](event.target, event, parameters)) {
        finished = true;
      }
    }
  });
}

// ----------- atv/application.js -----------
//
// Maintain list of applications in this top-level module
//
// An application is identified by its "prefix"-- default "atv"
// This allows for avoiding name collisions *and* independent apps on
// the same page.

function createApplication(prefix) {
  const application = {};
  const manager = createControllerManager(prefix);

  application.activate = function () {
    loadImportmap(manager.refresh);
  };
  application.manager = manager;

  return application;
}

const applications = stateMap();

function activate(prefix = "atv") {
  prefix = `${prefix}`;
  applications.initialize(prefix, function () {
    const application = createApplication(prefix);
    application.activate();
    return application;
  });
}

// ----------- atv/controller-manager.js -----------
//
// Reponsible for managing all the instances of a given controller type,
// E.g. <div data-atv-controller="my-controller">:
// There will be one "manager" for "my" with the prefix "atv", responsible
// for care and feeding of the controllers (worker bees).

const allControllers = stateMap();

function createControllerManager(prefix) {
  const selector = controllerSelector(prefix);
  const managers = {};
  let watchingDom = false;

  let log = () => undefined;
  if (document.querySelector(friendlySelector(`data-${prefix}-report`))) {
    log = (message) => console.log(`ATV (${prefix}): ${message}`);
  }

  // Find outlets (provided to atv controllers as fourth connect parameter)
  function outlets(selector, controllerName, callback) {
    document.querySelectorAll(selector).forEach(function (element) {
      const controller = allControllers.get(prefix, element, controllerName);
      if (controller) {
        callback(controller);
      }
    });
  }

  // This public function receives a set of ES6 modules from
  // the importmap loader
  function refresh(moduleDefinitions) {
    let controllerCount = 0;

    function refreshModule({ controllerName, module, version }) {
      const manager = managers[controllerName];
      if (!manager || manager.version !== version) {
        const staleControllers = manager?.controllers;
        if (staleControllers) {
          staleControllers.forEach(function (controller) {
            controller.disconnect();
          });
        }

        // Manager structure
        managers[controllerName] = {
          controllerName,
          controllers: new Map(),
          module,
          outlets,
          prefix,
          selector,
          version
        };
      }
    }

    function addOrUpdateControllers() {
      const liveList = stateMap();
      allControllerElements(prefix).forEach(function ([
        controllerName,
        element
      ]) {
        const manager = managers[controllerName];
        if (!manager) {
          console.error(`ATV: Missing module: ${prefix}/${controllerName}`);
          return;
        }
        let controller = manager.controllers.get(element);
        if (controller?.disconnect) {
          controller.disconnect();
          controller = undefined;
        }
        if (!controller) {
          const newController = createController(manager, element);
          manager.controllers.set(element, newController);
          allControllers.set(prefix, element, controllerName, newController);
        }
        liveList.set(element, controllerName, true);
        controllerCount += 1;
      });
      allControllers
        .get(prefix)
        ?.keys()
        ?.forEach(function (element) {
          allControllers
            .get(prefix, element)
            ?.keys()
            ?.forEach(function (controllerName) {
              if (liveList.get(element, controllerName)) {
                return;
              }
              const controller = allControllers.destroy(
                prefix,
                element,
                controllerName
              );
              const disconnector = controller?.actions?.disconnect;
              if (disconnector) {
                disconnector();
              }
            });
        });
    }

    function refreshApplication() {
      addOrUpdateControllers();
      refreshEvents(prefix);
    }

    function setupDomWatcher() {
      if (watchingDom) {
        return;
      }
      watchingDom = true;
      const observer = new MutationObserver(refreshApplication);
      observer.observe(document.body, { childList: true, subtree: true });
      document.documentElement.addEventListener("turbo:load", function () {
        refreshApplication();
        watchingDom = false;
        setupDomWatcher();
      });
    }

    moduleDefinitions.forEach(refreshModule);
    refreshApplication();
    setupDomWatcher();
    const managerCount = Object.keys(managers).length;
    log(`Activated: Managers: ${managerCount} Controllers: ${controllerCount}`);
  }
  return { refresh };
}

// Find the container controller by prefix and name for element
function controllerFor(prefix, element, controllerName) {
  if (element === undefined) {
    return;
  }
  const controller = allControllers.get(prefix, element, controllerName);
  if (controller) {
    return controller;
  }
  return controllerFor(prefix, element.parentNode, controllerName);
}

// ----------- atv/controller.js -----------
//
// This is the worker bee, a controller specifically attached
// to a given dom element.

function createController(controllerManager, element) {
  const targets = {}; // Exposed to ATV controller code
  const values = {}; // Exposed to ATV controller code
  const prefix = controllerManager.prefix;

  // Used to update controllers if importmap is changed to a new cache name
  const controller = {
    element,
    moduleVersion: controllerManager.version,
    prefix,
    targets,
    values
  };

  // Update or find associated targets and values
  function refresh() {
    refreshValues(controllerManager, element, values);
    refreshTargets(controllerManager, element, targets);
  }

  controller.refresh = refresh;

  refresh();

  // This is where the actual connection to the controller instance happens
  const result = controllerManager.module.connect(
    targets,
    values,
    element,
    controllerManager.outlets
  );
  controller.actions = functionify(result);

  return controller;
}

// ----------- atv/element-finder.js -----------
//
// Helpers to deal with finding things in the DOM

function rawSelector(prefix, type) {
  let dashPrefix = "";
  if (prefix) {
    dashPrefix = `${prefix}-`;
  }
  return ["data-", dashPrefix, type].join("");
}

function allControllerElements(prefix) {
  const result = [];
  const selector = rawSelector(prefix, "controller");
  const elements = Array.from(
    document.body.querySelectorAll(friendlySelector(selector))
  );
  elements.forEach(function (element) {
    allVariants(selector).forEach(function (variant) {
      const value = element.getAttribute(variant);
      if (value) {
        value.split(/[\s,]+/).forEach(function (controllerName) {
          result.push([controllerName.replace(/_/g, "-"), element]);
        });
      }
    });
  });
  return result;
}

function allActionElements(prefix) {
  const result = new Set();

  function collectActions(selector) {
    Array.from(
      document.body.querySelectorAll(friendlySelector(selector))
    ).forEach(function (element) {
      element.getAttributeNames().forEach(function (attributeName) {
        if (/^data.*actions?$/.test(attributeName)) {
          result.add(element);
        }
      });
    });
  }
  collectActions(rawSelector(prefix, "action"));
  allControllerNames.forEach(function (controllerName) {
    collectActions(rawSelector(prefix, `${controllerName}-action`));
  });
  return Array.from(result);
}

function controllerSelector(prefix) {
  return `[${rawSelector(prefix, "controller")}]`;
}

function outOfScope(element, rootElement, controllerName, prefix) {
  if (!element || element.nodeType === "BODY") {
    return true;
  }
  const closestRoot = element.closest(controllerSelector(prefix));
  if (!closestRoot) {
    return true;
  }
  let out = false;
  attributesFor(closestRoot, "controller").forEach(function (attr) {
    const list = attr.split(deCommaPattern).map((str) => dasherize(str));
    if (list.includes(controllerName)) {
      out = !(closestRoot === rootElement);
    } else {
      out = outOfScope(
        closestRoot.parentNode,
        rootElement,
        controllerName,
        prefix
      );
    }
  });
  return out;
}

const variantRegex = new RegExp("([^_-]+)[-_]?(.*)");
const startRegex = new RegExp("^[-_]");

function allVariants(selector) {
  if (!selector) {
    return [];
  }
  const variants = new Set();
  function addVariants(prefix, remainder) {
    if (remainder) {
      const match = remainder.match(variantRegex);
      if (match) {
        const first = match[1];
        const rest = match[2];
        addVariants(`${prefix}-${first}`, rest);
        addVariants(`${prefix}_${first}`, rest);
        return;
      }
    }
    const result = prefix.replace(startRegex, "");
    variants.add(result);
    variants.add(`${result}s`);
  }
  addVariants("", selector);
  return Array.from(variants);
}

function friendlySelector(selector) {
  return allVariants(selector)
    .map((item) => `[${item}]`)
    .join(",");
}

// ----------- atv/event.js -----------

const allHandlers = stateMap();

function refreshHandler(prefix, element, eventName) {
  if (allHandlers.get(prefix, element, eventName)) {
    return;
  }
  const handler = function (event) {
    act(prefix, element, eventName, event);
  };
  allHandlers.set(prefix, element, eventName, () => handler);
  element.addEventListener(eventName, handler);
}

function refreshEvents(prefix) {
  allActionElements(prefix).forEach(function (element) {
    distinctEventNamesFor(prefix, element).forEach(function (eventName) {
      refreshHandler(prefix, element, eventName);
    });
  });
}

// ----------- atv/importmap.js -----------
//
// Responsible for finding all the available ATV controllers
// in the importmaps. Also provides a global list of all
// controller type names

const importMapSelector = "script[type='importmap']";
const allControllerNames = new Set();

function importMap() {
  return JSON.parse(document.querySelector(importMapSelector).innerText)
    .imports;
}

// This method is called first upon activation (booting) of ATV
// for a given prefix. The callback receives a set of fully
// instantiated ES6 modules and will complete initialization.
function loadImportmap(complete) {
  const importMapper = new RegExp("^controllers\/(.*)[-_]atv$");
  const moduleDefinitions = [];

  function reloadModules() {
    const map = importMap();
    const moduleLoaderPromises = [];

    Object.keys(map).forEach(function (source) {
      const matched = source.match(importMapper);
      if (!matched) {
        return;
      }
      const controllerName = matched[1]
        .split("/")
        .join("--")
        .replace(underscore, "-");
      allControllerNames.add(controllerName);
      moduleLoaderPromises.push(
        new Promise(function (resolve) {
          import(source).then(function (module) {
            const version = `${map[source]}`;
            moduleDefinitions.push({
              controllerName,
              module,
              version
            });
            resolve(module);
          });
        })
      );
    });

    Promise.allSettled(moduleLoaderPromises).then(() =>
      complete(moduleDefinitions)
    );
  }

  // This watcher is just for the importmap header script itself.
  function setupDomWatcher() {
    const observer = new MutationObserver(reloadModules);
    observer.observe(document.querySelector(importMapSelector), {
      childList: true,
      subtree: true
    });
  }

  reloadModules();
  setupDomWatcher();
}

// ----------- atv/pluralize.js -----------
// Inspired by Rails Inflector
// Used for target lists, assuming all targets will be lower case

const irregularMap = {
  child: "children",
  index: "indices",
  louse: "lice",
  man: "men",
  matrix: "matrices",
  mouse: "mice",
  ox: "oxen",
  person: "people",
  potato: "potatoes",
  quiz: "quizzes",
  tomato: "tomatoes",
  vertex: "vertices"
};

const replacements = [
  [/quiz$/, "quizzes"],
  [/x$/, "xes"],
  [/ch$/, "ches"],
  [/ss$/, "sses"],
  [/sh$/, "shes"],
  [/s$/, "ses"]
];

function pluralize(word) {
  if (Object.values(irregularMap).includes(word)) {
    return word;
  }
  if (irregularMap[word]) {
    return irregularMap[word];
  }
  let ii;
  for (ii = 0; ii < replacements.length; ii += 1) {
    const [pattern, replacement] = replacements[ii];
    if (pattern.test(word)) {
      return word.replace(pattern, replacement);
    }
  }
  const m1 = word.match(/([^aeiouy]|qu)y$/i);
  if (m1) {
    return word.replace(/y$/, "ies");
  }
  const m2 = word.match(/(?:([^f])fe|([lr])f)$/i);
  if (m2) {
    return word.replace(/f$/, "ves");
  }
  return `${word}s`;
}

// ----------- atv/state-map.js -----------
// Responsible for storing state by nested keys of any type

function stateMap() {
  // A la Picard
  function engage(map, params, action, value = undefined) {
    if (params.length === 0) {
      return undefined;
    }
    const firstKey = params[0];
    let result = map.get(firstKey);
    if (params.length === 1) {
      switch (action) {
        case "destroy":
          result = map.get(firstKey);
          map.delete(firstKey);
          return result;
        case "initialize":
          if (!map.has(firstKey)) {
            map.set(firstKey, functionify(value));
          }
          break;
        case "set":
          map.set(firstKey, functionify(value));
          break;
      }
      return map.get(firstKey);
    }
    if (!map.has(firstKey)) {
      map.set(firstKey, new Map());
    }
    return engage(map.get(firstKey), params.slice(1), action, value);
  }

  const map = new Map();

  function initialize(...params) {
    return engage(map, params, "initialize", params.pop());
  }

  function set(...params) {
    return engage(map, params, "set", params.pop());
  }

  function get(...params) {
    return engage(map, params, "get");
  }

  function destroy(...params) {
    return engage(map, params, "destroy");
  }

  return {
    destroy,
    get,
    initialize,
    map,
    set
  };
}

// ----------- atv/target.js -----------
//
// Responsible for keeping track of all the targets on the page

const targetMatchers = {};
const targetSelectors = {};

function refreshTargets(controllerManager, rootElement, targets) {
  const controllerName = controllerManager.controllerName;
  const prefix = controllerManager.prefix;
  let matcherKey = controllerName;
  if (prefix) {
    matcherKey = `${prefix}-${controllerName}`;
  }

  function dataMatcher() {
    if (!targetMatchers[matcherKey]) {
      const friendlyName = controllerName.replace(/-/g, "[-_]");
      let parts = ["data[-_]", prefix];
      if (prefix) {
        parts.push(`[-_]${friendlyName}[-_]target[s]?`);
      }
      targetMatchers[matcherKey] = new RegExp(parts.join(""));
    }
    return targetMatchers[matcherKey];
  }

  function dataSelector() {
    if (!targetSelectors[matcherKey]) {
      targetSelectors[matcherKey] = friendlySelector(
        `data-${matcherKey}-target`
      );
    }
    return targetSelectors[matcherKey];
  }

  Object.keys(targets).forEach(function (key) {
    delete targets[key];
  });

  function updateTargets(element) {
    if (outOfScope(element, rootElement, controllerName, prefix)) {
      return;
    }
    element.getAttributeNames().forEach(function (attributeName) {
      if (dataMatcher().test(attributeName)) {
        const parsed = element.getAttribute(attributeName);
        parsed.split(/[\s]*,[\s]*/).forEach(function (key) {
          const pluralKey = pluralize(key);
          if (targets[pluralKey]?.includes(element)) {
            return;
          }
          targets[key] = element;
          if (!targets[pluralKey]) {
            targets[pluralKey] = [];
          }
          targets[pluralKey].push(element);
        });
      }
    });
  }
  updateTargets(rootElement);
  rootElement.querySelectorAll(dataSelector()).forEach(updateTargets);
}

// ----------- atv/utilities.js -----------

const deCommaPattern = /,[\s+]/;
const isNumber = new RegExp("^-?\\d*[.]?\\d+$");
const isQuote = new RegExp("[\"']");
const isWord = new RegExp("\\w+");
const underscore = new RegExp("[_]", "g");

function attributesFor(element, type) {
  return attributeKeysFor(element, type).map(function (name) {
    return element.getAttribute(name);
  });
}

function attributeKeysFor(element, type) {
  if (!element || !element.getAttributeNames) {
    return [];
  }
  const regex = new RegExp(`${type}s?$`, "i");
  return element.getAttributeNames().filter((name) => regex.test(name));
}

function dasherize(string) {
  return string.replace(/_/g, "-");
}

function dataPrefix(prefix) {
  if (prefix) {
    return `data-${prefix}`;
  }
  return "data";
}

function functionify(value) {
  if (typeof value === "function") {
    return value();
  }
  return value;
}

// ----------- atv/value.js -----------
//
// Represents a value for a given controller.

const valueMatchers = {};
const valueRegex = /values?/;

function refreshValues(controllerManager, element, values) {
  const controllerName = controllerManager.controllerName;
  const prefix = controllerManager.prefix;
  const matcherKey = `${prefix}-${controllerName}`;

  function dataMatcher() {
    const friendlyName = controllerName.replace(/-/g, "[-_]");
    if (!valueMatchers[matcherKey]) {
      let parts = ["data[-_]", prefix];
      if (prefix) {
        parts.push(`[-_]${friendlyName}[-_]value[s]?`);
      }
      valueMatchers[matcherKey] = new RegExp(parts.join(""));
    }
    return valueMatchers[matcherKey];
  }

  // Must preserve the original "values" object here.
  Object.keys(values).forEach(function (key) {
    delete values[key];
  });
  element.getAttributeNames().forEach(function (attributeName) {
    if (dataMatcher().test(attributeName)) {
      if (!valueRegex.test(attributeName)) {
        return;
      }
      const value = element.getAttribute(attributeName);
      let parsed;
      if (value.startsWith("{")) {
        parsed = JSON.parse(value);
      } else {
        parsed = JSON.parse(`{${value}}`);
      }
      Object.keys(parsed).forEach(function (key) {
        values[key] = parsed[key];
      });
    }
  });
}

export { activate, version };
