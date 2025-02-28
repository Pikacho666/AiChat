<script setup>
// 引入css
import '../../css/LoginAndRegister.css'
// 引入包
import { ref } from 'vue'
import axios from '../../utils/axios'
import changePage from '../../utils/changePage';
import { useRouter } from 'vue-router'
import { message } from "ant-design-vue";

// 引入路由实例
const router = useRouter()

//定义变量
const email = ref('')
const password = ref('')
const isPasswordFocused = ref(false)

// 定义函数，用于登录
// 实现逻辑：发送axios请求
// 若登录成功则储存sessionID到localStorage（供后续检测登录状态使用），并跳转到个人中心页面
// 若登录失败则提示错误信息
function login() {
  // 发送axios请求
  axios.post('/login', {
    email: email.value,
    password: password.value
  }).then(res => {
    
    // 登录成功
    if(res.data.code === 200) {
      //保存sessionID到localStorage，用于后续路由守卫请求验证登录状态携带
      localStorage.setItem('token', res.data.data.sessionID);
      //保存uid到localStorage，用于后续携带请求个人信息
      localStorage.setItem('uid', res.data.data.uid);
      //保存用户名到localStorage，用于后续显示与请求
      localStorage.setItem('username', res.data.data.username);
      //保存邮箱到localStorage，用于后续显示与请求
      localStorage.setItem('email', res.data.data.email);
      //保存头像到localStorage，用于后续显示与请求
      localStorage.setItem('avatar', res.data.data.avatar);

      // 转跳到Chat页面
      changePage(router,'/chat')
    } else {
      // 登录失败
      message.error(res.data.message);
      console.log(res.data.message);
    }
    
  })
}

// 定义函数，用于根据focus状态切换图片
function handleFocus(status) {
  isPasswordFocused.value = status
}
</script>

<template>
<div class="login-box">
  <!-- 动态切换类 -->
  <div :class="isPasswordFocused ? 'closeleft' : 'openleft'"></div>
  <div :class="isPasswordFocused ? 'closeright' : 'openright'"></div>
  <h2>AiChat Login</h2>
  <form>
    <div class="user-box">
      <input type="email" required v-model="email" @focus="handleFocus(false)"/>
      <label>邮箱</label>
    </div>
    <div class="user-box">
      <!-- Vue3 的事件绑定 -->
      <input
        type="password"
        required
        @focus="handleFocus(true)"
        @blur="handleBlur"
        v-model="password"
      />
      <label>密码</label>
    </div>
    <a href="#" class="login-btn" @click="login">提交</a>
    <a href="#" class="register-link" @click="changePage(router,'/register')">没有账号？点此注册</a>
  </form>
</div>
</template>

<style scoped>

</style>
