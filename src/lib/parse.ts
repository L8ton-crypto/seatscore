// CSV parsing for Microsoft 365 admin centre licence + activity exports.
// Tolerant of column-name variation.

export interface ParsedRow {
  userPrincipalName: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  licenseSku: string | null;
  lastActiveAt: string | null;
  daysSinceActive: number | null;
}

const LIKELY_KEYS: Record<keyof ParsedRow, string[]> = {
  userPrincipalName: ["userprincipalname","user principal name","upn","email","user","sign-in name"],
  displayName: ["displayname","display name","name"],
  department: ["department","dept"],
  jobTitle: ["jobtitle","job title","title","role"],
  licenseSku: ["licenses","licence","licensesku","license sku","assigned licenses","assigned licences","skuid"],
  lastActiveAt: ["last activity date","last active","last activity","last sign-in","last signin","last sign in","last copilot activity","last m365 copilot activity"],
  daysSinceActive: ["days since last activity","days inactive","days since active"],
};

function normaliseHeader(h: string): string {
  return h.toLowerCase().trim().replace(/\s+/g, " ");
}

function pickColumn(headers: string[], candidates: string[]): string | null {
  const norm = headers.map(normaliseHeader);
  for (const cand of candidates) {
    const idx = norm.indexOf(cand);
    if (idx >= 0) return headers[idx];
  }
  for (let i = 0; i < norm.length; i++) {
    for (const cand of candidates) {
      if (norm[i].includes(cand)) return headers[i];
    }
  }
  return null;
}

export interface MappedColumns { [k: string]: string | null; }

export function detectColumns(headers: string[]): MappedColumns {
  const out: MappedColumns = {};
  for (const key of Object.keys(LIKELY_KEYS) as (keyof ParsedRow)[]) {
    out[key] = pickColumn(headers, LIKELY_KEYS[key]);
  }
  return out;
}

export function parseRow(row: Record<string, string>, cols: MappedColumns, now: Date): ParsedRow {
  const get = (k: string): string | null => {
    const col = cols[k];
    if (!col) return null;
    const v = row[col];
    if (v === undefined || v === null || v === "") return null;
    return String(v).trim();
  };

  let lastActiveIso: string | null = null;
  let daysSinceActive: number | null = null;

  const dRaw = get("daysSinceActive");
  if (dRaw && /^\d+$/.test(dRaw)) {
    daysSinceActive = parseInt(dRaw, 10);
  }

  const laRaw = get("lastActiveAt");
  if (laRaw) {
    const ts = Date.parse(laRaw);
    if (!Number.isNaN(ts)) {
      const dt = new Date(ts);
      lastActiveIso = dt.toISOString();
      const diff = Math.floor((now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceActive === null) daysSinceActive = diff;
    } else if (laRaw.toLowerCase() === "never" || laRaw.toLowerCase() === "n/a" || laRaw === "-") {
      daysSinceActive = 9999;
    }
  }

  return {
    userPrincipalName: get("userPrincipalName"),
    displayName: get("displayName"),
    department: get("department"),
    jobTitle: get("jobTitle"),
    licenseSku: get("licenseSku"),
    lastActiveAt: lastActiveIso,
    daysSinceActive,
  };
}
