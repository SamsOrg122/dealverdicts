'use client'
console.log('ACCOUNT PAGE VERSION: 2026-01-20 v2 (Upgrade URL hard-fix + debug)')

import React, { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabaseClient'

type Profile = { id: string; email: string | null; is_pro: boolean; plan: string }

// ---------- styles (copied/trimmed from main page) ----------
const s = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(1100px 650px at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 600px at 85% 10%, rgba(16,185,129,0.14), transparent 55%), #070b18',
    color: '#e5e7eb',
    padding: 20,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
  } as CSSProperties,

  shell: { maxWidth: 980, margin: '0 auto' } as CSSProperties,

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

  h1: { fontSize: 26, fontWeight: 950, margin: '14px 0 6px' } as CSSProperties,
  mini: { fontSize: 12, color: 'rgba(229,231,235,0.72)', lineHeight: 1.5 } as CSSProperties,
  muted: { color: 'rgba(229,231,235,0.72)' } as CSSProperties,

  link: { color: '#a5b4fc', textDecoration: 'none', fontWeight: 900 } as CSSProperties,
}

function isHttpUrl(v: unknown): v is string {
  if (typeof v !== 'string') return false
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

// ---------- page ----------
export default function AccountPage() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [upgradeError, setUpgradeError] = useState<string | null>(null)

  const qs = useMemo(() => {
    if (typeof window === 'undefined') return ''
    return window.location.search ?? ''
  }, [])

  const loadProfile = async () => {
    const { data } = await supabase.auth.getUser()
    if (!data.user) {
      window.location.href = '/login'
      return
    }

    setUserEmail(data.user.email ?? null)

    const { data: p, error } = await supabase
      .from('profiles')
      .select('id,email,is_pro,plan')
      .eq('id', data.user.id)
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    if (!p) {
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert({ id: data.user.id, email: data.user.email, is_pro: false, plan: 'free' })

      if (insertError) {
        console.error(insertError)
        setLoading(false)
        return
      }

      const { data: newP, error: refetchError } = await supabase
        .from('profiles')
        .select('id,email,is_pro,plan')
        .eq('id', data.user.id)
        .limit(1)
        .maybeSingle()

      if (refetchError) {
        console.error(refetchError)
        setLoading(false)
        return
      }

      setProfile(newP as Profile)
    } else {
      setProfile(p as Profile)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const upgrade = async () => {
    setUpgradeError(null)
    setUpgrading(true)

    try {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        setUpgrading(false)
        alert('Niet ingelogd')
        return
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user.id, email: data.user.email }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        console.error('Checkout API error:', json)
        setUpgradeError(json?.error ?? 'Checkout error (API)')
        setUpgrading(false)
        return
      }

      const url = json?.url

      // ✅ HARD FIX: only allow valid http(s) URL
      if (!isHttpUrl(url)) {
        console.error('Invalid checkout url returned:', url, json)
        setUpgradeError(
          `Stripe URL is ongeldig. (debug: url=${String(url)})`
        )
        setUpgrading(false)
        return
      }

      // redirect naar Stripe
      window.location.assign(url)
    } catch (e: any) {
      console.error('Upgrade error:', e)
      setUpgradeError(e?.message ?? 'Unknown error')
      setUpgrading(false)
    }
  }

  if (loading) {
    return (
      <main style={s.page}>
        <div style={s.shell}>
          <div style={s.topbar}>
            <div style={s.brand}>
              <div style={s.logo} />
              <div>
                <div style={s.title}>DealVerdicts</div>
                <div style={s.sub}>Account laden…</div>
              </div>
            </div>
            <span style={s.chip}>…</span>
          </div>

          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={s.muted}>Loading…</div>
          </div>
        </div>
      </main>
    )
  }

  if (!profile) {
    return (
      <main style={s.page}>
        <div style={s.shell}>
          <div style={s.topbar}>
            <div style={s.brand}>
              <div style={s.logo} />
              <div>
                <div style={s.title}>DealVerdicts</div>
                <div style={s.sub}>Geen profiel</div>
              </div>
            </div>
            <button onClick={logout} style={s.btn}>
              Logout
            </button>
          </div>

          <div style={{ ...s.card, marginTop: 12 }}>
            <div style={s.muted}>Geen profile gevonden.</div>
            <div style={{ marginTop: 12 }}>
              <a href="/" style={s.link}>
                ← Terug naar deals
              </a>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const isPro = profile.plan === 'pro' || Boolean(profile.is_pro)
  const showSuccess = qs.includes('success=1')
  const showCanceled = qs.includes('canceled=1')

  return (
    <main style={s.page}>
      <div style={s.shell}>
        <div style={s.topbar}>
          <div style={s.brand}>
            <div style={s.logo} />
            <div>
              <div style={s.title}>DealVerdicts</div>
              <div style={s.sub}>
                Ingelogd als <strong>{userEmail ?? profile.email ?? '-'}</strong>
              </div>
            </div>
          </div>

          <div style={s.row}>
            <span style={s.chip}>
              Plan: {isPro ? 'Pro' : 'Free'} {isPro ? '✅' : ''}
            </span>
            <a href="/" style={{ ...s.btnPrimary, textDecoration: 'none' }}>
              ← Terug naar deals
            </a>
            <button onClick={logout} style={s.btn}>
              Logout
            </button>
          </div>
        </div>

        <h1 style={s.h1}>Account</h1>

        {(showSuccess || showCanceled) && (
          <div
            style={{
              ...s.card,
              marginTop: 12,
              border: showSuccess ? '1px solid rgba(34,197,94,0.30)' : '1px solid rgba(239,68,68,0.30)',
            }}
          >
            <div style={{ fontWeight: 950 }}>{showSuccess ? 'Betaling gelukt ✅' : 'Betaling geannuleerd'}</div>
            <div style={{ marginTop: 6, ...s.mini }}>
              {showSuccess ? 'Je account wordt (soms) binnen enkele seconden geüpdatet.' : 'Je abonnement is niet geactiveerd.'}
            </div>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => window.location.reload()} style={s.btn} title="Refresh om je planstatus te herladen">
                Refresh status
              </button>
            </div>
          </div>
        )}

        <div style={{ ...s.card, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={s.mini}>Ingelogd als</div>
              <div style={{ fontWeight: 950, fontSize: 16 }}>{profile.email ?? userEmail ?? '-'}</div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={s.mini}>Plan</div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>{isPro ? 'Pro' : 'Free'}</div>
            </div>
          </div>

          <div style={s.divider} />

          {isPro ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...s.chip, borderColor: 'rgba(34,197,94,0.35)' }}>Je bent Pro ✅</span>
              <span style={s.mini}>Dankjewel — je hebt onbeperkt deals + scenario’s vergelijken + Pro-rapporten.</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={s.proBadge}>PRO</span>
                <div style={{ fontWeight: 950 }}>Upgrade naar Pro</div>
              </div>

              <div style={{ marginTop: 8, ...s.hint }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Wat je krijgt</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  <li style={{ marginBottom: 4 }}>Onbeperkt deals (geen Free limiet)</li>
                  <li style={{ marginBottom: 4 }}>Meerdere scenario’s opslaan + vergelijken</li>
                  <li style={{ marginBottom: 4 }}>Uitgebreide Pro-rapporten kopiëren</li>
                </ul>
                <div style={{ marginTop: 10, ...s.mini }}>Je wordt doorgestuurd naar Stripe om je abonnement te activeren.</div>
              </div>

              {upgradeError ? (
                <div style={{ ...s.card, marginTop: 12, border: '1px solid rgba(239,68,68,0.30)' }}>
                  <div style={{ fontWeight: 950 }}>Upgrade fout</div>
                  <div style={{ marginTop: 6, ...s.mini }}>{upgradeError}</div>
                </div>
              ) : null}

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={upgrade} disabled={upgrading} style={s.btnPrimary}>
                  {upgrading ? 'Doorsturen naar Stripe…' : 'Upgrade naar Pro'}
                </button>
                <button onClick={() => window.location.reload()} style={s.btn} disabled={upgrading}>
                  Refresh status
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{ marginTop: 14, ...s.mini }}>
          Tip: als je net terugkomt van Stripe en de status is nog niet geüpdatet, klik “Refresh status”.
        </div>
      </div>
    </main>
  )
}
