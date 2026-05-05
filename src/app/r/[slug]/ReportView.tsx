"use client";

import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import Link from "next/link";

interface Seat {
  user_principal_name: string | null;
  display_name: string | null;
  department: string | null;
  job_title: string | null;
  license_sku: string | null;
  last_active_at: string | null;
  days_since_active: number | null;
  bucket: string;
  role_fit: string | null;
  score: number;
  recommendation: string | null;
}

interface Upload {
  id: number;
  slug: string;
  filename: string;
  license_cost_pence: number;
  currency: string;
  total_seats: number;
  dormant_seats: number;
  wasted_pence_per_month: number;
  created_at: string;
}

const BUCKET_COLOURS: Record<string, string> = {
  active: "#22c55e",
  low_use: "#f59e0b",
  wrong_role: "#a855f7",
  dormant: "#ef4444",
};

const BUCKET_LABELS: Record<string, string> = {
  active: "Active",
  low_use: "Low use",
  wrong_role: "Wrong role",
  dormant: "Dormant",
};

function fmtGBP(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pounds);
}

export default function ReportView({ upload, seats }: { upload: Upload; seats: Seat[] }) {
  const [filter, setFilter] = useState<string>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, low_use: 0, wrong_role: 0, dormant: 0 };
    seats.forEach((s) => {
      c[s.bucket] = (c[s.bucket] ?? 0) + 1;
    });
    return c;
  }, [seats]);

  const wastedSeats = (counts.dormant ?? 0) + (counts.wrong_role ?? 0);
  const wastedPerYear = upload.wasted_pence_per_month * 12;
  const utilisationPct =
    upload.total_seats === 0
      ? 0
      : Math.round(((counts.active ?? 0) / upload.total_seats) * 100);

  const pieData = (["dormant", "wrong_role", "low_use", "active"] as const).map((b) => ({
    name: BUCKET_LABELS[b],
    bucket: b,
    value: counts[b] ?? 0,
  })).filter((d) => d.value > 0);

  const departments = useMemo(() => {
    const map = new Map<string, { dormant: number; wrong_role: number; total: number }>();
    seats.forEach((s) => {
      const dept = s.department || "Unspecified";
      const cur = map.get(dept) ?? { dormant: 0, wrong_role: 0, total: 0 };
      cur.total += 1;
      if (s.bucket === "dormant") cur.dormant += 1;
      if (s.bucket === "wrong_role") cur.wrong_role += 1;
      map.set(dept, cur);
    });
    return Array.from(map.entries())
      .map(([name, v]) => ({
        name,
        dormant: v.dormant,
        wrong_role: v.wrong_role,
        total: v.total,
        wasted: (v.dormant + v.wrong_role) * upload.license_cost_pence,
      }))
      .sort((a, b) => b.wasted - a.wasted)
      .slice(0, 8);
  }, [seats, upload.license_cost_pence]);

  const filteredSeats = useMemo(() => {
    if (filter === "all") return seats;
    return seats.filter((s) => s.bucket === filter);
  }, [seats, filter]);

  function downloadCsv() {
    const cols = [
      "User",
      "Email",
      "Department",
      "Job title",
      "Bucket",
      "Role fit",
      "Days since active",
      "Score",
      "Recommendation",
    ];
    const rows = seats.map((s) => [
      s.display_name ?? "",
      s.user_principal_name ?? "",
      s.department ?? "",
      s.job_title ?? "",
      BUCKET_LABELS[s.bucket] ?? s.bucket,
      s.role_fit ?? "",
      s.days_since_active ?? "",
      String(s.score),
      s.recommendation ?? "",
    ]);
    const csv = [cols, ...rows]
      .map((r) =>
        r
          .map((c) => {
            const v = String(c);
            return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seatscore-${upload.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-3xl" />
      </div>

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-blue-400" />
          SeatScore
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCsv}
            className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <Link
            href="/"
            className="btn-secondary inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            New scan
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-2 flex items-center gap-3 text-sm text-zinc-400">
          <span>{upload.filename}</span>
          <span className="text-zinc-600">/</span>
          <span>{new Date(upload.created_at).toLocaleString("en-GB")}</span>
        </div>
        <h1 className="text-3xl font-bold md:text-4xl">
          {wastedSeats > 0 ? (
            <>
              <span className="gradient-text">{fmtGBP(upload.wasted_pence_per_month)}</span>{" "}
              <span className="text-zinc-300">per month going to seats nobody is using</span>
            </>
          ) : (
            <span>Healthy utilisation. No obvious waste.</span>
          )}
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          {upload.total_seats} seats analysed at {fmtGBP(upload.license_cost_pence)}/month each.{" "}
          {wastedSeats > 0
            ? `${wastedSeats} seats (${Math.round((wastedSeats / upload.total_seats) * 100)}%) flagged. ${fmtGBP(wastedPerYear)} per year if nothing changes.`
            : `Everyone in the export is active. Worth re-running monthly.`}
        </p>
      </div>

      <section className="mx-auto mt-10 grid max-w-6xl grid-cols-2 gap-4 px-6 md:grid-cols-4">
        <Stat label="Total seats" value={String(upload.total_seats)} />
        <Stat
          label="Active"
          value={String(counts.active ?? 0)}
          sub={`${utilisationPct}% utilisation`}
          tone="good"
        />
        <Stat
          label="Dormant"
          value={String(counts.dormant ?? 0)}
          sub={fmtGBP((counts.dormant ?? 0) * upload.license_cost_pence) + "/mo"}
          tone="bad"
        />
        <Stat
          label="Wrong role"
          value={String(counts.wrong_role ?? 0)}
          sub={fmtGBP((counts.wrong_role ?? 0) * upload.license_cost_pence) + "/mo"}
          tone="warn"
        />
      </section>

      <section className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-4 px-6 lg:grid-cols-2">
        <div className="card rounded-2xl p-6">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Bucket breakdown</h3>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={2}
                  stroke="none"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.bucket} fill={BUCKET_COLOURS[entry.bucket]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f0f17",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8,
                    color: "#e7e7ea",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {pieData.map((d) => (
              <div key={d.bucket} className="flex items-center gap-1.5 text-zinc-400">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: BUCKET_COLOURS[d.bucket] }}
                />
                {d.name}: {d.value}
              </div>
            ))}
          </div>
        </div>

        <div className="card rounded-2xl p-6">
          <h3 className="mb-4 text-sm font-semibold text-zinc-300">Top departments by waste</h3>
          {departments.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              No department data in the export.
            </div>
          ) : (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={departments} layout="vertical" margin={{ left: 8, right: 24 }}>
                  <XAxis
                    type="number"
                    stroke="#52525b"
                    fontSize={11}
                    tickFormatter={(v) => fmtGBP(v as number)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#a1a1aa"
                    fontSize={11}
                    width={120}
                  />
                  <Tooltip
                    formatter={(v) => fmtGBP(v as number)}
                    contentStyle={{
                      background: "#0f0f17",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8,
                      color: "#e7e7ea",
                    }}
                  />
                  <Bar dataKey="wasted" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-8 max-w-6xl px-6 pb-16">
        <div className="card rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5">
            <h3 className="text-sm font-semibold text-zinc-300">Seat detail</h3>
            <div className="flex flex-wrap gap-2 text-xs">
              {(["all", "dormant", "wrong_role", "low_use", "active"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={
                    "rounded-md border px-2.5 py-1 transition-colors " +
                    (filter === f
                      ? "border-blue-400/50 bg-blue-500/10 text-blue-200"
                      : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05]")
                  }
                >
                  {f === "all" ? "All" : BUCKET_LABELS[f]}
                  {f !== "all" ? <span className="ml-1 text-zinc-500">{counts[f] ?? 0}</span> : null}
                </button>
              ))}
            </div>
          </div>
          <div className="scrollbar-thin max-h-[600px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-black/50 backdrop-blur">
                <tr className="border-b border-white/5 text-left text-xs text-zinc-500">
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Department</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Days idle</th>
                  <th className="px-5 py-3 font-medium">Bucket</th>
                  <th className="px-5 py-3 font-medium">Recommendation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredSeats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      Nothing in this bucket.
                    </td>
                  </tr>
                ) : (
                  filteredSeats.map((s, i) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="px-5 py-3">
                        <div className="font-medium text-zinc-200">
                          {s.display_name || s.user_principal_name || "Unknown"}
                        </div>
                        {s.user_principal_name && s.display_name ? (
                          <div className="text-xs text-zinc-500">{s.user_principal_name}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{s.department ?? "-"}</td>
                      <td className="px-5 py-3 text-zinc-400">{s.job_title ?? "-"}</td>
                      <td className="px-5 py-3 text-zinc-400">
                        {s.days_since_active === null
                          ? "-"
                          : s.days_since_active >= 9999
                            ? "Never"
                            : s.days_since_active}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs"
                          style={{
                            background: BUCKET_COLOURS[s.bucket] + "22",
                            color: BUCKET_COLOURS[s.bucket],
                          }}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: BUCKET_COLOURS[s.bucket] }}
                          />
                          {BUCKET_LABELS[s.bucket] ?? s.bucket}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-zinc-400">{s.recommendation ?? "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-6">
          <h3 className="text-base font-semibold text-zinc-100">What to do with this</h3>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-300">
            <li>Pull the dormant list. Send a one-line survey: "We are reclaiming this. Reply if you need it."</li>
            <li>Reassign wrong-role seats to people on the waiting list before the next renewal cycle.</li>
            <li>For low-use seats, run a 30-min department workshop with three real prompts that solve their work.</li>
            <li>Re-run this scan in 30 days. The number should drop. If it does not, you have a leadership problem, not a tooling problem.</li>
          </ol>
        </div>
      </section>

      <footer className="border-t border-white/5 py-8 text-center text-xs text-zinc-500">
        Built by L8. If you want help acting on this, the consulting day rate is GBP 1500-3000.
      </footer>
    </main>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "warn" | "bad";
}) {
  const colour =
    tone === "good"
      ? "text-emerald-400"
      : tone === "bad"
        ? "text-red-400"
        : tone === "warn"
          ? "text-amber-400"
          : "text-zinc-100";
  return (
    <div className="card rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={"mt-1 text-3xl font-bold " + colour}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-zinc-400">{sub}</div> : null}
    </div>
  );
}
