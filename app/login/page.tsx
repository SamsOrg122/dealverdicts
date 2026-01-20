'use client'
console.log('LOGIN PAGE VERSION: 2026-01-19 v2 (DealPilot style, keeps signup-in-login)')

import React, { useState, type CSSProperties } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

const s = {
  page: {
    minHeight: '100vh',
    background:
      'radial-gradient(1100px 650px at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(900px 600px at 85% 10%, rgba(16,185,129,0.14), transparent 55%), #070b18',
    color: '#e5e7eb',
    padding: 20,
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as CSSProperties,

  shell: { width: '100%', maxWidth: 520 } as CSSProperties,

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

  card: {
    marginTop: 12,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.10)',
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    padding: 14,
  } as CSSProperties,

  label: { fontSize: 12, color: 'rgba(229,231,235,0.72)', marginBottom: 6 } as CSSProperties,

  input: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(0,0,0,0.22)',
    color: '#e5e7eb',
    outline: 'none',
  } as CSSProperties,

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

  hint: {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(0,0,0,0.18)',
    padding: 12,
  } as CSSProperties,

  mini: { fontSize: 12, color: 'rgba(229,231,235,0.72)', lineHeight: 1.5 } as CSSProperties,

  divider: { height: 1, background: 'rgba(255,255,255,0.10)', margin: '12px 0' } as CSSProperties,
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // ✅ jouw signup flow blijft exact hetzelfde (mail confirm / code)
  const signUp = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return alert(error.message)
    alert('Account aangemaakt! (Als confirm aan staat: check je mail)')
  }

  // ✅ jouw signin flow blijft exact hetzelfde
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
        <div style={s.topbar}>
          <div style={s.brand}>
            <div style={s.logo} />
            <div>
              <div style={s.title}>DealVerdicts</div>
              <div style={s.sub}>Login / Account maken</div>
            </div>
          </div>

          <span style={{ ...s.hint, padding: '6px 10px' }}>
            <span style={s.mini}>Supabase auth</span>
          </span>
        </div>

        <div style={s.card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Login</div>
          <div style={{ marginTop: 6, ...s.mini }}>
            Log in met je account. Of maak een account aan — je krijgt dan een bevestigingsmail (als confirm aan staat).
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
              {loading ? 'Bezig…' : 'Inloggen'}
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

        <div style={{ marginTop: 12, ...s.mini, textAlign: 'center' }}>
          Na inloggen ga je door naar je deals.
        </div>
      </div>
    </main>
  )
}
