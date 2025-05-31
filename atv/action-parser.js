/*jslint white*/
/*global console*/
import { isNumber, isQuote, isWord, underscore } from "atv/utilities";
import { stateMap } from "atv/state-map";

// ATV Action Parser
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

export { parseActions };
