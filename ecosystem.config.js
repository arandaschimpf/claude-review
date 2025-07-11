module.exports = {
  apps: [
    {
      name: 'claude-review',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        REPO_URL: process.env.REPO_URL || 'https://github.com/arandaschimpf/claude-review.git'
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
};