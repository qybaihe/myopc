# IOPC 页面布局方案 v0.1

## 仓库摸底结论（关键修正）

**Paperclip 是 TypeScript，不是 Python。** 它已经用了 Better Auth + Drizzle ORM + Express + pnpm workspace + React UI。这意味着：
- 认证层：Paperclip 和 IOPC 可以共享同一个 Better Auth 实例
- 数据层：Paperclip 的 Drizzle schema 可以直接在 IOPC 中引用或迁移
- Adapter 层：Paperclip 已有 adapter-opencode-local、adapter-claude-local 等，IOPC 的 adapter-paperclip 本质上是对 Paperclip API 的二次封装
- UI 组件：Paperclip UI 有大量可复用的 React 组件（AgentDetail、Approvals、Dashboard 等）

**OpenCode 也是 TypeScript，有 HTTP API + WebSocket + CLI。** Paperclip 已经有 adapter-opencode-local 直接对接它。IOPC 不需要直接调 OpenCode，走 Paperclip 间接调用即可。

---

## 全局布局骨架

```
┌────────────────────────────────────────────────────────────────────┐
│  顶栏 (64px)                                                        │
│  [Logo] [导航tabs]                                   [🔔] [👤 头像] │
├──────────┬─────────────────────────────────────────────────────────┤
│          │                                                          │
│  侧边栏  │              主内容区                                     │
│  (240px) │                                                          │
│          │  ┌─────────────────────────────────────────────────────┐ │
│  按页面  │  │  页面头部: 标题 + 操作按钮                             │ │
│  动态变  │  ├─────────────────────────────────────────────────────┤ │
│          │  │                                                     │ │
│          │  │  页面主体: 卡片/列表/编辑器/图表                       │ │
│          │  │                                                     │ │
│          │  │                                                     │ │
│          │  └─────────────────────────────────────────────────────┘ │
│          │                                                          │
├──────────┴─────────────────────────────────────────────────────────┤
│  底栏 (可选, 32px) — 快捷状态: 服务器在线数 / Agent运行数 / 未读告警   │
└────────────────────────────────────────────────────────────────────┘
```

### 布局规则

1. **顶栏永远固定**，包含全局导航 + 全局操作（通知/用户菜单）
2. **侧边栏按页面动态变化**，不同页面显示不同的子导航/筛选器
3. **主内容区**是唯一大面积变化的区域
4. **底栏可选**，Desktop 端显示系统托盘状态的等价信息

---

## 逐页布局 + 仓库映射

### 1. 仪表盘 (Dashboard)

```
侧边栏: 无（或折叠的快捷入口）
主内容区:
┌──────────────────────────────────────────────────────┐
│  仪表盘                                    [刷新]    │
├──────────┬──────────┬──────────┬─────────────────────┤
│ 指标卡1  │ 指标卡2  │ 指标卡3  │ 指标卡4             │
│ 收入     │ 访客     │ 部署数   │ 活跃员工            │
│ ¥12,480  │ 2,847    │ 5        │ 3                   │
├──────────┴──────────┴──────────┴─────────────────────┤
│                                                       │
│  ┌─────────────────────┐  ┌────────────────────────┐ │
│  │ 活跃任务 (2/3 宽)   │  │ 待审批 (1/3 宽)        │ │
│  │                     │  │                        │ │
│  │ 任务列表 + 进度条   │  │ 审批卡片 + 操作按钮   │ │
│  │                     │  │                        │ │
│  └─────────────────────┘  └────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │ 服务器状态 (全宽)                                │ │
│  │ ServerCard × N                                   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 | IOPC 实现 |
|------|----------|----------|-----------|
| 指标卡-收入/访客 | **Umami** `src/app/api/websites/` | REST GET /api/websites/{id}/stats | IOPC MetricCard 组件 |
| 指标卡-部署数 | **Paperclip** `server/src/routes/projects.ts` | REST GET /api/projects | IOPC MetricCard |
| 指标卡-活跃员工 | **Paperclip** `server/src/routes/agents.ts` | REST GET /api/agents?status=active | IOPC MetricCard |
| 活跃任务 | **Paperclip** `server/src/routes/issues.ts` | REST GET /api/issues?status=in_progress | Paperclip 的 Issues/MyIssues 组件可参考 |
| 待审批 | **Paperclip** `server/src/routes/approvals.ts` | REST GET /api/approvals?status=pending | Paperclip 的 Approvals 组件可参考 |
| 服务器状态 | **iopc-agent** | WebSocket 心跳上报 | IOPC ServerCard 组件 |

---

### 2. 项目 (Projects)

```
侧边栏:
┌──────────────┐
│ 🔍 搜索项目   │
│              │
│ 📁 全部项目   │
│ 📁 SaaS      │
│ 📁 电商      │
│ 📁 内容站    │
│              │
│ [+ 新建项目] │
└──────────────┘

