
function connect(targets) {
  return {
    multiply: function() {
      let product = 1;
      targets.allAFactor.forEach((factor) => {
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
    },
    blur: function(actor) {
      targets.extra.innerText = "DONE";
      return true;
    }
  };
}

export { connect };
