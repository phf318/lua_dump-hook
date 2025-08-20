import frida
import sys
import time
import subprocess
import os
import argparse

def compile_typescript():
    # 获取脚本所在目录的绝对路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 切换到脚本所在目录
    original_dir = os.getcwd()
    os.chdir(script_dir)
    
    try:
        # 确保node_modules存在
        if not os.path.exists("node_modules"):
            print("[*] 安装Node.js依赖...")
            subprocess.run(["npm", "install"], shell=True, check=True)
        
        # 编译TypeScript
        print("[*] 编译TypeScript...")
        subprocess.run(["npm", "run", "build"], shell=True, check=True)
    finally:
        # 恢复原始工作目录
        os.chdir(original_dir)

# 获取项目根目录
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lua_script_dir = os.path.join(root_dir, "lua_script")

script_counter = 0

def on_message(message, data):
    if data:
        print(f"JS 端确认收到 {len(data)} 数据")


def main(luascript, pkg_name):
    # 获取脚本所在目录的绝对路径
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # lua_name = "testhook.lua"
    # lua_path = os.path.join(script_dir, lua_name)


    with open(luascript, "rb") as f:
        file_data = f.read()

    # 连接到USB设备
    device = frida.get_usb_device()

    # 启动目标应用
    # package_name = "com.farlightgames.pgame.gp"
    pid = device.spawn([pkg_name])
    device.resume(pid)
    time.sleep(1)  # 给应用一些启动时间

    # 附加到进程
    session = device.attach(pid)
    
    # 读取并加载编译后的JS脚本
    js_path = os.path.join(script_dir, "loadfilex.js")
    if not os.path.exists(js_path):
        raise Exception("编译后的JS文件不存在，请确保TypeScript编译成功")
        
    with open(js_path, "r", encoding="utf-8") as f:
        script_content = f.read()
    
    # 创建脚本
    script = session.create_script(script_content)
    script.on('message', on_message)
    
    # 加载脚本
    script.load()

    data = file_data.decode('utf-8')
    # script.post({'type': 'lua_script'}, data=file_data)
    script.post({'type': 'lua_script', 'payload': data, 'len':len(file_data)})
    
    # 保持程序运行
    print("[*] 脚本已加载，按Ctrl+Z Enter退出")

    sys.stdin.read()

class HelpOnErrorParser(argparse.ArgumentParser):
    def error(self, message):
        """参数解析失败时打印帮助信息"""
        sys.stderr.write(f"错误: {message}\n\n")
        self.print_help()
        sys.exit(2)


if __name__ == "__main__":
    # 创建参数解析器
    parser = HelpOnErrorParser(
        description='Lua脚本注入工具',
        formatter_class=argparse.RawTextHelpFormatter,
        epilog='示例:\n  python start.py -p pkg_name\n  python start.py -s /path/to/script.lua -l /path/to/logs -p pkg_name'
    )
    
    # 添加参数定义
    parser.add_argument(
        '-s', '--script',
        dest='lua_script',
        nargs='?',  # 设置为可选位置参数
        default=os.path.abspath('hook.lua'),
        type=lambda x: os.path.abspath(x),  # 自动转换绝对路径
        help='Lua脚本路径 (默认: hook.lua)'
    )

    parser.add_argument(
        '-l', '--log',
        dest='log_dir',
        nargs='?',
        default=os.getcwd(),
        type=lambda x: os.path.abspath(x),
        help='日志输出目录 (默认: 当前目录)'
    )

    parser.add_argument(
        '-p', '--package',
        dest = 'package_name',
        type=str,
        help='应用包名'
    )

    # 解析参数
    args = parser.parse_args()

    # 验证Lua脚本存在
    if not os.path.exists(args.lua_script):
        parser.error(f"Lua脚本文件不存在: {args.lua_script}")

    # 确保日志目录存在
    os.makedirs(args.log_dir, exist_ok=True)

    # 打印配置信息
    print(f"[配置] Lua脚本: {args.lua_script}")
    print(f"[配置] 日志目录: {args.log_dir}")
    print(f"[配置] 应用包名: {args.package_name}")

    main(args.lua_script, args.package_name)

    log_name = "login.log"
    subprocess.run(
        f"adb shell su -c \'cp /data/user/0/com.farlightgames.pgame.gp/files/tmp/{log_name} /sdcard/tmp/{log_name} \'",
        shell=True, check=True)
    subprocess.run(["adb", "pull", "/sdcard/tmp/" + log_name, args.log_dir], shell=True, check=True)