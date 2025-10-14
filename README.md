目前hook-lua工具可以实现：(但需要自行编写注入的lua代码)
1. 获取lua所有全局函数（遍历打印G表）
2. 通过hook luaState 注入执行任意lua代码，调用任意已知全局函数
3. 通过lua debug模块hook，获得任意已知函数的参数和返回值
4. 通过lua debug模块hook，修改任意已知函数的参数和返回值

lua5.4接口文档
https://www.lua.org/manual/5.4/
## Dumplua
通过源码分析，lua加载代码主要由luaL_loadbufferx和luaL_loadfilex两种接口加载，两种接口最终都会经过lua_load接口：
- luaL_loadbufferx 和 luaL_loadfilex 只是“喂数据”的辅助封装；真正完成编译/反序列化的是 lua_load。
- 因此无论从内存加载还是从文件加载，最后都会走到同一条编译管线（源码解析或字节码解析），并把生成的闭包函数压栈返回。
调用路径概览（Lua 5.2+）

luaL_loadbufferx
  └─> 构造内存 reader(getS)
      └─> lua_load(L, reader, data, chunkname, mode)


luaL_loadfilex
  └─> 打开文件
      └─> 构造文件 reader(getF)
          └─> lua_load(L, reader, data, chunkname, mode)

不同接口传入不同类型的reader
lua_load 
- 基于传入的 reader 构造统一的输入流（ZIO）。
- 读取开头判断类型：
  - 若是字节码（以 LUA_SIGNATURE 开头）→ 调用反序列化（如 luaU_undump）加载为 Proto。
  - 若是源码 → 词法/语法分析与代码生成（如 luaY_parser）得到 Proto。
- 用得到的 Proto 创建 Lua 闭包，把该函数压栈。

因hookluaL_loadbufferx比较简单，igame框架里采取了直接hook luaL_loadbufferx
luaL_loadfilex：代码中采取先hook lua_load获得文件指针和读取器指针，再构造函数读取文件
## Hooklua 
注入实现原理是hook任意函数获得LuaState指针，构造luaL_loadbufferx加载lua代码
构造luaL_loadbufferx后要调用lua_pcall执行
如遇报错：报错字符串会被压入栈顶，可通过读取栈顶获取报错信息，如不返回需继续执行要恢复lua栈顶

### lua注入脚本说明
例：hook.lua
- 获取输出值
目前采取在目标应用的执行目录下创建log文件，并将需要获取的输出写入
注：
  - 列表类型可以调用cjson转化成字符串写入
  - 但列表中可能存在function类型，调用write和cjson会报错
- 获取全局变量表
  - 通过lua_getglobal函数可以查看全局变量
  - 在igame框架中，把全局变量都放在全局变量ed表中（可能因为便于查找区分）
- hook函数（具体详细使用见lua5.4接口文档👆）
  - debug.sethook(hookFn, "cr", 0) ："c": 函数被调用时触发一次 call 事件; "r": 函数返回时触发一次 return 事件
  - debug.getinfo(2, "nuS")：level=2 表示“当前钩子之上的那个函数”（也就是被调用/返回的目标）, "nuS" 拿到：
    - n: 函数名等元信息（info.name 可能为 nil，匿名或 C 函数常见，可通过name找到要hook的函数）
    - u: 参数数量、是否可变参等（info.nparams、isvararg）
    - S: 源信息（short_src、linedefined 等）
  - debug.getlocal(2, 2)：读取“目标帧（level=2）第 2 个局部变量”。注意这取的是“局部变量”序号，不一定就是第 2 个“形参”。有 upvalue/寄存器分配/vararg 时，序号和期望不一定一致。
  - 以上两个函数的level参数要根据具体情况调试分析
  - 通过以上函数可以获取/修改lua函数的参数和返回值
- lua中有个upvalue的概念目前没有具体研究
