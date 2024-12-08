
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
    },
    newTargetConnected: function(target) {
      console.log("TargetConnected")
      target.innerHtml = "Added New Target";
    },
    thereTargetConnected: (target) => console.log("THERE", target)
  };
}

export { connect };
