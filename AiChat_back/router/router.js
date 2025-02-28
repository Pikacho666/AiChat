const express = require("express")
const path = require("path")
const session = require("express-session")
const cookie = require("express-session/session/cookie")
const moment = require('moment');
const databaseOperator = require("../utils/databaseOperator")
const isEmail = require("../utils/emailCheck")
const sendVerificationCode = require("../utils/sendVerificationCode")
const redisClient = require('../utils/redisClient');
const messageParser = require('../utils/messageParser'); // 该类用于解析数据库聊天记录
const messageConverter = require('../utils/messageConverter'); // 该类用于将数据库的聊天记录转换为API需要格式
const chatUtil = require('../utils/chatUtil'); // 工具类，调用AI接口
const stringUtil = require('../utils/stringUtil'); // 工具类，字符串处理
const { marked } = require('marked'); //导入marked模块，将markdown转为html
const hljs = require('highlight.js');

// 关键配置
marked.setOptions({
  // 启用代码块解析（默认已启用，但需要配合highlight使用）
  highlight: function(code, lang) {
    // 处理语言标注
    const validLang = hljs.getLanguage(lang) ? lang : 'plaintext';
    
    // 修复大模型可能存在的标注不规范问题（如 ``` c → ```c）
    const sanitizedLang = validLang.replace(/\s+/g, ''); // 去除语言名中的空格
    
    try {
      return hljs.highlight(code, { language: sanitizedLang }).value;
    } catch (err) {
      return hljs.highlight(code, { language: 'plaintext' }).value;
    }
  },
  langPrefix: 'hljs ', // 匹配 highlight.js 的 CSS 选择器
  breaks: true,                  // 转换换行符为 <br>
  mangle: false,                 // 不转换特殊字符（如保留 <stdio.h>）
  headerIds: false               // 禁用自动生成标题ID（可选）
});

// 渲染函数
function renderMarkdown(content) {
  // 预处理大模型可能的多余换行
  const cleanedContent = content
    .replace(/\n```/g, '\n```')  // 标准化代码块结束标记
    .replace(/\n{3,}/g, '\n\n'); // 压缩连续空行
  
  return marked.parse(cleanedContent);
}

// 创建路由
const Router = express.Router()

// 创建session路由
Router.use(session({
  secret: 'session', // 服务器端生成session的签名
  name: "data", // 修改session对应的cookie的名称
  resave: false, // 强制保存 session ，即使它并没有变化
  saveUninitialized: true, // 强制将未初始化的session存储
  cookie: { 
      maxAge: 1000*600*144, // 设置过期时间为一天
      secure: false, // true 表示只有https协议才能访问cookie
    }
}))

// 进程异常不退出
process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
});

// 创建登录验证中间件
// 如果登录状态未被设置，则设置为false
Router.use((req,res,next)=>{
  if(req.session.status === undefined){
    req.session.status = false
  }
  next()
})

// 设置提交登录路由
Router.post("/login",async (req,res)=>{

  //获取前端数据
  const { email, password } = req.body;
  //设置sql语句
  const sql = `SELECT * FROM users WHERE email='${email}'`
  //调用数据库查询函数
  let result = await databaseOperator(sql)

  //判断用户是否存在与密码是否正确
  if(!(result.length === 0) && password === result[0].password)
  {
    //登录成功,状态为true
    req.session.status = true
    //将用户uid存入session
    req.session.uid = result[0].uid

    req.session.mail = result[0].mail
    res.json({
      code: 200,
      message: "登录成功",
      data: {
        // 将登录成功sessionID返回给前端
        sessionID:req.sessionID,
        // 将用户uid返回给前端
        uid:result[0].uid,
        // 将用户名返回给前端
        username:result[0].username,
        // 将用户邮箱返回给前端
        email:result[0].email,
        // 将用户头像返回给前端
        avatar:result[0].avatar,
      },
    })
  }
  else
  {
    //登录失败
    res.json({
      code: 400,
      message: "用户名或密码错误",
      data: null,
    })
  }
    
})

