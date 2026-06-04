# IOPC / Paperclip 集成项目部署交接（2026-05-17）

## 一、当前结论（先看这个）

- 新服务器已完成基础部署，公网 `HTTP + HTTPS` 都已经通。
- 主站已可访问：`https://myopc.me/`
- `http://myopc.me/` 会自动 `301` 跳转到 HTTPS。
- `paperclipai auth bootstrap-ceo` 的 **旧配置兼容问题已修复**，不会再因为 `config.json` 缺 `$meta` / `logging` 而报错。
- Resend 邮件验证码注册/登录流程代码已接入到 Paperclip 的认证链路。
- 管理员账号已可直接使用：
  - 邮箱：`admin@myopc.me`
  - 密码：`zsqzsq123`

---

## 二、给下一个接手模型 / 工程师的完整提示词

你现在接手的是 `/Users/baihe/Documents/iopc` 里的 Paperclip 集成部署项目。请全程使用简体中文，执行导向，不要空谈，不要 reset / checkout / pull 覆盖本地脏工作树。

### 1）项目背景
这是一个基于本地 Paperclip 的深度集成工程，当前集成方向包括：
1. Paperclip 主系统（公司 / 项目 / Agent 管理）
2. OpenCode 集成（AI 代码助手 Web 端）
3. Knowledge / Milkdown 知识库集成（Paperclip 内置）
4. Uptime Kuma 监控集成（Paperclip embedded 模式）
5. Products / Umami 分析集成
6. 整站中文化
7. AI Gateway 统一配置
8. 二级域名分发功能（后续开发方向）

### 2）服务器信息
- IP：`104.248.150.29`
- 用户：`root`
- SSH：已免密
- OS：`Ubuntu 24.04.3 LTS x86_64`
- 配置：`4C / 8G / 154G SSD`
- 机房：新加坡（DigitalOcean）

### 3）本地项目路径
项目根目录：`/Users/baihe/Documents/iopc`

核心仓库：
- `/Users/baihe/Documents/iopc/repos/paperclip`
- `/Users/baihe/Documents/iopc/repos/opencode`
- `/Users/baihe/Documents/iopc/repos/uptime-kuma`
- `/Users/baihe/Documents/iopc/repos/umami`
- `/Users/baihe/Documents/iopc/repos/better-auth`
- `/Users/baihe/Documents/iopc/repos/milkdown`

### 4）当前服务器已部署并运行中的服务
已通过 systemd 自启动：
- `paperclip.service`
- `opencode.service`
- `uptime-kuma.service`
- `umami.service`
- `postgresql@16-main.service`
- `nginx.service`

当前监听端口：
- `443` → nginx / HTTPS
- `80` → nginx / HTTP（已跳转 HTTPS）
- `3100` → Paperclip
- `3001` → Uptime Kuma
- `3000` → Umami
- `4096` → OpenCode Web
- `5432` → PostgreSQL（127.0.0.1）

### 5）当前已验证可用的公网入口
- `https://myopc.me/` → `200`
- `https://www.myopc.me/` → `200`
- `http://myopc.me/` → `301 -> https://myopc.me/`

### 6）Paperclip 当前部署状态
当前仍采用：
- `authenticated + public`
- 监听 `0.0.0.0:3100`
- 运行方式：**tsx 源码模式**

当前 systemd：
- 文件：`/etc/systemd/system/paperclip.service`
- 关键环境变量：
  - `PAPERCLIP_DEPLOYMENT_MODE=authenticated`
  - `PAPERCLIP_DEPLOYMENT_EXPOSURE=public`
  - `HOST=0.0.0.0`
  - `PAPERCLIP_PUBLIC_URL=https://myopc.me`
  - `LD_LIBRARY_PATH=/opt/embedded-postgres-native/lib`

当前实例配置文件：
- `/root/.paperclip/instances/default/config.json`

当前对外 base URL 已改为：
- `https://myopc.me/`

### 7）已修复的重要问题

#### A. Paperclip embedded-postgres 启动问题
历史根因：
- embedded-postgres 切到 `postgres` 用户时，无法穿越 `/root/.paperclip/...`
- 再叠加 native 二进制 / 动态库路径问题

已处理：
- embedded postgres native 已放到：`/opt/embedded-postgres-native`
- `LD_LIBRARY_PATH=/opt/embedded-postgres-native/lib`
- `server/src/index.ts` 已开启 `createPostgresUser: true`
- 当前 `paperclip.service` 正常运行

#### B. Resend 邮件验证码认证已接入
已改文件：
- `/Users/baihe/Documents/iopc/repos/paperclip/server/src/auth/better-auth.ts`
- `/Users/baihe/Documents/iopc/repos/paperclip/ui/src/api/auth.ts`
- `/Users/baihe/Documents/iopc/repos/paperclip/ui/src/pages/Auth.tsx`
- `/Users/baihe/Documents/iopc/repos/paperclip/ui/src/pages/InviteLanding.tsx`
- `/Users/baihe/Documents/iopc/repos/paperclip/.env.example`
- `/Users/baihe/Documents/iopc/repos/paperclip/server/package.json`
- `/Users/baihe/Documents/iopc/repos/paperclip/pnpm-workspace.yaml`
- `/Users/baihe/Documents/iopc/repos/paperclip/pnpm-lock.yaml`

服务器环境变量已写入：
- 文件：`/root/.paperclip/instances/default/.env`
- 已包含：
  - `PAPERCLIP_AGENT_JWT_SECRET=...`
  - `RESEND_API_KEY=<set-in-server-env>`
  - `RESEND_FROM_EMAIL=onboarding@resend.dev`
  - `RESEND_FROM_NAME=Paperclip`

