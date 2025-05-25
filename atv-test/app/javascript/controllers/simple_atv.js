
function connect(targets) {
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
      console.log("NEW TargetConnected")
      console.log(target);
      window.target = target;
      target.innerHTML = "Added New Target";
    },
    newTargetDisconnected: function(target) {
      console.log("--------------NEW TargetDisconnected")
      console.log(target);
    },
    thereTargetConnected: (target) => console.log("THERE", target),
    hereTargetConnected: (target) => console.log("HERE", target),
    focus: () => console.log("FOCUS!")
  };
}

export { connect };
