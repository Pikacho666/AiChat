const pool = require('./db');

// 数据库操作函数
async function database(sql) {
  try {
    const [rows, fields] = await pool.query(sql); // 使用解构获取结果
    return rows; // 返回查询结果
  } catch (err) {
    console.error('Database error:', err.message); // 打印错误信息
    throw err; // 抛出错误
  }
}

module.exports = database;
