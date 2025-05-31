/*jslint white*/
import { functionify } from "atv/utilities";

// ATV State Maps
// Responsible for storing state by nested keys of any type

const allStateMaps = {};

const DESTROY = 0;
const GET = 1;
const INITIALIZE = 2;
const SET = 3;

function stateMap(name, sticky = true) {
  let map;
  if (sticky) {
    if (!allStateMaps[name]) {
      allStateMaps[name] = new Map();
    }
    map = allStateMaps[name];
  } else {
    map = new Map();
  }

  // A la Picard
  function engage(theMap, params, action, value = undefined) {
    if (params.length === 0) {
      return undefined;
    }
    const firstKey = params[0];
    let result = theMap.get(firstKey);
    if (params.length === 1) {
      switch (action) {
        case DESTROY:
          result = theMap.get(firstKey);
          theMap.delete(firstKey);
          return result;
        case INITIALIZE:
          if (!theMap.has(firstKey)) {
            theMap.set(firstKey, functionify(value));
          }
          break;
        case SET:
          theMap.set(firstKey, functionify(value));
          break;
      }
      return theMap.get(firstKey);
    }
    if (!theMap.has(firstKey)) {
      theMap.set(firstKey, new Map());
    }
    return engage(theMap.get(firstKey), params.slice(1), action, value);
  }

  function initialize(...params) {
    return engage(map, params, INITIALIZE, params.pop());
  }

  function set(...params) {
    return engage(map, params, SET, params.pop());
  }

  function get(...params) {
    return engage(map, params, GET);
  }

  function destroy(...params) {
    return engage(map, params, DESTROY);
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
