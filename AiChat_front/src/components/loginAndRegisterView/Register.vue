<script setup>
// 引入css
import '../../css/LoginAndRegister.css'
// 引入包
import { useRouter } from 'vue-router'
import { ref } from 'vue'
import changePage from '../../utils/changePage'
import axios from '../../utils/axios'
import sleep from '../../utils/sleep'
import { message } from "ant-design-vue";

// 引入路由实例
const router = useRouter()

//定义变量
const email = ref('')
const password = ref('')
const passwordAgain = ref('')
const VerificationCode = ref('')
const getVerificationCodeButtonText = ref('获取验证码');
const isPasswordFocused = ref(false)
const isGetVerificationCode = ref(false)
let getVerificationButtonTimer = null; // 存储计时器 ID
let countdown = ref(60);

// 每秒更新发送验证码倒计时函数
const startCountdown = () => {
  // 每次启动前确保旧计时器清除（防止重复计时器）
  if (getVerificationButtonTimer) {
    clearInterval(getVerificationButtonTimer);
  }

  // 启动新的计时器
  getVerificationButtonTimer = setInterval(() => {
    countdown.value--; // 更新倒计时
    if (countdown.value > 0) {
      getVerificationCodeButtonText.value = `${countdown.value}s 后重试`;
    } else {
      // 恢复按钮状态
      isGetVerificationCode.value = false;
      getVerificationCodeButtonText.value = '获取验证码';
      clearInterval(getVerificationButtonTimer); // 清除计时器
      getVerificationButtonTimer = null; // 重置计时器 ID
      countdown.value = 60; // 重置倒计时
    }
  }, 1000);
};

// 定义函数,请求注册
const register = () => {
  
  if(email.value === '' || password.value === '' || passwordAgain.value === ''){
    // 存在数据为空
    message.error('存在数据为空！！！')
  }
  else if (password.value!== passwordAgain.value) {
    // 两次密码不一致
    message.error('两次密码输入不一致！')
  }
  else if(email.value.indexOf('@') === -1 || email.value.indexOf('.') === -1) {
    // 邮箱格式不正确
    message.error('邮箱格式不正确！')
  }
  else if(password.value.length < 8) {
    // 密码长度不足
    message.error('密码长度需大于等于8位！')
  }
  else if(VerificationCode.value === '') {
    // 邮箱验证码为空
    message.error('邮箱验证码不能为空！')
  }
  else{
    // 发送请求
    axios.post('/register', {
      email: email.value,
      password: password.value,
      passwordAgain: passwordAgain.value,
      VerificationCode: VerificationCode.value
    }).then(async res => {
      // 注册成功
      if (res.data.code === 200) {
        message.success('注册成功, 即将转跳登录页面！')
        await sleep(1000) // 延迟1秒后跳转到登录页面
        changePage(router, '/login')
      } else if (res.data.code === 400) {
        message.error(res.data.message)
      }
    })
  }
}

// 定义函数，请求验证码
const getVerificationCode = () => {
  axios.post('/getVerificationCode', {
    email: email.value
  }, {
    timeout: 10000 // 设置超时时间为 10 秒，因为发送邮件响应慢
  }).then(res => {
    
    if (res.data.code === 200) {
      // 发送成功
      message.success(res.data.message)

      // 发送成功按钮禁用
      isGetVerificationCode.value = true
      // 启动计时器
      startCountdown()
    } else if (res.data.code === 400 || res.data.code === 401 || res.data.code === 402) {
      // 发送失败
      message.error(res.data.message)
    }
  })
}

// 定义函数，用于根据focus状态切换图片
function handleFocus(status) {
  isPasswordFocused.value = status
}
</script>

<template>
<div class="login-box" style="height: 500px;">
  <!-- 动态切换类 -->
  <div :class="isPasswordFocused ? 'closeleft' : 'openleft'"></div>
  <div :class="isPasswordFocused ? 'closeright' : 'openright'"></div>
  <h2>AiChat Register</h2>
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
    <div class="user-box">
      <!-- Vue3 的事件绑定 -->
      <input
        type="password"
        required
        @focus="handleFocus(true)"
        @blur="handleBlur"
        v-model="passwordAgain"
      />
      <label>确认密码</label>
    </div>
    <div class="user-box">
      <!-- Vue3 的事件绑定 -->
      <input
        type="text"
        required
        @focus="handleFocus(false)"
        @blur="handleBlur"
        v-model="VerificationCode"
        style="width: 75%;"
      />
      <label>邮箱验证码</label>
      <button type="button" class="code-btn" @click="getVerificationCode" :disabled="isGetVerificationCode">{{ getVerificationCodeButtonText }}</button>
    </div>
    <a href="#" class="login-btn" @click="register">提交注册</a>
    <a href="#" class="register-link" @click="changePage(router,'/login')">有账号？返回登录</a>
  </form>
</div>
</template>

<style scoped>

</style>
