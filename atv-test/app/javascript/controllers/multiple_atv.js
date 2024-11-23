
function connect(targets) {
  let counter = 0; // shared

  return () => {
    let clockCount = 0; // not shared
    return {
      click: function(actor) {
        counter += 1;
        actor.innerText = `Count ${counter}`;
        return true;
      },
      clack: function(actor) {
        actor.style.backgroundColor = "bluegreen".replace(actor.style.backgroundColor, "");
        return true;
      },
      clock: function() {
        clockCount += 1;
        targets.clock.innerText = clockCount;
        return true;
      }
    }
  };
}

export { connect };
