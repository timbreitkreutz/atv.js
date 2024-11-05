![atv-sm](https://github.com/user-attachments/assets/2d7657c1-0e41-49e1-93a3-6394f49fcf74)


# atv.js
Lightweight JavaScript for Rails inspired by Stimulus.js


Do you just want to have actions, targets, and values available in your Rails JS controllers? Tired of messing around with `this` and `bind` and the other bad parts of JavaScript?

Do you want to not care about whether you have underscores or dashes in your Rails JS data attributes in the HTML?

Is stimulus just not DRY enough for you?

If so, this library might be for you!

Here is an example that simulates a conversation you might have upon meeting an extraterrestrial alien:

```html
<!-- greeting.html -->

<div data-atv-controller="greeting" data-atv-greeting-values="<%= {greeting: 'We come in peace!'}.to_json %>">
  <p>Hello earthling!</p>
  <button data-atv-greeting-action="click">Greet me</button>
  <p data-atv-greeting-target="output"></p>
</div>
```
For the controller, all you need to provide is an `connect` method that receives the targets, values, root element, and module as arguments.
It needs to return a hash of action functions (which receive regular old DOM events).
```js
  // app/javascript/controllers/greeting_atv.js
  const connect = (targets, values) => {
    const actions = {
      click: (actor) => {
        actor.style.display = 'none'; // the button
        targets.output.innerText = values.greeting; // the output paragraph
      }
    }
    return actions;
  };

  export { connect };
```

Finally, the following JS is required (typically in the application layout header) to activate it on your page
```js
  import { activate } from 'atv';

  activate();
```

Compare this to the [stimulus](https://stimulus.hotwired.dev) equivalent: in particular the "action" declaration. Also note that in stimulus it is darn near impossible to use it at all without JavaScript "classes". With ATV you can use those if you want, but you don't have to.

## Examples

[ATV By Example](https://atv.sbrew.com/atv_by_example)

## Coming Soon!

* More documentation!
* More Tests
* And other things

## Contributing

ATV is still a very young project.
This incarnation started afresh in August 2024 after a couple of previous sketches and prototypes were thrown out.

If you like this idea and want to help out please join or start a discussion here on the GitHub page. I'm looking for like minded rails fans who also are striving to do clean, minimalist JavaScript along the lines of Douglas Crockford (JavaScript--The Good Parts).

### Credo

* Keep It Simple, Sam
* atv.js will be formatted with `prettier --trailing-comma none`
* I reserve the right to make atv.js pass JSlint (browser, whitespace options-- will need a little massaging each time unfortunately) at any given time. Incoming PRs must not add new JSLint violations.
* where there is a conflict, `prettier --trailing-comma none` trumps JSlint