主内容区 - 列表视图:
┌──────────────────────────────────────────────────────────┐
│  项目                              [卡片│列表] [+ 新建] │
├──────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ 项目卡片1  │  │ 项目卡片2  │  │ 项目卡片3  │        │
│  │ 状态+域名  │  │ 状态+域名  │  │ 状态+域名  │        │
│  │ 访客+可用性│  │ 访客+可用性│  │ 访客+可用性│        │
│  │ 驻守员工   │  │ 驻守员工   │  │ 驻守员工   │        │
│  └────────────┘  └────────────┘  └────────────┘        │
└──────────────────────────────────────────────────────────┘

主内容区 - 详情视图:
┌──────────────────────────────────────────────────────────┐
│  ← 返回  my-saas-app  🟢在线          [部署] [设置]     │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  概览    │  部署    │  监控    │  分析    │  员工        │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│  (Tab 内容)                                              │
└──────────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 |
|------|----------|----------|
| 项目列表 | **Paperclip** `/api/projects` | REST |
| 项目卡片-状态 | **Uptime Kuma** `server/routers/api-router.js` | REST GET /api/monitor/{id} |
| 项目卡片-访客 | **Umami** `/api/websites/{id}/stats` | REST |
| 项目卡片-域名 | **Traefik** REST API | GET /api/http/routers |
| 概览Tab-域名路由 | **Traefik** | REST GET /api/http/routers?search=domain |
| 部署Tab-环境变量/历史 | **Paperclip** `/api/projects/{id}` + **iopc-agent** | REST + WS |
| 监控Tab-响应时间/可用率 | **Uptime Kuma** | REST + WS 推送 beat |
| 分析Tab-访问/转化 | **Umami** `/api/websites/{id}/{type}` | REST |
| 员工Tab-驻守Agent | **Paperclip** `/api/agents?projectId={id}` | REST |

**Paperclip UI 可复用组件：**
- `ui/src/pages/Projects.tsx` → 项目列表布局参考
- `ui/src/pages/ProjectDetail.tsx` → 详情页 Tab 布局参考

---

### 3. 员工 (AI Employees)

```
侧边栏:
┌──────────────┐
│ 🔍 搜索员工   │
│              │
│ 📁 全部      │
│ 🟢 运行中    │
│ 🟡 处理中    │
│ ⚪ 已暂停    │
│              │
│ [+ 招聘员工] │
└──────────────┘

主内容区 - 列表:
┌──────────────────────────────────────────────────────────┐
│  员工                                          [+ 招聘] │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │ Dev Agent  🟢 运行中  │  当前: 重构支付模块 80%  │   │
│  │ Claude Sonnet       │  本月 ¥340/¥500            │   │
│  │ [详情] [暂停] [对话]                              │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Ops Agent  🟡 处理中  │  当前: 延迟诊断 40%     │   │
│  │ Claude Haiku        │  本月 ¥45/¥200             │   │
│  │ [详情] [暂停] [对话]                              │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

主内容区 - 详情:
┌──────────────────────────────────────────────────────────┐
│  ← 返回  Dev Agent  🟢 运行中                           │
├──────────┬──────────┬──────────┬──────────┬──────────────┤
│  配置    │  任务    │  对话    │  记忆    │  预算        │
├──────────┴──────────┴──────────┴──────────┴──────────────┤
│  (Tab 内容)                                              │
└──────────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 |
|------|----------|----------|
| 员工列表 | **Paperclip** `/api/agents` | REST |
| 员工详情-配置 | **Paperclip** `/api/agents/{id}` | REST |
| 员工详情-配置/模型 | **LiteLLM** `litellm/proxy/` | REST GET /model/info |
| 员工详情-任务 | **Paperclip** `/api/issues?agentId={id}` | REST |
| 员工详情-对话 | **Paperclip** `/api/issues/{id}/chat` | REST + WS |
| 员工详情-预算 | **LiteLLM** `proxy/analytics_endpoints/` | REST GET /spend/keys |
| 员工详情-记忆 | **Paperclip** + **R2R**(后置) | REST |

**Paperclip UI 可复用组件：**
- `ui/src/pages/Agents.tsx` → 员工列表参考
- `ui/src/pages/AgentDetail.tsx` → 员工详情+Tab 参考
- `ui/src/pages/NewAgent.tsx` → 招聘向导参考

---

### 4. Skills

```
侧边栏:
┌──────────────┐
│ 🔍 搜索 Skill │
│              │
│ 🏪 商店      │
│ 📦 已安装    │
│              │
│ L1 原子      │
│ L2 复合      │
│ L3 角色      │
└──────────────┘

