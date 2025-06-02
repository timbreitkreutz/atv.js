## Version 0.2.0

* Rewrite from ground up with new modules in separate files
* Breaking changes:  String parameters to actions need to be quoted
* Now ATV uses a pluralizer for target lists, so for example, if you have several targets called "mouse", you need to access them with `targets.mice`.
* No longer triggers added or removed callbacks for targets. LMK if you need it, I can add it!

## Version 0.1.5-0.1.10

* Major refactor-- new tests added, all previous tests still pass
* No functionality changes.
* JSLint, ESlint, and Prettier have been reconciled

## Version 0.1.4

* Only remove nodes that leave the DOM, reload on BODY changes only

## Version 0.1.3

* Cache dynamically loaded modules
* Found a bug with value duplication on sibling components: added test and fix
* Export version number from main ATV module
* reduce number of JSLint messages by renaming some modules

## Version 0.1.2

* Add ability to reference multiple targets with 's' suffix, so you can reference `targets.allItem` or `targets.items`
* Another small bugfix with multiple targets from 0.1.0 cleanup work--with new test

## Version 0.1.1

* Fix small last-minute bug was introduced in 0.1.0 where calling activate twice was not detected

## Version 0.1.0

* First "complete" alpha version ready for external review and testing
* See README.md and sbrew.com/atv_by_example for current docs
* Previous versions in 0.0.x range were pushed for initial development purposes without individual comments.
