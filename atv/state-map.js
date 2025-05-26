/*jslint white*/
import { functionify } from "atv/utilities";

const allStateMaps = {};

const DESTROY = 0;
const GET = 1;
const INITIALIZE = 2;
const SET = 3;

function stateMap(name) {
  if (!allStateMaps[name]) {
    allStateMaps[name] = new Map();
  }
  const map = allStateMaps[name];

  // A la Picard
  function engage(theMap, params, action, value = undefined) {
    if (params.length === 0) {
      return undefined;
    }
    const firstKey = params[0];
    if (params.length === 1) {
      switch (action) {
        case DESTROY:
          theMap.delete(firstKey);
          break;
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
    if (!theMap.get(firstKey)) {
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
