class MessageConverter {
    // 将字符串转换为符合规格的 messages 格式
    static convertStringToMessages(inputString) {
        // 将输入的字符串中的单引号替换为双引号
        const formattedString = `[${inputString.replace(/([a-zA-Z]+):/g, '"$1":').replace(/'/g, '"')}]`;

        try {
            // 解析为对象数组
            const inputArray = JSON.parse(formattedString);

            // 转换为符合规格的 messages 格式
            return inputArray.map(item => ({
                role: item.from === 'user' ? 'user' : 'assistant',
                content: item.text
            }));
        } catch (error) {
            throw new Error("Invalid input string format");
        }
    }
}

module.exports = MessageConverter;
