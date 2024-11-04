
function connect() {
  let counter = 0;

  return {
    click: function(actor) {
      console.log("CLICK")
      counter += 1;
      actor.innerText = `Count ${counter}`;
    },
    clack: function(actor) {
      console.log("CLACK")
      console.log(actor.style);
      actor.style.backgroundColor = "bluegreen".replace(actor.style.backgroundColor, "");
    }
  };
}

export { connect };
