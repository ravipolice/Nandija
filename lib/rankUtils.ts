export const getRankColorClass = (rank: string | undefined): string => {
  if (!rank) return "text-slate-500";
  const r = rank.toUpperCase();

  // Level 1: Top Officers (Amber/Gold)
  if (["DG & IGP", "DG", "ADGP", "IGP", "DIG", "DCP", "SP", "ADDL_SP", "DSP", "ACP", "ASST.CMDT", "DEPT.CMDT", "CMDT"].includes(r)) {
    return "text-amber-600 font-bold";
  }

  // Level 2: Inspectors & Sub-Inspectors (Indigo/Violet)
  if (r.includes("PI") || r.includes("PSI") || r.includes("RPI") || r.includes("RSI") || r.includes("CPI")) {
    return "text-indigo-600 font-bold";
  }

  // Level 3: Frontline Force (ASI, HC, PC) - Emerald/Teal
  if (r.includes("ASI") || r.includes("HC") || r.includes("PC")) {
    return "text-emerald-600 font-bold";
  }

  // Level 4: Administrative / Ministerial (Slate/Gray)
  if (["FDA", "SDA", "SS", "STENO", "TYPIST", "PA", "FOLLOWER", "GHA"].includes(r)) {
    return "text-slate-500 font-bold";
  }

  return "text-slate-500";
};
