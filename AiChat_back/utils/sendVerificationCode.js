// 导入 nodemailer 模块
const nodemailer = require('nodemailer');

// 该函数传入email即可发送验证码邮件并以键值对的形式保存到redis中

// 创建发送邮件的服务函数
async function sendVerificationCode(email) {
    try {
        // 创建一个验证码（6位随机数字）
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // 创建邮件传输器
        const transporter = nodemailer.createTransport({
            host: '替换为你的 SMTP 服务地址', // 替换为你的 SMTP 服务地址
            port: STMP端口,               // SMTP 端口，通常是 465（SSL）或 587（TLS）
            secure: false,            // 使用 SSL
            auth: {
                user: '发件人邮箱地址', // 发件人邮箱地址
                pass: '发件人邮箱的授权码或密码'    // 发件人邮箱的授权码或密码
            }
        });

        // 设置邮件内容
        const mailOptions = {
            from: '"Ai Chat" <你的邮箱地址>', // 发件人信息
            to: email,                                      // 收件人邮箱地址
            subject: 'AiChat 注册验证码',              // 邮件主题
            text: `您的验证码是: ${verificationCode}`, // 邮件正文（纯文本）
            html: 
                `
                    <!DOCTYPE html>
                    <html lang="zh-CN">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>验证码邮件</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                background-color: #f4f4f4;
                                margin: 0;
                                padding: 0;
                            }
                            .email-container {
                                max-width: 600px;
                                margin: 20px auto;
                                background-color: #ffffff;
                                border-radius: 8px;
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                                overflow: hidden;
                            }
                            .email-header {
                                background-color: #007bff;
                                color: #ffffff;
                                text-align: center;
                                padding: 20px;
                            }
                            .email-header h1 {
                                margin: 0;
                                font-size: 24px;
                            }
                            .email-body {
                                padding: 20px;
                                line-height: 1.6;
                                color: #333333;
                            }
                            .email-body h2 {
                                text-align: center;
                                color: #007bff;
                                font-size: 32px;
                                margin: 20px 0;
                            }
                            .email-footer {
                                background-color: #f8f9fa;
                                text-align: center;
                                padding: 10px;
                                font-size: 14px;
                                color: #888888;
                            }
                            .email-footer a {
                                color: #007bff;
                                text-decoration: none;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="email-container">
                            <!-- Header -->
                            <div class="email-header">
                                <h1>AiChat</h1>
                            </div>

                            <!-- Body -->
                            <div class="email-body">
                                <p>尊敬的用户，您好！</p>
                                <p>感谢您注册 <strong>AiChat</strong>。以下是您的验证码，请在10分钟内使用：</p>
                                <h2>${verificationCode}</h2>
                                <p>如果您未请求此邮件，请忽略。</p>
                            </div>

                            <!-- Footer -->
                            <div class="email-footer">
                                <p>&copy; 2025 AiChat. All rights reserved.</p>
                                <p>
                                    有任何问题，请联系 <a href="admin@mail.zrllove.cn">admin@mail.zrllove.cn</a>
                                </p>
                            </div>
                        </div>
                    </body>
                    </html>
                ` // 邮件正文（HTML）
            // 注意text和html可以同时存在，因为有些邮箱可能不支持html格式的邮件
        };

        // 发送邮件
        const info = await transporter.sendMail(mailOptions);

        // console.log(`Email sent: ${info.messageId}`); // 输出邮件 ID
        return { success: true, verificationCode };  // 返回验证码和发送状态
    } catch (error) {
        // console.error('Error sending email:', error); // 错误处理
        return { success: false, error };
    }
}

// 导出函数
module.exports = sendVerificationCode;
