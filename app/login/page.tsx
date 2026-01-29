'use client'
console.log('LOGIN DEPLOY CHECK: ' + new Date().toISOString())
console.log('LOGIN PAGE VERSION: 2026-01-29 v3 (Landing hero + CTA, same DealVerdicts style)')

import React, { useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

const s = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(1100px 650px at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 600px at 85% 10%, rgba(16,185,129,0.14), transparent 55%), #070b18',
    color: '#e5e7eb',
    padding: 20,
    overflowX: 'hidden',
    width: '100%',
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  } as CSSProperties,

  shell: { maxWidth: 1100, width: '100%', margin: '0 auto' } as CSSProperties,

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

  chip: {
    padding: '6px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
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

  card: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    padding: 14,
  } as CSSProperties,

  hint: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    padding: 12,
  } as CSSProperties,

  divider: { height: 1, background: 'rgba(255,255,255,0.10)', margin: '12px 0' } as CSSProperties,

  h1: { fontSize: 34, fontWeight: 950, margin: '14px 0 8px', letterSpacing: -0.2 } as CSSProperties,
  h2: { fontSize: 15, fontWeight: 950, margin: '14px 0 10px' } as CSSProperties,
  mini: { fontSize: 12, color: 'rgba(229,231,235,0.72)', lineHeight: 1.5 } as CSSProperties,
  muted: { color: 'rgba(229,231,235,0.72)' } as CSSProperties,

  btn: {
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#e5e7eb',
    padding: '10px 12px',
    borderRadius: 12,
    fontWeight: 800,
    cursor: 'pointer',
  } as CSSProperties,

  btnPrimary: {
    border: '1px solid rgba(99,102,241,0.35)',
    background: 'linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95))',
    color: '#fff',
    padding: '10px 12px',
    borderRadius: 12,
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
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

  label: { fontSize: 12, color: 'rgba(229,231,235,0.72)', marginBottom: 6 } as CSSProperties,

  layout: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 0.85fr',
    gap: 14,
    alignItems: 'start',
    marginTop: 14,
  } as CSSProperties,

  // responsive helpers
  layoutMobile: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: 14,
    alignItems: 'start',
    marginTop: 14,
  } as CSSProperties,

  heroPillRow: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 } as CSSProperties,

  bullet: { display: 'flex', gap: 10, alignItems: 'flex-start' } as CSSProperties,
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    marginTop: 6,
    background: 'rgba(99,102,241,0.95)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
    flexShrink: 0,
  } as CSSProperties,

  previewFrame: {
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.10)',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04)), radial-gradient(600px 220px at 30% 0%, rgba(99,102,241,0.20), transparent 60%), rgba(0,0,0,0.18)',
    padding: 14,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 30px 70px rgba(0,0,0,0.55)',
    overflow: 'hidden',
  } as CSSProperties,

  previewTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  } as CSSProperties,

  previewBar: {
    height: 10,
    width: 120,
    borderRadius: 999,
    background: 'rgba(255,255,255,0.10)',
  } as CSSProperties,

  previewCard: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(0,0,0,0.20)',
    padding: 12,
  } as CSSProperties,
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 900
  }, [])

  // ✅ signup flow blijft hetzelfde
  const signUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    alert('Account aangemaakt! (Als confirm aan staat: check je mail)')
  }

  // ✅ signin flow blijft hetzelfde
  const signIn = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    router.push('/')
  }

  return (
    <main style={s.page}>
      <div style={s.shell}>
        {/* TOPBAR */}
        <div style={s.topbar}>
          <div style={s.brand}>
            <div style={s.logo} />
            <div>
              <div style={s.title}>DealVerdicts</div>
              <div style={s.sub}>Maak van twijfel een beslissing.</div>
            </div>
          </div>

          <div style={s.row}>
            <span style={s.chip}>⚡ 2 min setup</span>
            <span style={s.chip}>🔒 Privacy-first</span>
          </div>
        </div>

        {/* HERO + LOGIN */}
        <div style={isMobile ? s.layoutMobile : s.layout}>
          {/* LEFT: HERO */}
          <div>
            <div style={{ ...s.card }}>
              <div style={s.h1}>Analyseer vastgoeddeals in seconden.</div>
              <div style={{ ...s.muted, fontSize: 14, lineHeight: 1.6, maxWidth: 620 }}>
                DealVerdicts helpt je snel beslissen met cashflow, rendement en een helder verdict.
                Minder twijfelen. Meer goede deals.
              </div>

              <div style={s.heroPillRow}>
                <span style={s.chip}>✅ GO / MAYBE / NO-GO</span>
                <span style={s.chip}>📊 Live score</span>
                <span style={s.chip}>↗ Quick Funda</span>
                <span style={s.proBadge}>PRO: scenario’s vergelijken</span>
              </div>

              <div style={s.divider} />

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={s.bullet}>
                  <div style={s.dot} />
                  <div>
                    <div style={{ fontWeight: 950 }}>Snelle beslissing</div>
                    <div style={s.mini}>Vul huur & kosten in → krijg direct verdict + advies.</div>
                  </div>
                </div>

                <div style={s.bullet}>
                  <div style={{ ...s.dot, background: 'rgba(16,185,129,0.95)' }} />
                  <div>
                    <div style={{ fontWeight: 950 }}>Onderhandelen met data</div>
                    <div style={s.mini}>Gebruik scenario’s om te zien wat er moet gebeuren voor een “GO”.</div>
                  </div>
                </div>

                <div style={s.bullet}>
                  <div style={{ ...s.dot, background: 'rgba(245,158,11,0.95)' }} />
                  <div>
                    <div style={{ fontWeight: 950 }}>Overzicht & focus</div>
                    <div style={s.mini}>Filter & sorteer je deals zodat je alleen naar de beste kijkt.</div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 14, ...s.hint }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Voor wie?</div>
                <div style={s.mini}>
                  Voor iedereen die vastgoed bekijkt (beginner of pro) en sneller wil weten: <strong>doen of laten?</strong>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, ...s.mini }}>
              Door in te loggen accepteer je dat dit een tool is (geen financieel advies). Jij beslist.
            </div>
          </div>

          {/* RIGHT: LOGIN CARD + PREVIEW */}
          <div>
            <div style={s.card}>
              <div style={{ fontWeight: 950, fontSize: 18 }}>Log in om te starten</div>
              <div style={{ marginTop: 6, ...s.mini }}>
                Eerst inloggen. Daarna kun je meteen deals toevoegen en verdicts krijgen.
              </div>

              <div style={s.divider} />

              <div>
                <div style={s.label}>Email</div>
                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={s.input}
                  autoComplete="email"
                  inputMode="email"
                />
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={s.label}>Wachtwoord</div>
                <input
                  placeholder="Wachtwoord"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={s.input}
                  autoComplete="current-password"
                />
              </div>

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button onClick={signIn} disabled={loading} style={s.btnPrimary}>
                  {loading ? 'Bezig…' : 'Inloggen →'}
                </button>

                <button onClick={signUp} disabled={loading} style={s.btn}>
                  {loading ? 'Bezig…' : 'Account maken'}
                </button>
              </div>

              <div style={{ marginTop: 12, ...s.hint }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={s.mini}>
                  Als “Email confirmations” aan staat in Supabase, moet je eerst je mail bevestigen voordat je kunt inloggen.
                </div>
              </div>
            </div>

            {/* “Image” / preview without external assets */}
            <div style={{ marginTop: 12, ...s.previewFrame }}>
              <div style={s.previewTop}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: 'rgba(239,68,68,0.8)' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: 'rgba(245,158,11,0.8)' }} />
                  <div style={{ width: 10, height: 10, borderRadius: 99, background: 'rgba(34,197,94,0.8)' }} />
                </div>
                <div style={s.previewBar} />
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={s.previewCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontWeight: 950 }}>Nieuwe deal</div>
                    <span style={s.chip}>Import (Funda)</span>
                  </div>
                  <div style={{ marginTop: 8, ...s.mini }}>
                    Huur €1450 · Kosten €350 → <strong style={{ color: 'rgba(34,197,94,0.95)' }}>GO</strong>
                  </div>
                </div>

                <div style={s.previewCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontWeight: 950 }}>Live verdict</div>
                    <span style={{ ...s.chip, borderColor: 'rgba(255,255,255,0.20)' }}>Score 78/100</span>
                  </div>
                  <div style={{ marginTop: 8, ...s.mini }}>
                    “Cashflow positief en rendement sterk. Plan bezichtiging + check regels.”
                  </div>
                </div>

                <div style={{ ...s.previewCard, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.18)' }}>
                  <div style={{ fontWeight: 950 }}>Pro</div>
                  <div style={{ marginTop: 6, ...s.mini }}>
                    Meerdere scenario’s opslaan & vergelijken per deal.
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 10, ...s.mini }}>
                Dit is een preview van de app-stijl (geen screenshot nodig).
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, ...s.mini, textAlign: 'center' }}>
          Na inloggen ga je door naar je deals.
        </div>
      </div>
    </main>
  )
}
