// Scoring logic for SeatScore.

export type Bucket = "dormant" | "low_use" | "wrong_role" | "active";
export type RoleFit = "high" | "medium" | "low" | "unknown";

const HIGH_USAGE_KEYWORDS = [
  "engineer","developer","architect","analyst","data","consultant",
  "scientist","researcher","writer","marketing","product manager",
  "designer","lawyer","legal","finance","accountant","auditor",
  "operations","strategy","manager","director","principal","lead",
  "head of","chief","vp",
];

const LOW_USAGE_KEYWORDS = [
  "driver","warehouse","receptionist","porter","cleaner",
  "security guard","field","factory","production line","frontline",
  "barista","cashier","kitchen",
];

export function classifyRoleFit(jobTitle: string | undefined | null): RoleFit {
  if (!jobTitle) return "unknown";
  const t = jobTitle.toLowerCase();
  for (const k of LOW_USAGE_KEYWORDS) if (t.includes(k)) return "low";
  for (const k of HIGH_USAGE_KEYWORDS) if (t.includes(k)) return "high";
  return "medium";
}

export interface SeatInput {
  jobTitle?: string | null;
  daysSinceActive: number | null;
}

export interface SeatVerdict {
  bucket: Bucket;
  roleFit: RoleFit;
  score: number;
  recommendation: string;
}

export function classifySeat(input: SeatInput): SeatVerdict {
  const roleFit = classifyRoleFit(input.jobTitle);
  const days = input.daysSinceActive;

  if (days === null || days >= 30) {
    return {
      bucket: "dormant",
      roleFit,
      score: 0,
      recommendation: "Revoke or reassign. No activity in 30+ days.",
    };
  }

  if (roleFit === "low") {
    return {
      bucket: "wrong_role",
      roleFit,
      score: 25,
      recommendation: "Role unlikely to benefit. Reassign to a knowledge worker.",
    };
  }

  if (days >= 14) {
    return {
      bucket: "low_use",
      roleFit,
      score: 50,
      recommendation: "Low engagement. Pair with a 30-min use-case workshop.",
    };
  }

  return {
    bucket: "active",
    roleFit,
    score: 100,
    recommendation: "Healthy usage. No action.",
  };
}

export function bucketLabel(b: Bucket): string {
  switch (b) {
    case "dormant": return "Dormant";
    case "low_use": return "Low use";
    case "wrong_role": return "Wrong role";
    case "active": return "Active";
  }
}

export function bucketColor(b: Bucket): string {
  switch (b) {
    case "dormant": return "#ef4444";
    case "low_use": return "#f59e0b";
    case "wrong_role": return "#a855f7";
    case "active": return "#22c55e";
  }
}
