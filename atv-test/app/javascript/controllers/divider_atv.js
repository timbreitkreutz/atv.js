
function connect(targets) {
  return {
    divide: function() {
      if (Number(targets.divisor.value) === 0) {
        targets.quotient.innerText = "You can't divide by zero!";
        return false;
      }
      return targets.quotient.innerText = 
        Number(targets.dividend.value) / Number(targets.divisor.value);
    }
  };
}

export { connect };
