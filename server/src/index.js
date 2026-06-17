const app = require("./app");
const { port } = require("./config/env");

app.listen(port, () => {
  console.log(`Campus secondhand API is running at http://localhost:${port}`);
});
