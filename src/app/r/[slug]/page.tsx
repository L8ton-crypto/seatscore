import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ReportView from "./ReportView";

export const dynamic = "force-dynamic";

interface ApiSeat {
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

interface ApiUpload {
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

export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/report/${slug}`, { cache: "no-store" });
  if (!res.ok) notFound();
  const data = (await res.json()) as { upload: ApiUpload; seats: ApiSeat[] };

  return <ReportView upload={data.upload} seats={data.seats} />;
}
