import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  	// 配置前端服务地址和端口
	server: {
    //自定义主机名
	  host: '0.0.0.0',
    //自定义端口
		port: 8080,
		// 是否开启 https
		https: false,
	},
	// 设置反向代理，跨域
	proxy: {
    '/api': { // 代理标识符
      target: 'http://localhost:8081', // 目标服务器地址
      changeOrigin: true, // 允许跨域
      rewrite: (path) => path.replace(/^\/api/, ''), // 可选：重写路径

      // 此配置若按照以下在vue中请求
      // fetch('/api/users')
      // .then(response => response.json())
      // .then(data => console.log(data));
      // 这个请求会被代理为 http://localhost:10000/users，但对前端来说它仍然表现为 /api/users
    },
  },
})