主内容区 - 商店:
┌──────────────────────────────────────────────────────────┐
│  Skill 商店                          筛选: L1│L2│L3     │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐                 │
│  │ 🤖 dev-engineer │  │ 🚀 launch-product│                │
│  │ L3 角色Skill   │  │ L2 复合Skill    │                 │
│  │ 持续开发...     │  │ 从0到上线...    │                 │
│  │ 需要: LiteLLM.. │  │ 需要: Traefik.. │                 │
│  │ [安装] 128人用  │  │ [安装] 256人用  │                 │
│  └────────────────┘  └────────────────┘                 │
└──────────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 |
|------|----------|----------|
| Skill 商店 | **Paperclip** `/api/company-skills` | REST |
| Skill 安装状态检测 | 各 Adapter health check | REST |
| Skill 安装向导 | **Paperclip** `/api/company-skills/{id}/install` | REST POST |

**Paperclip UI 可复用组件：**
- `ui/src/pages/CompanySkills.tsx` → Skill 商店参考
- `ui/src/pages/PluginManager.tsx` → 插件管理参考

---

### 5. 知识 (Knowledge)

```
侧边栏:
┌──────────────┐
│ 🔍 搜索文档   │
│              │
│ 📁 文档      │
│  ├ 帮助中心  │
│  ├ 项目文档  │
│  └ SOP       │
│ 📂 知识库    │
│ 📋 模板库    │
│              │
│ [+ 新建文档] │
└──────────────┘

主内容区 - 文档编辑 (左右分栏):
┌──────────────────────────────────────────────────────────┐
│  知识                                     [文档│知识库│模板]│
├───────────────┬──────────────────────────────────────────┤
│ 文档树 (200px)│  Milkdown 编辑区                         │
│               │                                          │
│ 📁 帮助中心   │  # 支付模块集成方案                       │
│  ├ 快速入门   │                                          │
│  ├ 安装Agent  │  我们使用 Stripe API...                  │
│  └ 招聘员工   │                                          │
│ 📁 项目文档   │  > /agent 支付模块的 webhook...         │
│  ├ my-saas   │                                          │
│  └ blog      │  ── AI 员工回复 ──────────────           │
│ 📁 SOP       │  Dev Agent: webhook端需要...             │
│  ├ 部署      │  [采纳] [追问]                           │
│  └ 应急      │                                          │
│               │                                          │
└───────────────┴──────────────────────────────────────────┘

主内容区 - 知识库 (RAG 搜索):
┌──────────────────────────────────────────────────────────┐
│  项目知识库                    📂 [my-saas-app ▼]        │
├──────────────────────────────────────────────────────────┤
│  🔍 用自然语言提问...                                    │
│                                                          │
│  📄 最近知识条目                                         │
│  Stripe 集成方案        🤖 Dev Agent   2h前              │
│  数据库迁移规范         🤖 Dev Agent   1d前              │
│  应急响应 SOP           👤 手动添加     3d前              │
└──────────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 |
|------|----------|----------|
| 文档树 | **IOPC PostgreSQL** (自建) | REST GET /api/docs |
| 文档编辑器 | **Milkdown** `packages/kit` + `packages/crepe` | React 组件 `<Milkdown />` |
| 文档保存 | **IOPC Backend** | REST PUT /api/docs/{id} |
| /agent 对话 | **Paperclip** `/api/issues/chat` + **LiteLLM** | REST |
| /chart 图表 | **Umami** `/api/websites/{id}/stats` | REST → Milkdown 插件 |
| 知识库搜索 | **R2R**(后置) | REST POST /search |
| 模板库 | **IOPC PostgreSQL** (预置数据) | REST GET /api/templates |

**Milkdown 具体使用方式：**
- `@milkdown/kit` — 核心插件集（commonmark、gfm、slash command、blockquote 等）
- `@milkdown/crepe` — 带主题的编辑器封装（直接用，自带 UI 主题）
- `@milkdown/components` — 独立组件（如果 crepe 太重，可按需组装）
- IOPC 自定义 slash command: 写 Milkdown plugin，注册 /agent /skill /chart /sop

---

### 6. 数据 (Analytics)

```
侧边栏:
┌──────────────┐
│ 📊 全局数据   │
│              │
│ 📁 按项目    │
│  ├ my-saas   │
│  ├ landing   │
│  └ blog      │
│              │
│ 📅 时间范围   │
│  [7天▼]      │
└──────────────┘

