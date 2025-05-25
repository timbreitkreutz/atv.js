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
  const myStateMap = allStateMaps[name];

  // A la Picard
  function engage(map, keyParams, action, value = undefined) {
    if (keyParams.length === 0) {
      return undefined;
    }
    const firstKey = keyParams[0];
    if (keyParams.length === 1) {
      switch (action) {
        case DESTROY:
          map.delete(firstKey);
          break;
        case INITIALIZE:
          if (!map.has(firstKey)) {
            map.set(firstKey, functionify(value));
          }
          break;
        case SET:
          map.set(firstKey, functionify(value));
          break;
      }
      return map.get(firstKey);
    }
    if (!map.get(firstKey)) {
      map.set(firstKey, new Map());
    }
    return engage(map.get(firstKey), keyParams.slice(1), action, value);
  }

  function initialize(...params) {
    return engage(myStateMap, params, INITIALIZE, params.pop());
  }

  function set(...params) {
    return engage(myStateMap, params, SET, params.pop());
  }

  function get(...params) {
    return engage(myStateMap, params, GET);
  }

  function destroy(...params) {
    return engage(myStateMap, params, DESTROY);
  }

  return {
    destroy,
    get,
    initialize,
    map: myStateMap,
    set
  };
}

export { stateMap };