当前逻辑：
- 如果存在 `RESEND_API_KEY`：注册 / 未验证登录会走 email OTP
- 如果不存在：回退旧版邮箱密码流程

#### C. 管理员账号已手工 bootstrap 成功
已可直接登录：
- 邮箱：`admin@myopc.me`
- 密码：`zsqzsq123`

账号已确认拥有 `instance_admin`。

#### D. bootstrap-ceo CLI 已修复
原问题：
- 服务器实例配置仍是旧格式，只包含：`server/database/auth/secrets/storage`
- 新版 CLI 读取时会报：
  - `Invalid config ...: $meta: Required; logging: Required`

本次已修：
- 在 `cli/src/config/store.ts` 增加 legacy config 兼容迁移
- 自动补齐：
  - `$meta`
  - `logging`
  - `telemetry`
  - embedded-postgres 默认路径
  - backup/log/storage/secrets 的运行时相对路径
- 新增测试：
  - `/Users/baihe/Documents/iopc/repos/paperclip/cli/src/__tests__/config-store.test.ts`

本地已验证：
- `pnpm vitest run cli/src/__tests__/config-store.test.ts` 通过

服务器已验证：
- `cd /root/iopc/repos/paperclip && pnpm paperclipai auth bootstrap-ceo --base-url https://myopc.me`
- 结果：不再报配置错误，而是正常进入业务逻辑；因为实例已有管理员，所以提示：
  - `Instance already has an admin user. Use --force to generate a new bootstrap invite.`

#### E. HTTPS 已配置完成
已完成：
- 安装 `certbot` + `python3-certbot-nginx`
- 为 `myopc.me`、`www.myopc.me` 申请 Let's Encrypt 证书
- nginx 已配置 443 证书
- 80 已跳转 443
- 证书路径：
  - `/etc/letsencrypt/live/myopc.me/fullchain.pem`
  - `/etc/letsencrypt/live/myopc.me/privkey.pem`
- 当前证书到期时间：`2026-08-15`
- certbot 自动续期 timer 已启用

### 8）当前仍需注意的点
1. `paperclip.service` 目前还是 `tsx src/index.ts` 源码模式，不是 `node dist/index.js`。
   - 好处：稳定，已经跑通。
   - 后续如果要省内存，再切编译产物模式。

2. `pnpm --filter paperclipai build` 在服务器上目前**不影响 CLI 使用**，但单独跑 build 仍可能因为服务器仓库根的 `esbuild` 安装层不完整而失败。
   - `pnpm paperclipai ...` 命令已经能正常用，因为走的是 `tsx cli/src/index.ts`。
   - 如果后续要补齐 dist build，可优先处理这个依赖层问题。

3. 服务器上的实例配置文件仍是“旧格式内容 + 运行时兼容读取”的状态：
   - `/root/.paperclip/instances/default/config.json`
   - 现在已经可用；不是阻塞项。
   - 如果后续想彻底升级配置格式，可以再用 CLI 配置流或者脚本落盘成新 schema。

### 9）建议的下一步优先级
按优先级建议继续做：
1. 用浏览器完整走一遍 `https://myopc.me/` 的注册 / 邮箱验证码 / 登录 / 退出流程
2. 再验证 Invite / board claim / admin 权限页流程
3. 视情况把 Paperclip 从 `tsx` 切到 `node dist/index.js`
4. 再考虑把 Paperclip 数据库从 embedded-postgres 切到系统 PostgreSQL
5. 再继续做二级域名分发功能

### 10）常用核查命令
```bash
ssh root@104.248.150.29

systemctl is-active paperclip nginx opencode uptime-kuma umami postgresql@16-main
ss -ltnp | egrep ':(80|443|3100|3001|3000|4096|5432)\\b'

curl -I http://myopc.me
curl -I https://myopc.me
curl -I https://www.myopc.me

cd /root/iopc/repos/paperclip
pnpm paperclipai auth bootstrap-ceo --base-url https://myopc.me
```

### 11）关键文件速查
本地：
- `/Users/baihe/Documents/iopc/repos/paperclip/cli/src/config/store.ts`
- `/Users/baihe/Documents/iopc/repos/paperclip/cli/src/__tests__/config-store.test.ts`
- `/Users/baihe/Documents/iopc/repos/paperclip/server/src/auth/better-auth.ts`
- `/Users/baihe/Documents/iopc/repos/paperclip/ui/src/pages/Auth.tsx`
- `/Users/baihe/Documents/iopc/repos/paperclip/ui/src/pages/InviteLanding.tsx`
- `/Users/baihe/Documents/iopc/repos/paperclip/ui/src/api/auth.ts`

服务器：
- `/root/.paperclip/instances/default/config.json`
- `/root/.paperclip/instances/default/.env`
- `/etc/systemd/system/paperclip.service`
- `/etc/nginx/sites-available/paperclip`
- `/etc/letsencrypt/live/myopc.me/fullchain.pem`
- `/etc/letsencrypt/live/myopc.me/privkey.pem`

### 12）执行风格要求
- 全程简体中文
- 不要 reset / checkout / revert / pull 覆盖本地改动
- 小步修改，优先验证
- 优先相信运行态，再回源码确认
- 先修阻塞，再做优化

如果你接下来继续操作，请先从“浏览器完整验证注册 / 登录 / 邮箱验证码链路”开始。
