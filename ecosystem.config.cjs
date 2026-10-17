module.exports = {
  apps: [{
    name: "student-mcp-file-server",
    script: "./server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: "200M",
    env: { NODE_ENV: "production", HOST: "127.0.0.1", PORT: 3000 }
  }]
};
