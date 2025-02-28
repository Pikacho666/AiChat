// 定义函数，用于切换页面
// 实现逻辑：将传入路径添加到路由后面
function changePage(router, path) {
  router.push(path)
}

// 导出函数
export default changePage