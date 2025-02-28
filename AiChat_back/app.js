const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")

// 导入路由模块
const router = require("./router/router")

// 创建一个服务器对象
const app = express()

// 添加跨域，解析数据的中间件
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:false}))

// 添加cookie解析
app.use(cookieParser())

// 添加路由
app.use("/",router)

// 启动监听
app.listen(8081,()=>{})

