
function connect() {
  let counter = 0;

  return {
    click: function(actor) {
      counter += 1;
      actor.innerText = `Count ${counter}`;
    },
    clack: function(actor) {
      actor.style.backgroundColor = "bluegreen".replace(actor.style.backgroundColor, "");
    }
  };
}

export { connect };
