/*jslint white*/
import { functionify } from "atv/utilities";

// ATV State Maps
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
          if (result) {
            map.delete(firstKey);
          }
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

export { stateMap };