主内容区:
┌──────────────────────────────────────────────────────────┐
│  数据                                [7天│30天│90天]     │
├──────────┬──────────┬──────────┬──────────────────────────┤
│ 访客卡   │ 页面卡   │ 跳出率卡 │ 时长卡                   │
│ 5,620/周 │ 18,400   │ 38%      │ 3m45s                    │
├──────────┴──────────┴──────────┴──────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐ │
│  │  趋势折线图 (全宽)                                   │ │
│  │  Recharts AreaChart                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────┐  ┌───────────────────────────┐ │
│  │ 页面排名 (1/2 宽)    │  │ 来源分布 (1/2 宽)        │ │
│  │ /pricing  3,420      │  │ Google 45%                │ │
│  │ /features 2,180      │  │ 直接   28%                │ │
│  └──────────────────────┘  └───────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 |
|------|----------|----------|
| 全部数据 | **Umami** `src/app/api/websites/` | REST |
| 指标卡 | **Umami** `src/queries/sql/` → GET /api/websites/{id}/stats | REST |
| 趋势图 | **Umami** → GET /api/websites/{id}/timeseries | REST |
| 页面排名 | **Umami** → GET /api/websites/{id}/metrics | REST |
| 来源分布 | **Umami** → GET /api/websites/{id}/stats (referrer) | REST |
| 实时在线 | **Umami** → GET /api/websites/{id}/realtime | REST |

**Umami 可参考组件：**
- `src/components/charts/` — 图表组件参考（但 IOPC 用 Recharts 重绘）
- `src/components/metrics/` — 指标卡参考

---

### 7. 设置 (Settings)

```
侧边栏:
┌──────────────┐
│ 👤 账户      │
│ 🖥 服务器     │
│ 🤖 AI模型    │
│ 🔔 通知      │
│ 🔗 集成      │
└──────────────┘

主内容区:
┌──────────────────────────────────────────────────────────┐
│  设置                                                     │
├──────────────────────────────────────────────────────────┤
│  (根据侧边栏选择显示对应表单/列表)                         │
│                                                          │
│  [服务器] — 服务器列表 + 一键安装命令                      │
│  [AI模型] — LiteLLM Provider 配置 + 模型路由规则          │
│  [通知]   — Novu 通道配置 + 通知规则                      │
│  [集成]   — 所有 Adapter 连接状态一览                     │
│  [账户]   — Better Auth 用户管理                          │
└──────────────────────────────────────────────────────────┘
```

**仓库→区域映射：**

| 区域 | 数据来自 | 调用方式 |
|------|----------|----------|
| 服务器管理 | **iopc-agent** | WS 心跳 + REST 指令下发 |
| AI模型配置 | **LiteLLM** `litellm/proxy/` | REST GET/POST /model/info, /key/info |
| 通知配置 | **Novu**(后置) | REST |
| 集成状态 | 各 Adapter health check | REST |
| 账户管理 | **Better Auth** (直接 SDK 调用) | 库调用，不走 REST |

**Paperclip UI 可复用组件：**
- `ui/src/pages/InstanceSettings.tsx` → 实例设置参考
- `ui/src/pages/Secrets.tsx` → 密钥管理参考

---

