import { createApp } from 'vue'
//导入路由
import router from './router/router.js'
//导入项目界面入口组件
import App from './App.vue'

//创建vue实例
const app = createApp(App)

//挂载路由
app.use(router)

//创建vue实例并挂载到id为app的div上
app.mount('#app')