
function connect() {
  let counter = 0;

  return {
    click: function(actor, _event, params) {
      const [label, increment] = params;
      counter = counter + Number(increment);
      actor.innerText = `${label} ${counter}`;
    }
  };
}

export { connect };
