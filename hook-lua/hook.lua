local output_file = "/data/user/0/com.xxx.xx.xxx/files/tmp/login.log"
local file = io.open(output_file, "w")
ed.json = require "cjson"


        
local function get_table(tbl)
   if type(tbl) ~= "table" then
        file:write(type(tbl))
        return
   end
   for k, v in pairs(tbl) do
        local vt = type(v)
        local val
        
        if vt == "string" then
            val = v
        elseif vt == "number" then
            val = v
        elseif vt == "boolean" then
            val = tostring(v)
        elseif vt == "function" then
            val = tostring(v)
        elseif vt == "table" then
            --get_table(v)
            val = vt
        else
            val = vt
        end
        file:write(tostring(k), " ", val, "\n")
        file:flush()
   end
end
    

-- 目标监控函数示例
local function target_func(a, b)
    return a + b, a - b
end

-- 创建调用栈跟踪表
local call_stack = {}


-- 调试钩子函数
function ed.debug_hook(event)

    if event == "call" then
        --file:write("getting info\n")
        local info = debug.getinfo(2, "nuS")
        if info.name == nil then
            return
            --if not string.find(info.name, "Tolua") then
                --file:write(info.name)
                --file:write("\n")
            --end
        end
        --file:write(info.name, "\n")
        local num = 1
        if info.name == "PerformSend" then
            -- 记录调用参数
            local t
            num = num + 1
            local args = {}
            --file:write(info.nparams)
            file:write("find target func\n")
            t, args = debug.getlocal(2, 2)
            --file:write(type(a13["sdkLogin"]))
            --get_table(a13["sdkLogin"])
            if type(args) == "string" then
                local binf = string.format("/data/user/0/com.xxx.xxx.xxx/files/tmp/%s.bin", num)
                local bin = io.open(binf, "wb")
                bin:write("encodemsg:" .. args .. "finish")
                bin:flush()
                bin:close()
            else
                file:write(info.nparams)
                
            end
            local v_str = ed.json.encode(args[2])
            file:write(v_str)
            file:flush()

        end
    
    elseif event == "return" then
        local reinfo = debug.getinfo(2, "nS")
        --file:write(reinfo.name or "nil", "\n")
        if reinfo.name ~= "target_func" then return end
        file:write("f target\n")
        local i=1
        while true do
            local n, val = debug.getlocal(2, i)
            if not n then break end
            if n:sub(1,1) == "(" then
                local t = type(val)
                if t == "table" then
                    get_table(val)
                elseif t == "number" then
                    file:write(n or "nil", " ", tostring(val))
                elseif t == "string" then
                    file:write(val, "\n")
                else
                    file:write(n or "nil", " ", type(val))
                end
            end
            i = i + 1
        end
    end
end


-- 设置调试钩子（监控调用和返回事件）
debug.sethook(ed.debug_hook, "cr", 0)
-- file:write(ed.serialize(ed.myargs))
-- 测试调用

target_func(10, 5)