## 全局布局规则

### 侧边栏宽度规范

| 状态 | 宽度 | 何时使用 |
|------|------|----------|
| 展开 | 240px | 默认，Desktop 端 |
| 窄版 | 200px | 知识页的文档树 |
| 折叠 | 64px (图标) | 小屏/用户手动折叠 |
| 隐藏 | 0px | 移动端 |

### 内容区布局模式（3 种复用）

**模式 A — 卡片网格**（仪表盘、项目列表、Skill 商店）
```
┌──────┐ ┌──────┐ ┌──────┐
│ Card │ │ Card │ │ Card │
└──────┘ └──────┘ └──────┘
响应式: 3列 → 2列 → 1列
```

**模式 B — 左右分栏**（知识页、项目详情）
```
┌─────────┬──────────────────┐
│ 树/列表  │  编辑器/详情     │
│ 200-240px│  flex-1          │
└─────────┴──────────────────┘
可拖拽分隔线调整比例
```

**模式 C — Tab 详情**（员工详情、项目详情）
```
┌──────────────────────────────┐
│ 标题栏 + 操作按钮            │
├──────┬──────┬──────┬────────┤
│ Tab1 │ Tab2 │ Tab3 │ Tab4   │
├──────┴──────┴──────┴────────┤
│ Tab 内容区                   │
└──────────────────────────────┘
```

---

## 仓库集成方式汇总

| 仓库 | 集成方式 | 是否需要 Adapter | 部署方式 |
|------|----------|-------------------|----------|
| **Paperclip** | REST API 调用 | ✅ adapter-paperclip | Docker 容器（iopc-agent 管理） |
| **OpenCode** | 间接调用（经 Paperclip adapter） | ❌ Paperclip 已封装 | Desktop 本地进程 / 服务器进程 |
| **Traefik** | REST API 调用 | ✅ adapter-traefik | Docker 容器（iopc-agent 管理） |
| **Uptime Kuma** | REST + WebSocket | ✅ adapter-uptime-kuma | Docker 容器（iopc-agent 管理） |
| **LiteLLM** | REST API (OpenAI 兼容) | ✅ adapter-litellm | Docker 容器（iopc-agent 管理） |
| **Better Auth** | TS SDK 直接引用 | ❌ 库调用 | 内嵌 IOPC Backend |
| **Umami** | REST API 调用 | ✅ adapter-umami | Docker 容器（iopc-agent 管理） |
| **Milkdown** | React 组件 npm 包 | ❌ 前端组件 | pnpm 依赖，内嵌 IOPC UI |

**需要写 Adapter 的：5 个**（Paperclip, Traefik, Uptime Kuma, LiteLLM, Umami）
**直接库/组件引用的：3 个**（Better Auth, Milkdown, OpenCode[经Paperclip]）

---

## Paperclip → IOPC 页面映射表

Paperclip 已有的 UI 页面，IOPC 不是照搬，而是**提取数据+用 IOPC Design Kit 重绘**：

| Paperclip 页面 | 对应 IOPC 页面 | 复用策略 |
|----------------|---------------|----------|
| Dashboard.tsx | 仪表盘 | 数据接口复用，UI 重绘（加 Umami/Kuma 数据） |
| Agents.tsx | 员工列表 | 数据接口复用，卡片组件参考 |
| AgentDetail.tsx | 员工详情 | Tab 结构参考，加预算/记忆 Tab |
| Projects.tsx | 项目列表 | 数据接口复用，卡片加 Kuma/Umami 数据 |
| ProjectDetail.tsx | 项目详情 | Tab 结构参考，加部署/监控/分析 Tab |
| Approvals.tsx | 仪表盘-待审批区 | 数据接口复用，审批卡片参考 |
| CompanySkills.tsx | Skills 商店 | 数据接口复用，Skill 卡片参考 |
| OrgChart.tsx | 员工-组织图 | 可直接复用（加 IOPC 主题） |
| Costs.tsx | 员工-预算 Tab | 数据接口复用 |
| Secrets.tsx | 设置-密钥 | 数据接口复用 |
| InstanceSettings.tsx | 设置-实例 | 结构参考 |

**原则：Paperclip 的 server API 和 DB schema 是核心资产，UI 组件是参考素材。IOPC 用自己的 Design Kit 重绘一切。**
