import frida
import sys
import time
import subprocess
import os
import argparse


# 获取项目根目录
root_dir = os.path.dirname(os.path.abspath(__file__))
# root_dir = "C:\\frida-scripts\\dumplua"
lua_script_dir = os.path.join(root_dir, "lua_script")

# 检查并创建输出目录
if not os.path.exists(lua_script_dir):
    os.makedirs(lua_script_dir)
    print(f"[+] 创建输出目录: {lua_script_dir}")
else:
    print(f"[*] 使用现有输出目录: {lua_script_dir}")

script_counter = 0

def on_message(message, data):
    global script_counter
    if message['type'] == 'send':
        payload = message['payload']
        if payload['type'] == 'lua_script':
           
            name = payload['name'].replace('@', '').replace('/', '-')
            if not name or name == "?":  # 如果名称无效，使用计数器
                script_counter += 1
                name = f"{script_counter}.lua"
            elif not name.endswith('.lua'):
                name += '.lua'

            filename = os.path.join(lua_script_dir, name)

            # 确保目录存在
            # os.makedirs(os.path.dirname(filename), exist_ok=True)

            # 保存内容
            content = payload['content']
            if isinstance(content, list):  # 如果是字节数组
                with open(filename, 'wb+') as f:
                    #print(content)
                    f.write(bytes(content))
            else:  # 如果是字符串
                with open(filename, 'w+', encoding='utf-8') as f:
                    f.write(content)

            print(f"[+] 保存Lua脚本: {filename}")
            print(f"    大小: {payload['size']} 字节")

        elif payload['type'] == 'lua_buffer':
            # 创建输出目录
            if not os.path.exists(lua_script_dir):
                os.makedirs(lua_script_dir)
            
            # 构造文件名，使用原始名称
            name = payload['name'].replace('@', '').replace('/', '-')
            if not name or name == "?":  # 如果名称无效，使用计数器
                script_counter += 1
                name = f"{script_counter}.lua"
            elif not name.endswith('.lua'):
                name += '.lua'
            
            filename = os.path.join(lua_script_dir, name)
            
            # 确保目录存在
            # os.makedirs(os.path.dirname(filename), exist_ok=True)
            
            # 保存内容
            content = payload['content']
            if isinstance(content, list):  # 如果是字节数组
                with open(filename, 'wb+') as f:
                    # print(content)
                    f.write(bytes(content))
            else:  # 如果是字符串
                with open(filename, 'w+', encoding='utf-8') as f:
                    f.write(content)

            print(f"[+] 保存Lua脚本: {filename}")
            print(f"    大小: {payload['size']} 字节")
    elif message['type'] == 'error':
        print(f"[-] 错误: {message['description']}")

def main():
    # 设置命令行参数解析
    parser = argparse.ArgumentParser(description='Frida脚本用于dump Lua代码')
    parser.add_argument('package_name', help='目标应用的包名')
    args = parser.parse_args()

    # 获取脚本所在目录的绝对路径
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # 连接到USB设备
    device = frida.get_usb_device()

    # 启动目标应用
    pid = device.spawn([args.package_name])
    device.resume(pid)
    time.sleep(1)  # 给应用一些启动时间
    
    # 附加到进程
    session = device.attach(pid)
        
    with open("luaload.js", "r", encoding="utf-8") as f:
        script_content = f.read()
    
    # 创建脚本
    script = session.create_script(script_content)
    script.on('message', on_message)
    
    # 加载脚本
    script.load()
    
    # 保持程序运行
    print("[*] 脚本已加载，按Ctrl+Z退出")
    sys.stdin.read()

if __name__ == "__main__":
    main() 