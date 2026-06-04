# IOPC 开源集成架构 v0.2

> 一句话定位：**IOPC 是面向个体创业者的 AI 工作台——把「技能 → 产品 → 上线 → 收钱 → 运营 → 迭代」串成一人公司闭环。**

---

## 一、系统分层

```
┌──────────────────────────────────────────────────────────────┐
│                   双端产品层 (2 Surfaces)                     │
│                                                              │
│   ┌────────────────────┐    ┌──────────────────────────┐     │
│   │  Web 端 (SaaS)      │    │  Desktop App             │     │
│   │  Next.js SPA       │    │  Tauri + 同套 UI 代码     │     │
│   │  任意浏览器访问      │    │  本地服务器直连            │     │
│   └────────────────────┘    └──────────────────────────┘     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│                   IOPC 平台层 (Backend — TypeScript)          │
│                                                              │
│   Better Auth │ LiteLLM Proxy │ 通知 │ 计费 │ 文档 │ API GW  │
│   (用户/认证)    (AI API 统一)    (Novu)              │
├──────────────┬──────────────┬───────────────────────────────┤
│   管理中枢    │   执行引擎    │       基础设施               │
│  Paperclip   │ OpenCode    │  Traefik + Uptime Kuma       │
│  (TypeScript) │ (TypeScript)     │  (Go)    (Node.js)           │
│  AI员工/任务  │  代码/命令    │  网关/证书  监控              │
├──────────────┴──────────────┴───────────────────────────────┤
│                   服务器接入层                                 │
│            iopc-agent (Go, 一键安装 / 回连注册)               │
├──────────────────────────────────────────────────────────────┤
│                   数据与知识层                                 │
│   Milkdown(文档编辑) │ R2R/LlamaIndex(AI知识) │ Umami(分析)   │
├──────────────────────────────────────────────────────────────┤
│                   容器运行层                                   │
│          Docker Compose — 所有开源模块统一容器化部署            │
└──────────────────────────────────────────────────────────────┘
```

---

## 二、模块选型表

### 2.1 已确定核心依赖（8 项）

