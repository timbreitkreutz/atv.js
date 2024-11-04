// hello_atv.js
function connect(targets) {
  return {
    greet: function() {
      targets.output.textContent = 
        `Hello, ${targets.name.value}!`;
    }
  };
}

export { connect };
