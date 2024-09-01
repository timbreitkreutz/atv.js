# atv.js
Lightweight JavaScript for Rails inspired by Stimulus.js


Do you just want to have actions, targets, and values available in your Rails JS controllers? Tired of messing around with `this` and `bind` and the other bad parts of Javascript?

Do you want to not care about whether you have underscores or dashes in your Rails JS data attributes in the HTML?


If so, this library might be for you!

Here is an example that simulates a conversation you might have upon meeting an extraterrestrial alien:

```html
  <!-- example.html -->
  <div data-atv-controller="example", data-example-values="{greeting: 'We come in peace'}">
    <p>Hello earthling!</p>
    <button data-example-action="click">Greet me</button>
    <p data-example-target="output"></p>
  </div>
```
```js
  // atv_example_controller.js
  const activate = (targets, values) => {
    click: () => {
      targets.output.innerText = values.greeting;
    }
  };
  export { activate };

```

Compare this to the [stimulus](https://stimulus.hotwired.dev) equivalent: in particular the "action" declaration. Also note that in stimulus it is darn near impossible to use it at all without JavaScript "classes". With ATV you can use those if you want, but you don't have to.
