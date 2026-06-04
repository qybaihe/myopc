import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Db } from "@paperclipai/db";
import type { ProjectWorkspace, WorkspaceRuntimeService } from "@paperclipai/shared";
import { projectService } from "./projects.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const reposRoot = path.resolve(moduleDir, "../../../../");
const umamiRepoPath = path.join(reposRoot, "umami");

const PRODUCT_PREVIEW_CANDIDATES = [
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002",
  "http://127.0.0.1:3003",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:5173",
] as const;

const UMAMI_BASE_URL = "http://127.0.0.1:3000";
const UMAMI_HEARTBEAT_URL = `${UMAMI_BASE_URL}/api/heartbeat`;
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

type ProbedUrl = {
  url: string;
  status: number;
  title: string | null;
};

type ProductProjectShape = {
  id: string;
  urlKey: string | null;
  primaryWorkspace: (Pick<ProjectWorkspace, "runtimeServices"> & { runtimeServices?: WorkspaceRuntimeService[] }) | null;
  workspaces: Array<Pick<ProjectWorkspace, "runtimeServices"> & { runtimeServices?: WorkspaceRuntimeService[] }>;
};

function readRouteRef(project: Pick<ProductProjectShape, "id" | "urlKey">) {
  return project.urlKey?.trim() || project.id;
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readPublicBaseUrl(): string | null {
  const raw =
    normalizeText(process.env.PAPERCLIP_PUBLIC_URL)
    ?? normalizeText(process.env.PAPERCLIP_AUTH_PUBLIC_BASE_URL)
    ?? normalizeText(process.env.BETTER_AUTH_URL)
    ?? normalizeText(process.env.BETTER_AUTH_BASE_URL);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeSubdomainSegment(value: string | null | undefined): string | null {
  const normalized = normalizeText(value)
    ?.toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized && normalized.length > 0 ? normalized : null;
}

function readProductPublicDomainSuffix(): string | null {
  const explicit = normalizeText(process.env.PAPERCLIP_PRODUCT_PUBLIC_DOMAIN_SUFFIX);
  if (explicit) return explicit.replace(/^\.+|\.+$/g, "");

  const publicBaseUrl = readPublicBaseUrl();
  if (!publicBaseUrl) return null;
  try {
    const hostname = new URL(publicBaseUrl).hostname.toLowerCase();
    if (hostname === "myopc.me" || hostname === "www.myopc.me") return "apps.myopc.me";
  } catch {
    return null;
  }
  return null;
}

function isLoopbackUrl(rawUrl: string | null | undefined): boolean {
  const value = normalizeText(rawUrl);
  if (!value) return false;
  try {
    return LOOPBACK_HOSTS.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function publicProductUrl(project: Pick<ProductProjectShape, "id" | "urlKey">): string | null {
  const projectRef = normalizeSubdomainSegment(readRouteRef(project)) ?? normalizeSubdomainSegment(project.id);
  if (!projectRef) return null;

  const template = normalizeText(process.env.PAPERCLIP_PRODUCT_PUBLIC_URL_TEMPLATE);
  if (template) {
    return template
      .replaceAll("{{project}}", encodeURIComponent(projectRef))
      .replaceAll("{project}", encodeURIComponent(projectRef));
  }

  const suffix = readProductPublicDomainSuffix();
  return suffix ? `https://${projectRef}.${suffix}` : null;
}

export function normalizeBrowserVisibleProductUrl(
  rawUrl: string | null | undefined,
  project: Pick<ProductProjectShape, "id" | "urlKey">,
): string | null {
  const value = normalizeText(rawUrl);
  if (!value) return null;
  if (!isLoopbackUrl(value)) return value;
  return publicProductUrl(project);
}

function summarizeProjectRuntimeServices(project: ProductProjectShape) {
  const seen = new Set<string>();
  const services: WorkspaceRuntimeService[] = [];
  const workspaceCandidates = [project.primaryWorkspace, ...project.workspaces]
    .filter(Boolean)
    .flatMap((workspace) => workspace?.runtimeServices ?? []);

  for (const service of workspaceCandidates) {
    const key = service.id || `${service.serviceName}:${service.url ?? service.port ?? "none"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    services.push(service);
  }

  return services;
}

async function probeUrl(url: string): Promise<ProbedUrl | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      },
    });

    const contentType = response.headers.get("content-type") ?? "";
    let title: string | null = null;

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const match = html.match(/<title>(.*?)<\/title>/is);
      title = normalizeText(match?.[1]?.replace(/\s+/g, " ") ?? null);
    } else {
      await response.arrayBuffer().catch(() => null);
    }

    return {
      url,
      status: response.status,
      title,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function productService(db: Db) {
  const projects = projectService(db);

  return {
    listCompanyProducts: async (companyId: string) => {
      const companyProjects = (await projects.list(companyId)).filter((project) => !project.archivedAt);
      const previewCandidates = (await Promise.all(PRODUCT_PREVIEW_CANDIDATES.map((url) => probeUrl(url))))
        .filter((result): result is ProbedUrl => Boolean(result));

      const umamiHeartbeat = await probeUrl(UMAMI_HEARTBEAT_URL);
      const umamiRepoPresent = existsSync(umamiRepoPath);
      let previewIndex = 0;

      const products = companyProjects.map((project) => {
        const projectRef = readRouteRef(project);
        const runtimeServices = summarizeProjectRuntimeServices(project);
        const liveRuntimeService =
          runtimeServices.find((service) => normalizeText(service.url) && service.healthStatus === "healthy")
          ?? runtimeServices.find((service) => normalizeText(service.url) && service.status === "running")
          ?? runtimeServices.find((service) => normalizeText(service.url));

        const runtimeUrl = normalizeText(liveRuntimeService?.url);
        const preview = runtimeUrl ? null : previewCandidates[previewIndex] ?? null;
        if (!runtimeUrl && preview) {
          previewIndex += 1;
        }

        const previewUrl = normalizeBrowserVisibleProductUrl(runtimeUrl ?? preview?.url ?? null, project);
        const siteTitle = preview?.title ?? null;

        return {
          id: projectRef,
          name: project.name,
          projectId: project.id,
          projectRef,
          projectName: project.name,
          projectColor: project.color ?? null,
          projectLocalFolder: project.codebase.effectiveLocalFolder ?? null,
          site: {
            name: siteTitle ?? `${project.name} website`,
            title: siteTitle,
            url: previewUrl,
            status: previewUrl ? "live" : "planned",
            source: runtimeUrl ? "runtime_service" : preview ? "local_preview" : "missing",
            runtimeServices: runtimeServices.map((service) => ({
              id: service.id,
              serviceName: service.serviceName,
              status: service.status,
              healthStatus: service.healthStatus,
              port: service.port,
              url: normalizeBrowserVisibleProductUrl(service.url, project),
            })),
          },
          analytics: {
            provider: "umami",
            status: umamiHeartbeat ? "live" : umamiRepoPresent ? "repo" : "missing",
            baseUrl: umamiHeartbeat ? UMAMI_BASE_URL : null,
            embedUrl: umamiHeartbeat ? UMAMI_BASE_URL : null,
            repoPath: umamiRepoPresent ? umamiRepoPath : null,
            installCommand: "pnpm install",
            databaseCommand: "docker compose up -d db",
            devCommand: "pnpm dev",
            buildCommand: "pnpm build && pnpm start",
          },
        };
      });

      return {
        checkedAt: new Date().toISOString(),
        umami: {
          status: umamiHeartbeat ? "live" : umamiRepoPresent ? "repo" : "missing",
          baseUrl: umamiHeartbeat ? UMAMI_BASE_URL : null,
          repoPath: umamiRepoPresent ? umamiRepoPath : null,
        },
        products,
      };
    },
  };
}
