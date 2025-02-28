<script setup>
import { ref, reactive, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { message } from "ant-design-vue";
import { onBeforeMount, onMounted } from 'vue';
import axios from '../../utils/axios'
import sleep from '../../utils/sleep'
import Footer from '../footerView/Footer.vue'
import '../../css/chat.css'
import 'highlight.js/styles/atom-one-dark.css';

// 用户信息
const userName = 'Momo'
const userAvatar = 'https://img0.baidu.com/it/u=285032715,784861620&fm=253&fmt=auto&app=138&f=JPEG?w=800&h=800'

// 聊天数据
const conversations = reactive([])

// 当前对话 ID
let activeConversationId = ref(1)

// 当前是否可发送消息
let canSend = ref(true)

// 当前对话(根据当前对话ID查找对应对话，若找到则返回当前对话，否则返回第一个对话)
const currentConversation = computed(() => {
  return conversations.find(conv => conv.id === activeConversationId.value) || conversations[0]
})

const newMessage = ref('') // 用户输入的消息
const chatBoxStyle = reactive({ overflowY: 'auto', maxHeight: '80vh' }) // 聊天框样式(使当内容超出最大高度时可以滚动)
const conversationListStyle = reactive({ overflowY: 'auto', maxHeight: '100vh' }) // 交谈列表样式(使当内容超出最大高度时可以滚动)
const isEmptyConversation = computed(() => currentConversation.value.messages.length === 0 && newMessage.value === '') // 当前对话是否为空
const conversationList = ref(null) // 交谈列表 DOM 元素 交谈列表内容
const chatBox = ref(null) // 聊天框 DOM 元素 聊天框内容

const screenWidth = ref(window.innerWidth); // 屏幕宽度
const isWideScreen = computed(() => screenWidth.value > 900);// 计算属性，根据屏幕宽度实时判断是否是宽屏
// 处理屏幕大小变化的回调函数
const handleResize = () => {
  screenWidth.value = window.innerWidth; // 更新 screenWidth
};

// 自动滚动
const scrollToBottom = (scrollView) => {
  nextTick(() => {
    if (chatBox.value && scrollView === 'chatBox') {   
      // 聊天框内容滚动到底部
      chatBox.value.scrollTop = chatBox.value.scrollHeight 
    }
    
    if (scrollView === 'conversationList') {
      // 交谈列表滚动到底部
      conversationList.value.scrollTop = conversationList.value.scrollHeight
    }
  })
}

// 发送消息
const sendMessage = async () => {
  // 如果发送的信息去除首尾空格后不为空
  if (newMessage.value.trim() && canSend.value) {

    canSend.value = false // 禁止发送消息
    currentConversation.value.messages.push({ from: 'user', text: newMessage.value }) // 将发送的信息添加到当前对话
    const userSendMessage = newMessage.value // 保存发送的信息
    newMessage.value = '' // 清空输入框内容
    conversations.find(conv => conv.id === activeConversationId.value).messages.push({ from: 'gpt', text: 'Ai Thinking...' }) // 显示Ai正在思考中

    // 发起请求得到回复
    await axios.post('/getChatReply', {
      chatID: activeConversationId.value,
      content: userSendMessage
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      timeout: 20000,
    }).then((res) => {
      if(res.data.code === 200){
        // 发送成功提示
        message.success(res.data.message);

        // 输出回复内容
        console.log(res.data.data);
        console.log(res.data.data.length);
        console.log(res.data.data[2]);
      
        // 定义一个下标变量，保存回复内容的最大下标
        let maxIndex = res.data.data.length - 1;
        // 定义一个变量保存当前回复内容的下标
        let currentIndex = 0;
        // 定义一个变量保存当前回复内容
        let replyContent = res.data.data;

        // 定义一个定时器（执行间隔时长为100ms）
        let intervalId = setInterval(() => {

          // 获取当前回复内容在总聊天中的下标
          const currentReplyTextIndex = conversations.find(conv => conv.id === activeConversationId.value).messages.length - 1;

          // 如果回复刚开始，则格式化当前回复的text
          if (currentIndex === 0) {
            conversations.find(conv => conv.id === activeConversationId.value).messages[currentReplyTextIndex].text = '';
          }

          // 输出当前回复内容
          conversations.find(conv => conv.id === activeConversationId.value).messages[currentReplyTextIndex].text += replyContent[currentIndex];

          // 如果下标等于maxIndex，表示信息已经打印完成，则清除(结束)定时器并允许发送消息
          if (currentIndex === maxIndex) {
            clearInterval(intervalId);
            canSend.value = true
          }

          // 自增下标
          currentIndex++;
        }, 100);
      }
      else {
        // 发送失败提示
        message.error(res.data.message);

        // 允许发送消息
        canSend.value = true
      }
    }).catch((err) => {
      // 未知错误提示
      message.error("服务请求错误...");
      // 打印错误信息到控制台
      console.log(err);

      // 获取当前回复内容在总聊天中的下标并为用户显示‘服务器连接异常...’
      const currentReplyTextIndex = conversations.find(conv => conv.id === activeConversationId.value).messages.length - 1;
      conversations.find(conv => conv.id === activeConversationId.value).messages[currentReplyTextIndex].text = '服务器连接异常...';
      
      // 允许发送消息
      canSend.value = true
    });

    // 调用函数，将聊天框滚动到底部
    scrollToBottom("chatBox")
  }
}

// 切换对话
const selectConversation = (id) => {
  // 切换对话时，将当前对话 ID 置为新 ID
  activeConversationId.value = id

  // 切换对话时，请求新对话的聊天记录
  axios.get('/getChatInfo', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    params: {
      // 传递当前对话的ID进行获取当前对话的聊天记录
      chatID: activeConversationId.value
    }
  }).then((res) => {
    if(res.data.code === 200){
      // 获取聊天信息成功提示
      message.success(res.data.message);
      
      // 更新聊天记录 conversations 的内容
      // 查找目标对象的索引
      const index = conversations.findIndex(item => item.id === activeConversationId.value);
      // 如果找到目标对象
      if (index !== -1) {
        // 直接修改 conversations 数组中的 messages 元素
        // 将获取到的聊天记录添加到 conversations 数组中
        conversations[index].messages = res.data.data.messages;  
      }   
    }
    else {
      // 获取聊天信息失败提示
      message.error(res.data.message);
    }
  }).catch((err) => {
    // 未知错误提示
    message.error("未知错误...");
    // 打印错误信息到控制台
    console.log(err);
  });

  scrollToBottom("chatBox") // 切换对话时滚动到底部
}

