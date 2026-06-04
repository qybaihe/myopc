"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { CreditCard, ShoppingBag, WalletCards } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Panel from "@/components/panel";
import { useCompany } from "@/lib/company-context";
import { getPaymentEventsForProject, getProductsForProject, getProjectById } from "@/lib/company-data";

export default function ProjectCommercePage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const { state, hydrated } = useCompany();
  const project = getProjectById(state, projectId);
  const products = getProductsForProject(state, projectId);
  const paymentEvents = getPaymentEventsForProject(state, projectId);

  const funnelData = useMemo(
    () => [
      { label: "到达商品页", value: Math.max(project?.visitors7d ?? 0, 120) },
      { label: "进入结算", value: Math.round((project?.visitors7d ?? 120) * 0.22) },
      { label: "支付成功", value: Math.round((project?.visitors7d ?? 120) * 0.08) },
    ],
    [project?.visitors7d]
  );

  if (!hydrated || !project) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/8 bg-white/[0.03] p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">支付 / 发卡</div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{project.name} 的商业化页面</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-400 sm:text-base">
              你提到的发卡网站、支付页、回调页，这一版已经作为项目内的标准页面类型纳进来了。现在先把 Demo 编排和状态流做扎实；能真连后端时再逐步替换接口层。
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="在售商品" value={`${products.length}`} />
            <Stat label="最新支付事件" value={`${paymentEvents.length}`} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_420px]">
        <div className="space-y-6">
          <Panel title="商品与套餐" description="先把项目内支付页的结构位做完整。">
            <div className="grid gap-4 lg:grid-cols-2">
              {products.length ? products.map((product) => (
                <div key={product.id} className="rounded-[28px] border border-white/8 bg-black/20 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-lg font-semibold text-white">{product.name}</div>
                      <div className="mt-1 text-sm text-zinc-500">{product.plan} · {product.billing}</div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] text-zinc-300">
                      {product.status === "selling" ? "在售" : "草稿"}
                    </span>
                  </div>
                  <div className="mt-6 text-3xl font-semibold text-white">¥{product.price}</div>
                  <div className="mt-2 text-sm text-zinc-500">转化率 {product.conversion}%</div>
                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <SmallCard icon={<ShoppingBag className="h-4 w-4" />} label="商品页" value="已纳入项目" />
                    <SmallCard icon={<WalletCards className="h-4 w-4" />} label="支付回调" value="待真连" />
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-6 text-sm text-zinc-500">当前项目还没有商业化商品。</div>
              )}
            </div>
          </Panel>

          <Panel title="支付漏斗 Demo" description="这块先做项目级商业化看板，后续再接真实支付埋点。">
            <div className="h-80 rounded-2xl border border-white/8 bg-black/20 p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                  <XAxis type="number" stroke="#71717a" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" stroke="#71717a" tickLine={false} axisLine={false} width={86} />
                  <Tooltip contentStyle={{ background: "#09090b", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }} />
                  <Bar dataKey="value" fill="#22d3ee" radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="最近支付事件" description="状态流先做 Demo，但已经按项目维度归档。">
            <div className="space-y-3">
              {paymentEvents.length ? paymentEvents.map((event) => (
                <div key={event.id} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <CreditCard className="h-4 w-4 text-cyan-300" />
                        {event.title}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{event.kind} · {event.time}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">{event.amount ? `¥${event.amount}` : "—"}</div>
                      <div className={`mt-1 text-xs ${event.status === "success" ? "text-emerald-300" : event.status === "pending" ? "text-amber-300" : "text-red-300"}`}>
                        {event.status}
                      </div>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-6 text-sm text-zinc-500">当前项目没有支付事件。</div>
              )}
            </div>
          </Panel>

          <Panel title="当前阶段说明" description="为什么这里先上 Demo 页面，而不是假装已经全部真连。">
            <div className="space-y-3 text-sm text-zinc-300">
              <Reason text="支付页和发卡页已经进入项目工作台结构，这一步解决的是编排问题。" />
              <Reason text="真实支付接口、Webhook 签名校验、订单落库等后端链路还没有在这个仓库里连好。" />
              <Reason text="所以当前把页面和状态流占住，同时明确标注为 Demo，不伪装成“已接通”。" />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function SmallCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="flex items-center gap-2 text-xs text-zinc-500">{icon}{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function Reason({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">{text}</div>;
}
