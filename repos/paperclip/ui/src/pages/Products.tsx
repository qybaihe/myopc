import { useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Eye,
  ExternalLink,
  Package2,
  SquareTerminal,
  Users,
  MousePointerClick,
  TimerReset,
} from "lucide-react";
import { useSearchParams } from "@/lib/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBreadcrumbs } from "@/context/BreadcrumbContext";
import { useCompany } from "@/context/CompanyContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  productsApi,
  type CompanyProductSnapshot,
  type ProductAnalyticsDashboard,
  type ProductAnalyticsPoint,
} from "@/api/products";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: "live" | "repo" | "missing" | "planned" | "auth_error" | "site_missing") {
  switch (status) {
    case "live":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "repo":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400";
    case "auth_error":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400";
    case "site_missing":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-400";
    case "planned":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatDelta(value: number) {
  if (!Number.isFinite(value)) return "–";
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

function formatPercentDelta(value: number) {
  if (!Number.isFinite(value)) return "–";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  if (minutes <= 0) return `${remain}s`;
  return `${minutes}m ${remain}s`;
}

function TrendBars({
  title,
  data,
  compare,
  tone = "cyan",
}: {
  title: string;
  data: ProductAnalyticsPoint[];
  compare?: ProductAnalyticsPoint[];
  tone?: "cyan" | "emerald";
}) {
  const max = Math.max(1, ...data.map((item) => item.y), ...(compare ?? []).map((item) => item.y));
  const fillClass = tone === "emerald" ? "bg-emerald-500/70" : "bg-cyan-500/70";
  const compareClass = tone === "emerald" ? "bg-emerald-300/25" : "bg-cyan-300/25";

  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-4 flex h-44 items-end gap-2">
        {data.map((item, index) => {
          const valueHeight = `${Math.max(8, (item.y / max) * 100)}%`;
          const comparePoint = compare?.[index];
          const compareHeight = comparePoint ? `${Math.max(8, (comparePoint.y / max) * 100)}%` : null;
          return (
            <div key={`${item.x}:${index}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1">
                {compareHeight ? <div className={cn("w-2 rounded-t-sm", compareClass)} style={{ height: compareHeight }} /> : null}
                <div className={cn("w-3 rounded-t-sm", fillClass)} style={{ height: valueHeight }} />
              </div>
              <div className="text-[10px] text-muted-foreground">{item.x}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{delta}</div>
    </div>
  );
}

function AnalyticsPanel({
  product,
  dashboard,
  isLoading,
  t,
}: {
  product: CompanyProductSnapshot;
  dashboard: ProductAnalyticsDashboard | undefined;
  isLoading: boolean;
  t: (key: string) => string;
}) {
  const stats = dashboard?.stats ?? null;
  const pageviews = dashboard?.pageviews ?? null;
  const hasLiveData = dashboard?.status === "live" && stats && pageviews;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card px-4 py-4 shadow-xs">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{t("Analytics & monitoring")}</h2>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge className={cn("border-0", statusBadgeClass(dashboard?.status ?? product.analytics.status))}>
            {(dashboard?.status ?? product.analytics.status) === "live"
              ? t("Live")
              : (dashboard?.status ?? product.analytics.status) === "repo"
                ? t("Repo detected")
                : (dashboard?.status ?? product.analytics.status) === "auth_error"
                  ? t("Auth required")
                  : (dashboard?.status ?? product.analytics.status) === "site_missing"
                    ? t("Website registration pending")
                : t("Not connected")}
          </Badge>
          <Badge variant="outline">{t("Source repo")} · Umami</Badge>
          {dashboard?.website?.domain ? <Badge variant="outline">{dashboard.website.domain}</Badge> : null}
        </div>

        <div className="mt-4 space-y-3 text-sm text-muted-foreground">
          {isLoading ? (
            <p>{t("Loading Umami dashboard...")}</p>
          ) : dashboard?.status === "live" ? (
            <p>{t("Umami data is being queried directly and rendered inside Paperclip.")}</p>
          ) : dashboard?.status === "repo" ? (
            <p>{t("Umami repo is available locally, but the service is not running yet.")}</p>
          ) : dashboard?.status === "site_missing" ? (
            <p>{t("Umami is running, but this website has not been registered yet. Paperclip will try to create it automatically once the site URL is stable.")}</p>
          ) : dashboard?.status === "auth_error" ? (
            <p>{dashboard.message ?? t("Paperclip could not log in to Umami. Check the local Umami credentials.")}</p>
          ) : (
            <p>{t("No local Umami repo was detected.")}</p>
          )}

          {product.analytics.repoPath ? (
            <div className="rounded-xl border bg-background/70 px-3 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Source repo")}</div>
              <div className="mt-1 break-all font-mono text-xs text-foreground">{product.analytics.repoPath}</div>
            </div>
          ) : null}

          {!hasLiveData ? (
            <div className="rounded-xl border bg-background/70 px-3 py-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Suggested source-first Umami startup")}</div>
              <div className="mt-2 space-y-1 font-mono text-xs text-foreground">
                <div>{product.analytics.installCommand}</div>
                <div>{product.analytics.databaseCommand}</div>
                <div>{product.analytics.devCommand}</div>
              </div>
              {dashboard?.message ? <div className="mt-2 text-xs text-muted-foreground">{dashboard.message}</div> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border bg-card px-4 py-4 shadow-xs">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{t("Analytics console")}</h2>
        </div>

        {hasLiveData ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <MetricTile
                label={t("Visitors")}
                value={String(stats.visitors)}
                delta={`${t("vs previous")} ${formatDelta(stats.visitors - stats.comparison.visitors)}`}
                icon={<Users className="h-4 w-4" />}
              />
              <MetricTile
                label={t("Visits")}
                value={String(stats.visits)}
                delta={`${t("vs previous")} ${formatDelta(stats.visits - stats.comparison.visits)}`}
                icon={<Activity className="h-4 w-4" />}
              />
              <MetricTile
                label={t("Pageviews")}
                value={String(stats.pageviews)}
                delta={`${t("vs previous")} ${formatDelta(stats.pageviews - stats.comparison.pageviews)}`}
                icon={<Eye className="h-4 w-4" />}
              />
              <MetricTile
                label={t("Bounce rate")}
                value={`${Math.round((Math.min(stats.visits, stats.bounces) / Math.max(1, stats.visits)) * 100)}%`}
                delta={`${t("vs previous")} ${formatPercentDelta(
                  (Math.min(stats.visits, stats.bounces) / Math.max(1, stats.visits)) * 100 -
                    (Math.min(stats.comparison.visits, stats.comparison.bounces) / Math.max(1, stats.comparison.visits)) * 100,
                )}`}
                icon={<MousePointerClick className="h-4 w-4" />}
              />
              <MetricTile
                label={t("Visit duration")}
                value={formatDuration(stats.totaltime / Math.max(1, stats.visits))}
                delta={`${t("vs previous")} ${formatDuration(
                  Math.abs(stats.totaltime / Math.max(1, stats.visits) - stats.comparison.totaltime / Math.max(1, stats.comparison.visits)),
                )}`}
                icon={<TimerReset className="h-4 w-4" />}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <TrendBars
                title={t("Pageviews trend")}
                data={pageviews.pageviews}
                compare={pageviews.compare?.pageviews}
                tone="cyan"
              />
              <TrendBars
                title={t("Sessions trend")}
                data={pageviews.sessions}
                compare={pageviews.compare?.sessions}
                tone="emerald"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState icon={BarChart3} message={t("Monitoring will appear here once Umami is started from source.")} />
          </div>
        )}
      </div>
    </div>
  );
}

export function Products() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    setBreadcrumbs([{ label: t("Products") }]);
  }, [setBreadcrumbs, t]);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products.list(selectedCompanyId!),
    queryFn: () => productsApi.list(selectedCompanyId!),
    enabled: !!selectedCompanyId,
  });

  const products = data?.products ?? [];
  const requestedProductId = searchParams.get("product");
  const activeProduct = useMemo(
    () => products.find((product) => product.id === requestedProductId) ?? products[0] ?? null,
    [products, requestedProductId],
  );
  const analyticsQuery = useQuery({
    queryKey: activeProduct && selectedCompanyId
      ? queryKeys.products.analytics(selectedCompanyId, activeProduct.id)
      : ["products", "__analytics_disabled__"] as const,
    queryFn: () => productsApi.analytics(selectedCompanyId!, activeProduct!.id),
    enabled: Boolean(selectedCompanyId && activeProduct),
  });
  const siteActionUrl = useMemo(() => {
    if (activeProduct?.site.url) return activeProduct.site.url;
    const domain = analyticsQuery.data?.website?.domain;
    return domain ? `http://${domain}` : null;
  }, [activeProduct?.site.url, analyticsQuery.data?.website?.domain]);

  useEffect(() => {
    if (!activeProduct) return;
    if (requestedProductId === activeProduct.id) return;
    const next = new URLSearchParams(searchParams);
    next.set("product", activeProduct.id);
    setSearchParams(next, { replace: true });
  }, [activeProduct, requestedProductId, searchParams, setSearchParams]);

  if (!selectedCompanyId) {
    return <EmptyState icon={Package2} message={t("Select a company to open product websites.")} />;
  }

  if (isLoading) {
    return <PageSkeleton variant="detail" />;
  }

  if (products.length === 0 || !activeProduct) {
    return (
      <EmptyState
        icon={Package2}
        message={t("No product websites yet. Create a project or start a local website first.")}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-11rem)] space-y-4">
      <div className="rounded-2xl border bg-card px-4 py-3 shadow-xs">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Package2 className="h-4 w-4 text-muted-foreground" />
              <h1 className="text-sm font-medium">{t("Products")}</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("This area collects product websites and analytics integrations. Right now it focuses on website products first.")}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {products.length > 1 ? (
              <div>
                <Select
                  value={activeProduct.id}
                  onValueChange={(value) => {
                    const next = new URLSearchParams(searchParams);
                    next.set("product", value);
                    setSearchParams(next);
                  }}
                >
                  <SelectTrigger className="min-w-[16rem] max-w-full">
                    <SelectValue placeholder={t("Choose a product")} />
                  </SelectTrigger>
                  <SelectContent align="end">
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="hidden min-w-0 md:flex md:flex-col md:items-end">
              <div className="text-sm font-medium">{activeProduct.name}</div>
              <div className="text-xs text-muted-foreground">
                {t("Monitoring first, website launch second.")}
              </div>
            </div>

            {siteActionUrl ? (
              <Button asChild size="sm" variant="outline">
                <a href={siteActionUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  {t("Open website")}
                </a>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card px-4 py-4 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("border-0", statusBadgeClass(activeProduct.site.status))}>
                {(siteActionUrl || activeProduct.site.status === "live") ? t("Live") : t("Planned")}
              </Badge>
              <Badge className={cn("border-0", statusBadgeClass(activeProduct.analytics.status))}>
                {activeProduct.analytics.status === "live"
                  ? t("Analytics live")
                  : activeProduct.analytics.status === "repo"
                    ? t("Analytics repo ready")
                    : t("Analytics missing")}
              </Badge>
              <Badge variant="outline">{t("Project")} · {activeProduct.projectName}</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {activeProduct.site.source === "runtime_service"
                ? t("Detected from project runtime services.")
                : activeProduct.site.source === "local_preview" || analyticsQuery.data?.website?.domain
                  ? t("Detected from a live local preview port.")
                  : t("No website URL is available for this product yet.")}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {activeProduct.projectLocalFolder ? (
              <Badge variant="outline" className="max-w-full truncate">
                {activeProduct.projectLocalFolder}
              </Badge>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AnalyticsPanel
          product={activeProduct}
          dashboard={analyticsQuery.data}
          isLoading={analyticsQuery.isLoading}
          t={t}
        />

        <div className="space-y-4">
          <div className="rounded-2xl border bg-card px-4 py-4 shadow-xs">
            <div className="flex items-center gap-2">
              <SquareTerminal className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{t("Runtime services")}</h2>
            </div>
            <div className="mt-3 space-y-2">
              {activeProduct.site.runtimeServices.length > 0 ? (
                activeProduct.site.runtimeServices.map((service) => (
                  <div key={service.id} className="rounded-xl border bg-background/70 px-3 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium">{service.serviceName}</div>
                      <Badge variant="outline">{service.status}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {service.url ?? service.port ?? t("No port")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                  {t("No runtime services were attached to this product yet.")}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-card px-4 py-4 shadow-xs">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium">{t("Current integration notes")}</h2>
            </div>
            <div className="mt-3 space-y-3 text-sm text-muted-foreground">
              <p>{t("Umami should be the primary monitoring panel here, and the website itself stays as a secondary action button.")}</p>
              <p>{t("This page intentionally removes the website preview and the inner left project rail, so the monitoring panel becomes the default focus.")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
