export const config = {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    wsServer: process.env.WS_SERVER_URL || 'ws://localhost:4000',
    server: {
      port: parseInt(process.env.PORT || '3001'),
    }
  };