function connect(_targets, values, root) {
  return function() {
    const messageSpan = document.getElementById(values.spanId);
    if (messageSpan) {
      if (values.spanId === "disconnected-state-2") {
        messageSpan.innerText = "Connected 2";
        messageSpan.style.color = "red";
      } else {
        messageSpan.innerText = "Connected 1";
        messageSpan.style.color = "blue";
      }
    }

    return {
      click: function() {
        root.parentNode.removeChild(root);
      },
      disconnect: function() {
        messageSpan.innerText = "Disconnected";
        messageSpan.style.color = "black"
      }
    };
  };
}

export { connect };