| 模块 | 选型 | 职责 | 语言 | 许可证 | 仓库 |
|------|------|------|------|--------|------|
| AI 管理中枢 | **Paperclip** | AI 员工/任务/审批/预算/Skill | Python | - | [paperclipai/paperclip](https://github.com/paperclipai/paperclip) |
| 开发执行器 | **OpenCode** | 代码修改/命令执行/开发推进 | Go/TS | - | [anomalyco/opencode](https://github.com/anomalyco/opencode) |
| 发布网关 | **Traefik** | 二级域名/HTTPS/路由 | Go | MIT | [traefik/traefik](https://github.com/traefik/traefik) |
| 监控 | **Uptime Kuma** | 站点/API/支付回调/在线状态 | Node.js | MIT | [louislam/uptime-kuma](https://github.com/louislam/uptime-kuma) |
| AI API 入口 | **LiteLLM** | 统一代理 OpenAI/Claude/本地模型 | Python | MIT | [BerriAI/litellm](https://github.com/BerriAI/litellm) |
| 用户系统 | **Better Auth** | 注册/登录/OAuth/Session/2FA | TypeScript | MIT | [better-auth/better-auth](https://github.com/better-auth/better-auth) |
| 数据分析 | **Umami** | 站点访问/转化分析，隐私友好 | Node.js/Next.js | MIT | [umami-software/umami](https://github.com/umami-software/umami) |
| 文档编辑器 | **Milkdown** | Markdown 所见即所得编辑器 | TypeScript | MIT | [Milkdown/milkdown](https://github.com/Milkdown/milkdown) |

> 注：当前 `Paperclip` 官方仓库 README 显示其主形态为 **Node.js server + React UI**；上表语言列先保留原架构草案写法，真正接入时请以仓库现状/API 为准。

### 2.2 建议 MVP 纳入模块

| 模块 | 候选选型 | 职责 | 许可证 | 仓库 | 选型理由 |
|------|----------|------|--------|------|----------|
| 文档/知识库-AI侧 | **R2R / LlamaIndex** | 项目知识/SOP/记忆/问答底座 | MIT | [SciPhi-AI/R2R](https://github.com/SciPhi-AI/R2R) / [run-llama/llama_index](https://github.com/run-llama/llama_index) | 结构化知识摄入 + RAG，直接供 Agent 调用 |
| 通知 | **Novu** | 多渠道通知（邮件/推送/Slack等）| MIT（core）+ Commercial（enterprise） | [novuhq/novu](https://github.com/novuhq/novu) | 统一通知工作流，MVP 仅用邮件通道 |

### 2.3 可后置增强模块

| 模块 | 候选选型 | 职责 | 许可证 | 仓库 | 后置理由 |
|------|----------|------|--------|------|----------|
| 文档/知识库-用户侧 | ~~Outline~~→**Milkdown** | Markdown 编辑器，IOPC 内嵌 | MIT | 历史方案：[outline/outline](https://github.com/outline/outline)；当前方案：[Milkdown/milkdown](https://github.com/Milkdown/milkdown) | 已升级为核心依赖，见 2.1 |
| 代码仓库 | Gitea | 自托管 Git | MIT | [go-gitea/gitea](https://github.com/go-gitea/gitea) | MVP 用户可直连 GitHub |
| 密钥管理 | Infisical | Secret 管理 | MIT | [Infisical/infisical](https://github.com/Infisical/infisical) | MVP 用 .env + 平台加密存储 |
| 商城/订单 | Medusa | 商品/购物车/支付 | MIT | [medusajs/medusa](https://github.com/medusajs/medusa) | 按 Skill 按需加载 |
| 内容后台 | Payload | CMS/内容管理 | MIT | [payloadcms/payload](https://github.com/payloadcms/payload) | 内容型产品需要，SaaS/工具型不需要 |
| 可视化编辑 | Puck | 拖拽页面编辑 | MIT | [puckeditor/puck](https://github.com/puckeditor/puck) | MVP 用模板替代 |
| 自动化流程 | Activepieces | 工作流自动化 | MIT | [activepieces/activepieces](https://github.com/activepieces/activepieces) | MVP 用 Skill+Agent 覆盖 |
| 客服 | Chatwoot | 多渠道客服 | MIT | [chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) | 用户量起来后再接入 |

### 2.4 建议先 clone 的仓库清单

> 目标：把“真正需要研究/对接/可能读源码”的仓库先分层列出来，避免把 npm 包和独立服务混在一起。

| 分组 | 建议 | 仓库 |
|------|------|------|
| **P0：现在就 clone（MVP 直接依赖）** | 先把直接影响 MVP 闭环的服务和中枢都拉下来 | [paperclipai/paperclip](https://github.com/paperclipai/paperclip)、[anomalyco/opencode](https://github.com/anomalyco/opencode)、[BerriAI/litellm](https://github.com/BerriAI/litellm)、[better-auth/better-auth](https://github.com/better-auth/better-auth)、[umami-software/umami](https://github.com/umami-software/umami)、[Milkdown/milkdown](https://github.com/Milkdown/milkdown)、[traefik/traefik](https://github.com/traefik/traefik)、[louislam/uptime-kuma](https://github.com/louislam/uptime-kuma)、[SciPhi-AI/R2R](https://github.com/SciPhi-AI/R2R)、[novuhq/novu](https://github.com/novuhq/novu) |
| **P0-备选：同阶段需要做技术比较** | 目前文档把它写成候选，不一定全部落地，但最好一起备查 | [run-llama/llama_index](https://github.com/run-llama/llama_index) |
| **P1：开发底座（通常按包安装，需深读源码时再 clone）** | 框架本身多数不需要 fork，但遇到深度调试/二开时很有价值 | [honojs/hono](https://github.com/honojs/hono)、[expressjs/express](https://github.com/expressjs/express)、[vercel/next.js](https://github.com/vercel/next.js)、[facebook/react](https://github.com/facebook/react)、[tauri-apps/tauri](https://github.com/tauri-apps/tauri)、[drizzle-team/drizzle-orm](https://github.com/drizzle-team/drizzle-orm)、[pnpm/pnpm](https://github.com/pnpm/pnpm)、[vercel/turborepo](https://github.com/vercel/turborepo) |
| **P2：后置增强（先登记仓库，不急着 clone）** | 等 MVP 跑通再看是否要接入 | [go-gitea/gitea](https://github.com/go-gitea/gitea)、[Infisical/infisical](https://github.com/Infisical/infisical)、[medusajs/medusa](https://github.com/medusajs/medusa)、[payloadcms/payload](https://github.com/payloadcms/payload)、[puckeditor/puck](https://github.com/puckeditor/puck)、[activepieces/activepieces](https://github.com/activepieces/activepieces)、[chatwoot/chatwoot](https://github.com/chatwoot/chatwoot) |

---

## 三、技术栈决策：为什么选 TypeScript 全栈

### 3.1 问题：7 个确认模块，语言各异

| 项目 | 语言 | 暴露的集成接口 |
|------|------|---------------|
| Paperclip | Python | REST API |
| OpenCode | Go/TS | CLI + API |
| Traefik | Go | REST API + Docker Provider |
| Uptime Kuma | Node.js | REST API + WebSocket |
| LiteLLM | Python | REST API (OpenAI 兼容) |
| Better Auth | **TypeScript** | **原生 TS SDK** |
| Umami | **TypeScript/Next.js** | REST API |

**关键事实：这些项目不需要语言统一——它们都是独立服务，通过 API 通信。IOPC 平台本身是「胶水层」，语言选择只影响胶水层，不影响被集成的项目。**

### 3.2 决策：TypeScript 全栈

```
IOPC 平台技术栈
├── Backend    → Hono / Express (TypeScript)
├── Frontend   → Next.js + React (TypeScript)
├── Desktop    → Tauri (Rust shell) + 同套 Web UI
├── Agent      → Go（轻量守护进程，交叉编译方便）
├── Database   → PostgreSQL + Drizzle ORM
└── 包管理      → pnpm monorepo (Turborepo)
```

**理由：**

1. **Better Auth 是 TS 原生** — 用户系统是平台根基，原生集成零摩擦
2. **Umami 是 Next.js** — 前端 SDK / 嵌入组件直接复用
3. **前后端共享类型** — API Schema、Skill 定义、Agent 配置一处定义，前后端同步
4. **Desktop 用 Tauri 打包同一套 Web UI** — 不写两套界面，5MB vs Electron 150MB
5. **Paperclip/LiteLLM 的 Python 生态** — 不需要我们写 Python，只调 API
6. **社区与招聘** — TS 全栈是最多人能上手的组合

### 3.3 统一集成策略：API 网关 + Adapter 模式

不是把所有项目代码拉进来改，而是：

```
                    IOPC Backend (TS)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    Adapter 模式    API Gateway     Event Bus
          │              │              │
          ▼              ▼              ▼
  ┌─────────────────────────────────────────┐
  │    每个 Adapter 统一封装：                │
  │    - 标准化 CRUD 接口                    │
  │    - 统一错误处理                        │
  │    - 统一认证（注入 Better Auth token）   │
  │    - 统一日志/追踪                       │
  └─────────────────────────────────────────┤
          │
   ┌──────┼──────┬──────────┬──────────┐
   ▼      ▼      ▼          ▼          ▼
Paperclip LiteLLM Traefik  Kuma     Umami
  (API)   (API)  (API)    (WS/API)  (API)
```

**每个开源模块一个 Adapter：**
- `packages/adapter-paperclip` — 封装 Paperclip REST API
- `packages/adapter-litellm` — 封装 LiteLLM REST API (OpenAI 兼容格式)
- `packages/adapter-traefik` — 封装 Traefik REST API / Docker Provider
- `packages/adapter-uptime-kuma` — 封装 Kuma API + WebSocket 事件
- `packages/adapter-umami` — 封装 Umami 统计 API
- `packages/adapter-novu` — 封装 Novu API

**统一认证链路：**
```
用户登录 → Better Auth 签发 JWT
  → IOPC Backend 注入 token
    → 各 Adapter 将 token 转换为目标模块的认证方式
      (Paperclip API Key / LiteLLM Virtual Key / Kuma Token / ...)
```

### 3.4 Monorepo 结构

```
iopc/
├── apps/
│   ├── web/              → Next.js SaaS 前端（Web 端）
│   ├── desktop/          → Tauri 应用（桌面端），引用 web/ 的 UI
│   └── server/           → Hono/Express 后端 API
│
├── packages/
│   ├── adapter-paperclip/
│   ├── adapter-litellm/
│   ├── adapter-traefik/
│   ├── adapter-uptime-kuma/
│   ├── adapter-umami/
│   ├── adapter-novu/
│   ├── adapter-r2r/
│   │
│   ├── core/             → 共享类型定义、Skill Schema、Agent 配置
│   ├── auth/             → Better Auth 配置 + 插件
│   ├── ui/               → 共享 React 组件库（含 Milkdown 编辑器封装）
│   └── db/               → Drizzle ORM schema + 迁移
│
├── agent/                → iopc-agent (Go, 独立仓库或子目录)
│
├── docker/               → Docker Compose 全栈编排
│   ├── docker-compose.yml        → 开发环境（所有服务）
│   ├── docker-compose.prod.yml  → 生产环境
│   └── .env.example
│
├── skills/               → Skill 定义文件（YAML/JSON）
│   ├── l1-deploy-static.yaml
│   ├── l2-launch-product.yaml
│   └── l3-dev-engineer.yaml
│
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## 四、双端产品策略

### 4.1 Web 端（外部端 / SaaS）

```
定位：随时随地访问的云端工作台
├── 用户场景
│   ├── 在咖啡厅查看项目状态
│   ├── 在手机上审批 Agent 任务
│   ├── 从任何设备接入 AI 员工
│   └── 团队协作者远程访问
│
├── 技术实现
│   ├── Next.js SPA，部署在 IOPC 云端
│   ├── 通过 IOPC Backend API 通信
│   ├── Backend 转发到用户服务器的 iopc-agent
│   └── Better Auth SSO 贯穿全链路
│
└── 与桌面端的差异
    ├── 数据存储在云端
    ├── 不直连本地服务器
    └── 需要经过平台 API 中转
```

### 4.2 Desktop App（电脑端 / Tauri）

```
定位：深度操作的本地工作台
├── 用户场景
│   ├── 本地开发、看日志、调配置
│   ├── 直连 iopc-agent（局域网/本机）
│   ├── 不依赖云端的离线操作
│   └── 更强的文件系统 / 终端访问
│
├── 技术实现
│   ├── Tauri 2.0（Rust shell + Webview）
│   ├── UI 代码与 Web 端完全共享（同一套 React 组件）
│   ├── Tauri Rust 侧负责：
│   │   ├── 本地 iopc-agent 进程管理
│   │   ├── 文件系统访问（代码编辑）
│   │   ├── 本地 Docker 管理
│   │   └── 系统托盘 / 原生通知
│   └── 可选模式：
│       ├── 纯本地模式（无云端，直连 agent）
│       └── 混合模式（同时连云端 + 本地 agent）
│
└── 与 Web 端的差异
    ├── 直连本地 agent，低延迟
    ├── 可操作文件系统和进程
    ├── 系统托盘常驻
    └── 支持离线/弱网场景
```

### 4.3 代码共享策略

```
packages/ui/          → 100% 共享：所有 React 组件
packages/core/        → 100% 共享：类型、Skill Schema
packages/auth/        → 100% 共享：认证逻辑
packages/adapter-*/   → 100% 共享：API 封装

apps/web/             → 仅 Web 端特有：
                        ├── SEO/SSR 页面
                        ├── Landing Page
                        └── 公开文档中心

apps/desktop/         → 仅桌面端特有：
                        ├── Tauri Rust 侧代码
                        │   ├── agent 进程管理
                        │   ├── 文件系统桥接
                        │   └── 系统托盘
                        └── 本地模式 UI 开关

apps/server/          → 仅服务端特有：
                        ├── API 路由
                        ├── Webhook 接收
                        └── 定时任务
```

---

## 五、文档/知识库双层方案

### 5.1 面向用户 — 文档中心 / 帮助中心

**选型：Milkdown**（Markdown 编辑器）+ IOPC 自建文档管理（PostgreSQL 存储）

```
用户文档中心
├── 文档列表（IOPC 自绘：树形目录 + 搜索）
│   ├── 帮助中心
│   │   ├── 快速入门教程
│   │   ├── Skill 使用文档
│   │   ├── 常见问题 FAQ
│   │   └── 最佳实践指南
│   ├── 项目文档（按项目隔离）
│   │   ├── 架构决策记录 (ADR)
│   │   ├── API 文档
│   │   └── 运维手册
│   └── 模板文档库
│       ├── 商业计划书模板
│       ├── 定价策略模板
│       └── 各行业 Launch Checklist
│
└── 文档编辑器（Milkdown 嵌入，IOPC 主题）
    ├── 所见即所得 Markdown 编辑
    ├── IOPC 专属插件：
    │   ├── /skill 引用 — 在文档中嵌入 Skill 操作按钮
    │   ├── /agent 对话 — 在文档中唤起 AI 员工问答
    │   ├── /chart 嵌入 — 插入 Umami 数据图表
    │   ├── /sop 引用 — 关联 SOP 条目
    │   └── /template — 从模板插入内容
    ├── 自动保存 → PostgreSQL + 版本历史
    └── 保存时自动同步到 R2R 知识索引
```

**为什么用 Milkdown 而不是 Outline：**

| | Outline | Milkdown |
|---|---|---|
| 本质 | 独立 Wiki 服务（需独立部署） | 编辑器组件（npm 包，嵌入 IOPC） |
| UI 一致性 | 需 iframe 或注入主题，拼盘感 | 原生 React 组件，100% 融入 IOPC Design Kit |
| 部署 | 额外 Docker 容器 + Redis + PostgreSQL | 零额外部署，用 IOPC 自己的 PostgreSQL |
| 定制 | 改 Outline 代码或靠 API | 插件体系，写 IOPC 专属 slash command |
| 许可 | BSL 1.1（限制商业竞争） | MIT |
| 数据 | 文档存在 Outline 的库里 | 文档存在 IOPC 的库里，天然与 R2R 同步 |
| AI 集成 | 需 API 调用，割裂 | 编辑器内直接 /agent 对话，体验无缝 |

**核心收益：知识库 100% 自绘，零 iframe，零外部 UI，零额外服务。**

### 5.2 面向 AI 员工 — 项目知识库 / SOP / 记忆

**选型：R2R / LlamaIndex（结构化知识底座）+ Paperclip Memory（运行时记忆）**

```
AI 知识层
├── 项目知识库（R2R / LlamaIndex）
│   ├── 代码仓库索引（函数/接口/依赖图）
│   ├── 业务规则库（定价/限额/合规约束）
│   ├── 历史决策记录（ADR）
│   └── 外部文档摄入（竞品分析/市场报告）
├── SOP 库（结构化流程）
│   ├── 部署 SOP（创建项目→配置→发布→验证）
│   ├── 应急 SOP（告警→诊断→修复→复盘）
│   ├── 运营 SOP（内容发布→监测→优化）
│   └── 财务 SOP（开票→对账→提现）
├── Agent 记忆（Paperclip Memory）
│   ├── 短期：当前任务上下文
│   ├── 中期：项目偏好/风格/约束
│   └── 长期：跨项目经验沉淀
└── 问答底座（RAG）
    ├── 自然语言查询项目知识
    ├── Agent 自助检索 SOP
    └── 用户向 AI 员工提问的检索后端
```

**关键设计：**
- 知识摄入入口：用户上传 / Git 仓库同步 / Agent 运行产出自动归档 / 网页剪藏 / Milkdown 编辑保存
- 知识更新触发：Milkdown 文档保存 → 自动同步到 R2R 索引；代码变更 → 自动重建索引
- 双向打通：Milkdown 文档即知识源，保存时自动进入 R2R；R2R 检索结果可在 Milkdown 中 /agent 对话引用

---

## 六、Skill → Agent → 执行器映射

### 6.1 Skill 分层

```
Skill（用户可调用能力）
├── L1 原子 Skill — 单一动作，映射到单一 Adapter 调用
│   ├── deploy-static    → adapter-traefik + 文件部署
│   ├── run-migration    → adapter-paperclip → OpenCode: 执行迁移
│   ├── create-landing   → adapter-paperclip → OpenCode: 生成落地页
│   ├── check-uptime     → adapter-uptime-kuma: 查询状态
│   ├── query-analytics  → adapter-umami: 查询访问数据
│   └── call-llm         → adapter-litellm: 统一 LLM 调用
│
├── L2 复合 Skill — 编排多步骤，映射到 Agent 工作流
│   ├── launch-product   → 创建仓库→写代码→部署→配监控→发通知
│   ├── fix-incident     → 告警接收→诊断→修复→验证→复盘
│   ├── content-publish  → 生成内容→审校→发布→推送→追踪数据
│   └── onboard-customer → 注册→欢迎邮件→引导→首单追踪
│
└── L3 角色 Skill — 持续性职责，映射到常驻 Agent
    ├── dev-engineer      → 持续开发、PR、代码审查
    ├── ops-sre           → 持续监控、部署、应急响应
    ├── growth-marketer   → 持续内容、SEO、数据分析
    └── support-agent     → 持续客服、工单、反馈汇总
```

### 6.2 Agent 分工

| Agent | 对应角色 Skill | 调用的 Adapter | 知识依赖 |
|-------|---------------|---------------|----------|
| **Dev Agent** | dev-engineer | paperclip, litellm, traefik | 代码库索引, 部署 SOP |
| **Ops Agent** | ops-sre | traefik, uptime-kuma, paperclip | 应急 SOP, 基础设施知识 |
| **Content Agent** | growth-marketer | milkdown(写), umami(读), novu(发) | 品牌 SOP, 内容模板 |
| **Support Agent** | support-agent | milkdown(检索), r2r(RAG), novu | 产品文档, FAQ |
| **Biz Agent** | onboard-customer | novu, umami(读), litellm | 商业 SOP, 定价知识 |

### 6.3 执行链路

```
用户在工作台触发 Skill
        │
        ▼
   IOPC Backend — Skill Router
        │
        ▼
   Paperclip — 选择 Agent → 分配任务 → 审批流
        │
        ▼
   Agent 执行 — 查询知识库(R2R) → 编排步骤 → 调用 Adapter
        │
   ┌────┼────┬────┬────┐
   ▼    ▼    ▼    ▼    ▼
  Open  Lite  Tra  Kuma Umami
  Code  LLM   efik
  (代码) (AI)  (路由) (监控) (分析)
        │
        ▼
   结果回写 Paperclip → 通知用户（Novu）→ 知识库更新（R2R）
```

---

## 七、第一版页面结构

```
IOPC 工作台（Web + Desktop 共享 UI）
├── 仪表盘（Dashboard）
│   ├── 核心指标：收入/用户/部署数/告警
│   ├── 活跃任务（Agent 执行中）
│   └── 待审批项（Paperclip 审批队列）
│
├── 项目（Projects）
│   ├── 项目列表（卡片/列表视图）
│   ├── 项目详情
│   │   ├── 概览（状态/域名/部署历史）
│   │   ├── 代码（关联仓库/最近变更）
│   │   ├── 部署（Traefik 路由配置/环境变量）
│   │   └── 监控（Uptime Kuma 嵌入面板）
│   └── 新建项目 → Launch Skill 向导
│
├── 员工（AI Employees）
│   ├── 员工列表（角色/状态/当前任务）
│   ├── 员工详情
│   │   ├── 配置（模型/权限/预算上限 → LiteLLM Virtual Key）
│   │   ├── 任务历史
│   │   └── 记忆（知识库检索/偏好设置）
│   └── 招聘员工 → 角色 Skill 选择
│
├── Skills
│   ├── Skill 商店（浏览/安装）
│   ├── 已安装 Skill（启用/禁用/配置）
│   └── Skill 详情（描述/步骤/所需模块/权限）
│
├── 文档（Knowledge）
│   ├── 文档列表（树形目录 + 搜索，IOPC 自绘）
│   ├── 文档编辑（Milkdown 编辑器，IOPC 内嵌）
│   ├── 模板库（分类浏览/使用）
│   └── 项目知识库（按项目切换/搜索）
│
├── 数据（Analytics）         ← 新增
│   ├── 访问概览（Umami 嵌入）
│   ├── 页面排名
│   └── 转化漏斗
│
├── 收入（Revenue）— 后置
│   ├── 订单/支付概览
│   └── 提现/对账
│
└── 设置（Settings）
    ├── 服务器管理（iopc-agent 连接状态）
    ├── AI 模型配置（LiteLLM provider/key/配额）
    ├── 通知偏好（Novu 通道配置）
    └── 账户与团队（Better Auth 用户管理）

Desktop 端额外页面：
├── 本地服务器（Local Server）
│   ├── Docker 容器管理
│   ├── 实时日志
│   └── 文件浏览器
└── 系统托盘
    ├── 服务器在线状态
    ├── 未读告警数
    └── 快捷操作（一键部署/一键回滚）
```

---

## 八、MVP 路线图

### Phase 0 — 基础骨架（2-3 周）

**目标：能跑通最小链路 + 双端框架**

- [ ] Monorepo 搭建：pnpm + Turborepo
- [ ] IOPC Backend 脚手架：Hono + Better Auth + Drizzle + PostgreSQL
- [ ] Web 前端脚手架：Next.js + 基础布局 + 登录页
- [ ] Desktop 脚手架：Tauri 2.0 + 加载同套 Web UI + 系统托盘
- [ ] Docker Compose 开发环境：PostgreSQL + Redis + LiteLLM
- [ ] Paperclip 集成：AI 员工创建/任务下发/状态回显
- [ ] iopc-agent：Go 守护进程，一键安装脚本，回连注册

### Phase 1 — 核心闭环（3-4 周）

**目标：从创建项目到部署上线的完整流程**

- [ ] LiteLLM 集成：统一 AI API 代理 + Virtual Key + 用量追踪
- [ ] Traefik 集成：iopc-agent 部署 Traefik，平台配置路由
- [ ] Uptime Kuma 集成：部署后自动创建监控探针
- [ ] Umami 集成：项目自动绑定分析，仪表盘嵌入
- [ ] 项目 CRUD + Launch Skill 向导
- [ ] L1 原子 Skill 实现（deploy-static, check-uptime, run-migration, call-llm, query-analytics）
- [ ] Dev Agent + Ops Agent 基础实现
- [ ] Novu 集成：任务完成/告警/审批 邮件通知
- [ ] 仪表盘：核心指标 + 活跃任务 + 待审批

### Phase 2 — 知识与体验（3-4 周）

**目标：AI 有记忆、用户有文档、Skill 可编排**

- [ ] Milkdown 集成：文档编辑器嵌入 + IOPC 主题 + 自定义 slash commands
- [ ] 文档管理模块：树形目录/搜索/版本历史（PostgreSQL 存储）
- [ ] R2R / LlamaIndex 集成：项目知识库 + RAG 问答
- [ ] Milkdown ↔ R2R 双向同步：文档保存自动入索引
- [ ] 模板文档库：首批 10 个行业模板
- [ ] L2 复合 Skill 实现（launch-product, fix-incident）
- [ ] Agent 记忆层：短期/中期记忆持久化
- [ ] Desktop 深度功能：本地日志/文件浏览/容器管理

### Phase 3 — 增长引擎（3-4 周）

**目标：能收钱、能增长、能迭代**

- [ ] Medusa 集成（按需）：商品/订单/支付
- [ ] L3 角色 Skill 实现（growth-marketer, support-agent）
- [ ] Content Agent + Biz Agent 实现
- [ ] 收入面板
- [ ] Skill 商店：第三方 Skill 安装机制

### Phase 4 — 增强模块（持续）

**目标：按用户反馈按需加载**

- [ ] Gitea 集成（需要自托管仓库的用户）
- [ ] Infisical 集成（规模化密钥管理）
- [ ] Payload 集成（内容型产品用户）
- [ ] Puck 集成（拖拽建站用户）
- [ ] Activepieces 集成（复杂自动化用户）
- [ ] Chatwoot 集成（客服需求用户）

---

## 九、iopc-agent 设计要点

```
用户服务器
├── iopc-agent（Go 守护进程，~10MB 单二进制）
│   ├── 自动安装 Docker + Docker Compose（如未安装）
│   ├── 自动部署 Traefik + Uptime Kuma + LiteLLM（Docker Compose）
│   ├── 回连 IOPC 平台（WebSocket / gRPC）
│   ├── 上报：CPU/内存/磁盘/容器状态
│   ├── 接收：部署指令/路由配置/证书申请
│   └── 执行：OpenCode 远程调用（受限 shell）
│
├── Traefik（自动容器）
│   └── 动态配置：IOPC 平台下发路由规则
│
├── Uptime Kuma（自动容器）
│   └── 探针配置：IOPC 平台下发监控规则
│
└── LiteLLM（自动容器）
    └── 配置同步：IOPC 平台下发 provider/key
```

- Go 写 agent：交叉编译单二进制，无运行时依赖，curl | bash 一键安装
- 不存 SSH 私钥在平台侧
- 所有操作通过 agent 回连通道执行
- agent 负责本地 Docker 管理、证书续期
- 断线自动重连，平台侧显示离线告警

---

## 十、关键架构决策记录

| # | 决策 | 理由 |
|---|------|------|
| ADR-001 | 用户前台是工作台，不是终端/聊天框 | 个体创业者需要结构化视图，不是 REPL |
| ADR-002 | 服务器接入用 iopc-agent 回连 | 不存 SSH 私钥，安全且体验好 |
| ADR-003 | 知识库拆用户侧+AI侧两层 | 用户需要可读文档，AI 需要可检索知识，诉求不同 |
| ADR-004 | 优先 MIT 许可项目 | 降低法务风险，社区友好 |
| ADR-005 | Skill 三层分级（原子/复合/角色） | 复用性从底向上递增，编排复杂度可控 |
| ADR-006 | LiteLLM 做 AI API 统一入口 | 多模型 fallback + 成本追踪是 MVP 硬需求 |
| ADR-007 | **文档编辑用 Milkdown 不用 Outline** | 编辑器组件 vs 独立服务：Milkdown 是 npm 包嵌入 IOPC，零 iframe、零额外部署、MIT 许可、插件可写 slash command 直连 Agent |
| ADR-008 | AI 知识库选 R2R/LlamaIndex | 结构化摄入 + RAG + Agent 原生调用 |
| ADR-009 | **IOPC 平台用 TypeScript 全栈** | Better Auth TS 原生、前后端共享类型、Tauri 复用 UI |
| ADR-010 | **Desktop 用 Tauri 不用 Electron** | 5MB vs 150MB、Rust 侧做系统桥接、同套 UI 代码 |
| ADR-011 | **iopc-agent 用 Go** | 单二进制交叉编译、无运行时依赖、一键安装 |
| ADR-012 | **Adapter 模式统一集成** | 不 fork 不 embed，每个开源模块一个 Adapter 封装 API |
| ADR-013 | **Umami 确认纳入核心** | 隐私友好分析是闭环必需：产品上线→看数据→迭代 |
| ADR-014 | **LiteLLM 确认纳入核心** | 统一 AI 入口是 Agent 体系的前提条件 |
| ADR-015 | **Better Auth 确认纳入核心** | 用户系统是平台根基，SSO 打通所有子模块 |
