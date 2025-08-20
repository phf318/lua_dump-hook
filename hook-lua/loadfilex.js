Java.perform(() => {
    let luaModule = null;
   
    console.log("当前进程 PID:", Process.id);

    // 遍历所有模块查找包含Lua API的模块
    const modules = Process.enumerateModules();
    for (let module of modules) {
        try {
            const loadBufferExport = module.findExportByName("luaL_loadbufferx");
            if (loadBufferExport !== null) {
                luaModule = module;
                console.log("找到Lua模块:", module.name);
                break;
            }
        } catch (e) {
            continue;
        }
    }

    if (!luaModule) {
        console.log("错误: 未找到包含Lua API的模块");
        return;
    }

    let recvscript;
    let byteLength;
    recv("lua_script", function(msg) {
        recvscript = msg.payload;
        byteLength = msg.len;
    });

    
    const pushstring = luaModule.findExportByName("lua_pushstring");
    if (!pushstring) {
        console.log("错误: 未找到lua_pushstring函数");
        return;
    }

    let hookListener;
    hookListener = Interceptor.attach(pushstring, {
        onEnter: function(args) {
            console.log("Hook 已触发");
            console.log("lptr: ", args[0]);
            compileLuaFromFile(args[0]);
            hookListener.detach();
            hookListener = null;
        }
    });

    function compileLuaFromFile(lptr) {
        // 获取所需的Lua API函数
        const tolstring = luaModule.findExportByName("lua_tolstring");
        const gettop = luaModule.findExportByName("lua_gettop");
        const loadbuffer = luaModule.findExportByName("luaL_loadbufferx");
        const pcall = luaModule.findExportByName("lua_pcall");

        // 检查所有必需的函数是否都存在
        if (!tolstring || !gettop || !loadbuffer || !pcall) {
            console.log("错误: 某些必需的Lua API函数未找到");
            return;
        }

        const lua_tolstring = new NativeFunction(tolstring, 'pointer', ['pointer', 'int', 'pointer'], { 'abi': "default" });
        const lua_gettop = new NativeFunction(gettop, 'int', ['pointer'], { 'abi': "default" });
        const lua_loadbuffer = new NativeFunction(loadbuffer, 'int', ['pointer','pointer','int','pointer','pointer'], { 'abi': "default" });
        const lua_pcall = new NativeFunction(pcall, 'int', ['pointer','int','int','int'], { 'abi': "default" });

        const L = ptr(lptr);
        const codeBuffer = Memory.allocUtf8String(recvscript);
        const chunkname = Memory.allocUtf8String("testhook");
        
        const loadRet = lua_loadbuffer(
            L,
            codeBuffer,
            byteLength,
            chunkname,
            NULL
        );
        
        if (loadRet !== 0) {
            const top = lua_gettop(L);
            console.log("now top", top);
            const strLenPtr = Memory.alloc(4);
            const err = lua_tolstring(L, top, strLenPtr);
            console.log("文件加载失败: %s", Memory.readByteArray(err, 200));
            return;
        }
        console.log("loadbuffer 成功");

        const pcall_re = lua_pcall(L, 0, -1, 0);
        if (pcall_re !== 0) {
            const top = lua_gettop(L);
            console.log("now top", top);
            const strLenPtr = Memory.alloc(4);
            const err = lua_tolstring(L, top, strLenPtr);
            console.log("执行失败: %s", Memory.readByteArray(err, 200));
            return;
        }
        
        console.log("compileLuaFromFile 执行成功");
    }
});
