![atv-sm](https://github.com/user-attachments/assets/2d7657c1-0e41-49e1-93a3-6394f49fcf74)


# atv.js
Lightweight JavaScript for Rails inspired by Stimulus.js; minifies to under 7,000 bytes.

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

## Dependencies

* importmaps
* es6 modules
* rails standard location of JS controllers (i.e. app/javascript/controllers/*_atv.js)
* reasonably modern browser--regularly tested on firefox, safari, and a couple-years-old chromium

## Usage and examples

Run the script `bin/install_rails.rb` from your rails root, or do the following manual steps:

To add to your importmap enabled rails app:

```
bin/importmap pin '@sbrew.com/atv'
```

Then add the following code to your global application layout (or global JavaScript page):

```js
<script type="module">
  import { activate } from '@sbrew.com/atv';

  activate();
</script>
```

Right now all the features of ATV can be seen in action at [ATV By Example](https://atv.sbrew.com/atv_by_example)

## Coming Soon!

* I'll be continuing to add more tests and documentation.
* Namespaced controllers (i.e. `controllers/domain/do_the_thing_atv.js`)
* Automated tests around reloading the whole page

If there's demand, the following things might get added:
* Something closer to the 'window' events of stimulus
* Broken out values, vs a single JSON attribute
* Ability to modify attributes in the DOM and pick up the changes, e.g. new targets added dynamically

## Contributing

ATV is still a very young project.
This incarnation started afresh in August 2024 after a couple of previous sketches and prototypes were thrown out.

If you like this idea and want to help out please join or start a discussion here on the GitHub page. I'm looking for like minded rails fans who also are striving to do clean, minimalist JavaScript along the lines of Douglas Crockford (JavaScript--The Good Parts).

### Tests

* Tests are run in `atv-test` -- it's a Rails 8 Beta app set up with capybara/selenium on Firefox.
* To run tests: `rails test:system`

### Credo

* Keep It Simple, Sam
* Stick to functional style (a la Crockford) with minimum fuss, avoid classes or forcing user to program with any bad parts of JavaScript. 
* Linters/formatters:  applied in the following sequence, with manual adjustments as necessary:
    * `node jslint.mjs --browser --devel --white atv.js` to the extent the following two will be able to run correctly
    * `npx eslint atv.js`
    * `npx prettier --trailing-comma none atv.js --write`
* Some new-ish JavaScript idioms are avoided on purpose for one slightly older browser I have to support for now, e.g. the ... operator.  Soon.


[![0 dependencies!](https://0dependencies.dev/0dependencies.svg)](https://0dependencies.dev)
