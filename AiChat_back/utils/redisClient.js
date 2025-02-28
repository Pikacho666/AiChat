const redis = require('redis');

class RedisClient {
  constructor() {
    this.client = redis.createClient({
      socket: {
        host: '127.0.0.1', // Redis 服务地址
        port: 6379,        // Redis 端口号
      },
    });

    // 监听连接成功事件
    this.client.on('connect', () => {
      console.log('Redis client connected');
    });

    // 监听错误事件
    this.client.on('error', (err) => {
      console.error('Redis client error:', err);
    });

    // 连接到 Redis
    this.client.connect().catch((err) => {
      console.error('Error connecting to Redis:', err);
    });
  }

  /**
   * 设置键值对
   * @param {string} key 键
   * @param {string} value 值
   * @param {number} [expiry] 可选，过期时间（秒）
   */
  async set(key, value, expiry = null) {
    try {
      await this.client.set(key, value);
      if (expiry) {
        await this.client.expire(key, expiry);
      }
      // console.log(`Set key: ${key}, value: ${value}, expiry: ${expiry}s`);
    } catch (error) {
      console.error('Error setting key in Redis:', error);
    }
  }

  /**
   * 获取键值
   * @param {string} key 键
   * @returns {Promise<string|null>} 返回值或 null
   */
  async get(key) {
    try {
      const value = await this.client.get(key);
      // console.log(`Get key: ${key}, value: ${value}`);
      return value;
    } catch (error) {
      console.error('Error getting key from Redis:', error);
      return null;
    }
  }

  /**
   * 删除键
   * @param {string} key 键
   * @returns {Promise<number>} 返回删除的键数量
   */
  async del(key) {
    try {
      const result = await this.client.del(key);
      // console.log(`Deleted key: ${key}`);
      return result;
    } catch (error) {
      console.error('Error deleting key from Redis:', error);
      return 0;
    }
  }

  /**
   * 关闭 Redis 连接
   */
  async close() {
    try {
      await this.client.quit();
      console.log('Redis client connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

// 导出单例
module.exports = new RedisClient();