// 设置注册路由
Router.post("/register",async (req,res)=>{

  //获取前端数据
  const { email, password, passwordAgain, VerificationCode } = req.body;

  // 校验邮箱格式
  if(!isEmail(email) || password !== passwordAgain || password.length < 8)
  {
    return res.json({
      code: 400,
      message: '后端：邮箱或者密码格式错误',
      data: null,
    });
  }

  // 从redis缓存中获取验证码, 验证验证码是否正确
  let rightVerificationCode = await redisClient.get('Demo_AiChat_VerificationCode_' + email); // 获取缓存中的验证码
  if (rightVerificationCode !== VerificationCode) {
    return res.json({
      code: 400,
      message: '验证码错误！',
      data: null,
    });
  }

  //设置sql语句，查询是否重复注册
  const sql = `SELECT * FROM users WHERE email='${email}'`
  //调用数据库查询函数
  let result = await databaseOperator(sql)

  //判断用户是否存在
  if(result.length === 0)
  {
    //设置sql语句，插入新用户
    const sql1 = `INSERT INTO users (username, email, password) VALUES ('Momo','${email}', '${password}')`
    //调用数据库插入函数
    let result1 = await databaseOperator(sql1)

    // 设置sql语句，为新用户插入一个聊天记录
    const sql2 = `INSERT INTO chat (uid, title) VALUES (${result1.insertId}, '默认聊天')`
    //调用数据库插入函数
    let result2 = await databaseOperator(sql2)

    //注册成功
    res.json({
      code: 200,
      message: "注册成功",
      data: null,
    })
  }
  else
  {
    //注册失败
    res.json({
      code: 400,
      message: "该邮箱已被注册",
      data: null,
    })
  }
})

// 设置发送验证码路由
Router.post("/getVerificationCode", async (req, res) => {
  try {
    // 获取前端数据
    const { email } = req.body;

    // 校验邮箱格式
    if (!isEmail(email)) {
      return res.json({
        code: 401,
        message: '邮箱格式错误',
        data: null,
      });
    }
    // 调用发送验证码函数
    let result = await sendVerificationCode(email);
    // 若验证码发送成功则result.success为true，否则为false
    
    // 发送成功
    if (result.success) {      

      // 设置redis缓存（键：imgur_邮箱，值：验证码，过期时间：10分钟）
      await redisClient.set('Demo_AiChat_VerificationCode_' + email, result.verificationCode, 60 * 10); // 设置缓存过期时间为10分钟

      res.json({
        code: 200,
        message: '验证码发送成功, 请查收!',
        data: null,
      });
    } else {
      res.json({
        code: 402,
        message: '验证码发送失败, 请稍后再试!',
        data: null,
      });
    }
  } catch (error) {
    res.json({
        code: 400,
        message: '未知错误',
        data: null,
      });
    }
});



// 设置退出登录路由
Router.post("/logout", (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。
  const sessionID = req.headers.authorization?.split(' ')[1]; // 提取 Bearer token

  console.log(!sessionID);
  

  // 如果 sessionID 为空，则表示未登录，返回给前端 401 状态码
  if (!sessionID) {
    return res.json({
      code: 401,
      message: 'SessionID为空',
      data: null,
    });
  }

  // 能到这里说明 sessionID 不为空，手动加载会话
  req.sessionStore.get(sessionID, (err, session) => {
    // 如果会话不存在，则表示未登录，返回给前端 402 状态码
    if (err || !session) {
      return res.json({
        code: 402,
        message: 'SessionID错误',
        data: null,
      });
    }

    // 能执行到这里，表明会话存在，开始销毁会话
    req.sessionStore.destroy(sessionID, (err) => {

      // 销毁会话失败，返回给前端 403 状态码
      if (err) {
        return res.json({
          code: 403,
          message: 'SessionID销毁失败',
          data: null,
        });
      }

      // 销毁会话成功，返回给前端 200 状态码
      return res.json({
        code: 200,
        message: '退出登录成功',
        data: null,
      });
    });
  });
})

// 设置验证用户登录状态路由
Router.get('/checkLogin', (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。
  const sessionID = req.headers.authorization?.split(' ')[1]; // 提取 Bearer token
  
  // 如果 sessionID 为空，则表示未登录
  if (!sessionID) {
    return res.json({
      code: 400,
      message: '未登录',
      data: null,
    });
  }

  // 手动加载会话
  req.sessionStore.get(sessionID, (err, session) => {
    if (err || !session) {
      return res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }

    // 检查会话状态
    if (session.status) {
      res.json({
        code: 200,
        message: '已登录',
        data: null,
      });
    } else {
      res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }
  });
});

