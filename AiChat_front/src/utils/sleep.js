// 定义函数用于暂停进程，单位ms
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 导出函数
export default sleep;

// 调用方法(记得要将异步改为同步)：
// async function test() {
//   console.log('start');
//   await sleep(2000);
//   console.log('end');
// }