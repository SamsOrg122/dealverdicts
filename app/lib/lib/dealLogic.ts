// src/lib/dealLogic.ts
export type DealStatus = "GO" | "MAYBE" | "NO-GO";

export type DealInputs = {
  purchasePrice: number;     // €
  monthlyRent: number;       // €/m
  monthlyCosts: number;      // €/m
};

export type DealMetrics = {
  monthlyCashflow: number;   // €/m
  grossYield: number;        // % per jaar
  netYield: number;          // % per jaar
  status: DealStatus;
  reasons: string[];
};

function safeNumber(n: unknown) {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) ? x : 0;
}

export function computeDealMetrics(input: DealInputs): DealMetrics {
  const purchasePrice = Math.max(0, safeNumber(input.purchasePrice));
  const monthlyRent = Math.max(0, safeNumber(input.monthlyRent));
  const monthlyCosts = Math.max(0, safeNumber(input.monthlyCosts));

  const monthlyCashflow = monthlyRent - monthlyCosts;

  const annualRent = monthlyRent * 12;
  const annualNet = Math.max(0, (monthlyRent - monthlyCosts) * 12);

  const grossYield = purchasePrice > 0 ? (annualRent / purchasePrice) * 100 : 0;
  const netYield = purchasePrice > 0 ? (annualNet / purchasePrice) * 100 : 0;

  // v1 rules (simpel & uitlegbaar)
  let status: DealStatus = "NO-GO";
  const reasons: string[] = [];

  const cashflowOk = monthlyCashflow >= 0;
  const cashflowBorder = monthlyCashflow >= -100;
  const netGo = netYield >= 6;
  const netMaybe = netYield >= 4;

  if (cashflowOk && netGo) status = "GO";
  else if (cashflowBorder && netMaybe) status = "MAYBE";
  else status = "NO-GO";

  // reasons (transparant!)
  if (status === "GO") {
    reasons.push("Positieve cashflow");
    reasons.push("Netto rendement ≥ 6%");
  } else if (status === "MAYBE") {
    if (monthlyCashflow < 0) reasons.push("Licht negatieve cashflow (≥ -€100)");
    reasons.push("Netto rendement ≥ 4%");
    reasons.push("Check aannames (huur, kosten, leegstand)");
  } else {
    if (monthlyCashflow < -100) reasons.push("Cashflow te negatief (< -€100)");
    if (netYield < 4) reasons.push("Netto rendement < 4%");
  }

  return {
    monthlyCashflow,
    grossYield,
    netYield,
    status,
    reasons,
  };
}

export function statusUi(status: DealStatus) {
  switch (status) {
    case "GO":
      return { label: "GO", pill: "bg-green-100 text-green-800 ring-green-200" };
    case "MAYBE":
      return { label: "MAYBE", pill: "bg-amber-100 text-amber-900 ring-amber-200" };
    default:
      return { label: "NO-GO", pill: "bg-red-100 text-red-800 ring-red-200" };
  }
}
