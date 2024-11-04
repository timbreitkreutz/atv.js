
function connect() {
  let counter = 0;

  return {
    click: function(actor) {
      counter += 1;
      actor.innerText = `Count ${counter}`;
    }
  };
}

export { connect };
