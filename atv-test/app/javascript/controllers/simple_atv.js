
function connect(targets, values) {
  let counter = 0;

  return {
    click: function(actor) {
      counter += 1;
      actor.innerText = `Count ${counter}`;
      if (targets.blah) {
        targets.blah.innerText = `Count: ${counter}`;
      }
    },
    clack: function(actor) {
      counter -= 1;
      actor.innerText = `Clack ${counter}`;
    }
  };
}

export { connect };
