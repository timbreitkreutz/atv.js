
function connect(targets) {
  return {
    multiply: function() {
      let product = 1;
      targets.allFactor.forEach((factor) => {
        if (factor.value) {
          product *= factor.value;
        } else {
          product *= factor.innerText;
        }
      });
      if (targets.product) {
        targets.product.innerText = product;
      }
      return product;
    }
  };
}

export { connect };
