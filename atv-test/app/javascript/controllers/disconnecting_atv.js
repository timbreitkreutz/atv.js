function connect(_targets, values, root) {
  return function() {
    const id = Math.random();
    const messageSpan = document.getElementById(values.spanId);
    if (messageSpan) {
      if (values.spanId === "disconnected-state-2") {
        messageSpan.innerText = `Connected ${id}`;
        messageSpan.style.color = "red";
      } else {
        messageSpan.innerText = `Connected ${id}`;
        messageSpan.style.color = "blue";
      }
    }

    return {
      click: function() {
        root.parentNode.removeChild(root);
      },
      disconnect: function() {
        console.log(`disconnect ${id}`)
        messageSpan.innerText = "Disconnected";
        messageSpan.style.color = "black"
      },
      oneTargetDisconnected: () => console.log("DISCONNECT ONE"),
      twoTargetDisconnected: () => console.log("DISCONNECT TWO"),
      oneTargetConnected: () => console.log("CONN ONE"),
      twoTargetConnected: () => console.log("CONN TWO"),
    };
  };
}

export { connect };
