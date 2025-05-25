/*jslint white*/
// ATV/value
//
// Represents a value for a given controller.

const matchers = {};
const valueRegex = /values?/;

function refreshValues(controllerManager, element, values) {
  const controllerName = controllerManager.controllerName;
  const prefix = controllerManager.prefix;
  const matcherKey = `${prefix}-${controllerName}`;

  function dataMatcher() {
    const friendlyName = controllerName.replace(/-/g, "[-_]");
    if (!matchers[matcherKey]) {
      let parts = ["data[-_]", prefix];
      if (prefix) {
        parts.push(`[-_]${friendlyName}[-_]value[s]?`);
      }
      matchers[matcherKey] = new RegExp(parts.join(""));
    }
    return matchers[matcherKey];
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

export { refreshValues };
