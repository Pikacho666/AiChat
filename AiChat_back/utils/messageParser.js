class MessageParser {
  // 将数据库返回的消息字符串解析成数组
  static parseMessages(messagesString) {
    let formattedString = messagesString;

    try {
      // 1. 优先处理双引号转义（放在其他替换前）
      formattedString = formattedString
        .replace(/\\"/g, '\\\\"')  // 先转义已有的转义双引号
        .replace(/"/g, '\\"');     // 转义所有未转义的双引号

      // 2. 处理键的引号格式（支持无引号和单引号两种形式）
      formattedString = formattedString
        .replace(/([{,]\s*)'?([a-zA-Z0-9_]+)'?\s*:/g, '$1"$2":') // 键的引号处理
        .replace(/'/g, '"'); // 剩余单引号转为双引号（值部分）

      // 3. 处理特殊字符转义（放在键处理之后）
      formattedString = formattedString
        .replace(/\n/g, '\\n')  // 转义换行符
        .replace(/\r/g, '\\r')  // 转义回车符
        .replace(/\t/g, '\\t'); // 转义制表符

      // 4. 处理JSON格式问题
      formattedString = formattedString
        .replace(/([{,]\s*)"([^"]+)"\s*:/g, '$1"$2":') // 清理多余的引号
        .replace(/,\s*([}\]])/g, '$1')  // 去除多余逗号
        .replace(/\\\\"/g, '\\"');      // 恢复正确的双引号转义

      // 5. 确保包装成数组格式
      formattedString = formattedString.startsWith('[') 
        ? formattedString
        : `[${formattedString}]`;

      // 6. 解析并恢复原始内容
      const parsedMessages = JSON.parse(formattedString);

      // 7. 恢复特殊字符
      return parsedMessages.map(msg => ({
        from: msg.from,
        text: msg.text
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\"/g, '"')
      }));
    } catch (error) {
      console.error("Error parsing messages:", error);
      console.error("Formatted String:", formattedString);
      return [];
    }
  }

  // 将从数据库返回的数据处理成所需格式
  static processRowData(row) {
    const { id, uid, title, messages } = row;
    const parsedMessages = messages ? MessageParser.parseMessages(messages) : [];
    return { id, uid, title, messages: parsedMessages };
  }
}

module.exports = MessageParser;