// 获取聊天信息路由(获取聊天记录的ID和Title)
Router.get('/getAllChatInfo', async (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。
  const sessionID = req.headers.authorization?.split(' ')[1]; // 提取 Bearer token
  

  // 如果 sessionID 为空，则表示未登录
  if (!sessionID) {
    return res.json({
      code: 400,
      message: '未登录',
      data: null,
    });
  }

  // 手动加载会话
  req.sessionStore.get(sessionID, async (err, session) => {
    if (err || !session) {
      return res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }

    // 检查会话状态
    if (session.status) {
      // 从数据库中获取聊天信息标题
      const sql = `SELECT id, title FROM chat WHERE uid=${session.uid}`
      let result = await databaseOperator(sql)

      // 为result数组每个对象添加新字段messages，确保传给前端的数据符合要求
      for (let i = 0; i < result.length; i++) {
        result[i].messages = []
      }

      // 返回聊天信息
      res.json({
        code: 200,
        message: '获取聊天信息成功',
        data: result,
      });
    } else {
      res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }
  });
});

// 根据聊天ID获取聊天信息路由(获取聊天记录)
Router.get('/getChatInfo', async (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。
  const sessionID = req.headers.authorization?.split(' ')[1]; // 提取 Bearer token
  

  // 如果 sessionID 为空，则表示未登录
  if (!sessionID) {
    return res.json({
      code: 400,
      message: '未登录',
      data: null,
    });
  }

  // 手动加载会话
  req.sessionStore.get(sessionID, async (err, session) => {
    if (err || !session) {
      return res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }

    // 检查会话状态
    if (session.status) {
      // 从前端传过来的聊天ID
      const { chatID } = req.query;

      // 从数据库中获取聊天信息
      const sql = `SELECT * FROM chat WHERE uid=${session.uid} AND id=${chatID}`
      let result = await databaseOperator(sql)
      

      // 若聊天记录不存在，则返回400状态码
      if (result.length === 0) {
        return res.json({
          code: 400,
          message: '聊天记录不存在',
          data: null,
        });
      }
      
      // 若聊天记录存在且不为空
      if (result[0].messages) {
        // 还原转译后的聊天记录 messages 字段
        const unescapedString = await stringUtil.processForDatabase(result[0].messages, false);
        // 将还原转译后的记录，给到result数组的第一个元素中的messages字段
        result[0].messages = unescapedString
      }
      
      // 调用工具类解析聊天记录
      result = messageParser.processRowData(result[0])
      
      // 将markdown转为html
      for (let i = 0; i < result.messages.length; i++) {
        result.messages[i].text = renderMarkdown(result.messages[i].text);
      }
      
      // 返回聊天记录
      res.json({
        code: 200,
        message: '获取聊天记录成功',
        data: result,
      });
    } else {
      res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }
  });
});

// 新增聊天记录路由
Router.post('/addChatInfo', async (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。  
  const sessionID = req.headers.authorization?.split(' ')[1];

  // 如果 sessionID 为空，则表示未登录
  if (!sessionID) {
    return res.json({
      code: 400,
      message: '未登录',
      data: null,
    });
  }

  // 手动加载会话
  req.sessionStore.get(sessionID, async (err, session) => {
    if (err || !session) {
      return res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }

    // 检查会话状态
    if (session.status) {
      console.log(moment().format('MM-DD HH:mm:ss'));
      // 设置sql语句，插入聊天记录
      const sql = `INSERT INTO chat (uid, title) VALUES (${session.uid}, '${moment().format('MM-DD HH:mm:ss')}')`
      // 调用数据库插入函数
      let result = await databaseOperator(sql)

      // 返回聊天记录ID
      res.json({
        code: 200,
        message: '新增聊天记录成功',
        data: {
          chatID: result.insertId,
        },
      });
    } else {
      res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }
  });
});

