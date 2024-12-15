function connect(targets, _values, root) {
  if (targets.states) {
    targets.states.forEach((element) => element.innerText = "Connected");
  }

  return {
    click: function(actor) {
      root.insertAdjacentHTML("afterend", `
        <div data-atv-controller="connecting" id="${Math.random()}">
          <button class="connect-button" data-atv-connecting-action="click" data-atv-connecting-target="state">
            Not yet connected.
          </button>
        </div>
      `);
      console.log("TT")
      console.log(targets.state);
    },
    stateTargetConnected: function() {
      targets.state.innerText = "Connected";
    },
    stateTargetDisconnected: function(element) {
      root.insertAdjacentHTML("beforeend", `<p>STATE IS DISCONNECTED ${element.innerText} ${targets.states?.length}<p/>`)
    },
  };
}

export { connect };
