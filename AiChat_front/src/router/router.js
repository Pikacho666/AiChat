// 导入包
import { createRouter, createWebHistory } from 'vue-router'

// 导入组件
import Login from '../components/loginAndRegisterView/Login.vue'
import Register from '../components/loginAndRegisterView/Register.vue'
import Chat from '../components/chatView/Chat.vue'

// 工具类
import axios from '../utils/axios'

// 创建路由实例对象
const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      redirect: '/chat',
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
      // meta中的键值对可供前置与后置守卫调用
      meta: {
        title: 'AiChat Login',
        // 该路由需要登录验证
        isAuth: false
      }
    },
    {
      path: '/register',
      name: 'register',
      component: Register,
      // meta中的键值对可供前置与后置守卫调用
      meta: {
        title: 'AiChat Register',
        // 该路由需要登录验证
        isAuth: false
      }
    },
    {
      path: '/chat',
      name: 'chat',
      component: Chat,
      // meta中的键值对可供前置与后置守卫调用
      meta: {
        title: 'AiChat Chat',
        // 该路由需要登录验证
        isAuth: true
      }
    },
  ]
})

//添加全局前置守卫
//to是申请访问的路由，next是放行使用（类似于nodeJS中间件的next）
router.beforeEach((to, from, next) => {
  // 判断该路由是否需要登录
  if (to.meta.isAuth) {
    // 判断是否登录
    axios.get('/checkLogin', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    }).then(res => {
      // 如果登录，放行
      if (res.data.code === 200) {
        next()
      } else {
        // 如果未登录，重定向到登录页面
        next('/login')
      }
    });
    
  } else {
    // 该路由不需要登录，放行
    next()
  }
})

// 添加全局后置守卫
// to是申请访问的路由
router.afterEach((to, from) => {
  // 修改页面标题(meta在上方代码路由有定义)
  document.title = to.meta.title
})

// 导出路由实例对象
export default router