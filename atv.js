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

import { createControllerManager } from "atv/controller-manager";
import { loadImportmap } from "atv/importmap";
import { stateMap } from "atv/state-map";

const version = "0.2.0";

// Maintain list of applications in this top-level module
// An application is identified by its "prefix"-- default "atv"
// This allows for avoiding name collisions *and* independent apps on
// the same page.

function createApplication(prefix) {
  const application = {};
  const manager = createControllerManager(prefix);

  application.activate = function () {
    loadImportmap(manager.refresh);
  };

  return application;
}

const applications = stateMap("applications");

function activate(prefix = "atv") {
  prefix = `${prefix}`;
  applications.initialize(prefix, function () {
    const application = createApplication(prefix);
    application.activate();
    return application;
  });
}

export { activate, version };
