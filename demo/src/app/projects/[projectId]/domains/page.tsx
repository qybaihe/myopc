"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleDot,
  Copy,
  Globe,
  KeyRound,
  Network,
  Route,
  Server,
  ShieldCheck,
  SquareTerminal,
} from "lucide-react";
import Panel from "@/components/panel";
import { useCompany } from "@/lib/company-context";
import { getProjectById } from "@/lib/company-data";

const BASE_DOMAIN = "oir.me";
const SERVER_IP = "104.248.150.29";

type DistributionRule = {
  host: string;
  label: string;
  service: string;
  target: string;
  port: string;
  status: "ready" | "after-dns" | "tls-next";
  note: string;
};

const presetRules: DistributionRule[] = [
  {
    host: "oir.me",
    label: "根域主站",
    service: "MyOPC 控制台",
    target: "http://127.0.0.1:3100",
    port: "3100",
    status: "after-dns",
    note: "根域直接进入主控制台。",
  },
  {
    host: "www.oir.me",
    label: "WWW 入口",
    service: "MyOPC 控制台",
    target: "http://127.0.0.1:3100",
    port: "3100",
    status: "after-dns",
    note: "兼容浏览器习惯输入。",
  },
  {
    host: "app.oir.me",
    label: "应用入口",
    service: "MyOPC 控制台",
    target: "http://127.0.0.1:3100",
    port: "3100",
    status: "after-dns",
    note: "后续默认产品控制台入口。",
  },
  {
    host: "code.oir.me",
    label: "代码执行",
    service: "MyOPC 智能编码工作台",
    target: "http://127.0.0.1:4096",
    port: "4096",
    status: "after-dns",
    note: "保留给执行器和代码助手。",
  },
  {
    host: "status.oir.me",
    label: "状态监控",
    service: "Uptime Kuma",
    target: "http://127.0.0.1:3001",
    port: "3001",
    status: "after-dns",
    note: "站点健康检查和状态页。",
  },
  {
    host: "analytics.oir.me",
    label: "访问分析",
    service: "Umami",
    target: "http://127.0.0.1:3000",
    port: "3000",
    status: "after-dns",
    note: "流量统计后台。",
  },
];

const dnsRecords = [
  { type: "A", name: "@", value: SERVER_IP, purpose: "让 oir.me 根域进入分发服务器" },
  { type: "A", name: "*", value: SERVER_IP, purpose: "让任意二级域名先进入同一台分发服务器" },
  { type: "A", name: "www", value: SERVER_IP, purpose: "部分 DNS 面板不会用 * 覆盖 www，单独补一条更稳" },
];

