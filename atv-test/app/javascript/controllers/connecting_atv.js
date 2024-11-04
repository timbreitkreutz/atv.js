function connect(targets, _values, root) {
  targets.state.innerText = "Connected";

  return {
    click: function() {
      root.insertAdjacentHTML("afterend", `
        <div data-atv-controller="connecting" id="${Math.random()}">
          <button data-atv-connecting-action="click">
            Create
          </button>
          <span data-atv-connecting-target="state">
            Not yet connected.
          </span>
        </div>
      `);
    }
  };
}

export { connect };
