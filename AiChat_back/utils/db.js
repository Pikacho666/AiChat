const mysql = require("mysql2");

// 这里不使用createConnection方法的原因是createConnection数据库空闲太久会自动断开链接
// 创建数据库连接池，使用连接池会自动处理断线重连的问题
const pool = mysql.createPool({
  host: "127.0.0.1",
  port: "3306",
  user: "root",
  password: "00000000",
  database: "Demo_AiChat",
  waitForConnections: true, // 等待可用连接
  connectionLimit: 10, // 最大连接数
  queueLimit: 0, // 队列限制 (0 表示不限制)
});

// 导出 pool 对象
module.exports = pool.promise(); // 使用 Promise 版本
