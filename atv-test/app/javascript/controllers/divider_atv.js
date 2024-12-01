
function connect(targets) {
  return {
    divide: function() {
      if (Number(targets.divisor.value) === 0) {
        targets.quotient.innerText = "You can't divide by zero!";
        return false;
      }
      const result = Number(targets.dividend.value) / Number(targets.divisor.value);
      targets.quotient.innerText = result;
      return result !== 0;
    }
  };
}

export { connect };
