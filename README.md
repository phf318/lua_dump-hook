目前hook-lua工具可以实现：
1. 获取lua所有全局函数（遍历打印G表）
2. 通过hook luaState 注入执行任意lua代码，调用任意已知全局函数
3. 通过lua debug模块hook，获得任意已知函数的参数和返回值
4. 通过lua debug模块hook，修改任意已知函数的参数和返回值
但需要自行编写注入的lua代码