// 新建对话
const createNewConversation = () => {
  // 请求新建对话接口
  axios.post('/addChatInfo', {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    }
  }).then((res) => {
    if(res.data.code === 200){
      // 新建对话成功提示
      message.success(res.data.message);
      // 输出的新对话ID(唯一识别号)
      console.log(res.data.data.chatID);

      // 请求获取新对话的聊天记录
      axios.get('/getChatInfo', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        params: {
          // 传递当前对话的ID进行获取当前对话的聊天记录
          chatID: res.data.data.chatID
        }
      }).then((res) => {
        if(res.data.code === 200){

          console.log(res.data.data);
          

          // 获取聊天信息成功提示
          message.success(res.data.message);
          
          // 将聊天记录添加到 conversations 数组中
          conversations.push(res.data.data);
          // 更新当前对话 activeConversationId 的 ID 为新对话的ID
          activeConversationId.value = res.data.data.id;
        }
        else {
          // 获取聊天信息失败提示
          message.error(res.data.message);
        }
      }).catch((err) => {
        // 未知错误提示
        message.error("未知错误...");
        // 打印错误信息到控制台
        console.log(err);
      });

      // 将对话列表滚动条滚动到底部
      nextTick(() => {
        scrollToBottom("conversationList")
      })
      
    }
    else {
      // 新建对话失败提示
      message.error(res.data.message);
    }
  }).catch((err) => {
    // 未知错误提示
    message.error("未知错误...");
    // 打印错误信息到控制台
    console.log(err);
  });

  // 将对话列表滚动条滚动到底部
  nextTick(() => {
    scrollToBottom("conversationList")
  })
}

// 删除对话
const deleteConversation = (index) => {
  // 取出申请删除下标的对话ID(唯一识别号)
  const chatID = conversations[index].id

  if (conversations.length > 1) {
    // 请求删除对话接口
    axios.post('/deleteChatInfo', {
      chatID: chatID
    }, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
    }).then((res) => {
      if(res.data.code === 200){
        // 删除对话成功提示
        message.success(res.data.message);

        // 前面后端删除完成之后，这里删除前端赎罪中的元素(参数一 从哪开始删除，参数二 删除几个)
        // 也就是删除用户点击删除的对话
        conversations.splice(index, 1)

        // 若删除的是当前对话，则切换到第一个对话
        if(activeConversationId.value === chatID){
          activeConversationId.value = conversations[0].id;
        }
      }
      else {
        // 删除对话失败提示
        message.error(res.data.message);
      }
    }).catch(() => {
      // 删除对话失败提示
      message.error("未知错误...");
    });
  }
}

// 监听当前对话内容变化，聊天区域自动滚动(参数一 为监听的变量，参数二 为回调函数)
watch(currentConversation, () => {
  scrollToBottom("chatBox")
})

// 退出登录函数
const logout = async () => {
  // 请求退出登录接口
  axios.post('/logout', {
  }, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    }
  }).then((res) => {
    if(res.data.code === 200){
      // 退出登录成功
      message.success(res.data.message);
      message.info("即将跳转到登录页面...");
    }
    else {
      // 退出登录失败
      message.error(res.data.message);
    }
  }).catch(() => {
    // 退出登录失败
    message.error("未知错误...");
  });

  // 无论接口请求销毁sessionID成功或失败，均删除本地储存的账号信息，回到登录页面
  // 清除本地所有储存的用户信息
  localStorage.clear();
  // 停止进程1秒后重定向到登录路由
  await sleep(1000);
  window.location.href = '/login'
};

