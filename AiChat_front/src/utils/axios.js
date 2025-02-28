// 导入 axios
import axios from 'axios';

// 创建 axios 实例
const instance = axios.create({
  baseURL: 'http://localhost:8081/', // 设置后端基础路径
  timeout: 5000, // 设置请求超时时间
});

// 导出配置好的 axios 实例
export default instance;