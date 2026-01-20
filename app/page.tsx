'use client'
console.log('PAGE VERSION: 2026-01-15 v11 (Filters + Sort + Quick Funda action)')

import React, { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from './lib/supabaseClient'

type AnalysisRow = {
  id: number
  property_id: number
  monthly_rent: number | null
  monthly_costs: number | null
  monthly_cashflow: number | null
  gross_yield: number | null
  net_yield: number | null
  created_at?: string | null
}

type PropertyRow = {
  id: number
  user_id?: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  property_type: string | null
  bedrooms: number | null
  surface_m2: number | null
  year_built: number | null
  funda_url: string | null
  notes: string | null
  purchase_price: number | null
  created_at?: string | null
  deal_analysis?: AnalysisRow[]
  latestAnalysis?: AnalysisRow | null
}

type VerdictPack = {
  label: 'GO' | 'MAYBE' | 'NO-GO' | 'ONBEKEND'
  color: string
  title: string
  reason: string
  bullets: string[]
  tips: string[]
}

type ToastState =
  | { open: true; kind: 'success' | 'error' | 'info'; title: string; message?: string }
  | { open: false }

type VerdictFilter = 'ALL' | 'GO' | 'MAYBE' | 'NO-GO' | 'ONBEKEND'
type SortMode = 'verdict' | 'score' | 'newest'

// ---------- helpers ----------
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function fmtEUR(n: number | null | undefined) {
  const v = Number(n ?? 0)
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  const formatted = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 0 }).format(abs)
  return `${sign}€ ${formatted}`
}

function fmtPct(n: number | null | undefined) {
  const v = Number(n ?? 0)
  return `${v.toFixed(2)}%`
}

function getDealVerdict(cashflow: number | null, netYield: number | null): VerdictPack {
  const cf = cashflow ?? 0
  const ny = netYield ?? 0

  if (cashflow === null || netYield === null) {
    return {
      label: 'ONBEKEND',
      color: '#94a3b8',
      title: 'Nog geen analyse',
      reason: 'Vul huur en kosten in om deze deal te beoordelen.',
      bullets: [
        'Vul een realistische maandhuur in.',
        'Vul alle maandelijkse kosten in (VvE, onderhoud, leegstand).',
        'Bekijk daarna cashflow en rendement.',
      ],
      tips: ['Tip: reken liever iets te conservatief dan te optimistisch.'],
    }
  }

  if (cf >= 0 && ny >= 6) {
    return {
      label: 'GO',
      color: '#22c55e',
      title: 'GO — financieel sterke deal',
      reason: `Positieve cashflow (${fmtEUR(cf)}/m) en netto rendement ${ny.toFixed(2)}%.`,
      bullets: ['Plan zo snel mogelijk een bezichtiging.', 'Check huurpotentie en regelgeving.', 'Laat kosten en staat controleren.'],
      tips: ['Tip: zelfs kleine prijsverlagingen maken deze deal nóg beter.'],
    }
  }

  if (cf < 0 && ny < 4) {
    return {
      label: 'NO-GO',
      color: '#ef4444',
      title: 'NO-GO — financieel zwak',
      reason: `Negatieve cashflow (${fmtEUR(cf)}/m) en laag rendement (${ny.toFixed(2)}%).`,
      bullets: ['Alleen interessant bij forse prijsverlaging.', 'Of met duidelijke value-add strategie.', 'Zonder plan: overslaan.'],
      tips: ['Tip: discipline is winstgevender dan elke deal willen doen.'],
    }
  }

  const issue =
    cf < 0 && ny >= 4
      ? 'Rendement is oké, maar cashflow is negatief.'
      : cf >= 0 && ny < 6
      ? 'Cashflow is oké, maar rendement is te laag.'
      : 'Cashflow en rendement zijn borderline.'

  return {
    label: 'MAYBE',
    color: '#f59e0b',
    title: 'MAYBE — potentie, maar werk nodig',
    reason: `${issue} (CF ${fmtEUR(cf)}/m, netto ${ny.toFixed(2)}%).`,
    bullets: ['Onderhandel op aankoopprijs.', 'Check of huur omhoog kan.', 'Maak meerdere scenario’s en stuur richting GO.'],
    tips: ['Tip: ga alleen door als je weet hoe je dit een GO maakt.'],
  }
}

function verdictPriority(label: string) {
  if (label === 'GO') return 0
  if (label === 'MAYBE') return 1
  if (label === 'NO-GO') return 2
  return 3
}

function getDealScoreAndAdvice(cashflow: number | null, netYield: number | null) {
  if (cashflow === null || netYield === null) {
    return { score: 0, advice: 'Nog geen analyse ingevuld.' }
  }

  let score = (netYield ?? 0) * 8
  if ((cashflow ?? 0) > 0) score += Math.min((cashflow ?? 0) / 50, 20)
  if ((cashflow ?? 0) < 0) score -= Math.min(Math.abs(cashflow ?? 0) / 50, 25)
  score = clamp(Math.round(score))

let advice = 'Werkbare deal.'
if (score >= 75) advice = 'Sterke deal.'
else if (score >= 55) advice = 'Werkbare deal.'
else if (score >= 35) advice = 'Risicovol.'
else advice = 'Zwak.'

  return { score, advice }
}

function computeFromScenario(purchasePrice: number, monthlyRent: number, monthlyCosts: number) {
  const monthlyCashflow = monthlyRent - monthlyCosts
  const grossYield = purchasePrice > 0 ? ((monthlyRent * 12) / purchasePrice) * 100 : 0
  const netYield = purchasePrice > 0 ? ((monthlyCashflow * 12) / purchasePrice) * 100 : 0
  return { monthlyCashflow, grossYield, netYield }
}

function analysisLabel(a: AnalysisRow) {
  const rent = Math.round(a.monthly_rent ?? 0)
  const costs = Math.round(a.monthly_costs ?? 0)
  const cf = Math.round(a.monthly_cashflow ?? 0)
  const ny = Number(a.net_yield ?? 0).toFixed(2)
  const when = a.created_at ? new Date(a.created_at).toLocaleString() : ''
  return `#${a.id} · Huur ${fmtEUR(rent)} · Kosten ${fmtEUR(costs)} · CF ${fmtEUR(cf)} · Netto ${ny}% ${when ? `(${when})` : ''}`
}

function scoreOf(a: AnalysisRow | null | undefined) {
  if (!a) return 0
  return getDealScoreAndAdvice(a.monthly_cashflow ?? null, a.net_yield ?? null).score
}

