// config_atv.js
function connect(targets, values) {
  return {
    reveal: function() {
      targets.output.textContent = values.answer;
    }
  };
}

export { connect };
