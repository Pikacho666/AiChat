/*校验邮件地址是否合法 */
function isEmail(str) {
 
let reg = /^\w+@[a-zA-Z0-9-]{2,63}(\.[a-zA-Z]{2,63})+$/;
 
return reg.test(str);
 
}

// 导出IsEmail方法对象
module.exports = isEmail