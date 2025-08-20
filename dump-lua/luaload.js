Java.perform(() => {
    let luaModule = null;
   
    console.log("当前进程 PID:", Process.id);
    const libil2cpp = Process.findModuleByName("libil2cpp.so");
    const base = libil2cpp.base;
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
    

    const lua_version = luaModule.findExportByName("lua_version");
    const get_version = new NativeFunction(lua_version, 'double', ['pointer'], { 'abi': "default" });
    const lua_load = luaModule.findExportByName("lua_load");
    const luaL_loadbufferx = luaModule.findExportByName("luaL_loadbufferx");
    const loadfile = luaModule.findExportByName("luaL_loadfilex");
    const lua_loadfilex = new NativeFunction(loadfile, 'int', ['pointer', 'pointer', 'pointer'], { 'abi': "default" });
    const tolstring = luaModule.findExportByName("lua_tolstring");
    const lua_tolstring = new NativeFunction(tolstring, 'pointer', ['pointer', 'int', 'pointer'], { 'abi': "default" });
    const gettop = luaModule.findExportByName("lua_gettop");
    const lua_gettop = new NativeFunction(gettop, 'int', ['pointer'], { 'abi': "default" });


    if (!lua_load) {
        console.log("错误: 未找到lua_load函数");
        return;
    }

    const lua_load_ptr = luaModule.findExportByName("lua_load");
    if (!lua_load_ptr) {
        console.log("错误: 未找到lua_load函数");
        return;
    }


    Interceptor.attach(luaL_loadbufferx, {
        onEnter: function(args) {
            // 保存参数供onLeave使用
            this.L = args[0];
            this.buff = args[1];
            this.size = args[2].toInt32();
            this.name = args[3].readCString();
            console.log("[+] luaL_loadbufferx 被调用");
            console.log("    size:", this.size);
            console.log("    name:", this.name);
            
            // 直接读取字节数组
            this.luaContent = new Uint8Array(this.buff.readByteArray(this.size));
        },
        onLeave: function(retval) {
            // 发送给主机
            console.log("luaContent: ", this.luaContent);
            send({
                type: "lua_script",
                name: this.name,
                size: this.size,
                content: Array.from(this.luaContent)  // 转换为普通数组发送
            });

            // console.log("[+] luaL_loadbufferx 返回值:", retval);
        }
    });

    // Hook lua_load函数
    let hookluaload;
    let luastate = null;

    hookluaload = Interceptor.attach(lua_load_ptr, {
        onEnter: function(args) {
            console.log("----------------lua_load被调用----------------");
            this.L = args[0];  // 保存lua_State指针
            this.reader = args[1];  // 保存reader函数指针
            this.data = args[2];  // 保存data指针
            this.chunkname = args[3].readCString();  // 保存chunkname指针
            this.mode = args[4];  // 保存mode指针
            this.file = false;
            // 打印参数信息
            console.log("lua_State指针:", this.L);
            luastate = this.L;


            const load = Memory.readPointer(this.data.add(Process.pointerSize * 2))
            // console.log("load: ", load);
            if (load.compare(ptr(0)) > 0 && load.compare(ptr("0x7fffffffffff")) < 0) {
                console.log("指针有效");
                this.file = true;
                const result = readAllSource(this.L, this.reader, this.data);
                this.buffer = result.buffer;
                this.size = result.size;
                this.name = this.chunkname;

            } 
            // else {
            //     console.log("指针值超出正常范围");
            // }

            // console.log("reader: ", this.reader);
            // console.log('Reader memory range:', JSON.stringify(Process.findRangeByAddress(this.reader)));
            // console.log("Reader函数指针:", this.reader);
            // console.log("Data指针:", this.data);
            

            // const reader = new NativeFunction(this.reader, 'pointer', ['pointer', 'pointer', 'pointer']);
            // const sizePtr = Memory.alloc(Process.pointerSize);
            // const result = reader(this.L, this.data, sizePtr);
            // console.log("result: ", Memory.readByteArray(result, 100));

        },
        onLeave: function(retval) {
            
            if (this.file) {
            发送给主机
            send({
                type: "lua_script",
                size: this.size,
                name: this.name,
                content: this.buffer
            });
        }


            // console.log("----------------OnLeave----------------");
            // console.log(Memory.readByteArray(this.sp, 64));

            //console.log(Memory.readByteArray(this.p, 100));
    }        
    });


    // 2. 完整的读取实现
    function readAllSource(Lptr, readerPtr, dataPtr) {
        let allData = [];
        let totalSize = 0;
        let chunkCount = 0;
        
        while(true) {
            const sizePtr = Memory.alloc(Process.pointerSize);
            
            // 调用reader
            const result = new NativeFunction(readerPtr, 'pointer', ['pointer', 'pointer', 'pointer'])(
                Lptr, 
                dataPtr, 
                sizePtr
            );
            
            const size = sizePtr.readUInt();
            
            // 检查是否读取结束
            if (result.isNull() || size === 0) {
                console.log(`读取完成，共读取 ${chunkCount} 个数据块，总大小: ${totalSize} 字节`);
                break;
            }
            
            // 读取数据
            const buffer = result.readByteArray(size);
            allData.push(buffer);
            totalSize += size;
            chunkCount++;
            
            console.log(`读取第 ${chunkCount} 个数据块，大小: ${size} 字节`);
        }
        
        // 合并所有数据并转换为数组
        const finalBuffer = new Uint8Array(totalSize);
        let offset = 0;
        for (const buffer of allData) {
            finalBuffer.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }
        
        return {
            buffer: Array.from(finalBuffer),  // 直接返回数组格式
            size: totalSize
        };
    }




});
