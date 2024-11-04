function connect(_targets, _values, root) {
  const disconnectedState = document.getElementById('disconnected-state');
  disconnectedState.innerText = "Connected";

  return {
    click: function() {
      root.parentNode.removeChild(root);
    },
    disconnect: function() {
      disconnectedState.innerText = "Disconnected";
    }
  };
}

export { connect };
