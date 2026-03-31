// scripts/wait-and-start.cjs

const waitOn = require("wait-on");
const { exec } = require("child_process");

waitOn(
  {
    resources: ["http://localhost:5174"],
    delay: 200,
    interval: 300,
    timeout: 60000
  },
  (err) => {
    if (err) {
      console.error("Wait-on failed:", err);
      process.exit(1);
    }

    console.log("Frontend ready — starting Electron...");
    exec("npm run electron-start", (err) => {
      if (err) console.error(err);
    });
  }
);