// 页面加载完成前执行
onBeforeMount(() => {
  // 页面加载完成前，请求聊天信息(获取聊天记录的ID和Title)
  axios.get('/getAllChatInfo', {
    headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      }
  }).then((res) => {
    if(res.data.code === 200){
      // 获取聊天信息成功提示
      message.success(res.data.message);

      // 清空 conversations 聊天数据数组中的所有元素
      conversations.splice(0, conversations.length);
      // 将 res.data.data 后台获取到的聊天数据赋值给 conversations 聊天数据数组
      conversations.push(...res.data.data);

      // 更新当前对话 activeConversationId 的ID 为获取到的第一个对话的ID
      activeConversationId.value = conversations[0].id;
    }
    else {
      // 获取聊天信息失败提示
      message.error(res.data.message);
    }
  }).catch((err) => {
    // 未知错误提示
    message.error("未知错误...");
    // 打印错误信息到控制台
    console.log(err);
  });
})

// 页面加载完成后执行
onMounted(() => {
  // 页面加载完成后，监听屏幕宽度变化
  window.addEventListener("resize", handleResize);

  // 页面加载完成后，获取聊天列表中第一个对话记录
  axios.get('/getChatInfo', {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    params: {
      // 传递当前对话的ID进行获取当前对话的聊天记录
      chatID: activeConversationId.value
    }
  }).then((res) => {
    if(res.data.code === 200){
      // 获取聊天信息成功提示
      message.success(res.data.message);
      
      // 更新聊天记录 conversations 的内容
      // 查找目标对象的索引
      const index = conversations.findIndex(item => item.id === activeConversationId.value);
      // 如果找到目标对象
      if (index !== -1) {
        // 直接修改 conversations 数组中的 messages 元素
        // 将获取到的聊天记录添加到 conversations 数组中
        conversations[index].messages = res.data.data.messages;  
      }   
    }
    else {
      // 获取聊天信息失败提示
      message.error(res.data.message);
    }
  }).catch((err) => {
    // 未知错误提示
    message.error("未知错误...");
    // 打印错误信息到控制台
    console.log(err);
  });
})

// 页面销毁前执行
onBeforeUnmount(() => {
  // 组件销毁前，移除 resize 事件监听，防止内存泄漏
  window.removeEventListener("resize", handleResize);
});
</script>

<template>
  <div class="chat-container">
    <!-- 左侧对话切换栏 -->
    <div :class="isWideScreen ? 'left-layout-wide' : 'left-layout-narrow'">
      <!-- 左上角用户头像和昵称和退出登录 PC 端 -->
      <div class="user-info" v-if="isWideScreen">
        <img :src="userAvatar" alt="User Avatar" class="user-avatar" />
        <span class="user-name">{{ userName }}</span>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>

      <!-- 对话切换栏 -->
      <div class="conversation-list" :style="conversationListStyle" ref="conversationList">
        <div
          v-for="(conversation, index) in conversations"
          :key="conversation.id"
          class="conversation-item"
          :class="{ active: activeConversationId === conversation.id }"
          @click="selectConversation(conversation.id)"
        >
          {{ conversation.title }}
          <button class="delete-btn" @click.stop="deleteConversation(index)">×</button>
        </div>
        <button class="new-chat-btn" @click="createNewConversation">新建对话</button>
      </div>
    </div>

    <!-- 右侧聊天区域 -->
    <div :class="isWideScreen ? 'right-layout-wide' : 'right-layout-narrow'">
      <!-- 左上角用户头像和昵称和退出登录 移动端 -->
      <div class="user-info" v-if="!isWideScreen">
        <img :src="userAvatar" alt="User Avatar" class="user-avatar" />
        <span class="user-name">{{ userName }}</span>
        <button class="logout-btn" @click="logout">退出登录</button>
      </div>

      <!-- 聊天框 -->
      <div class="chat-box" ref="chatBox" :style="chatBoxStyle">
        <div v-if="isEmptyConversation" class="empty-chat">
          <span>{{ userName }} 请开始与 GPT 对话...</span>
        </div>
        <div
          v-for="(message, index) in currentConversation.messages"
          :key="index"
          :class="['chat-message', message.from === 'user' ? 'user-message' : 'gpt-message']"
        >
          <div class="message-content" v-html="message.text"></div>
        </div>
      </div>

      <!-- 输入框 -->
      <div class="chat-input">
        <input
          v-model="newMessage"
          class="input-field"
          type="text"
          placeholder="请输入信息..."
          @keydown.enter="sendMessage"
        />
        <img src="../../assets/aiChat/sendBtn.png" @click="sendMessage" alt="Send Button" class="send-btn" />
      </div>

      <!-- 底座说明 -->
      <Footer />
    </div>
  </div>
</template>

<style scoped>
:deep(.hljs) {
  padding: 1.2em;
  border-radius: 8px;
  font-family: 'Fira Code', monospace;
  margin: 1rem 0;
  overflow-x: auto;
  background: #2d2d2d;
}

:deep(.hljs::after) {
  content: attr(data-language);
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.2em 0.8em;
  font-size: 0.8em;
  color: rgba(255, 255, 255, 0.6);
  background: rgba(0, 0, 0, 0.3);
  border-bottom-left-radius: 5px;
}
</style>
