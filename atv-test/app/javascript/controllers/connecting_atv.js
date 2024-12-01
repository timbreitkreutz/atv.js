function connect(targets, _values, root) {
  if (targets.state) {
    targets.state.innerText = "Connected";
  }

  return {
    click: function() {
      root.insertAdjacentHTML("afterend", `
        <div data-atv-controller="connecting" id="${Math.random()}">
          <button class="connect-button" data-atv-connecting-action="click" data-atv-connecting-target="state">
            Not yet connected.
          </button>
        </div>
      `);
    }
  };
}

export { connect };
