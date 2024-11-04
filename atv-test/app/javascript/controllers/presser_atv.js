function connect() {
  console.log("CONNECTED");
  return {
    click: function() {
      console.log("CLICKED");
    }
  }
}

export { connect };