function safeNum(v: string) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// --- Funda import parsing ---
function normalizeText(raw: string) {
  return raw.replace(/\u00a0/g, ' ').replace(/\r/g, '').trim()
}
function parseEuroNumber(s: string) {
  const cleaned = s.replace(/[^\d]/g, '')
  if (!cleaned) return null
  return Number(cleaned)
}
function extractPostalCode(text: string) {
  const m = text.match(/\b(\d{4}\s?[A-Z]{2})\b/)
  return m ? m[1].replace(' ', '').toUpperCase() : null
}
function extractCity(text: string) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  for (const l of lines) {
    const m = l.match(/\b\d{4}\s?[A-Z]{2}\b\s+(.+)$/)
    if (m && m[1]) return m[1].split('·')[0].split(',')[0].trim()
  }
  return null
}
function extractAddressLine(text: string) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const streetWords = /straat|laan|weg|plein|gracht|kade|singel|dijk|hof|park|boulevard|steeg/i

  const candidate =
    lines.find((l) => streetWords.test(l) && /\b\d{1,4}\b/.test(l)) ||
    lines.find((l) => /\b\d{1,4}\b/.test(l))

  if (!candidate) return null
  return candidate.replace(/\s*\|\s*Funda\s*$/i, '').trim()
}
function extractM2(text: string) {
  const m = text.match(/(\d{1,4})\s?m²/i)
  return m ? Number(m[1]) : null
}
function extractRooms(text: string) {
  const m = text.match(/(\d{1,2})\s?kamers?/i)
  return m ? Number(m[1]) : null
}
function extractBedrooms(text: string) {
  const m = text.match(/(\d{1,2})\s?slaapkamers?/i)
  return m ? Number(m[1]) : null
}
function extractYearBuilt(text: string) {
  const m = text.match(/bouwjaar[:\s]*((19\d{2})|(20\d{2}))/i)
  if (m && m[1]) return Number(m[1])
  const y = text.match(/\b(19\d{2}|20\d{2})\b/)
  return y ? Number(y[1]) : null
}
function extractPropertyType(text: string) {
  const t = text.toLowerCase()
  if (t.includes('appartement')) return 'Appartement'
  if (t.includes('tussenwoning')) return 'Tussenwoning'
  if (t.includes('hoekwoning')) return 'Hoekwoning'
  if (t.includes('vrijstaande')) return 'Vrijstaand'
  if (t.includes('2-onder-1-kap') || t.includes('twee-onder-een-kap')) return '2-onder-1-kap'
  if (t.includes('studio')) return 'Studio'
  return null
}
function extractFundaData(raw: string) {
  const text = normalizeText(raw)

  const priceMatch = text.match(/€\s?[\d.\s]+/i)
  const price = priceMatch ? parseEuroNumber(priceMatch[0]) : null

  const postalCode = extractPostalCode(text)
  const city = extractCity(text)

  const titleLine =
    text
      .split('\n')
      .map((l) => l.trim())
      .find((l) => /huis te koop:/i.test(l)) ?? null

  const addrFromTitle = titleLine
    ? titleLine
        .replace(/huis te koop:\s*/i, '')
        .replace(/\b\d{4}\s?[A-Z]{2}\b/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    : null

  const address = addrFromTitle || extractAddressLine(text)

  const surfaceM2 = extractM2(text)
  const rooms = extractRooms(text)
  const bedrooms = extractBedrooms(text) ?? (rooms != null ? Math.max(rooms - 1, 0) : null)
  const yearBuilt = extractYearBuilt(text)
  const propertyType = extractPropertyType(text)

  const cleanCity = city ? city.replace(/\s*\|\s*Funda\s*$/i, '').trim() : null

  return {
    price,
    address,
    postalCode,
    city: cleanCity,
    propertyType,
    surfaceM2,
    bedrooms,
    yearBuilt,
    raw: text,
  }
}

const isLikelyFundaUrl = (s: string) => {
  const v = (s ?? '').trim()
  if (!v) return false
  try {
    const u = new URL(v)
    return /funda\.nl$/i.test(u.hostname) || /funda\.nl$/i.test(u.hostname.replace(/^www\./, ''))
  } catch {
    return false
  }
}

const isLikelyHttpUrl = (s: string | null | undefined) => {
  const v = (s ?? '').trim()
  if (!v) return false
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ---------- styles ----------
const s = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(1100px 650px at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 600px at 85% 10%, rgba(16,185,129,0.14), transparent 55%), #070b18',
    color: '#e5e7eb',
    padding: 20,
    overflowX: 'hidden',
    maxWidth: '100%',
    width: '100%',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  } as CSSProperties,

  shell: { maxWidth: '100%', width: '100%', margin: '0 auto', overflowX: 'hidden' } as CSSProperties,

  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
  } as CSSProperties,

  brand: { display: 'flex', alignItems: 'center', gap: 10 } as CSSProperties,
  logo: {
    width: 36,
    height: 36,
    borderRadius: 14,
    background: 'linear-gradient(135deg, rgba(99,102,241,1), rgba(16,185,129,1))',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  } as CSSProperties,

  title: { fontWeight: 950, letterSpacing: 0.2, fontSize: 16 } as CSSProperties,
  sub: { color: 'rgba(229,231,235,0.72)', fontSize: 13 } as CSSProperties,

  row: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' } as CSSProperties,

  btn: (isMobile: boolean) => ({
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e5e7eb',
    padding: '10px 12px',
    maxWidth: '100%',
    whiteSpace: isMobile ? 'normal' : 'nowrap',
    borderRadius: 12,
    fontWeight: 800,
    cursor: 'pointer',
  } as CSSProperties),

  btnPrimary: (isMobile: boolean) => ({
    border: '1px solid rgba(99,102,241,0.35)',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95))',
    color: '#fff',
    padding: '10px 12px',
    maxWidth: '100%',
    whiteSpace: isMobile ? 'normal' : 'nowrap',
    borderRadius: 12,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
  } as CSSProperties),

  btnDanger: {
    border: '1px solid rgba(239,68,68,0.35)',
    background: 'rgba(239,68,68,0.12)',
    color: '#fecaca',
    padding: '10px 12px',
    borderRadius: 12,
    fontWeight: 900,
    cursor: 'pointer',
  } as CSSProperties,

  iconBtn: {
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.05)',
    color: 'rgba(229,231,235,0.9)',
    width: 34,
    height: 34,
    borderRadius: 12,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  tinyIconBtn: {
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)',
    color: 'rgba(229,231,235,0.92)',
    width: 28,
    height: 28,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 950,
  } as CSSProperties,

  linkBtn: { display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' } as CSSProperties,

  chip: {
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
  } as CSSProperties,

  pillRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } as CSSProperties,

  filterPill: {
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    cursor: 'pointer',
  } as CSSProperties,

  filterPillActive: {
    border: '1px solid rgba(99,102,241,0.45)',
    background: 'rgba(99,102,241,0.18)',
    color: '#e0e7ff',
  } as CSSProperties,

  proBadge: {
    padding: '4px 8px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 950,
    border: '1px solid rgba(99,102,241,0.35)',
    background: 'rgba(99,102,241,0.14)',
    color: '#c7d2fe',
  } as CSSProperties,

  hint: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    padding: 12,
  } as CSSProperties,

  card: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    padding: 14,
  } as CSSProperties,

  input: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.22)',
    color: '#e5e7eb',
    outline: 'none',
  } as CSSProperties,

  textarea: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.22)',
    color: '#e5e7eb',
    outline: 'none',
    resize: 'vertical',
  } as CSSProperties,

  label: { fontSize: 12, color: 'rgba(229,231,235,0.72)', marginBottom: 6 } as CSSProperties,

  h1: { fontSize: 26, fontWeight: 950, margin: '14px 0 6px' } as CSSProperties,
  h2: { fontSize: 15, fontWeight: 950, margin: '14px 0 10px' } as CSSProperties,
  muted: { color: 'rgba(229,231,235,0.72)' } as CSSProperties,

  layout: {
    display: 'grid',
    gridTemplateColumns: '1.25fr 1fr',
    gap: 14,
    alignItems: 'start',
  } as CSSProperties,

  list: { display: 'grid', gridTemplateColumns: '1fr', gap: 10, padding: 0, margin: 0, listStyle: 'none' } as CSSProperties,

  dealItem: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.06)',
    padding: 12,
    cursor: 'pointer',
    transition: 'transform 120ms ease',
  } as CSSProperties,

  mini: { fontSize: 12, color: 'rgba(229,231,235,0.72)', lineHeight: 1.5 } as CSSProperties,

  grid2: (isMobile: boolean) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 } as CSSProperties),
  grid3: (isMobile: boolean) => ({ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 12 } as CSSProperties),

  divider: { height: 1, background: 'rgba(255,255,255,0.10)', margin: '12px 0' } as CSSProperties,

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 50,
  } as CSSProperties,

  modal: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(10,14,28,0.92)',
    backdropFilter: 'blur(12px)',
    padding: 14,
    boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
  } as CSSProperties,

  toastWrap: {
    position: 'fixed',
    right: 16,
    bottom: 16,
    zIndex: 100,
    width: 'min(420px, calc(100vw - 32px))',
  } as CSSProperties,

  toast: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(10,14,28,0.92)',
    backdropFilter: 'blur(12px)',
    padding: 12,
    boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
  } as CSSProperties,

  emptyHero: {
    borderRadius: 18,
    border: '1px dashed rgba(255,255,255,0.18)',
    background: 'rgba(255,255,255,0.05)',
    padding: 16,
  } as CSSProperties,

  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.20)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    fontWeight: 950,
  } as CSSProperties,
}

function buildReportText(args: {
  isPro: boolean
  selected: PropertyRow
  detail: {
    purchasePrice: number
    rentNum: number
    costsNum: number
    calc: ReturnType<typeof computeFromScenario> | null
    verdict: VerdictPack
    scorePack: { score: number; advice: string }
    history: AnalysisRow[]
    best: AnalysisRow | null
  }
}) {
  const { isPro, selected, detail } = args
  const a = detail.calc
  const v = detail.verdict

  const bullets = v.bullets.length ? `\nActiepunten:\n- ${v.bullets.join('\n- ')}\n` : ''
  const tips = v.tips.length ? `\nTips:\n- ${v.tips.join('\n- ')}\n` : ''

  const base =
    `DealVerdicts Rapport\n` +
    `================\n` +
    `Deal: ${selected.address ?? '(geen adres)'}\n` +
    `Postcode: ${selected.postal_code ?? '-'}\n` +
    `Plaats: ${selected.city ?? '-'}\n` +
    `Type: ${selected.property_type ?? '-'}\n` +
    `Aankoopprijs: ${fmtEUR(detail.purchasePrice)}\n` +
    `Scenario (huur/kosten): ${fmtEUR(detail.rentNum)} / ${fmtEUR(detail.costsNum)}\n` +
    `Cashflow: ${a ? fmtEUR(a.monthlyCashflow) : '—'} / maand\n` +
    `Netto yield: ${a ? a.netYield.toFixed(2) : '—'}%\n` +
    `Bruto yield: ${a ? a.grossYield.toFixed(2) : '—'}%\n` +
    `Verdict: ${v.label}\n` +
    `Waarom: ${v.reason}\n` +
    `Score: ${detail.scorePack.score}/100\n` +
    `Advies: ${detail.scorePack.advice}\n` +
    bullets +
    tips

  if (!isPro) return base

  const best = detail.best
  const bestLine = best
    ? `\nBeste scenario (automatisch): Huur ${fmtEUR(best.monthly_rent ?? 0)} · Kosten ${fmtEUR(best.monthly_costs ?? 0)} · CF ${fmtEUR(
        best.monthly_cashflow ?? 0
      )} · Netto ${fmtPct(best.net_yield ?? 0)}\n`
    : `\nBeste scenario (automatisch): — (nog geen historie)\n`

  const last5 = detail.history.slice(0, 5)
  const historyBlock =
    `\nAnalyse-historie (laatste ${last5.length}):\n` +
    last5
      .map((x) => {
        const when = x.created_at ? new Date(x.created_at).toLocaleString() : ''
        return `- #${x.id} · Huur ${fmtEUR(x.monthly_rent ?? 0)} · Kosten ${fmtEUR(x.monthly_costs ?? 0)} · CF ${fmtEUR(
          x.monthly_cashflow ?? 0
        )} · Netto ${fmtPct(x.net_yield ?? 0)} ${when ? `(${when})` : ''}`
      })
      .join('\n') +
    '\n'

  const notesBlock = selected.notes ? `\nNotities:\n${selected.notes}\n` : ''

  return base + bestLine + historyBlock + notesBlock
}

