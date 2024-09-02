# atv.js
Lightweight JavaScript for Rails inspired by Stimulus.js


Do you just want to have actions, targets, and values available in your Rails JS controllers? Tired of messing around with `this` and `bind` and the other bad parts of Javascript?

Do you want to not care about whether you have underscores or dashes in your Rails JS data attributes in the HTML?

Is stimulus just not DRY enough for you?


If so, this library might be for you!

Here is an example that simulates a conversation you might have upon meeting an extraterrestrial alien:

```html
<!-- example.html -->
<div data-atv-controller="greeting", data-atv-greeting-values="<%= {greeting: 'We come in peace!'}.to_json %>">
  <p>Hello earthling!</p>
  <button data-atv-greeting-action="click">Greet me</button>
  <p data-atv-greeting-target="output"></p>
</div>
```
For the controller, all you need to provide is an `activate` method that take the targets, values, root element, and module.
It needs to return a hash of action functions (which receive regular old DOM events).
```js
  // atv_greeting_controller.js
  const activate = (targets, values) => {
    return {
      click: (from) => {
        from.style.display = 'none'; // the button
        targets.output.innerText = values.greeting; // the output paragraph
      }
    }
  };

  export { activate };
```

Compare this to the [stimulus](https://stimulus.hotwired.dev) equivalent: in particular the "action" declaration. Also note that in stimulus it is darn near impossible to use it at all without JavaScript "classes". With ATV you can use those if you want, but you don't have to.
