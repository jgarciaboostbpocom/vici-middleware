module.exports = {
  apps: [
    {
      name: "vici-mw",
      cwd: "/opt/vici-mw",
      script: "dist/index.js",
      interpreter: "node",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        READONLY: process.env.READONLY || "1"
      }
    }
  ]
};
