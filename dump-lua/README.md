# Lua脚本Dump工具

这是一个使用Frida框架来转储Android应用中Lua脚本的工具。

## 功能特点

- 自动连接USB设备上的Android应用
- 实时监控并转储Lua脚本文件
- 支持转储二进制和文本格式的Lua脚本
- 自动创建并组织输出目录

## 环境要求

- Python 3.6+
- Frida
- Android设备（已启用USB调试）
- 目标应用已安装在设备上

## 安装

1. 安装Python依赖：
```bash
pip install frida frida-tools
```

2. 确保Android设备已正确连接并启用USB调试。

## 使用方法

1. 连接Android设备到电脑。

2. 运行脚本：
```bash
python luaload-start.py <package_name>
```

例如：
```bash
python luaload-start.py com.example.app
```

3. 转储的Lua脚本将保存在 `lua_script` 目录下。

## 输出说明

- 所有转储的Lua脚本都会保存在 `lua_script` 目录中
- 文件名会根据原始脚本名称自动生成
- 如果原始名称不可用，将使用数字序号命名

## 注意事项

- 确保目标应用已在设备上安装
- 确保设备已正确连接并授权
- 某些应用可能有反调试机制，可能需要额外处理 