module.exports = {
    apps: [
        {
            name: 'valet-web',
            script: 'bun',
            args: 'run start',
            cwd: './apps/web',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 8800
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 8800
            },
            error_file: './logs/web-error.log',
            out_file: './logs/web-out.log',
            log_file: './logs/web-combined.log',
            time: true
        },
        {
            name: 'valet-api',
            script: 'bun',
            args: 'src/index.ts',
            cwd: './apps/api',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'production',
                PORT: 8787,
                DATABASE_URL: 'sqlite:///tmp/valet.db',
                WEB_APP_URL: 'http://localhost:8800',
                SESSION_COOKIE_NAME: 'valet_session'
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 8787,
                DATABASE_URL: 'sqlite:///tmp/valet.db',
                WEB_APP_URL: 'http://localhost:8800',
                SESSION_COOKIE_NAME: 'valet_session'
            },
            error_file: './logs/api-error.log',
            out_file: './logs/api-out.log',
            log_file: './logs/api-combined.log',
            time: true
        }
    ]
};
