// server/config/redis.js
const Redis = require('ioredis');

const redisClient = new Redis(process.env.REDIS_URL, {
  tls: {
    rejectUnauthorized: false
  },
  maxRetriesPerRequest: null, // ✅ CRITICAL: BullMQ requires this
  enableReadyCheck: false,
  lazyConnect: true,
  retryStrategy: (times) => {
    if (times > 3) {
      console.log('❌ Redis connection failed after 3 attempts');
      return null;
    }
    return Math.min(times * 100, 3000);
  }
});

redisClient.on("error", (err) => {
  console.error("❌ Redis Error:", err.message);
});

redisClient.on("connect", () => {
  console.log("✅ Redis Connected");
});

// Test connection
redisClient.ping()
  .then(() => console.log('✅ Redis ping successful'))
  .catch((err) => console.error('❌ Redis ping failed:', err.message));

module.exports = redisClient;