// ---------- page ----------
export default function Home() {
  const FREE_DEAL_LIMIT = 5
    // 📱 Mobile detect (responsive)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Mobile-aware topbar styles
  const topbarRightStyle = isMobile ? { display: 'flex', flexDirection: 'column' as const, gap: 10, alignItems: 'stretch' as const } : s.row
  const topbarBtnStyle = (base: CSSProperties) => isMobile ? { ...base, whiteSpace: 'normal' as const, width: '100%' } : base

  const [isPro, setIsPro] = useState(false)
  const [planName, setPlanName] = useState<'free' | 'pro'>('free')

  const [userReady, setUserReady] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  const [showNewDeal, setShowNewDeal] = useState(true)

  const [toast, setToast] = useState<ToastState>({ open: false })
  const notify = (kind: 'success' | 'error' | 'info', title: string, message?: string) => {
    setToast({ open: true, kind, title, message })
    window.clearTimeout((notify as any)._t)
    ;(notify as any)._t = window.setTimeout(() => setToast({ open: false }), 3600)
  }

  const [verdictInfo, setVerdictInfo] = useState<VerdictPack | null>(null)

  // ✅ NEW: filter + sort controls (Deals list)
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('ALL')
  const [sortMode, setSortMode] = useState<SortMode>('verdict')

  // property fields (create)
  const [adres, setAdres] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [surfaceM2, setSurfaceM2] = useState('')
  const [yearBuilt, setYearBuilt] = useState('')
  const [fundaUrl, setFundaUrl] = useState('')
  const [notes, setNotes] = useState('')

  // Quick Add + import
  const [quickUrl, setQuickUrl] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importPreview, setImportPreview] = useState<ReturnType<typeof extractFundaData> | null>(null)
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  // analysis basic (create)
  const [prijs, setPrijs] = useState('')
  const [huur, setHuur] = useState('')
  const [kosten, setKosten] = useState('')
  const [loading, setLoading] = useState(false)

  const [deals, setDeals] = useState<PropertyRow[]>([])
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<PropertyRow | null>(null)

  // what-if scenario (detail)
  const [scenarioRent, setScenarioRent] = useState<string>('')
  const [scenarioCosts, setScenarioCosts] = useState<string>('')
  const [savingScenario, setSavingScenario] = useState(false)

  const [compareAId, setCompareAId] = useState<number | null>(null)
  const [compareBId, setCompareBId] = useState<number | null>(null)

  // ✅ Free limit is "actieve deals"
  const isAtLimit = !isPro && deals.length >= FREE_DEAL_LIMIT

  // delete modal
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // edit modal
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [edit, setEdit] = useState({
    address: '',
    postal_code: '',
    city: '',
    property_type: '',
    bedrooms: '',
    surface_m2: '',
    year_built: '',
    purchase_price: '',
    funda_url: '',
    notes: '',
  })

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }
  const goAccount = () => (window.location.href = '/account')

  useEffect(() => {
    const run = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        window.location.href = '/login'
        return
      }
      setUserEmail(data.user.email ?? null)
      setUserId(data.user.id)

      const { data: profile, error } = await supabase.from('profiles').select('is_pro, plan').eq('id', data.user.id).single()

      if (error) {
        console.error('Profile fetch error:', error)
        setIsPro(false)
        setPlanName('free')
      } else {
        const pro = Boolean(profile?.is_pro)
        setIsPro(pro)
        setPlanName(profile?.plan === 'pro' ? 'pro' : 'free')
      }

      setUserReady(true)
    }
    run()
  }, [])

 const loadDeals = async (uid?: string | null) => {
  const effectiveUid = uid ?? userId
  if (!effectiveUid) return

  const { data, error } = await supabase
    .from('properties')
    .select(
      `
        id,
        user_id,
        address,
        postal_code,
        city,
        property_type,
        bedrooms,
        surface_m2,
        year_built,
        funda_url,
        notes,
        purchase_price,
        created_at,
        deal_analysis (
          id,
          property_id,
          monthly_rent,
          monthly_costs,
          monthly_cashflow,
          gross_yield,
          net_yield,
          created_at
        )
      `
    )
    .eq('user_id', effectiveUid)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error(error)
    notify('error', 'Deals laden mislukt', error.message)
    return
  }

  const mapped: PropertyRow[] = (data ?? []).map((p: any) => {
    const analyses: AnalysisRow[] = (p.deal_analysis ?? []) as AnalysisRow[]
    analyses.sort((a, b) => ((a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1))
    return { ...p, latestAnalysis: analyses[0] ?? null }
  })

  setDeals(mapped)

  // 🔁 bestaande selectie up-to-date houden
  if (selected) {
    const updated = mapped.find((x) => x.id === selected.id)
    if (updated) setSelected(updated)
  }

  // ✅ NIEUW: auto-open als er maar 1 deal is
  if (mapped.length === 1 && !selected) {
    setSelected(mapped[0])
  }
}

  useEffect(() => {
    if (!userReady) return
    loadDeals(userId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userReady])

  useEffect(() => {
    if (!selected) return
    const a = selected.latestAnalysis
    setScenarioRent(a?.monthly_rent != null ? String(a.monthly_rent) : '')
    setScenarioCosts(a?.monthly_costs != null ? String(a.monthly_costs) : '')

    const history = (selected.deal_analysis ?? []).slice().sort((x, y) => ((x.created_at ?? '') > (y.created_at ?? '') ? -1 : 1))
    setCompareAId(history[0]?.id ?? null)
    setCompareBId(history[1]?.id ?? history[0]?.id ?? null)
  }, [selected])

  // ---- Quick Add ----
  const startQuickAdd = () => {
    const url = quickUrl.trim()
    if (!isLikelyFundaUrl(url)) {
      notify('error', 'Geen geldige Funda URL', 'Plak een link die begint met https://www.funda.nl/... (of www.funda.nl).')
      return
    }

    setFundaUrl(url)

    if (!showNewDeal) setShowNewDeal(true)
    setShowImport(true)
    setImportPreview(null)
    setImportWarnings([])

    notify('info', 'Quick Add gestart', 'Open Funda → Ctrl+A → Ctrl+C → plak in import → Analyseer → Toepassen.')
  }

  // ---- Import: preview ----
  const applyImport = () => {
    if (!importText.trim()) {
      notify('info', 'Plak eerst de tekst van Funda.')
      return
    }

    const p = extractFundaData(importText)

    const warnings: string[] = []
    if (!p.address) warnings.push('Adres niet gevonden')
    if (!p.postalCode) warnings.push('Postcode niet gevonden (verplicht om op te slaan)')
    if (!p.city) warnings.push('Plaats niet gevonden')
    if (!p.price) warnings.push('Prijs niet gevonden')
    if (!p.surfaceM2) warnings.push('m² niet gevonden')
    if (p.bedrooms == null) warnings.push('Slaapkamers niet gevonden')
    if (!p.yearBuilt) warnings.push('Bouwjaar niet gevonden')

    setImportPreview(p)
    setImportWarnings(warnings)
  }

  // ---- Import: apply to form ----
  const commitImport = () => {
    if (!importPreview) return
    const p = importPreview

    if (p.address) setAdres(p.address)
    if (p.postalCode) setPostalCode(p.postalCode)
    if (p.city) setCity(p.city)
    if (p.propertyType) setPropertyType(p.propertyType)
    if (p.surfaceM2 != null) setSurfaceM2(String(p.surfaceM2))
    if (p.bedrooms != null) setBedrooms(String(p.bedrooms))
    if (p.yearBuilt != null) setYearBuilt(String(p.yearBuilt))
    if (p.price != null) setPrijs(String(p.price))

  // ✅ nette notitie i.p.v. “alles geplakt”
setNotes((prev) => {
  const summaryLines = [
    p.address && `Adres: ${p.address}`,
    p.postalCode && `Postcode: ${p.postalCode}`,
    p.city && `Plaats: ${p.city}`,
    p.propertyType && `Type: ${p.propertyType}`,
    p.surfaceM2 != null && `Oppervlakte: ${p.surfaceM2} m²`,
    p.bedrooms != null && `Slaapkamers: ${p.bedrooms}`,
    p.yearBuilt != null && `Bouwjaar: ${p.yearBuilt}`,
    p.price != null && `Vraagprijs: € ${p.price.toLocaleString('nl-NL')}`,
  ].filter(Boolean) as string[]

  const autoBlock =
    `--- Automatisch (Funda) ---\n` +
    `Geupdate: ${new Date().toLocaleString()}\n` +
    summaryLines.join('\n')

  const OWN_HEADER = `--- Eigen notities ---`

  // pak eigen notities uit bestaande tekst (alles onder OWN_HEADER)
  const prevText = (prev ?? '').trim()
  const ownPart = prevText.includes(OWN_HEADER)
    ? prevText.split(OWN_HEADER).slice(1).join(OWN_HEADER).trim()
    : ''

  const ownBlock = `${OWN_HEADER}\n${ownPart ? ownPart.replace(/^\n+/, '') : ''}`.trimEnd()

  return `${autoBlock}\n\n${ownBlock}`
})

  notify('success', 'Import toegepast', 'Check velden en klik “Deal opslaan”.')
  setShowImport(false)
  setImportText('')
  setImportPreview(null)
  setImportWarnings([])
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isAtLimit) {
      notify(
        'info',
        'Limiet bereikt',
        `Free = max ${FREE_DEAL_LIMIT} actieve deals. Verwijder een deal om ruimte te maken of upgrade naar Pro voor onbeperkt.`
      )
      setLoading(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      notify('error', 'Niet ingelogd', 'Log opnieuw in.')
      setLoading(false)
      return
    }

    if (!postalCode.trim()) {
      notify('error', 'Postcode ontbreekt', 'Postcode is verplicht (postal_code).')
      setLoading(false)
      return
    }

    const purchasePrice = Number(prijs)
    const monthlyRent = Number(huur)
    const monthlyCosts = Number(kosten)

    const { data: propData, error: propErr } = await supabase
      .from('properties')
      .insert([
        {
          user_id: user.id,
          address: adres,
          postal_code: postalCode,
          city: city || null,
          property_type: propertyType || null,
          bedrooms: safeNum(bedrooms),
          surface_m2: safeNum(surfaceM2),
          year_built: safeNum(yearBuilt),
          funda_url: fundaUrl || null,
          notes: notes || null,
          purchase_price: purchasePrice,
        },
      ])
      .select('id')
      .single()

    if (propErr || !propData?.id) {
      setLoading(false)
      console.error(propErr)
      notify('error', 'Opslaan mislukt', propErr?.message ?? 'Property opslaan mislukt')
      return
    }

    const propertyId = Number(propData.id)
    const { monthlyCashflow, grossYield, netYield } = computeFromScenario(purchasePrice, monthlyRent, monthlyCosts)

    const { error: analysisErr } = await supabase.from('deal_analysis').insert([
      {
        user_id: user.id,
        property_id: propertyId,
        monthly_rent: monthlyRent,
        monthly_costs: monthlyCosts,
        monthly_cashflow: monthlyCashflow,
        gross_yield: grossYield,
        net_yield: netYield,
      },
    ])

    setLoading(false)

    if (analysisErr) {
      console.error(analysisErr)
      notify('error', 'Analyse opslaan mislukt', analysisErr.message)
      return
    }

    notify('success', 'Opgeslagen', 'Deal + analyse opgeslagen!')
    setAdres('')
    setPostalCode('')
    setCity('')
    setPropertyType('')
    setBedrooms('')
    setSurfaceM2('')
    setYearBuilt('')
    setFundaUrl('')
    setNotes('')
    setPrijs('')
    setHuur('')
    setKosten('')
    setQuickUrl('')
    await loadDeals(user.id)
  }

  const deleteDeal = async (id: number) => {
    setDeleting(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) throw new Error('Niet ingelogd.')

      const { data: deletedAnalyses, error: aErr } = await supabase.from('deal_analysis').delete().eq('property_id', id).select('id')
      if (aErr) throw aErr

      const { data: deletedProps, error: pErr } = await supabase.from('properties').delete().eq('id', id).eq('user_id', user.id).select('id')
      if (pErr) throw pErr

      const analysesCount = deletedAnalyses?.length ?? 0
      const propsCount = deletedProps?.length ?? 0

      if (propsCount === 0) {
        notify('error', 'Verwijderen blokkeert', `Deleted analyses: ${analysesCount}, deleted properties: ${propsCount}. (Meestal RLS of user_id mismatch.)`)
        return
      }

      notify('success', 'Verwijderd', 'Deal is definitief verwijderd. (Free limiet = actieve deals, dus je hebt nu weer ruimte.)')
      setDeleteId(null)
      if (selected?.id === id) setSelected(null)
      await loadDeals(user.id)
    } catch (e: any) {
      console.error('DELETE ERROR:', e)
      notify('error', 'Verwijderen mislukt', e?.message ?? 'Onbekende fout')
    } finally {
      setDeleting(false)
    }
  }

  const openEdit = () => {
    if (!selected) return
    setEdit({
      address: selected.address ?? '',
      postal_code: selected.postal_code ?? '',
      city: selected.city ?? '',
      property_type: selected.property_type ?? '',
      bedrooms: selected.bedrooms != null ? String(selected.bedrooms) : '',
      surface_m2: selected.surface_m2 != null ? String(selected.surface_m2) : '',
      year_built: selected.year_built != null ? String(selected.year_built) : '',
      purchase_price: selected.purchase_price != null ? String(selected.purchase_price) : '',
      funda_url: selected.funda_url ?? '',
      notes: selected.notes ?? '',
    })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    if (!selected) return
    setEditSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (!user) throw new Error('Niet ingelogd.')

      if (!edit.postal_code.trim()) {
        notify('error', 'Postcode ontbreekt', 'Postcode is verplicht.')
        setEditSaving(false)
        return
      }

      const payload = {
        address: edit.address || null,
        postal_code: edit.postal_code.trim(),
        city: edit.city || null,
        property_type: edit.property_type || null,
        bedrooms: edit.bedrooms.trim() ? safeNum(edit.bedrooms) : null,
        surface_m2: edit.surface_m2.trim() ? safeNum(edit.surface_m2) : null,
        year_built: edit.year_built.trim() ? safeNum(edit.year_built) : null,
        purchase_price: edit.purchase_price.trim() ? safeNum(edit.purchase_price) : null,
        funda_url: edit.funda_url || null,
        notes: edit.notes || null,
      }

      const { data: updated, error } = await supabase
        .from('properties')
        .update(payload)
        .eq('id', selected.id)
        .eq('user_id', user.id)
        .select(
          `
          id,
          user_id,
          address,
          postal_code,
          city,
          property_type,
          bedrooms,
          surface_m2,
          year_built,
          funda_url,
          notes,
          purchase_price,
          created_at,
          deal_analysis (
            id,
            property_id,
            monthly_rent,
            monthly_costs,
            monthly_cashflow,
            gross_yield,
            net_yield,
            created_at
          )
        `
        )
        .single()

      if (error) throw error
      if (!updated) throw new Error('Update gaf geen data terug.')

      notify('success', 'Aangepast', 'Deal details zijn opgeslagen.')
      setEditOpen(false)

      const p: any = updated
      const analyses: AnalysisRow[] = (p.deal_analysis ?? []) as AnalysisRow[]
      analyses.sort((a, b) => ((a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1))
      const updatedRow: PropertyRow = { ...p, latestAnalysis: analyses[0] ?? null }

      setSelected(updatedRow)
      setDeals((prev) => prev.map((x) => (x.id === updatedRow.id ? updatedRow : x)))
    } catch (e: any) {
      console.error('EDIT ERROR', e)
      notify('error', 'Opslaan mislukt', e?.message ?? 'Onbekende fout')
    } finally {
      setEditSaving(false)
    }
  }

  // ✅ NEW: filter + sort applied here
  const filteredDeals = useMemo(() => {
    const q = query.toLowerCase().trim()

    const base = deals.filter((d) => {
      const a = (d.address ?? '').toLowerCase()
      const pc = (d.postal_code ?? '').toLowerCase()
      const c = (d.city ?? '').toLowerCase()
      const matchesQuery = !q || a.includes(q) || pc.includes(q) || c.includes(q)

      const label = getDealVerdict(d.latestAnalysis?.monthly_cashflow ?? null, d.latestAnalysis?.net_yield ?? null).label
      const matchesVerdict = verdictFilter === 'ALL' ? true : label === verdictFilter

      return matchesQuery && matchesVerdict
    })

    const sorted = base.slice().sort((a, b) => {
      const aLabel = getDealVerdict(a.latestAnalysis?.monthly_cashflow ?? null, a.latestAnalysis?.net_yield ?? null).label
      const bLabel = getDealVerdict(b.latestAnalysis?.monthly_cashflow ?? null, b.latestAnalysis?.net_yield ?? null).label
      const aScore = getDealScoreAndAdvice(a.latestAnalysis?.monthly_cashflow ?? null, a.latestAnalysis?.net_yield ?? null).score
      const bScore = getDealScoreAndAdvice(b.latestAnalysis?.monthly_cashflow ?? null, b.latestAnalysis?.net_yield ?? null).score

      if (sortMode === 'score') {
        if (bScore !== aScore) return bScore - aScore
        // tie-break: verdict then newest
        const pv = verdictPriority(aLabel) - verdictPriority(bLabel)
        if (pv !== 0) return pv
        return (a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1
      }

if (sortMode === 'newest') {
  const at = a.created_at ?? ''
  const bt = b.created_at ?? ''

  // -1 = a boven b (a is nieuwer), 1 = b boven a, 0 = gelijk
  const t = at === bt ? 0 : at > bt ? -1 : 1

  if (t !== 0) return t
  return bScore - aScore
}

      // default: verdict
      const pv = verdictPriority(aLabel) - verdictPriority(bLabel)
      if (pv !== 0) return pv
      // within verdict: higher score first
      if (bScore !== aScore) return bScore - aScore
      return (a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1
    })

    return sorted
  }, [deals, query, verdictFilter, sortMode])

  const detail = useMemo(() => {
    if (!selected) return null

    const purchasePrice = Number(selected.purchase_price ?? 0)
    const history = (selected.deal_analysis ?? []).slice().sort((a, b) => ((a.created_at ?? '') > (b.created_at ?? '') ? -1 : 1))

    const best = history.reduce<AnalysisRow | null>((acc, cur) => {
      if (!acc) return cur
      return scoreOf(cur) > scoreOf(acc) ? cur : acc
    }, null)

    const rentNum = Number(scenarioRent)
    const costsNum = Number(scenarioCosts)
    const valid = Number.isFinite(rentNum) && Number.isFinite(costsNum)
    const calc = valid ? computeFromScenario(purchasePrice, rentNum, costsNum) : null

    const verdict = getDealVerdict(calc?.monthlyCashflow ?? null, calc?.netYield ?? null)
    const scorePack = getDealScoreAndAdvice(calc?.monthlyCashflow ?? null, calc?.netYield ?? null)

    return { purchasePrice, history, best, rentNum, costsNum, valid, calc, verdict, scorePack }
  }, [selected, scenarioRent, scenarioCosts])

  const saveScenarioAsNewAnalysis = async () => {
    if (!selected || !detail) return
    if (!detail.valid || !detail.calc) {
      notify('info', 'Vul huur en kosten in', 'Gebruik getallen.')
      return
    }
    if (!isPro) {
      notify('info', 'Pro feature', 'Meerdere scenario’s opslaan is Pro.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      notify('error', 'Niet ingelogd', 'Log opnieuw in.')
      return
    }

    setSavingScenario(true)

    const { error } = await supabase.from('deal_analysis').insert([
      {
        user_id: user.id,
        property_id: selected.id,
        monthly_rent: detail.rentNum,
        monthly_costs: detail.costsNum,
        monthly_cashflow: detail.calc.monthlyCashflow,
        gross_yield: detail.calc.grossYield,
        net_yield: detail.calc.netYield,
      },
    ])

    setSavingScenario(false)

    if (error) {
      console.error(error)
      notify('error', 'Opslaan mislukt', error.message)
      return
    }

    notify('success', 'Opgeslagen', 'Nieuwe analyse opgeslagen!')
    await loadDeals(user.id)
  }

  const upsertLatestAnalysis = async () => {
    if (!selected || !detail) return
    if (!detail.valid || !detail.calc) {
      notify('info', 'Vul huur en kosten in', 'Gebruik getallen.')
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      notify('error', 'Niet ingelogd', 'Log opnieuw in.')
      return
    }

    setSavingScenario(true)
    try {
      const latest = selected.latestAnalysis

      if (!latest?.id) {
        const { error: insErr } = await supabase.from('deal_analysis').insert([
          {
            user_id: user.id,
            property_id: selected.id,
            monthly_rent: detail.rentNum,
            monthly_costs: detail.costsNum,
            monthly_cashflow: detail.calc.monthlyCashflow,
            gross_yield: detail.calc.grossYield,
            net_yield: detail.calc.netYield,
          },
        ])
        if (insErr) throw insErr

        notify('success', 'Opgeslagen', 'Eerste analyse aangemaakt ✅')
        await loadDeals(user.id)
        return
      }

      const { error: upErr } = await supabase
        .from('deal_analysis')
        .update({
          monthly_rent: detail.rentNum,
          monthly_costs: detail.costsNum,
          monthly_cashflow: detail.calc.monthlyCashflow,
          gross_yield: detail.calc.grossYield,
          net_yield: detail.calc.netYield,
        })
        .eq('id', latest.id)
        .eq('user_id', user.id)

      if (upErr) throw upErr

      notify('success', 'Bijgewerkt', 'Laatste analyse bijgewerkt ✅')
      await loadDeals(user.id)
    } catch (e: any) {
      console.error('UPDATE ANALYSIS ERROR:', e)
      notify('error', 'Update mislukt', e?.message ?? 'Onbekende fout')
    } finally {
      setSavingScenario(false)
    }
  }

  const applyQuickDelta = (kind: 'rent' | 'costs', delta: number) => {
    if (!detail) return
    const rent = Number(scenarioRent)
    const costs = Number(scenarioCosts)
    const safeRent = Number.isFinite(rent) ? rent : 0
    const safeCosts = Number.isFinite(costs) ? costs : 0
    if (kind === 'rent') setScenarioRent(String(Math.max(0, safeRent + delta)))
    if (kind === 'costs') setScenarioCosts(String(Math.max(0, safeCosts + delta)))
  }

  const copyReport = async (mode: 'basic' | 'pro') => {
    if (!selected || !detail) return
    const text = buildReportText({
      isPro: mode === 'pro',
      selected,
      detail: {
        purchasePrice: detail.purchasePrice,
        rentNum: detail.rentNum,
        costsNum: detail.costsNum,
        calc: detail.calc,
        verdict: detail.verdict,
        scorePack: detail.scorePack,
        history: detail.history,
        best: detail.best,
      },
    })

    try {
      await navigator.clipboard.writeText(text)
      notify('success', 'Gekopieerd', mode === 'pro' ? 'Uitgebreid Pro-rapport staat op je clipboard.' : 'Samenvatting staat op je clipboard.')
    } catch {
      notify('error', 'Kopiëren lukt niet')
    }
  }

  const comparer = useMemo(() => {
    if (!detail) return null
    const history = detail.history
    const A = history.find((x) => x.id === compareAId) ?? null
    const B = history.find((x) => x.id === compareBId) ?? null
    const scoreA = scoreOf(A)
    const scoreB = scoreOf(B)
    const winner: 'A' | 'B' | 'TIE' = scoreA === scoreB ? 'TIE' : scoreA > scoreB ? 'A' : 'B'
    return { history, A, B, scoreA, scoreB, winner }
  }, [detail, compareAId, compareBId])

  if (!userReady) {
    return (
      <main style={s.page}>
        <div style={s.shell}>
          <div style={s.topbar}>
            <div style={s.brand}>
              <div style={s.logo} />
              <div>
                <div style={s.title}>DealVerdicts</div>
                <div style={s.sub}>Loading…</div>
              </div>
            </div>
            <span style={s.chip}>…</span>
          </div>
        </div>
      </main>
    )
  }

  // DETAIL
  if (selected && detail) {
    const { purchasePrice, calc, verdict, scorePack, history, best } = detail
    const bestVerdict = best ? getDealVerdict(best.monthly_cashflow ?? null, best.net_yield ?? null) : null
    const bestScore = best ? getDealScoreAndAdvice(best.monthly_cashflow ?? null, best.net_yield ?? null).score : null

    return (
      <main style={s.page}>
        <div style={s.shell}>
          <div style={s.topbar}>
            <div style={s.brand}>
              <div style={s.logo} />
              <div>
                <div style={s.title}>DealVerdicts</div>
                <div style={s.sub}>
                  Ingelogd als <strong>{userEmail ?? '-'}</strong>
                </div>
              </div>
            </div>

            <div style={topbarRightStyle}>
              <span style={s.chip}>
                Plan: {planName === 'pro' ? 'Pro' : 'Free'} {planName === 'pro' ? '✅' : ''}
              </span>
              <a href="/account" style={{ ...topbarBtnStyle(s.btnPrimary(isMobile)), ...s.linkBtn }}>
                Account / Upgrade →
              </a>
              <button onClick={logout} style={topbarBtnStyle(s.btn(isMobile))}>
                Logout
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setSelected(null)} style={s.btn(isMobile)}>
              ← Terug
            </button>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {isLikelyHttpUrl(selected.funda_url) ? (
                <a
                  href={selected.funda_url as string}
                  target="_blank"
                  rel="noreferrer"
                  style={{ ...s.btn(isMobile), ...s.linkBtn }}
                  title="Open Funda link"
                >
                  🔗 Funda →
                </a>
              ) : null}

              <button onClick={openEdit} style={s.btn(isMobile)}>
                ✎ Edit deal
              </button>
              <button onClick={() => setDeleteId(selected.id)} style={s.btnDanger}>
                ✕ Verwijder deal
              </button>
            </div>
          </div>

          <h1 style={s.h1}>{selected.address ?? '(geen adres)'}</h1>

          <div style={{ ...s.card, marginTop: 12 }}>
<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>

              <div>
                <div style={s.label}>Locatie</div>
                <div style={{ fontWeight: 950, fontSize: 16 }}>
                  {selected.postal_code ?? '-'} {selected.city ?? ''}
                </div>
                <div style={{ marginTop: 8, ...s.mini }}>
                  Type: <strong>{selected.property_type ?? '-'}</strong> · Slaapkamers: <strong>{selected.bedrooms ?? '-'}</strong> · m²:{' '}
                  <strong>{selected.surface_m2 ?? '-'}</strong> · Bouwjaar: <strong>{selected.year_built ?? '-'}</strong>
                </div>
                {selected.funda_url ? (
                  <div style={{ marginTop: 10, ...s.mini }}>
                    Funda:{' '}
                    <a href={selected.funda_url} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc' }}>
                      open link →
                    </a>
                  </div>
                ) : null}
                {selected.notes ? <div style={{ marginTop: 10, ...s.mini }}>Notities: {selected.notes}</div> : null}
              </div>

              <div>
                <div style={s.label}>Aankoopprijs</div>
                <div style={{ fontSize: 22, fontWeight: 950 }}>{fmtEUR(purchasePrice)}</div>
              </div>
            </div>
          </div>

          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ fontWeight: 950, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>⭐ Beste scenario</span>
                {!isPro ? <span style={s.proBadge}>PRO</span> : null}
              </div>

              {isPro && best ? (
                <span style={{ ...s.chip, borderColor: 'rgba(255,255,255,0.20)' }}>
                  Score {bestScore}/100 · {bestVerdict?.label}
                </span>
              ) : null}
            </div>

            {isPro ? (
              best ? (
                <div style={{ marginTop: 10, ...s.mini }}>
                  Huur {fmtEUR(best.monthly_rent ?? 0)} · Kosten {fmtEUR(best.monthly_costs ?? 0)} · Cashflow {fmtEUR(best.monthly_cashflow ?? 0)} · Netto{' '}
                  {fmtPct(best.net_yield ?? 0)}
                </div>
              ) : (
                <div style={s.muted}>Nog geen analyses om “beste scenario” te bepalen.</div>
              )
            ) : (
              <>
                <div style={{ marginTop: 8, ...s.mini }}>
                  In Pro krijg je automatisch het beste scenario + vergelijking + uitgebreid rapport.
                </div>
                <button onClick={goAccount} style={{ ...s.btnPrimary, marginTop: 10 }}>
                  Upgrade via Account →
                </button>
              </>
            )}
          </div>

          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...s.chip }}>
                Live verdict:{' '}
                <strong style={{ color: verdict.color, marginLeft: 6 }}>
                  {verdict.label}
                </strong>
              </span>

              <button style={s.tinyIconBtn} title="Bekijk uitleg" onClick={() => setVerdictInfo(verdict)} aria-label="Verdict uitleg">
                i
              </button>

              <span style={s.chip}>
                Live score: <strong>{scorePack.score}/100</strong>
              </span>

              <button onClick={() => copyReport('basic')} style={s.btn(isMobile)} title="Kopieer korte samenvatting">
                Kopieer samenvatting
              </button>

              {isPro ? (
                <button onClick={() => copyReport('pro')} style={s.btnPrimary(isMobile)} title="Kopieer uitgebreid rapport (Pro)">
                  Kopieer Pro-rapport
                </button>
              ) : (
                <button onClick={goAccount} style={s.btn(isMobile)} title="Uitgebreid rapport is Pro">
                  Uitgebreid rapport is Pro →
                </button>
              )}
            </div>

            <div style={{ marginTop: 10, ...s.mini }}>
              <strong>{verdict.title}</strong>
              <div style={{ marginTop: 6 }}>{verdict.reason}</div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => applyQuickDelta('rent', 50)} style={s.btn(isMobile)}>
                +€50 huur
              </button>
              <button onClick={() => applyQuickDelta('rent', -50)} style={s.btn(isMobile)}>
                -€50 huur
              </button>
              <button onClick={() => applyQuickDelta('costs', -50)} style={s.btn(isMobile)}>
                -€50 kosten
              </button>
              <button onClick={() => applyQuickDelta('costs', 50)} style={s.btn(isMobile)}>
                +€50 kosten
              </button>
            </div>
          </div>

          <h2 style={s.h2}>Scenario aanpassen</h2>
          <div style={s.card}>
            <div style={s.grid2(isMobile)}>
              <div>
                <div style={s.label}>Maandhuur (€)</div>
                <input value={scenarioRent} onChange={(e) => setScenarioRent(e.target.value)} style={s.input} placeholder="1450" />
              </div>
              <div>
                <div style={s.label}>Maandkosten (€)</div>
                <input value={scenarioCosts} onChange={(e) => setScenarioCosts(e.target.value)} style={s.input} placeholder="350" />
              </div>
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={upsertLatestAnalysis} disabled={savingScenario} style={s.btnPrimary(isMobile)}>
                {savingScenario ? 'Opslaan…' : 'Update laatste analyse'}
              </button>

              {isPro ? (
                <button onClick={saveScenarioAsNewAnalysis} disabled={savingScenario} style={s.btn(isMobile)} title="Sla meerdere scenario’s op (Pro)">
                  Opslaan als nieuw scenario <span style={{ marginLeft: 8, ...s.proBadge }}>PRO</span>
                </button>
              ) : (
                <button onClick={goAccount} style={s.btn(isMobile)} title="Meerdere scenario’s opslaan is Pro">
                  Opslaan als nieuw scenario is Pro →
                </button>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              {calc ? (
               <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <Metric label="Cashflow / maand" value={`${fmtEUR(calc.monthlyCashflow)}`} />
                  <Metric label="Netto rendement" value={`${calc.netYield.toFixed(2)}%`} />
                  <Metric label="Bruto rendement" value={`${calc.grossYield.toFixed(2)}%`} />
                  <Metric label="Aankoopprijs" value={`${fmtEUR(purchasePrice)}`} />
                </div>
              ) : (
                <div style={s.muted}>Vul huur en kosten in om live berekeningen te zien.</div>
              )}
            </div>
          </div>

          <h2 style={s.h2}>
            Scenario vergelijken {!isPro ? <span style={{ marginLeft: 8, ...s.proBadge }}>PRO</span> : null}
          </h2>

          {isPro ? (
            history.length < 2 ? (
              <div style={s.card}>Maak minimaal 2 analyses om te vergelijken.</div>
            ) : (
              <div style={s.card}>
                <div style={s.grid2(isMobile)}>
                  <div>
                    <div style={s.label}>Scenario A</div>
                    <select value={compareAId ?? ''} onChange={(e) => setCompareAId(e.target.value ? Number(e.target.value) : null)} style={s.input}>
                      {history.map((a) => (
                        <option key={a.id} value={a.id}>
                          {analysisLabel(a)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div style={s.label}>Scenario B</div>
                    <select value={compareBId ?? ''} onChange={(e) => setCompareBId(e.target.value ? Number(e.target.value) : null)} style={s.input}>
                      {history.map((a) => (
                        <option key={a.id} value={a.id}>
                          {analysisLabel(a)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {comparer?.A && comparer?.B && (
                  <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                    <ScenarioCard title="Scenario A" analysis={comparer.A} isWinner={comparer.winner === 'A'} />
                    <ScenarioCard title="Scenario B" analysis={comparer.B} isWinner={comparer.winner === 'B'} />
                  </div>
                )}
              </div>
            )
          ) : (
            <div style={s.card}>
              <div style={{ fontWeight: 950, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>Scenario vergelijken is Pro</span>
                <span style={s.proBadge}>PRO</span>
              </div>
              <div style={{ marginTop: 8, ...s.mini }}>
                Upgrade om meerdere scenario’s op te slaan én te vergelijken per deal.
              </div>
              <button onClick={goAccount} style={{ ...s.btnPrimary, marginTop: 10 }}>
                Upgrade via Account →
              </button>
            </div>
          )}

          {editOpen && (
            <Modal
              title="Edit deal"
              onClose={() => (editSaving ? null : setEditOpen(false))}
              footer={
                <>
                  <button onClick={() => setEditOpen(false)} style={s.btn(isMobile)} disabled={editSaving}>
                    Annuleer
                  </button>
                  <button onClick={saveEdit} style={s.btnPrimary(isMobile)} disabled={editSaving}>
                    {editSaving ? 'Opslaan…' : 'Opslaan'}
                  </button>
                </>
              }
            >
              <div style={{ ...s.mini, marginBottom: 10 }}>Pas de deal details aan. (Dit verandert niet automatisch je analyses.)</div>

              <div style={s.grid3(isMobile)}>
                <div>
                  <div style={s.label}>Adres</div>
                  <input value={edit.address} onChange={(e) => setEdit((p) => ({ ...p, address: e.target.value }))} style={s.input} placeholder="Straat + nr" />
                </div>
                <div>
                  <div style={s.label}>Postcode *</div>
                  <input value={edit.postal_code} onChange={(e) => setEdit((p) => ({ ...p, postal_code: e.target.value }))} style={s.input} placeholder="1011AB" />
                </div>
                <div>
                  <div style={s.label}>Plaats</div>
                  <input value={edit.city} onChange={(e) => setEdit((p) => ({ ...p, city: e.target.value }))} style={s.input} placeholder="Amsterdam" />
                </div>
              </div>

              <div style={{ ...s.grid3(isMobile), marginTop: 12 }}>
                <div>
                  <div style={s.label}>Type woning</div>
                  <input value={edit.property_type} onChange={(e) => setEdit((p) => ({ ...p, property_type: e.target.value }))} style={s.input} placeholder="Appartement / Rijtjeshuis / ..." />
                </div>
                <div>
                  <div style={s.label}>Slaapkamers</div>
                  <input value={edit.bedrooms} onChange={(e) => setEdit((p) => ({ ...p, bedrooms: e.target.value }))} style={s.input} placeholder="2" />
                </div>
                <div>
                  <div style={s.label}>Oppervlakte (m²)</div>
                  <input value={edit.surface_m2} onChange={(e) => setEdit((p) => ({ ...p, surface_m2: e.target.value }))} style={s.input} placeholder="55" />
                </div>
              </div>

              <div style={{ ...s.grid3(isMobile), marginTop: 12 }}>
                <div>
                  <div style={s.label}>Bouwjaar</div>
                  <input value={edit.year_built} onChange={(e) => setEdit((p) => ({ ...p, year_built: e.target.value }))} style={s.input} placeholder="1998" />
                </div>
                <div>
                  <div style={s.label}>Aankoopprijs (€)</div>
                  <input value={edit.purchase_price} onChange={(e) => setEdit((p) => ({ ...p, purchase_price: e.target.value }))} style={s.input} placeholder="250000" />
                </div>
                <div>
                  <div style={s.label}>Funda link</div>
                  <input value={edit.funda_url} onChange={(e) => setEdit((p) => ({ ...p, funda_url: e.target.value }))} style={s.input} placeholder="https://www.funda.nl/..." />
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={s.label}>Notities</div>
                <textarea value={edit.notes} onChange={(e) => setEdit((p) => ({ ...p, notes: e.target.value }))} rows={5} style={s.textarea} placeholder="..." />
              </div>
            </Modal>
          )}

          {deleteId != null && (
            <Modal
              title="Deal verwijderen?"
              onClose={() => (deleting ? null : setDeleteId(null))}
              footer={
                <>
                  <button onClick={() => setDeleteId(null)} style={s.btn(isMobile)} disabled={deleting}>
                    Annuleer
                  </button>
                  <button onClick={() => deleteDeal(deleteId)} style={s.btnDanger} disabled={deleting}>
                    {deleting ? 'Verwijderen…' : 'Verwijder definitief'}
                  </button>
                </>
              }
            >
              <div style={s.mini}>Dit verwijdert ook alle analyses van deze deal. Deze actie kan niet ongedaan worden gemaakt.</div>
            </Modal>
          )}

          {verdictInfo && (
            <Modal
              title="Verdict uitleg"
              onClose={() => setVerdictInfo(null)}
              footer={
                <>
                  <button onClick={() => setVerdictInfo(null)} style={s.btnPrimary(isMobile)}>
                    Sluiten
                  </button>
                </>
              }
            >
              <div style={{ ...s.mini }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ ...s.chip }}>
                    Verdict:{' '}
                    <strong style={{ color: verdictInfo.color, marginLeft: 6 }}>
                      {verdictInfo.label}
                    </strong>
                  </span>
                  <span style={{ ...s.chip, borderColor: 'rgba(255,255,255,0.20)' }}>{verdictInfo.title}</span>
                </div>

                <div style={{ marginTop: 10 }}>{verdictInfo.reason}</div>

                {verdictInfo.bullets?.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Actiepunten</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {verdictInfo.bullets.map((b) => (
                        <li key={b} style={{ marginBottom: 4 }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {verdictInfo.tips?.length ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Tips</div>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {verdictInfo.tips.map((t) => (
                        <li key={t} style={{ marginBottom: 4 }}>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </Modal>
          )}
        </div>

        <Toast toast={toast} onClose={() => setToast({ open: false })} />
      </main>
    )
  }

  // LIST
  return (
    <main style={s.page}>
      <div style={s.shell}>
        <div style={s.topbar}>
          <div style={s.brand}>
            <div style={s.logo} />
            <div>
              <div style={s.title}>DealVerdicts</div>
              <div style={s.sub}>
                Ingelogd als <strong>{userEmail ?? '-'}</strong>
              </div>
            </div>
          </div>

          <div style={s.row}>
            <span style={s.chip}>
              Plan: {planName === 'pro' ? 'Pro' : 'Free'} {planName === 'pro' ? '✅' : ''}
            </span>
            <a href="/account" style={{ ...topbarBtnStyle(s.btnPrimary(isMobile)), ...s.linkBtn }}>
              Account / Upgrade →
            </a>
            <button onClick={logout} style={topbarBtnStyle(s.btn(isMobile))}>
              Logout
            </button>
          </div>
        </div>

        <div style={{ ...s.card, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={s.label}>Jouw plan</div>
              <div style={{ fontSize: 18, fontWeight: 950 }}>{planName === 'pro' ? 'Pro' : 'Free'}</div>

              {planName !== 'pro' && (
                <div style={{ marginTop: 6, ...s.mini }}>
                  {deals.length}/{FREE_DEAL_LIMIT} <strong>actieve</strong> deals gebruikt {isAtLimit ? '· limiet bereikt' : ''}
                </div>
              )}

              {planName !== 'pro' && (
                <div style={{ marginTop: 10, ...s.hint, ...s.mini }}>
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>Free limiet uitgelegd</div>
                  Free = max <strong>{FREE_DEAL_LIMIT} actieve deals</strong>. Verwijderen maakt ruimte vrij (bedoeld). Wil je onbeperkt + scenario’s vergelijken? Upgrade naar Pro.
                </div>
              )}
            </div>

            {planName !== 'pro' ? (
              <button onClick={() => (window.location.href = '/account')} style={s.btnPrimary(isMobile)}>
                Upgrade via Account →
              </button>
            ) : (
              <span style={s.chip}>Pro ✅</span>
            )}
          </div>
        </div>

{deals.length === 0 && (
  <div style={{ ...s.card, marginTop: 12, marginBottom: 24 }}>
    <div style={s.emptyHero}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={s.emptyIcon}>🏠</div>

        <div style={{ maxWidth: 420 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>
            Maak van twijfel een beslissing.
          </div>

          <div style={{ marginTop: 8, ...s.mini }}>
            Krijg binnen 2 minuten een helder GO / MAYBE / NO-GO op je vastgoeddeal.
          </div>

          <div style={{ marginTop: 12, ...s.mini, opacity: 0.9 }}>
            Geen giswerk. Gewoon duidelijke keuzes.
          </div>

          <button
            onClick={() => {
              setShowNewDeal(true)
              setShowImport(false)
              setTimeout(() => {
                document
                  .getElementById('new-deal-form')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }, 50)
            }}
            style={{ ...s.btnPrimary(isMobile), marginTop: 14 }}
          >
            Analyseer mijn eerste deal →
          </button>
        </div>
      </div>
    </div>
  </div>
)}

        <div style={{ ...s.card, marginTop: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ width: '100%' }}>
              <div style={s.label}>Zoeken</div>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Zoek adres / postcode / plaats…" style={s.input} />
            </div>
            {query ? (
              <button onClick={() => setQuery('')} style={s.iconBtn} title="Clear">
                ✕
              </button>
            ) : null}
          </div>

          {/* ✅ NEW: filter + sort bar */}
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={s.pillRow}>
              <button
                style={{ ...s.filterPill, ...(verdictFilter === 'ALL' ? s.filterPillActive : {}) }}
                onClick={() => setVerdictFilter('ALL')}
                title="Toon alles"
              >
                Alles
              </button>
              <button
                style={{ ...s.filterPill, ...(verdictFilter === 'GO' ? s.filterPillActive : {}) }}
                onClick={() => setVerdictFilter('GO')}
                title="Toon GO"
              >
                GO
              </button>
              <button
                style={{ ...s.filterPill, ...(verdictFilter === 'MAYBE' ? s.filterPillActive : {}) }}
                onClick={() => setVerdictFilter('MAYBE')}
                title="Toon MAYBE"
              >
                MAYBE
              </button>
              <button
                style={{ ...s.filterPill, ...(verdictFilter === 'NO-GO' ? s.filterPillActive : {}) }}
                onClick={() => setVerdictFilter('NO-GO')}
                title="Toon NO-GO"
              >
                NO-GO
              </button>
              <button
                style={{ ...s.filterPill, ...(verdictFilter === 'ONBEKEND' ? s.filterPillActive : {}) }}
                onClick={() => setVerdictFilter('ONBEKEND')}
                title="Toon ONBEKEND"
              >
                ONBEKEND
              </button>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...s.mini, marginRight: 2 }}>Sort:</span>
              <select value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)} style={{ ...s.input, width: 220, padding: 10 }}>
                <option value="verdict">Verdict (GO → NO-GO)</option>
                <option value="score">Score (hoog → laag)</option>
                <option value="newest">Nieuwste</option>
              </select>

              <button
                onClick={() => {
                  setVerdictFilter('ALL')
                  setSortMode('verdict')
                  setQuery('')
                }}
                style={s.btn(isMobile)}
                title="Reset filters"
              >
                Reset
              </button>
            </div>
          </div>
        </div>


<div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
          {/* LEFT */}
          <div id="new-deal-form">
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 950, fontSize: 16 }}>Nieuwe deal</div>
                  <div style={s.mini}>Tip: gebruik Quick Add of Import (Funda) om supersnel te vullen.</div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setShowNewDeal((v) => !v)
                      if (showNewDeal) {
                        setShowImport(false)
                        setImportPreview(null)
                        setImportWarnings([])
                        setImportText('')
                      }
                    }}
                    style={s.btn(isMobile)}
                  >
                    {showNewDeal ? 'Verberg' : 'Toon'} formulier
                  </button>

                  <button
                    onClick={() => {
                      if (!showNewDeal) setShowNewDeal(true)
                      setShowImport((v) => !v)
                      if (!showImport) {
                        setImportPreview(null)
                        setImportWarnings([])
                      }
                    }}
                    style={s.btnPrimary(isMobile)}
                  >
                    Import (Funda) →
                  </button>
                </div>
              </div>

              {showNewDeal && (
                <>
                  {showImport && (
                    <>
                      <div style={s.divider} />

                      <div style={{ fontWeight: 950 }}>Funda import</div>
                      <div style={{ marginTop: 6, ...s.mini }}>
                        1) Open Funda → 2) Ctrl+A → Ctrl+C → 3) Plak hieronder → 4) “Analyseer” → 5) “Toepassen”
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div style={s.label}>Plak Funda tekst</div>
                        <textarea
                          value={importText}
                          onChange={(e) => setImportText(e.target.value)}
                          rows={8}
                          style={{
                            ...s.textarea,
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                          }}
                          placeholder="Plak hier de tekst van Funda…"
                        />
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        <button onClick={applyImport} style={s.btnPrimary(isMobile)}>
                          Analyseer (Preview)
                        </button>
                        <button
                          onClick={() => {
                            setShowImport(false)
                            setImportText('')
                            setImportPreview(null)
                            setImportWarnings([])
                          }}
                          style={s.btn(isMobile)}
                        >
                          Sluiten
                        </button>
                      </div>

                      {importPreview && (
                        <div style={{ marginTop: 14 }}>
                          <div style={{ fontWeight: 950, marginBottom: 10 }}>Preview</div>

                          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                            <PreviewRow label="Adres" value={importPreview.address ?? '—'} ok={!!importPreview.address} />
                            <PreviewRow label="Postcode (verplicht)" value={importPreview.postalCode ?? '—'} ok={!!importPreview.postalCode} />
                            <PreviewRow label="Plaats" value={importPreview.city ?? '—'} ok={!!importPreview.city} />
                            <PreviewRow label="Prijs" value={importPreview.price != null ? fmtEUR(importPreview.price) : '—'} ok={importPreview.price != null} />
                            <PreviewRow label="Type" value={importPreview.propertyType ?? '—'} ok={!!importPreview.propertyType} />
                            <PreviewRow label="m²" value={importPreview.surfaceM2 != null ? String(importPreview.surfaceM2) : '—'} ok={importPreview.surfaceM2 != null} />
                            <PreviewRow label="Slaapkamers" value={importPreview.bedrooms != null ? String(importPreview.bedrooms) : '—'} ok={importPreview.bedrooms != null} />
                            <PreviewRow label="Bouwjaar" value={importPreview.yearBuilt != null ? String(importPreview.yearBuilt) : '—'} ok={importPreview.yearBuilt != null} />
                          </div>

                          {importWarnings.length > 0 ? (
                            <div style={{ marginTop: 12, ...s.mini }}>
                              <div style={{ fontWeight: 950, color: '#f59e0b' }}>Let op:</div>
                              <ul style={{ marginTop: 6, paddingLeft: 18 }}>
                                {importWarnings.map((w) => (
                                  <li key={w}>{w}</li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <div style={{ marginTop: 12, ...s.mini, color: 'rgba(229,231,235,0.9)' }}>Alles lijkt gevonden ✅</div>
                          )}

                          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <button onClick={commitImport} style={s.btnPrimary(isMobile)}>
                              Toepassen in formulier
                            </button>
                            <button
                              onClick={() => {
                                setImportPreview(null)
                                setImportWarnings([])
                              }}
                              style={s.btn(isMobile)}
                            >
                              Reset preview
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div style={{ ...s.card, marginTop: 12 }}>
                    <div style={{ fontWeight: 950, marginBottom: 10 }}>Deal invoeren</div>

                    <form onSubmit={handleSubmit}>
                      <div style={s.grid3(isMobile)}>
                        <div>
                          <div style={s.label}>Adres</div>
                          <input value={adres} onChange={(e) => setAdres(e.target.value)} required style={s.input} placeholder="Straat + nr" />
                        </div>
                        <div>
                          <div style={s.label}>Postcode *</div>
                          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required style={s.input} placeholder="1011AB" />
                        </div>
                        <div>
                          <div style={s.label}>Plaats</div>
                          <input value={city} onChange={(e) => setCity(e.target.value)} style={s.input} placeholder="Amsterdam" />
                        </div>
                      </div>

                      <div style={{ ...s.grid3(isMobile), marginTop: 12 }}>
                        <div>
                          <div style={s.label}>Type woning</div>
                          <input value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={s.input} placeholder="Appartement / Rijtjeshuis / ..." />
                        </div>
                        <div>
                          <div style={s.label}>Slaapkamers</div>
                          <input value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} style={s.input} placeholder="2" />
                        </div>
                        <div>
                          <div style={s.label}>Oppervlakte (m²)</div>
                          <input value={surfaceM2} onChange={(e) => setSurfaceM2(e.target.value)} style={s.input} placeholder="55" />
                        </div>
                      </div>

                      <div style={{ ...s.grid3(isMobile), marginTop: 12 }}>
                        <div>
                          <div style={s.label}>Bouwjaar</div>
                          <input value={yearBuilt} onChange={(e) => setYearBuilt(e.target.value)} style={s.input} placeholder="1998" />
                        </div>
                        <div>
                          <div style={s.label}>Aankoopprijs (€)</div>
                          <input type="number" value={prijs} onChange={(e) => setPrijs(e.target.value)} required style={s.input} placeholder="250000" />
                        </div>
                        <div>
                          <div style={s.label}>Funda link (optioneel)</div>
                          <input value={fundaUrl} onChange={(e) => setFundaUrl(e.target.value)} style={s.input} placeholder="https://www.funda.nl/..." />
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div style={s.label}>Notities</div>
<textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} style={s.textarea} placeholder="--- Eigen notities ---&#10;Wat viel je op? Risico’s? Bezichtiging? Onderhandeling?…" />
                      </div>

                      <div style={{ ...s.grid2(isMobile), marginTop: 12 }}>
                        <div>
                          <div style={s.label}>Maandhuur (€)</div>
                          <input type="number" value={huur} onChange={(e) => setHuur(e.target.value)} required style={s.input} placeholder="1450" />
                        </div>
                        <div>
                          <div style={s.label}>Maandelijkse kosten (€)</div>
                          <input type="number" value={kosten} onChange={(e) => setKosten(e.target.value)} required style={s.input} placeholder="350" />
                        </div>
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button type="submit" disabled={loading} style={s.btnPrimary(isMobile)}>
                          {loading ? 'Opslaan…' : isAtLimit ? 'Limiet bereikt (Upgrade)' : 'Deal opslaan'}
                        </button>

                        {isAtLimit ? (
                          <button type="button" onClick={goAccount} style={s.btn(isMobile)}>
                            Upgrade nu →
                          </button>
                        ) : null}
                      </div>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* RIGHT */}
          <div>
            <div style={s.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                <div style={{ fontWeight: 950, fontSize: 16 }}>Deals</div>
                <span style={s.chip}>{filteredDeals.length}</span>
              </div>

              <div style={{ marginTop: 10 }}>
                {filteredDeals.length === 0 ? (
                  <div style={s.mini}>Geen deals gevonden (pas filters/zoekterm aan).</div>
                ) : (
                  <ul style={s.list}>
                    {filteredDeals.map((d) => {
                      const a = d.latestAnalysis
                      const verdict = getDealVerdict(a?.monthly_cashflow ?? null, a?.net_yield ?? null)
                      const scorePack = getDealScoreAndAdvice(a?.monthly_cashflow ?? null, a?.net_yield ?? null)
                      const canOpenFunda = isLikelyHttpUrl(d.funda_url)

                      return (
                        <li
                          key={d.id}
                          style={s.dealItem}
                          onClick={() => setSelected(d)}
                          onMouseEnter={(e) => {
                            ;(e.currentTarget as HTMLLIElement).style.transform = 'translateY(-1px)'
                          }}
                          onMouseLeave={(e) => {
                            ;(e.currentTarget as HTMLLIElement).style.transform = 'translateY(0px)'
                          }}
                          title="Klik om deal te openen"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 950, fontSize: 15, whiteSpace: isMobile ? 'normal' : 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {d.address ?? '(geen adres)'}
                              </div>
                              <div style={s.mini}>
                                {d.postal_code ?? '-'} {d.city ?? ''} · {d.property_type ?? 'Type: -'} · m² {d.surface_m2 ?? '-'} · 🛏 {d.bedrooms ?? '-'}
                              </div>
                              <div style={s.mini}>Aankoop: {fmtEUR(d.purchase_price ?? 0)}</div>
                            </div>

                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                                <span style={{ ...s.chip }}>
                                  <span style={{ color: verdict.color, fontWeight: 950 }}>{verdict.label}</span>
                                </span>

                                <button
                                  style={s.tinyIconBtn}
                                  title="Waarom dit verdict?"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setVerdictInfo(verdict)
                                  }}
                                  aria-label="Verdict uitleg"
                                >
                                  i
                                </button>

                                {/* ✅ NEW: quick open funda */}
                                {canOpenFunda ? (
                                  <button
                                    title="Open Funda"
                                    style={s.iconBtn}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      window.open(d.funda_url as string, '_blank', 'noreferrer')
                                    }}
                                    aria-label="Open Funda"
                                  >
                                    ↗
                                  </button>
                                ) : null}

                                <button
                                  title="Verwijder deal"
                                  style={s.iconBtn}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeleteId(d.id)
                                  }}
                                  aria-label="Verwijder deal"
                                >
                                  ✕
                                </button>
                              </div>
                              <div style={{ marginTop: 6, ...s.mini }}>
                                Score <strong style={{ color: '#e5e7eb' }}>{scorePack.score}</strong>/100
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 10, ...s.mini }}>
                            {a ? (
                              <>
                                Cashflow {fmtEUR(Math.round(a.monthly_cashflow ?? 0))} · Netto {Number(a.net_yield ?? 0).toFixed(2)}%
                                <div style={{ marginTop: 4, color: 'rgba(229,231,235,0.72)' }}>{scorePack.advice}</div>
                              </>
                            ) : (
                              <>Klik voor details.</>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>

        {deleteId != null && (
          <Modal
            title="Deal verwijderen?"
            onClose={() => (deleting ? null : setDeleteId(null))}
            footer={
              <>
                <button onClick={() => setDeleteId(null)} style={s.btn(isMobile)} disabled={deleting}>
                  Annuleer
                </button>
                <button onClick={() => deleteDeal(deleteId)} style={s.btnDanger} disabled={deleting}>
                  {deleting ? 'Verwijderen…' : 'Verwijder definitief'}
                </button>
              </>
            }
          >
            <div style={s.mini}>Dit verwijdert ook alle analyses van deze deal. Deze actie kan niet ongedaan worden gemaakt.</div>
          </Modal>
        )}

        {verdictInfo && (
          <Modal
            title="Verdict uitleg"
            onClose={() => setVerdictInfo(null)}
            footer={
              <>
                <button onClick={() => setVerdictInfo(null)} style={s.btnPrimary(isMobile)}>
                  Sluiten
                </button>
              </>
            }
          >
            <div style={{ ...s.mini }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ ...s.chip }}>
                  Verdict:{' '}
                  <strong style={{ color: verdictInfo.color, marginLeft: 6 }}>
                    {verdictInfo.label}
                  </strong>
                </span>
                <span style={{ ...s.chip, borderColor: 'rgba(255,255,255,0.20)' }}>{verdictInfo.title}</span>
              </div>

              <div style={{ marginTop: 10 }}>{verdictInfo.reason}</div>

              {verdictInfo.bullets?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>Actiepunten</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {verdictInfo.bullets.map((b) => (
                      <li key={b} style={{ marginBottom: 4 }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {verdictInfo.tips?.length ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>Tips</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {verdictInfo.tips.map((t) => (
                      <li key={t} style={{ marginBottom: 4 }}>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Modal>
        )}
      </div>

      <Toast toast={toast} onClose={() => setToast({ open: false })} />
    </main>
  )
}

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast.open) return null

  const border =
    toast.kind === 'success'
      ? '1px solid rgba(34,197,94,0.35)'
      : toast.kind === 'error'
      ? '1px solid rgba(239,68,68,0.35)'
      : '1px solid rgba(255,255,255,0.14)'

  return (
    <div style={s.toastWrap}>
      <div style={{ ...s.toast, border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div style={{ fontWeight: 950 }}>{toast.title}</div>
          <button onClick={onClose} style={s.tinyIconBtn} aria-label="Close toast" title="Close">
            ✕
          </button>
        </div>
        {toast.message ? (
          <div style={{ marginTop: 6, fontSize: 12, color: 'rgba(229,231,235,0.75)', lineHeight: 1.5 }}>{toast.message}</div>
        ) : null}
      </div>
    </div>
  )
}

function PreviewRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(0,0,0,0.20)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.72)' }}>{label}</div>
      <div style={{ marginTop: 6, fontWeight: 950, display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <span style={{ whiteSpace: 'normal', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
        <span style={{ fontSize: 12, fontWeight: 950, color: ok ? '#22c55e' : '#f59e0b' }}>{ok ? '✅' : '⚠️'}</span>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.10)',
        background: 'rgba(0,0,0,0.20)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: 12, color: 'rgba(229,231,235,0.72)' }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 950 }}>{value}</div>
    </div>
  )
}

function ScenarioCard({ title, analysis, isWinner }: { title: string; analysis: AnalysisRow; isWinner: boolean }) {
  const verdict = getDealVerdict(analysis.monthly_cashflow ?? null, analysis.net_yield ?? null)
  const scorePack = getDealScoreAndAdvice(analysis.monthly_cashflow ?? null, analysis.net_yield ?? null)

  return (
    <div
      style={{
        border: `2px solid ${isWinner ? verdict.color : 'rgba(255,255,255,0.10)'}`,
        borderRadius: 16,
        padding: 14,
        background: 'rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
        <div style={{ fontWeight: 950 }}>{title}</div>
        {isWinner ? (
          <span style={{ background: verdict.color, color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 950 }}>
            WINNER
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ border: `1px solid rgba(255,255,255,0.16)`, padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 950 }}>
          <span style={{ color: verdict.color }}>{verdict.label}</span>
        </span>
        <span style={{ fontSize: 12, color: 'rgba(229,231,235,0.75)' }}>
          Score <strong style={{ color: '#e5e7eb' }}>{scorePack.score}</strong>/100
        </span>
      </div>

      <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(229,231,235,0.82)', lineHeight: 1.45 }}>
        Huur: {fmtEUR(Math.round(analysis.monthly_rent ?? 0))} / maand
        <br />
        Kosten: {fmtEUR(Math.round(analysis.monthly_costs ?? 0))} / maand
        <br />
        Cashflow: {fmtEUR(Math.round(analysis.monthly_cashflow ?? 0))} / maand
        <br />
        Netto rendement: {Number(analysis.net_yield ?? 0).toFixed(2)}%
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(229,231,235,0.70)' }}>{scorePack.advice}</div>
    </div>
  )
}

function Modal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string
  children: React.ReactNode
  footer: React.ReactNode
  onClose: () => void
}) {
  return (
    <div style={s.modalOverlay} onMouseDown={onClose}>
      <div style={s.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
          <div style={{ fontWeight: 950 }}>{title}</div>
          <button style={s.iconBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div style={s.divider} />
        <div>{children}</div>
        <div style={{ ...s.divider, marginTop: 14 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>{footer}</div>
      </div>
    </div>
  )
}
