import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "@/lib/router";
import { authApi, isEmailNotVerifiedError } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { getRememberedInvitePath } from "../lib/invite-memory";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Bell,
  Bot,
  CreditCard,
  MessageCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Zap,
  Cpu,
  Globe,
  Layers,
} from "lucide-react";

type AuthMode = "sign_in" | "sign_up";

const consoleLines = [
  { text: "$ myopc auth start --default-agent=code-engine", tone: "text-cyan-200" },
  { text: "[myopc] creating company control plane", tone: "text-white/60" },
  { text: "[code-engine] MiniMax M3 infinite-token lane attached", tone: "text-emerald-400" },
  { text: "[notify] approvals ready for WeChat + Telegram", tone: "text-violet-300" },
];

function AuthShowcase() {
  return (
    <section className="relative flex min-h-full flex-col overflow-hidden bg-[#05060a] px-10 py-12 xl:px-20">
      {/* Background Epic Effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[80%] w-[80%] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[60%] w-[60%] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <header className="relative z-10 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 transition-transform hover:scale-105">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold tracking-tight text-white">MyOPC</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">The AI Agency OS</p>
          </div>
        </a>
      </header>

      <div className="relative z-10 flex flex-1 flex-col justify-center py-20">
        <div className="myopc-auth-fade max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-300">
            <Zap className="h-3.5 w-3.5 fill-cyan-300 animate-pulse" /> 欢迎来到单人公司时代
          </div>
          <h1 className="mt-8 text-6xl font-black leading-[1.05] tracking-tight text-white xl:text-7xl">
            一个人，也可以
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              运营一家巨头。
            </span>
          </h1>
          <p className="mt-10 text-xl leading-relaxed text-white/60 font-medium">
            MyOPC 为你提供全自动的 AI 代理团队。从代码构建到全网部署，从支付集成到流量监控，一切尽在掌握。
          </p>
          
          <ul className="mt-12 grid grid-cols-2 gap-x-12 gap-y-6">
            {[
              { label: "MyOPC 智能调度", icon: Layers },
              { label: "编码引擎自动执行", icon: Cpu },
              { label: "MiniMax M3 无限 Token", icon: Bot },
              { label: "全球边缘节点部署", icon: Globe },
            ].map((item) => (
              <li key={item.label} className="group flex items-center gap-4 text-sm font-semibold text-white/80 transition-colors hover:text-cyan-300">
                <item.icon className="h-5 w-5 text-cyan-400 transition-transform group-hover:scale-110" />
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="myopc-auth-fade myopc-auth-delay-2 mt-14 grid max-w-3xl gap-4 xl:grid-cols-[1fr_0.74fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2.5">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">system-kernel-init</span>
              </div>
            </div>
            <div className="space-y-2 p-5 font-mono text-xs">
              {consoleLines.map((line, index) => (
                <div key={line.text} className={`myopc-auth-line flex items-center gap-3 ${line.tone}`} style={{ animationDelay: `${index * 0.4}s` }}>
                  <span className="text-white/20 select-none">{">"}</span>
                  <span className="break-all">{line.text}</span>
                </div>
              ))}
              <div className="flex items-center gap-3 text-emerald-400/80 animate-pulse">
                <span className="text-white/20 select-none">{">"}</span>
                <span>[paperclip] listening for new developer...</span>
                <span className="h-4 w-1.5 bg-emerald-400/80 animate-[myopcCaret_1s_infinite]" />
              </div>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/34">task queue</p>
                <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-0.5 text-[10px] text-emerald-200">RUNNING</span>
              </div>
              <div className="mt-4 space-y-3">
                {([
                  ["Auth polish", 86, "bg-cyan-300"],
                  ["Landing loop", 72, "bg-violet-300"],
                  ["Ops notify", 58, "bg-emerald-300"],
                ] as const).map(([label, progress, color]) => (
                  <div key={label} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-white/54">
                      <span>{label}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                      <div className={`myopc-auth-progress h-full rounded-full ${color}`} style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/34">agent signal</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {["Plan", "Patch", "Verify"].map((item, index) => (
                  <div key={item} className="rounded-xl border border-white/8 bg-black/22 px-3 py-2 text-center">
                    <div className="mx-auto h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.75)]" style={{ animation: `myopcAuthPing 1.8s ease-in-out ${index * 0.25}s infinite` }} />
                    <p className="mt-2 text-[10px] text-white/52">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="relative z-10 mt-auto flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-white/20 font-bold">
        <p>© 2026 MYOPC SYSTEMS INC.</p>
        <p className="flex items-center gap-2"><ShieldCheck className="h-3 w-3" /> SECURED BY MYOPC AUTH</p>
      </footer>
    </section>
  );
}

export function AuthPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const requestedMode = searchParams.get("mode");
    if (!verificationEmail && (requestedMode === "sign_in" || requestedMode === "sign_up")) {
      setMode(requestedMode);
    }
  }, [searchParams, verificationEmail]);

  const nextPath = useMemo(
    () => searchParams.get("next") || getRememberedInvitePath() || "/companies",
    [searchParams],
  );
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  useEffect(() => {
    if (session) {
      navigate(nextPath, { replace: true });
    }
  }, [session, navigate, nextPath]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "sign_in") {
        return authApi.signInEmail({ email: email.trim(), password });
      }
      return authApi.signUpEmail({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    },
    onSuccess: async (result) => {
      if (result.token === null) {
        const nextEmail = email.trim();
        setVerificationEmail(nextEmail);
        setVerificationCode("");
        setError(null);
        setNotice(`我们向 ${nextEmail} 发送了验证码，请输入验证码以完成登录。`);
        return;
      }
      setError(null);
      setNotice(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      navigate(nextPath, { replace: true });
    },
    onError: (err) => {
      if (isEmailNotVerifiedError(err)) {
        const nextEmail = email.trim();
        setVerificationEmail(nextEmail);
        setVerificationCode("");
        setError(null);
        setNotice(`该邮箱尚未验证。我们已向 ${nextEmail} 发送了新代码。`);
        return;
      }
      setNotice(null);
      setError(err instanceof Error ? err.message : "身份验证失败");
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!verificationEmail) {
        throw new Error("Missing verification email");
      }
      return authApi.verifyEmailOtp({
        email: verificationEmail,
        otp: verificationCode.trim(),
      });
    },
    onSuccess: async () => {
      setError(null);
      setNotice(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      navigate(nextPath, { replace: true });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "验证失败");
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!verificationEmail) {
        throw new Error("Missing verification email");
      }
      return authApi.sendVerificationOtp({
        email: verificationEmail,
        type: "email-verification",
      });
    },
    onSuccess: () => {
      setError(null);
      setNotice(`已向 ${verificationEmail} 发送新验证码。`);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "无法重新发送验证码");
    },
  });

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    (mode === "sign_in" || (name.trim().length > 0 && password.trim().length >= 8));
  const canVerify = Boolean(verificationEmail && verificationCode.trim().length > 0);

  if (isSessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#030407] text-white font-mono">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <p className="text-xs tracking-[0.2em] text-white/40">INITIALIZING SECURE SESSION...</p>
        </div>
      </div>
    );
  }

  const title = verificationEmail
    ? "验证邮箱"
    : mode === "sign_in"
      ? "登录 MyOPC"
      : "开启你的单人公司";
  const description = verificationEmail
    ? `验证码已发送至 ${verificationEmail}`
    : mode === "sign_in"
      ? "连接你的 AI 代理军团，继续创造价值。"
      : "只需几秒，即可获得 MiniMax M3 赋能的 MyOPC 自动化构建能力。";

  return (
    <div className="fixed inset-0 flex flex-col bg-[#030407] text-white selection:bg-cyan-500/30">
      {/* Striking Red Banner */}
      <div className="relative z-[100] flex w-full items-center justify-center overflow-hidden bg-gradient-to-r from-red-600 via-red-500 to-red-600 px-4 py-3 shadow-2xl">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]" />
        <p className="relative flex items-center gap-3 text-center text-xs font-black tracking-[0.2em] text-white md:text-sm">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>MiniMax M3 · 无限 Token · 在 MyOPC 中无限体验，无限创造</span>
          <Sparkles className="h-4 w-4 animate-pulse" />
        </p>
      </div>

      <main className="relative flex flex-1 overflow-y-auto lg:overflow-hidden">
        {/* Left Side: Auth Form */}
        <section className="relative z-10 flex min-h-full w-full flex-col items-center justify-center border-r border-white/5 bg-[#030407] px-6 py-10 lg:w-[520px] lg:py-0 xl:w-[600px]">
          {/* Mobile Logo */}
          <div className="mb-12 flex items-center gap-3 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">MyOPC</span>
          </div>

          <div className="myopc-auth-fade w-full max-w-md rounded-[2.5rem] border border-white/10 bg-white/[0.035] p-8 shadow-2xl shadow-black/45 backdrop-blur-2xl sm:p-10">
            <div className="mb-10">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Secure Portal
              </div>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">{title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-white/50">{description}</p>
            </div>

            {!verificationEmail && (
              <div className="mb-8 rounded-[1.5rem] border border-white/5 bg-white/5 p-5 ring-1 ring-white/10 transition-colors hover:bg-white/8">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
                  <Bot className="h-4 w-4" /> 代理配置
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/40">
                  注册后将默认启用 <span className="text-white/80 font-bold">MyOPC 编码引擎</span>。
                  当前所有账户均已自动激活 <span className="text-cyan-300 font-bold">MiniMax M3</span> 无限 Token 权限。
                </p>
              </div>
            )}

            {verificationEmail ? (
              <form
                className="space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (verifyMutation.isPending) return;
                  if (!canVerify) return;
                  verifyMutation.mutate();
                }}
              >
                <div>
                  <label htmlFor="verification-code" className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-white/40">6位验证码</label>
                  <input
                    id="verification-code"
                    className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-lg font-mono tracking-[0.5em] text-white outline-none transition focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="000000"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                {notice && <p className="text-xs text-cyan-400/80">{notice}</p>}
                {error && <p className="text-xs text-red-400">{error}</p>}
                <Button 
                  type="submit" 
                  disabled={verifyMutation.isPending || !canVerify}
                  className="h-12 w-full rounded-2xl bg-white font-bold text-black transition-all hover:scale-[1.02] hover:bg-cyan-50 disabled:opacity-50 shadow-lg shadow-white/5"
                >
                  {verifyMutation.isPending ? "正在验证..." : "确认验证"}
                </Button>
                <div className="flex items-center justify-between text-xs px-2">
                  <button type="button" className="text-white/40 hover:text-cyan-400 transition-colors font-medium" onClick={() => resendMutation.mutate()}>重新发送代码</button>
                  <button type="button" className="text-white/40 hover:text-white transition-colors font-medium" onClick={() => setVerificationEmail(null)}>更换邮箱</button>
                </div>
              </form>
            ) : (
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (mutation.isPending || !canSubmit) return;
                  mutation.mutate();
                }}
              >
                {mode === "sign_up" && (
                  <div className="space-y-2">
                    <label htmlFor="name" className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-white/40">姓名 / 昵称</label>
                    <input id="name" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.08]" value={name} onChange={(e) => setName(e.target.value)} placeholder="你的名字" />
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="email" className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-white/40">电子邮箱</label>
                  <input id="email" type="email" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.08]" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" title="密码至少8位" className="ml-1 block text-[10px] font-bold uppercase tracking-widest text-white/40">密码 (至少8位)</label>
                  <input id="password" type="password" className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none transition-all focus:border-cyan-500/50 focus:bg-white/[0.08]" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                
                {notice && <p className="px-1 text-xs font-medium text-cyan-400/90 leading-relaxed">{notice}</p>}
                {error && <p className="px-1 text-xs font-medium text-red-400/90 leading-relaxed">{error}</p>}

                <Button 
                  type="submit" 
                  disabled={mutation.isPending || !canSubmit}
                  className="h-12 w-full rounded-2xl bg-white font-bold text-black transition-all hover:scale-[1.02] hover:bg-cyan-50 disabled:opacity-50 shadow-lg shadow-white/5"
                >
                  {mutation.isPending ? "处理中..." : mode === "sign_in" ? "进入控制台" : "创建账号"}
                </Button>
                
                <div className="flex items-center justify-center pt-2">
                  <button 
                    type="button" 
                    className="group flex items-center gap-2 text-xs font-bold text-cyan-500 transition-colors hover:text-cyan-400"
                    onClick={() => { setMode(mode === "sign_in" ? "sign_up" : "sign_in"); setError(null); }}
                  >
                    {mode === "sign_in" ? "没有账号？立即注册" : "已有账号？返回登录"}
                    <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </form>
            )}

            <div className="mt-12 space-y-5">
              <p className="ml-1 text-[10px] font-bold uppercase tracking-widest text-white/20">系统就绪状态</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "支付集成", icon: CreditCard },
                  { label: "自动发布", icon: Rocket },
                  { label: "消息推送", icon: MessageCircle },
                  { label: "实时监控", icon: Bell },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/5 hover:text-white/60">
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Showcase */}
        <div className="hidden flex-1 lg:block">
          <AuthShowcase />
        </div>
      </main>

      <style>{`
        @keyframes myopcAuthFade {
          from { opacity: 0; transform: translateY(15px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes myopcAuthLine {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes myopcCaret {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes myopcAuthPing {
          0%, 100% { opacity: .35; transform: scale(.82); }
          50% { opacity: 1; transform: scale(1.18); }
        }
        @keyframes myopcAuthProgress {
          0%, 100% { filter: saturate(.8); transform: translateX(-2%); }
          50% { filter: saturate(1.3); transform: translateX(2%); }
        }
        .myopc-auth-fade { animation: myopcAuthFade 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .myopc-auth-delay-2 { animation-delay: 0.2s; }
        .myopc-auth-line { animation: myopcAuthLine 3s infinite; }
        .myopc-auth-progress { animation: myopcAuthProgress 2.8s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
