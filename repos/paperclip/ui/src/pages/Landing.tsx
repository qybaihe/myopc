import {
  Activity,
  ArrowDown,
  ArrowRight,
  Bell,
  Bot,
  CheckCircle2,
  Code2,
  CreditCard,
  GitBranch,
  Gift,
  Globe2,
  LineChart,
  MessageCircle,
  Network,
  Rocket,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

const loopSteps = [
  { label: "Plan", text: "MyOPC 拆分产品目标", icon: Network },
  { label: "Build", text: "编码引擎修改并验证", icon: Code2 },
  { label: "Ship", text: "发布到产品入口", icon: Rocket },
  { label: "Watch", text: "监控流量与异常", icon: Activity },
  { label: "Repair", text: "自动生成维护任务", icon: Wrench },
];

const commandLines = [
  { tone: "text-cyan-200", text: "$ myopc legion run --product=myopc-os" },
  { tone: "text-white/62", text: "[myopc] planning: split launch into 7 issues" },
  { tone: "text-emerald-200", text: "[code-engine] patch accepted · auth page compiled" },
  { tone: "text-violet-200", text: "[monitor] traffic spike detected on /landing" },
  { tone: "text-amber-200", text: "[notify] approval pushed to WeChat + Telegram" },
  { tone: "text-emerald-200", text: "[ship] release candidate ready · confidence 96%" },
];

const capabilityCards = [
  {
    title: "MyOPC 指挥中枢",
    body: "把产品目标拆成任务，把 Agent 编成组织，让每一次修改都有上下文、负责人和结果。",
    icon: Bot,
    className: "lg:col-span-2",
  },
  {
    title: "智能编码执行层",
    body: "默认用 MyOPC 编码引擎接管代码修改、测试、修复和发布前检查。",
    icon: TerminalSquare,
    className: "",
  },
  {
    title: "产品自动维护",
    body: "上线后继续监听问题：异常、反馈、Bug、性能退化都能转成下一轮任务。",
    icon: Wrench,
    className: "",
  },
  {
    title: "收入与流量闭环",
    body: "未来打通支付、流量分析、转化监控，让产品公司从运行走向增长。",
    icon: LineChart,
    className: "lg:col-span-2",
  },
];

const roadmapCards = [
  { title: "支付打通", body: "订阅、订单、收入面板", icon: CreditCard },
  { title: "二级域名分发", body: "每个产品拥有独立入口", icon: Globe2 },
  { title: "产品流量监控", body: "访问、转化、异常趋势", icon: LineChart },
  { title: "持续自动维护", body: "问题触发任务与修复", icon: GitBranch },
  { title: "微信 / Telegram", body: "审批、故障、发布主动推送", icon: MessageCircle },
  { title: "多用户管理", body: "团队、客户、产品线权限", icon: Users },
];

function StatusDot({ className = "bg-emerald-300" }: { className?: string }) {
  return <span className={`h-2 w-2 rounded-full ${className}`} />;
}

function ProductCockpit() {
  return (
    <div className="relative mx-auto w-full max-w-4xl">
      <div className="absolute -inset-8 rounded-[3rem] bg-[radial-gradient(circle_at_50%_30%,rgba(124,92,255,0.28),transparent_58%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#080a10]/92 shadow-2xl shadow-violet-950/40 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <StatusDot className="bg-red-400/80" />
              <StatusDot className="bg-amber-300/80" />
              <StatusDot className="bg-emerald-300/80 animate-pulse" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/42">paperclip-os v0.8.2-stable</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-100 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live loop
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[230px_1fr]">
          <aside className="border-b border-white/10 bg-white/[0.025] p-5 lg:border-b-0 lg:border-r">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Active Clusters</p>
            <div className="space-y-2">
              {["MyOPC Landing", "SaaS Billing", "API Gateway"].map((item, index) => (
                <div
                  key={item}
                  className={`relative overflow-hidden rounded-2xl border px-3 py-2 text-sm transition-colors ${
                    index === 0
                      ? "border-violet-300/20 bg-violet-300/10 text-white"
                      : "border-white/5 bg-white/[0.03] text-white/48"
                  }`}
                >
                  {item}
                  {index === 0 && (
                    <div className="absolute bottom-0 left-0 h-[2px] w-full bg-gradient-to-r from-transparent via-violet-400/50 to-transparent animate-[myopcScan_2s_linear_infinite]" />
                  )}
                </div>
              ))}
            </div>

            <p className="mb-4 mt-7 text-[10px] font-bold uppercase tracking-[0.24em] text-white/35">Running Agents</p>
            <div className="space-y-3">
              {[
                ["CEO Agent", "bg-emerald-300"],
                ["Open Code", "bg-cyan-300"],
                ["Ops Watcher", "bg-violet-300"],
              ].map(([name, dot]) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.035] px-3 py-2 text-xs text-white/62">
                  <span className="flex items-center gap-2">
                    <StatusDot className={`${dot} shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                    {name}
                  </span>
                  <span className="font-mono text-[9px] text-white/20">READY</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="p-5 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">Execution loop</p>
                      <div className="h-1 w-12 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full bg-cyan-400/50 animate-[myopcProgress_3s_ease-in-out_infinite]" />
                      </div>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/40">自动规划 · 修改 · 验证 · 维护</p>
                  </div>
                  <Sparkles className="h-4 w-4 text-cyan-200 animate-pulse" />
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {commandLines.map((line, index) => (
                    <div
                      key={line.text}
                      className={`myopc-log-line group flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.025] px-3 py-2 transition-colors hover:bg-white/[0.05] ${line.tone}`}
                      style={{ animationDelay: `${index * 0.65}s` }}
                    >
                      <span className="text-white/20 select-none shrink-0">{index + 1}</span>
                      <span className="break-all">{line.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-5 transition-colors hover:bg-white/[0.07]">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/34">Total Revenue</p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-white">$1,234.50</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-emerald-400">
                    <Zap className="h-3 w-3 fill-emerald-400" /> +12.5% this week
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/34">Traffic watch</p>
                    <span className="font-mono text-[9px] text-cyan-300">LIVE</span>
                  </div>
                  <div className="mt-6 flex h-20 items-end gap-2.5">
                    {[35, 58, 46, 72, 62, 88, 76].map((height, index) => (
                      <span
                        key={index}
                        className="myopc-bar w-full rounded-t-md bg-gradient-to-t from-violet-600/50 to-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                        style={{ height: `${height}%`, animationDelay: `${index * 0.16}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-5">
              {loopSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="group relative rounded-2xl border border-white/8 bg-white/[0.035] p-3 transition-all hover:bg-white/[0.06] hover:border-white/15">
                    <Icon className="h-4 w-4 text-cyan-300 transition-transform group-hover:scale-110" />
                    <p className="mt-3 text-sm font-semibold text-white">{step.label}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-white/42">{step.text}</p>
                    {index < loopSteps.length - 1 ? (
                      <div className="absolute -right-[7px] top-1/2 hidden h-[1px] w-[14px] -translate-y-1/2 bg-gradient-to-r from-white/10 to-transparent lg:block" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="fixed inset-0 overflow-y-auto scroll-smooth bg-[#030407] text-white selection:bg-violet-300/30">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(circle_at_50%_35%,black,transparent_72%)]" />
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-violet-600/18 blur-3xl" />
        <div className="absolute bottom-[10%] right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <header className="fixed left-0 right-0 top-0 z-40 border-b border-white/5 bg-[#030407]/68 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8" aria-label="MyOPC navigation">
          <a href="/landing" className="flex items-center gap-3" aria-label="MyOPC landing">
            <span className="grid h-8 w-8 place-items-center rounded-xl border border-white/10 bg-white/[0.06]">
              <Sparkles className="h-4 w-4 text-cyan-100" />
            </span>
            <span className="text-sm font-semibold tracking-[0.26em]">MyOPC</span>
          </a>
          <div className="hidden items-center gap-6 text-xs text-white/48 md:flex">
            <a href="#command" className="transition hover:text-white">Command Center</a>
            <a href="#capabilities" className="transition hover:text-white">Capabilities</a>
            <a href="#roadmap" className="transition hover:text-white">Roadmap</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="/auth" className="hidden rounded-full px-4 py-2 text-sm text-white/58 transition hover:bg-white/8 hover:text-white sm:inline-flex">登录</a>
            <a href="/auth?mode=sign_up" className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-cyan-50">
              开始 <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="flex min-h-screen items-center justify-center px-5 pt-16 text-center">
          <div className="mx-auto max-w-6xl">
            <div className="myopc-fade-up flex flex-col items-center gap-6">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-[10px] uppercase tracking-[0.28em] text-white/48">
                <Zap className="h-3.5 w-3.5 text-cyan-300 fill-cyan-300/20" /> One-person company OS
              </p>
              
              <div className="inline-flex items-center gap-2 rounded-full border border-red-300/20 bg-red-500/10 px-4 py-1.5 text-[11px] font-semibold text-red-50 shadow-[0_0_28px_rgba(239,68,68,0.14)]">
                <Gift className="h-3.5 w-3.5 text-red-200" />
                MiniMax M3 · 无限 Token · 无限体验 · 无限创造
              </div>
            </div>

            <h1 className="myopc-fade-up myopc-delay-1 mt-10 text-[14vw] font-black leading-[1.05] tracking-[-0.02em] text-white sm:text-[11vw] lg:text-[8.5rem]">
              一个人，
              <br />
              也能开一家公司。
            </h1>
            <p className="myopc-fade-up myopc-delay-2 mx-auto mt-10 max-w-2xl font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-100/60 sm:text-xs">
              My OPC. My product. My income.
            </p>
            <div className="myopc-fade-up myopc-delay-3 mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="/auth?mode=sign_up" className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-black transition hover:scale-[1.02] hover:bg-cyan-50 shadow-lg shadow-white/5">
                召集我的 OPC 军团 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a href="#command" className="inline-flex h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-7 text-sm font-medium text-white/68 transition hover:border-white/22 hover:text-white hover:bg-white/[0.06]">
                向下查看系统演示 <ArrowDown className="h-4 w-4" />
              </a>
            </div>
          </div>
          <a href="#command" aria-label="Scroll to command center" className="myopc-scroll-hint absolute bottom-8 left-1/2 -translate-x-1/2 text-white/30">
            <ArrowDown className="h-5 w-5" />
          </a>
        </section>

        <section id="command" className="min-h-screen px-5 py-24 sm:px-8 lg:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[0.82fr_1.18fr]">
            <div className="myopc-fade-up max-w-xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/80">Live operating loop</p>
              <h2 className="mt-5 text-4xl font-bold leading-[1.1] tracking-[-0.04em] text-white sm:text-6xl">
                MyOPC 指挥，编码引擎执行，产品持续运转。
              </h2>
              <p className="mt-8 text-base leading-relaxed text-white/58">
                MyOPC 把一个人的想法变成可运行的 AI 产品公司：任务自动拆分、代码自动推进、异常自动进入维护队列，关键节点推送到微信和 Telegram。
              </p>
              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                {["MiniMax M3", "无限 Token", "MyOPC 控制面"].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs text-white/70 transition-colors hover:bg-white/[0.06] hover:border-white/20">
                    <CheckCircle2 className="mb-3 h-4 w-4 text-emerald-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <ProductCockpit />
          </div>
        </section>

        <section id="capabilities" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-200/60">From one person to a company</p>
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">从一个产品，到一家公司。</h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-white/48">你不再只是打开一个后台，而是在启动一套可以自己更新、维护、监控和增长的产品系统。</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {capabilityCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className={`group rounded-[2.5rem] border border-white/10 bg-white/[0.045] p-8 transition-all hover:-translate-y-1 hover:border-cyan-200/25 hover:bg-white/[0.065] ${card.className}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-cyan-100 transition-transform group-hover:scale-110">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-8 text-xl font-bold tracking-tight text-white">{card.title}</h3>
                    <p className="mt-4 max-w-2xl text-[13px] leading-relaxed text-white/52">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="roadmap" className="px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl rounded-[3rem] border border-white/10 bg-white/[0.035] p-8 sm:p-14 shadow-2xl">
            <div className="mb-14 max-w-3xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-violet-300/60">Automation stack</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">下一步，把产品收入、分发、监控和提醒全部接上。</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roadmapCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="group rounded-[2rem] border border-white/10 bg-black/30 p-6 transition-all hover:bg-black/50 hover:border-white/20">
                    <div className="flex items-start gap-5">
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/5 text-cyan-100 transition-colors group-hover:bg-cyan-500/10 group-hover:text-cyan-400">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div>
                        <h3 className="font-bold text-white group-hover:text-cyan-50">{card.title}</h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-white/50">{card.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 pt-12 text-center sm:px-8">
          <div className="mx-auto max-w-5xl rounded-[3rem] border border-cyan-500/15 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.13),transparent_45%),rgba(255,255,255,0.035)] p-10 sm:p-16 shadow-2xl">
            <div className="flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                <Bell className="h-7 w-7 animate-[myopcBell_2s_ease-in-out_infinite]" />
              </div>
            </div>
            <h2 className="mx-auto mt-8 max-w-3xl text-3xl font-bold tracking-tight text-white sm:text-5xl">出问题时，它会先找到你。</h2>
            <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-white/54 font-medium">监控异常、审批请求、发布结果，未来都可以主动推送到微信和 Telegram。你只做关键决策，OPC 军团负责把事情推进。</p>
            <div className="mt-10 flex justify-center">
              <a href="/auth?mode=sign_up" className="group inline-flex h-12 items-center gap-2 rounded-full bg-white px-8 text-sm font-bold text-black transition-all hover:scale-[1.05] hover:bg-cyan-50">
                免费开始 <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-[#030407] py-12">
        <div className="mx-auto max-w-7xl px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3 opacity-40">
            <Sparkles className="h-4 w-4" />
            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">MyOPC Systems © 2026</span>
          </div>
          <div className="flex gap-8 text-[10px] uppercase tracking-widest font-bold text-white/30">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Security</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes myopcFadeUp {
          from { opacity: 0; transform: translateY(24px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes myopcScrollHint {
          0%, 100% { transform: translate(-50%, 0); opacity: .32; }
          50% { transform: translate(-50%, 10px); opacity: .75; }
        }
        @keyframes myopcLogPulse {
          0%, 100% { opacity: .6; transform: translateX(0); }
          50% { opacity: 1; transform: translateX(2px); }
        }
        @keyframes myopcBar {
          0%, 100% { opacity: .45; transform: scaleY(.72); transform-origin: bottom; }
          50% { opacity: 1; transform: scaleY(1); transform-origin: bottom; }
        }
        @keyframes myopcScan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes myopcProgress {
          0% { width: 0%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        @keyframes myopcBell {
          0%, 100% { transform: rotate(0); }
          10%, 20% { transform: rotate(-10deg); }
          15%, 25% { transform: rotate(10deg); }
          30% { transform: rotate(0); }
        }
        .myopc-fade-up { opacity: 0; animation: myopcFadeUp .9s cubic-bezier(.16,1,.3,1) forwards; }
        .myopc-delay-1 { animation-delay: .16s; }
        .myopc-delay-2 { animation-delay: .34s; }
        .myopc-delay-3 { animation-delay: .52s; }
        .myopc-scroll-hint { animation: myopcScrollHint 1.8s ease-in-out infinite; }
        .myopc-log-line { animation: myopcLogPulse 4s ease-in-out infinite; }
        .myopc-bar { animation: myopcBar 2.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