export default function ProjectDomainsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated } = useCompany();
  const project = getProjectById(state, projectId);
  const [copied, setCopied] = useState<string | null>(null);

  const rules = useMemo(() => {
    if (!project) return presetRules;

    const projectHost = `${project.subdomain}.${BASE_DOMAIN}`;
    if (presetRules.some((rule) => rule.host === projectHost)) return presetRules;

    return [
      {
        host: projectHost,
        label: "当前项目",
        service: project.name,
        target: "http://127.0.0.1:3100",
        port: "3100",
        status: "after-dns" as const,
        note: "当前项目的默认二级域名入口。",
      },
      ...presetRules,
    ];
  }, [project]);

  const nginxConfig = useMemo(() => buildNginxConfig(rules), [rules]);
  const certbotCommand = useMemo(() => buildCertbotCommand(rules), [rules]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      setCopied(null);
    }
  };

  if (!hydrated || !project) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <div className="flex items-center gap-3">
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">二级域名分发</div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                oir.me 已接入编排
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">把 *.oir.me 统一打到服务器，再按 Host 分发到各服务</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              你只需要在域名后台加 DNS 解析。服务器收到请求后，用同一套分发规则把不同二级域名转发到 MyOPC 控制台、智能编码工作台、监控、分析或当前项目入口。
            </p>
          </div>

          <div className="grid min-w-[320px] grid-cols-2 gap-3">
            <Metric label="主域名" value={BASE_DOMAIN} />
            <Metric label="服务器 IP" value={SERVER_IP} />
            <Metric label="分发规则" value={`${rules.length}`} />
            <Metric label="入口模式" value="Host 分流" />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-6">
          <Panel title="你要在域名后台添加的解析" description="只做这三条就够：根域、通配二级域名、www 兼容入口。">
            <div className="overflow-hidden rounded-2xl border border-white/8">
              <div className="grid grid-cols-[80px_110px_minmax(0,1fr)] border-b border-white/8 bg-white/[0.04] px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-500 md:grid-cols-[90px_120px_180px_minmax(0,1fr)]">
                <span>类型</span>
                <span>主机</span>
                <span className="hidden md:block">值</span>
                <span>用途</span>
              </div>
              {dnsRecords.map((record) => (
                <div
                  key={`${record.type}-${record.name}`}
                  className="grid grid-cols-[80px_110px_minmax(0,1fr)] items-center gap-0 border-b border-white/8 px-4 py-4 text-sm last:border-b-0 md:grid-cols-[90px_120px_180px_minmax(0,1fr)]"
                >
                  <span className="font-medium text-white">{record.type}</span>
                  <span className="font-mono text-cyan-200">{record.name}</span>
                  <span className="hidden font-mono text-zinc-300 md:block">{record.value}</span>
                  <span className="min-w-0 text-zinc-400">
                    <span className="mr-2 inline font-mono text-zinc-300 md:hidden">{record.value}</span>
                    {record.purpose}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <GuideStep icon={<Globe className="h-4 w-4" />} title="DNS 面板" text="记录类型选 A，代理先关掉或设为 DNS only。" />
              <GuideStep icon={<Server className="h-4 w-4" />} title="等待生效" text="通常几分钟到半小时，生效后所有子域名都会进服务器。" />
              <GuideStep icon={<ShieldCheck className="h-4 w-4" />} title="HTTPS" text="解析生效后再签证书，避免 ACME 校验失败。" />
            </div>
          </Panel>

          <Panel title="当前分发规则" description="这里是已经准备好的 Host → 服务映射。DNS 生效后，Nginx 按这张表转发。">
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.host} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Route className="h-4 w-4 text-cyan-300" />
                        <span className="font-mono text-sm font-medium text-white">{rule.host}</span>
                        <StatusPill status={rule.status} />
                      </div>
                      <div className="mt-2 text-sm text-zinc-400">{rule.label} · {rule.note}</div>
                    </div>
                    <div className="grid min-w-[280px] grid-cols-[1fr_72px] gap-2 text-sm">
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        <div className="text-[11px] text-zinc-500">转发到</div>
                        <div className="mt-1 truncate font-mono text-zinc-200">{rule.target}</div>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2">
                        <div className="text-[11px] text-zinc-500">端口</div>
                        <div className="mt-1 font-mono text-zinc-200">{rule.port}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="操作顺序" description="你负责第一步，剩下可以按页面生成的配置上服务器。">
            <div className="space-y-3 text-sm text-zinc-300">
              <FlowItem icon={<CircleDot className="h-4 w-4" />} text={`在域名后台把 @、*、www 都解析到 ${SERVER_IP}。`} />
              <FlowItem icon={<ArrowRight className="h-4 w-4" />} text="解析生效后，把下面 Nginx 配置放到服务器并 reload。" />
              <FlowItem icon={<KeyRound className="h-4 w-4" />} text="最后为这些域名签 HTTPS 证书，正式访问就走 https。" />
            </div>
          </Panel>

          <Panel
            title="Nginx 分发配置"
            description="这是可直接放进 /etc/nginx/sites-available/oir.me 的配置。"
            action={<CopyButton copied={copied === "nginx"} onClick={() => copyText("nginx", nginxConfig)} />}
          >
            <pre className="max-h-[520px] overflow-auto rounded-2xl border border-white/8 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
              <code>{nginxConfig}</code>
            </pre>
          </Panel>

          <Panel
            title="证书命令"
            description="DNS 已经指向服务器以后再执行；未生效前执行会失败。"
            action={<CopyButton copied={copied === "certbot"} onClick={() => copyText("certbot", certbotCommand)} />}
          >
            <pre className="overflow-auto rounded-2xl border border-white/8 bg-black/40 p-4 text-xs leading-6 text-zinc-300">
              <code>{certbotCommand}</code>
            </pre>
          </Panel>

          <Panel title="落地判断" description="看到这些现象，就说明链路已经通了。">
            <div className="space-y-3 text-sm text-zinc-300">
              <FlowItem icon={<Network className="h-4 w-4" />} text="访问 app.oir.me 能进入 MyOPC 控制台。" />
              <FlowItem icon={<SquareTerminal className="h-4 w-4" />} text="访问 code.oir.me 能进入 MyOPC 智能编码工作台。" />
              <FlowItem icon={<ShieldCheck className="h-4 w-4" />} text="浏览器地址栏显示 HTTPS 有效证书。" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function buildNginxConfig(rules: DistributionRule[]) {
  const mapLines = rules.map((rule) => `  ${rule.host} ${rule.target};`).join("\n");

  return `map $http_upgrade $connection_upgrade {
  default upgrade;
  '' close;
}

map $host $oir_upstream {
  default http://127.0.0.1:3100;
${mapLines}
}

server {
  listen 80;
  server_name ${BASE_DOMAIN} *.${BASE_DOMAIN};

  location /.well-known/acme-challenge/ {
    root /var/www/certbot;
  }

  location / {
    proxy_pass $oir_upstream;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 3600;
  }
}`;
}

function buildCertbotCommand(rules: DistributionRule[]) {
  const hosts = Array.from(new Set(rules.map((rule) => rule.host)));
  const domains = hosts.map((host) => `-d ${host}`).join(" ");
  return `sudo mkdir -p /var/www/certbot
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx --redirect ${domains}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 break-words text-base font-semibold text-white sm:text-lg">{value}</div>
    </div>
  );
}

function GuideStep({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="flex items-center gap-2 text-cyan-300">
        {icon}
        <div className="text-sm font-medium text-white">{title}</div>
      </div>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{text}</div>
    </div>
  );
}

function FlowItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <span className="mt-0.5 shrink-0 text-cyan-300">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function StatusPill({ status }: { status: DistributionRule["status"] }) {
  const labelMap: Record<DistributionRule["status"], string> = {
    ready: "已准备",
    "after-dns": "等 DNS",
    "tls-next": "待证书",
  };

  const classMap: Record<DistributionRule["status"], string> = {
    ready: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    "after-dns": "border-amber-500/30 bg-amber-500/10 text-amber-300",
    "tls-next": "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${classMap[status]}`}>
      {labelMap[status]}
    </span>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.08] hover:text-white"
      aria-label="复制配置"
      title="复制配置"
    >
      {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
