import { existsSync } from "node:fs";
import path from "node:path";
import { IntegrationMode } from "@/lib/company-data";

export interface IntegrationSnapshot {
  key: string;
  name: string;
  mode: IntegrationMode;
  summary: string;
  evidence: string;
  endpoint?: string;
}

const WORKSPACE_ROOT = path.join(/* turbopackIgnore: true */ process.cwd(), "..");
const PATHS = {
  controlPlane: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "paperclip"),
  codeEngine: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "opencode"),
  traefik: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "traefik"),
  uptimeKuma: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "uptime-kuma"),
  umami: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "umami"),
  litellm: path.join(/* turbopackIgnore: true */ process.cwd(), "..", "repos", "litellm"),
  milkdown: path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules", "@milkdown"),
};

async function probeHttp(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(1500),
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });
    return {
      ok: true,
      status: response.status,
      url,
    };
  } catch {
    return null;
  }
}

export async function getIntegrationSnapshots(): Promise<IntegrationSnapshot[]> {
  const controlPlaneProbe = await probeHttp("http://127.0.0.1:3100/api/health");
  const codeEngineProbe =
    (await probeHttp("http://127.0.0.1:50137/health")) ??
    (await probeHttp("http://127.0.0.1:50137/"));

  return [
    {
      key: "control-plane",
      name: "MyOPC 控制面",
      mode: controlPlaneProbe ? "live" : existsSync(PATHS.controlPlane) ? "repo" : "missing",
      summary: "多 Agent 管理 / 任务 / 审批 / 项目控制平面",
      evidence: controlPlaneProbe
        ? `探活成功：${controlPlaneProbe.url} -> HTTP ${controlPlaneProbe.status}`
        : existsSync(PATHS.controlPlane)
          ? "MyOPC 控制面源码已接入工作区"
          : "未发现本地 MyOPC 控制面源码或服务",
      endpoint: controlPlaneProbe?.url,
    },
    {
      key: "code-engine",
      name: "MyOPC 智能编码引擎",
      mode: codeEngineProbe ? "live" : existsSync(PATHS.codeEngine) ? "repo" : "missing",
      summary: "本地编码执行器 / 开发改动 / 命令执行入口",
      evidence: codeEngineProbe
        ? `探活成功：${codeEngineProbe.url} -> HTTP ${codeEngineProbe.status}`
        : existsSync(PATHS.codeEngine)
          ? "MyOPC 智能编码引擎源码已接入工作区"
          : "未发现本地 MyOPC 智能编码引擎源码或服务",
      endpoint: codeEngineProbe?.url,
    },
    {
      key: "milkdown",
      name: "Milkdown",
      mode: "embedded",
      summary: "项目文档编辑器，直接内嵌在 MyOPC 页面中",
      evidence: `当前 Demo 依赖已安装：${PATHS.milkdown}`,
    },
    {
      key: "workspace-knowledge",
      name: "本地知识索引",
      mode: "embedded",
      summary: "读取工作区 markdown 文档并在项目知识页搜索",
      evidence: `直接读取工作区：${WORKSPACE_ROOT}`,
    },
    {
      key: "traefik",
      name: "Traefik",
      mode: existsSync(PATHS.traefik) ? "repo" : "missing",
      summary: "二级域名分发 / 路由 / HTTPS 入口",
      evidence: existsSync(PATHS.traefik) ? `已发现仓库：${PATHS.traefik}` : "未发现本地 Traefik 仓库",
    },
    {
      key: "uptime-kuma",
      name: "Uptime Kuma",
      mode: existsSync(PATHS.uptimeKuma) ? "repo" : "missing",
      summary: "服务探活 / 性能监控 / 状态页",
      evidence: existsSync(PATHS.uptimeKuma)
        ? `已发现仓库：${PATHS.uptimeKuma}`
        : "未发现本地 Uptime Kuma 仓库",
    },
    {
      key: "umami",
      name: "Umami",
      mode: existsSync(PATHS.umami) ? "repo" : "missing",
      summary: "访问分析 / 页面来源 / 转化数据",
      evidence: existsSync(PATHS.umami) ? `已发现仓库：${PATHS.umami}` : "未发现本地 Umami 仓库",
    },
    {
      key: "litellm",
      name: "LiteLLM",
      mode: existsSync(PATHS.litellm) ? "repo" : "missing",
      summary: "统一 LLM 代理 / 模型网关 / 预算统计",
      evidence: existsSync(PATHS.litellm) ? `已发现仓库：${PATHS.litellm}` : "未发现本地 LiteLLM 仓库",
    },
    {
      key: "payments-demo",
      name: "支付 / 发卡页面",
      mode: "demo",
      summary: "页面已纳入项目工作台，真实支付接口还未接入",
      evidence: "当前只完成项目内编排与 Demo 状态流，没有真实第三方支付 API 凭证。",
    },
  ];
}
