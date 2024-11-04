// app/javascript/controllers/events_atv.js
function connect() {
  return {
    keydown: function(_actor, event) {
      const key = event.key;
      if (key.length === 1 && !/[a-zA-Z]/.test(key)) {
        event.preventDefault();
      }
    }
  };
}

export { connect };