// 传入聊天记录ID删除聊天记录路由
Router.post('/deleteChatInfo', async (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。
  const sessionID = req.headers.authorization?.split(' ')[1];

  // 如果 sessionID 为空，则表示未登录
  if (!sessionID) {
    return res.json({
      code: 400,
      message: '未登录',
      data: null,
    });
  }

  // 手动加载会话
  req.sessionStore.get(sessionID, async (err, session) => {
    if (err || !session) {
      return res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }

    // 检查会话状态
    if (session.status) {
      // 从前端传过来的聊天ID
      const { chatID } = req.body;

      // 设置sql语句，删除聊天记录
      const sql = `DELETE FROM chat WHERE id=${chatID}`
      // 调用数据库删除函数
      let result = await databaseOperator(sql)

      // 返回删除结果
      if (result.affectedRows === 1) {
        res.json({
          code: 200,
          message: '删除聊天记录成功',
          data: null,
        });
      } else {
        res.json({
          code: 400,
          message: '删除聊天记录失败',
          data: null,
        });
      }
    } else {
      res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }
  });
});

// 获取聊天回复路由(传入聊天记录ID和发送内容)
Router.post('/getChatReply', async (req, res) => {
  // 从前端传过来的请求头中获取sessionID
  // req.headers.authorization 是 Express 提供的用于获取 HTTP 请求头中 Authorization 字段内容的方式。
  // “？”表示 req.headers.authorization 字段是否存在
  // 若存在，以空格为界，分成数组，我们取第二个元素(下标 1)，即取出token字符串。  
  const sessionID = req.headers.authorization?.split(' ')[1];

  // 如果 sessionID 为空，则表示未登录
  if (!sessionID) {
    return res.json({
      code: 400,
      message: '未登录',
      data: null,
    });
  }

  // 手动加载会话
  req.sessionStore.get(sessionID, async (err, session) => {
    if (err || !session) {
      return res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }

    // 检查会话状态
    if (session.status) {
      // 从前端传过来的聊天ID和发送内容
      const { chatID, content } = req.body;

      // 设置sql语句，从数据库中获取原本有的聊天记录
      const sql = `SELECT messages FROM chat WHERE id=${chatID} AND uid=${session.uid}`
      let orginalMessages = await databaseOperator(sql)

      // 若聊天记录不存在，则返回400状态码
      if (orginalMessages.length === 0) {
        return res.json({
          code: 400,
          message: '聊天记录不存在',
          data: null,
        });
      }

      // 准备一个变量，用于存储当前该存入数据库的聊天记录
      let nowMessages = ''
      if (orginalMessages[0].messages === null) {
        // 若聊天记录存在, 但是messages字段为空，则当前该存入数据库的聊天记录是用户发过来的这条消息
        nowMessages = '{ from: \'user\', text: \'' + content + '\' }'
      }else {
        // 若聊天记录存在, messages字段不为空，则前该存入数据库的聊天记录是原消息加上用户发过来的这条消息
        nowMessages = orginalMessages[0].messages + ',{ from: \'user\', text: \'' + content + '\' }'
      }

      // 转换为调用API符合规格的 messages 数组
      const messages = messageConverter.convertStringToMessages(nowMessages);
      // 准备一个变量，用于存储AI回复
      let aiResponse = ''

      // 尝试获取AI回复
      try {
          aiResponse = await chatUtil.getResponse(messages);
      } catch (error) {
          console.error("Error:", error.message);

          return res.json({
            code: 500,
            message: '服务器异常...',
            data: "服务器异常...",
          });
      }

      // 转译AI回复(因为ai回复含有如‘\n'等特殊字符，需要转译)
      const escapedString = stringUtil.processForDatabase(aiResponse.result, true);
      
      console.log(escapedString);
      

      // 将AI回复插入到当前该存入数据库的聊天记录中
      nowMessages += ',{ from: \'gpt\', text: \'' + escapedString + '\' }'
      
      // 更新数据库中聊天记录的 messages 字段
      const updateSql = `UPDATE chat SET messages="${nowMessages}" WHERE id=${chatID} AND uid=${session.uid}`
      let updateResult = await databaseOperator(updateSql)
      
      // 将AI回复转为HTML格式
      const htmlString = renderMarkdown(aiResponse.result);
      
      // 返回聊天回复
      res.json({
        code: 200,
        message: '获取聊天回复成功',
        data: htmlString,
      })
    } else {
      res.json({
        code: 400,
        message: '未登录',
        data: null,
      });
    }
  });
});


// 暴露路由
module.exports = Router