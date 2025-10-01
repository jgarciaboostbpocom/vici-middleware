module.exports = {
  apps: [
    {
      name: "vici-mw",
      cwd: "/opt/vici-mw",
      script: "src/server.ts",                 // your real entry file
      interpreter: "node",
      node_args: "-r ts-node/register",        // load ts-node automatically
      watch: false,
      env: {
        NODE_ENV: "production",
        TS_NODE_TRANSPILE_ONLY: "1",
        PORT: "3000",
        READONLY: process.env.READONLY || "1"
      }
    }
  ]
};
