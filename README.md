# dsh-plaud

在 DeepSeek Harness 对话中查找 Plaud 录音、读取带说话人和时间戳的转录、查看 Plaud 已有纪要，并整理为 Markdown。插件使用官方 Plaud MCP，当前固定为 `@plaud-ai/mcp@0.3.14`。

## 安装

在 DeepSeek Harness Web 0.2.2-rc.2 上完成了端到端验证。桌面端可用下列入口安装。账号需要开启 Plaud Cloud Sync。安装包包含固定版本的官方 MCP 和运行依赖，可直接安装。[Plaud Cloud Sync 说明](https://support.plaud.ai/hc/en-us/articles/57751078986265-Plaud-MCP)

- 桌面端打开 **插件 → 添加插件**，选择 npm 官方源，在包名或地址字段填入 `file:/安装包的绝对路径/dsh-plaud-0.1.1.tgz`，安装并启用。
- Web CLI 在终端执行以下命令，随后启动或重启对应 profile。

```sh
dsh plugin --profile web add '/安装包的绝对路径/dsh-plaud-0.1.1.tgz'
dsh web
```

如果已手动配置了同名 `plaud` MCP 服务器，在同一 profile 中保留一个入口即可。

## 授权和使用

1. 打开 **设置 → Plaud → 打开登录窗口**。
2. 点击 **在浏览器登录**。Plaud 授权页会在运行 DSH 的电脑上打开。请在两分钟内登录并点击授权。
3. 返回 DSH，窗口会自动显示 **已登录**。也可以用 **刷新状态** 核对连接，或在 **管理账户** 中退出登录。

授权超时后可以从设置窗口再次发起登录。升级时，已有 Plaud 授权可直接使用。仍可在对话中发送“登录 Plaud”，调用官方 MCP 登录工具。

登录后可在对话中发送：

- “列出本周 Plaud 录音的标题和录音时间。”
- “查找上周的项目会，给我已有纪要。”
- “读这条录音的原始转录，摘出关于交付日期的讨论，标注时间戳。”
- “用 Plaud 把这次项目会整理成带时间戳的 Markdown 会议纪要，列出决定、行动项、负责人和截止日期。”

也可以在输入框选用 `/plaud-meeting-notes`，再输入要整理的会议标题或日期。

Plaud 官方 MCP 在运行 DSH 的电脑上保存和刷新授权。退出会断开本机共用该授权的客户端。读取到的录音信息、转录或纪要会进入当前 DSH 会话和模型上下文。官方 MCP 对录音提供只读访问，生成新的 Markdown 纪要由 DSH 完成。

本插件由社区维护，使用 Plaud 发布的官方 MCP。

## 开发和打包

```sh
npm ci --ignore-scripts
npm test
npm run pack:release
```

安装包位于 `dist/dsh-plaud-0.1.1.tgz`。[Plaud MCP 官方文档](https://docs.plaud.ai/plaud-mcp-cli/mcp)
