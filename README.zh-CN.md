# ChatFleet 中文启动说明

这是 Codex × TwitchCon Hackathon 的参赛项目初版：主播是船长，Twitch 观众通过聊天协同驾驶飞船，三分钟内在三个星区救回九个人。

## 直接体验

公开体验：https://chatfleet-mission-control.yiwenxiao96.chatgpt.site

打开后点 **Launch mission**。默认开启自动模拟船员，不需要 Twitch 账号，也不需要 OpenAI API Key。所有模拟数据均标注为 Demo。可点击指令卡片或在右侧输入 `!boost`、`!shield`、`!scan` 自己参与。关闭 **Simulated crew** 可手动挑战。

- `!boost`：推进，消耗燃料。
- `!shield`：补充护盾，抵挡每 12 秒一次的碎片撞击。
- `!scan`：扫描遇难者，四次扫描完成一次信号锁定。
- 同一区域同时达到 100 距离、12 扫描点后救出三人。
- 三位不同船员在八秒内分工使用三种指令触发 Crew Sync，得到协作加分。
- 每名船员每两秒可操作一次，连续刷屏不能绕过冷却。
- 船长可切换航线、暂停、继续和重开任务；任务记录支持 JSON 导出。

## 本机启动

需要 Node.js 22.18 及以上版本。在本项目目录执行：

```sh
npm ci
npm run build
npm run db:migrate:local
npm run dev -- --port 5177
```

浏览器打开 http://127.0.0.1:5177 。迁移只在首次建立本地数据库时执行；之后只需运行最后一行。不要重复执行建表 SQL。所有数据保存在忽略提交的 `.wrangler/state` 目录。

## 接入真实 Twitch

现在已实现 OAuth + EventSub 聊天适配器，并做了模拟事件测试，但尚未用真实频道实测。

1. 在 Twitch Developer Console 注册应用，拿到公开的 Client ID。
2. 把项目 Connection settings 中展示的完整回调地址填入 Twitch 应用配置；本地地址为 `http://127.0.0.1:5177/?oauth=callback`。
3. 在项目中填写 Client ID，用准备直播的主播账号授权。只请求 `user:read:chat` 权限。
4. 显示 Twitch Connected 后启动任务，观众在该 Twitch 频道发送指令。

授权令牌只在当前浏览器标签的内存中，不发给项目后端、不写入源码。刷新后需要重新授权。船长标签要保持打开。切换演示／Twitch 模式会新建一局，避免混用模拟和真实观众。

## OBS

点 **OBS overlay** 获取只读画面地址。在 OBS 新增 Browser Source，填入地址，大小设为 1920×1080。独立画面通过后端读取同一局数据，不依赖两个页面共用浏览器。

线上体验站已按用户要求改为公开访问，并验证无需登录即可打开。OBS 可使用线上任务的 overlay 地址，也可在本机运行后使用本地地址。界面中的旧私有预览说明来自首次部署，目前实际权限已公开。

## 验证和参赛材料

- `npm test`：26 项玩法和 Twitch 适配器测试。
- `npm run typecheck`：TypeScript 检查。
- `npm run test:api`：本地服务器运行时执行 10 项接口集成检查。
- `submission/devpost.md`：可粘贴到 Devpost 的英文文案。
- `submission/video-script.md`：不到三分钟的视频录制脚本。
- `submission/checklist.zh-CN.md`：真实频道实测、仓库链接、视频上传和最终提交清单。

比赛截止时间：**2026 年 11 月 3 日 06:00，香港时间**，对应 11 月 2 日 14:00 America/Los_Angeles（当日为 PST，UTC−8）。官方 FAQ 的 UTC 换算和页面其他时间可能有出入；以官方规则的太平洋时间及主页面倒计时为准。
