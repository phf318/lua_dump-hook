# Lua脚本注入工具

基于 Frida 实现的 Lua 脚本动态注入工具，可通过获取 LuaState 指针调用 Lua API 执行自定义脚本。本工具主要用于 Lua 脚本的动态分析和调试。

## 功能特点

- 支持动态注入自定义 Lua 脚本
- 实时监控和记录 Lua 脚本执行过程
- 灵活的日志输出配置
- 支持多种目标应用场景

## 环境要求

- Python 3.6+
- Frida 15.0+
- 已root的Android设备或模拟器
- 目标应用包含Lua运行环境

## 使用方法

### 基本命令格式

```bash
python start.py -p <应用包名> [选项]
```

### 参数说明

#### 必需参数
- `-p, --package`: 指定目标应用的包名（例如：com.example.app）

#### 可选参数
- `-s, --script`: 指定要注入的Lua脚本路径（默认：当前目录下的hook.lua）
- `-l, --log`: 指定日志输出目录（默认：当前目录）

### 使用示例

1. 使用默认配置运行：
```bash
python start.py -p com.example.app
```

2. 指定自定义脚本和日志目录：
```bash
python start.py -p com.example.app -s /path/to/custom.lua -l /path/to/logs
```

## 日志配置

- 日志文件名在hook.lua中定义
- 确保日志文件名与python脚本中的log_name变量保持一致
- 建议使用绝对路径指定日志目录以避免路径问题

## 注意事项

1. 确保目标设备已正确连接并已授权
2. 目标应用必须已安装且包含Lua环境
3. 注入的Lua脚本需符合目标应用的Lua版本要求
4. 建议在测试环境中使用，避免在生产环境直接操作

## 常见问题

1. 如果遇到权限问题，请检查设备root状态和Frida服务是否正常运行
2. 脚本注入失败时，检查目标应用是否正确启动
3. 日志无输出时，确认日志路径配置是否正确


