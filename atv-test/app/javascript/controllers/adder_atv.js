function connect(targets, _values, _root, controllers) {
  return {
    add: function() {
      let sum = 0;
      controllers(".product", "multiplier", (controller) => {
        sum += controller.actions.multiply();
      });
      targets.sum.innerText = sum;
    }
  };
}

export { connect };
