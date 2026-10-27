module.exports = {
  apps: [{
    name: 'scioworld',
    cwd: __dirname,
    script: './src/index.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    restart_delay: 5000,
    env: { NODE_ENV: 'production' },
  }],
};
