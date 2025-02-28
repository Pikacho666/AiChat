class StringUtil {
    // 静态方法，用于转义多个特殊字符（在存入数据库之前）
    static escapeString(inputString) {
        return inputString
            .replace(/\\/g, '\\\\')  // 转义反斜杠 \
            .replace(/"/g, '\\"')     // 转义双引号 "
            .replace(/\n/g, '\\n')    // 转义换行符
            .replace(/\r/g, '\\r')    // 转义回车符
            .replace(/\t/g, '\\t');   // 转义制表符
    }

    // 静态方法，用于反转义多个特殊字符（从数据库取出后）
    static unescapeString(inputString) {
        return inputString
            .replace(/\\n/g, '\n')    // 还原换行符
            .replace(/\\r/g, '\r')    // 还原回车符
            .replace(/\\t/g, '\t')    // 还原制表符
            .replace(/\\"/g, '"')     // 还原双引号 "
            .replace(/\\\\/g, '\\');  // 还原反斜杠 \
    }

    // 静态方法：用于存储前转义字符串，取出后反转义字符串
    static processForDatabase(inputString, isForStorage = true) {
        if (isForStorage) {
            return this.escapeString(inputString); // 存入数据库时转义
        } else {
            return this.unescapeString(inputString); // 从数据库取出时反转义
        }
    }
}

module.exports = StringUtil;
