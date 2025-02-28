const axios = require('axios');

// 百度 AI 聊天机器人 API 相关信息
const AK = "Your API Key";
const SK = "Your Secret Key";

class chatUtil {
    // 获取 Access Token
    static async getAccessToken() {
        const options = {
            method: 'POST',
            url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${AK}&client_secret=${SK}`,
        };

        try {
            const response = await axios(options);
            return response.data.access_token;
        } catch (error) {
            throw new Error("Failed to fetch access token: " + error.message);
        }
    }

    // 调用接口获取回复
    static async getResponse(messages) {
        const accessToken = await this.getAccessToken();
        const options = {
            method: 'POST',
            url: `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro?access_token=${accessToken}`,
            headers: {
                'Content-Type': 'application/json',
            },
            data: JSON.stringify({
                messages: messages,
                temperature: 0.95,
                top_p: 0.8,
                penalty_score: 1,
                enable_system_memory: false,
                disable_search: false,
                enable_citation: false,
            }),
        };

        try {
            const response = await axios(options);
            return response.data;
        } catch (error) {
            throw new Error("Failed to get response: " + error.message);
        }
    }
}

module.exports = chatUtil;
