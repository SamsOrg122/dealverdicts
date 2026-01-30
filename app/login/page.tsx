'use client'

import React, { useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const router = useRouter()

  const canSubmit = useMemo(() => {
    return email.trim().length > 3 && password.length >= 6 && !loading
  }, [email, password, loading])

  const signUp = async () => {
    setErrorMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) return setErrorMsg(error.message)
    alert('Account aangemaakt! (Als confirm aan staat: check je mail)')
  }

  const signIn = async () => {
    setErrorMsg(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) return setErrorMsg(error.message)
    router.push('/')
  }

  return (
    <main className="page">
      {/* Ambient layers */}
      <div className="bg">
        <div className="orb orbA" />
        <div className="orb orbB" />
        <div className="grid" />
        <div className="topo" />
        <div className="cityline" />
        <div className="vignette" />
      </div>

      <div className="shell">
        {/* Header */}
        <header className="header">
          <div className="brand">
            <div className="mark" aria-hidden="true" />
            <div className="brandText">
              <div className="brandTitle">DealVerdicts</div>
              <div className="brandSub">Maak van twijfel een beslissing.</div>
            </div>
          </div>

          <div className="headerRight" aria-label="Highlights">
            <span className="chip">
              <span className="chipIcon" aria-hidden="true">⚡</span>
              2 min setup
            </span>
            <span className="chip">
              <span className="chipIcon" aria-hidden="true">🔒</span>
              Privacy-first
            </span>
          </div>
        </header>

        {/* Stage */}
        <section className="stage">
          {/* LOGIN COLUMN (comes first on mobile) */}
          <aside className="panel">
            <div className="panelInner">
              <div className="panelHead">
                <div>
                  <div className="panelTitle">Log in</div>
                  <div className="panelSub">Ga door naar je deals en verdicts.</div>
                </div>
                <div className="miniSeal" aria-hidden="true">
                  <div className="sealRing" />
                  <div className="sealText">UNDERWRITE</div>
                </div>
              </div>

              {errorMsg ? (
                <div className="errorBox" role="alert">
                  <div className="errorTitle">Oeps</div>
                  <div className="errorText">{errorMsg}</div>
                </div>
              ) : null}

              <form
                className="form"
                onSubmit={(e) => {
                  e.preventDefault()
                  if (canSubmit) signIn()
                }}
              >
                <div className="field">
                  <label className="label" htmlFor="email">Email</label>
                  <input
                    id="email"
                    className="input"
                    placeholder="jij@voorbeeld.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    inputMode="email"
                  />
                </div>

                <div className="field">
                  <label className="label" htmlFor="password">Wachtwoord</label>
                  <input
                    id="password"
                    className="input"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                  <div className="help">Minimaal 6 tekens.</div>
                </div>

                <div className="actions">
                  <button className="btnPrimary" type="submit" disabled={!canSubmit}>
                    {loading ? 'Bezig…' : 'Inloggen'}
                    <span className="arrow" aria-hidden="true">→</span>
                  </button>

                  <button
                    className="btn"
                    type="button"
                    onClick={signUp}
                    disabled={loading || email.trim().length < 4 || password.length < 6}
                  >
                    Account maken
                  </button>
                </div>

                <div className="tip">
                  <div className="tipTitle">Tip</div>
                  <div className="tipText">
                    Als “Email confirmations” aan staat in Supabase, moet je eerst je mail bevestigen voordat je kunt inloggen.
                  </div>
                </div>
              </form>
            </div>

            {/* ✅ NEW: fills the dead space on desktop */}
            <div className="panelExtra">
              <div className="extraTitle">Na inloggen</div>
              <div className="extraGrid">
                <div className="extraItem">
                  <div className="extraKicker">1</div>
                  <div>
                    <div className="extraLabel">Deal toevoegen</div>
                    <div className="extraText">Adres/huur/kosten → klaar.</div>
                  </div>
                </div>
                <div className="extraItem">
                  <div className="extraKicker">2</div>
                  <div>
                    <div className="extraLabel">Verdict & score</div>
                    <div className="extraText">GO/MAYBE/NO-GO met uitleg.</div>
                  </div>
                </div>
                <div className="extraItem">
                  <div className="extraKicker">3</div>
                  <div>
                    <div className="extraLabel">Onderhandel-anker</div>
                    <div className="extraText">Zie welke prijs jouw “GO” breekt.</div>
                  </div>
                </div>
              </div>

              <div className="extraTrust">
                <span className="trustDot" aria-hidden="true" />
                Alles blijft privé. Geen dashboards, geen gedoe — alleen beslissen.
              </div>
            </div>
          </aside>

          {/* HERO */}
          <div className="hero">
            <div className="heroHead">
              <div className="badge">
                <span className="pulseDot" aria-hidden="true" />
                Vastgoed deal engine
              </div>
              <h1 className="h1">
                Zie in één oogopslag of een deal
                <span className="accent"> GO</span> is.
              </h1>
              <p className="lead">
                Cashflow, rendement en risico in een helder verdict. Alsof je een underwriting team in je broekzak hebt.
              </p>
            </div>

            <div className="pitchStack" aria-label="Deal preview">
              <article className="pitchCard pitchCardBack" aria-hidden="true" />
              <article className="pitchCard pitchCardMid" aria-hidden="true" />

              <article className="pitchCard pitchCardFront">
                <div className="pitchTop">
                  <div className="pitchTitle">
                    <div className="miniLabel">Nieuwe deal</div>
                    <div className="bigTitle">Rotterdam • 2-kamer • 58m²</div>
                  </div>
                  <div className="verdict">
                    <span className="verdictDot" aria-hidden="true" />
                    GO
                  </div>
                </div>

                <div className="pitchDivider" />

                <div className="metrics">
                  <div className="metric">
                    <div className="metricLabel">Netto cashflow</div>
                    <div className="metricValue">+ €312 / mnd</div>
                    <div className="metricHint">na kosten & leegstand</div>
                  </div>
                  <div className="metric">
                    <div className="metricLabel">Bruto rendement</div>
                    <div className="metricValue">7.8%</div>
                    <div className="metricHint">op aankoopprijs</div>
                  </div>
                  <div className="metric">
                    <div className="metricLabel">Risico</div>
                    <div className="metricValue">Laag</div>
                    <div className="metricHint">stabiele wijk-score</div>
                  </div>
                </div>

                <div className="pitchDivider" />

                <div className="reasons">
                  <div className="reason">
                    <span className="rIcon rGreen" aria-hidden="true" />
                    <div>
                      <div className="reasonTitle">Sterke marge</div>
                      <div className="reasonText">Positieve cashflow zelfs bij conservatieve aannames.</div>
                    </div>
                  </div>
                  <div className="reason">
                    <span className="rIcon rIndigo" aria-hidden="true" />
                    <div>
                      <div className="reasonTitle">Onderhandel-anker</div>
                      <div className="reasonText">Je ziet precies welke prijs jouw “GO” breekt.</div>
                    </div>
                  </div>
                  <div className="reason">
                    <span className="rIcon rAmber" aria-hidden="true" />
                    <div>
                      <div className="reasonTitle">Scherpe focus</div>
                      <div className="reasonText">Filter deals op score, cashflow en risico.</div>
                    </div>
                  </div>
                </div>

                <div className="ctaRow">
                  <span className="ctaPill">✅ GO / MAYBE / NO-GO</span>
                  <span className="ctaPill">📊 Live score</span>
                  <span className="ctaPill pro">PRO: scenario’s</span>
                </div>
              </article>

              <div className="scanline" aria-hidden="true" />
            </div>

            <div className="fineprint">
              Door in te loggen accepteer je dat dit een tool is (geen financieel advies). Jij beslist.
            </div>
          </div>
        </section>

        <footer className="footer">Na inloggen ga je door naar je deals.</footer>
      </div>

      <style jsx>{`
        :global(html, body) { background: #050812; }

        .page{ min-height:100vh; color:#e7eaf2; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"; position:relative; overflow:hidden; }
        .bg{ position:absolute; inset:0; pointer-events:none; }
        .vignette{ position:absolute; inset:-40px; background: radial-gradient(1000px 600px at 20% 15%, rgba(99,102,241,0.10), transparent 60%), radial-gradient(900px 540px at 85% 20%, rgba(16,185,129,0.10), transparent 55%), radial-gradient(900px 540px at 50% 115%, rgba(56,189,248,0.08), transparent 55%), linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.65)); filter: saturate(1.05); }
        .orb{ position:absolute; width:520px; height:520px; border-radius:999px; filter: blur(28px); opacity:0.8; mix-blend-mode: screen; animation: drift 14s ease-in-out infinite; }
        .orbA{ left:-140px; top:-170px; background: radial-gradient(circle at 30% 30%, rgba(99,102,241,0.55), transparent 60%), radial-gradient(circle at 70% 70%, rgba(56,189,248,0.25), transparent 55%); }
        .orbB{ right:-160px; top:-120px; background: radial-gradient(circle at 30% 30%, rgba(16,185,129,0.45), transparent 60%), radial-gradient(circle at 70% 70%, rgba(245,158,11,0.20), transparent 55%); animation-delay: -6s; }
        .grid{ position:absolute; inset:0; background: linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px); background-size: 58px 58px; opacity:0.10; mask-image: radial-gradient(800px 520px at 30% 25%, #000 40%, transparent 72%); }
        .topo{ position:absolute; inset:-30px; background: repeating-radial-gradient(circle at 25% 30%, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 12px, transparent 18px); opacity:0.06; filter: blur(0.2px); animation: topoMove 18s linear infinite; mask-image: radial-gradient(900px 650px at 45% 40%, #000 35%, transparent 75%); }
        .cityline{ position:absolute; left:0; right:0; bottom:-40px; height:240px; background: linear-gradient(180deg, transparent, rgba(0,0,0,0.45)), url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='260' viewBox='0 0 1200 260'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.14)' stroke-width='2'%3E%3Cpath d='M0 220 L60 220 L60 170 L110 170 L110 200 L160 200 L160 140 L230 140 L230 220 L300 220 L300 160 L350 160 L350 220 L420 220 L420 120 L500 120 L500 220 L580 220 L580 150 L650 150 L650 220 L720 220 L720 110 L820 110 L820 220 L900 220 L900 170 L960 170 L960 220 L1040 220 L1040 135 L1120 135 L1120 220 L1200 220'/%3E%3C/g%3E%3C/svg%3E"); background-repeat:no-repeat; background-position: center bottom; opacity:0.22; filter: blur(0.1px); mask-image: linear-gradient(to top, #000 45%, transparent); }
        @keyframes drift{ 0%,100%{ transform: translate3d(0,0,0) scale(1);} 50%{ transform: translate3d(26px,18px,0) scale(1.02);} }
        @keyframes topoMove{ 0%{ transform: translate3d(0,0,0);} 100%{ transform: translate3d(120px, 60px, 0);} }

        @media (prefers-reduced-motion: reduce){
          .orb, .topo { animation: none !important; }
          .scanline { display:none; }
          .mark::after { display:none; }
        }

        .shell{ position:relative; max-width:1160px; margin:0 auto; padding:24px; }

        .header{ display:flex; justify-content:space-between; align-items:center; gap:14px; padding:14px 16px; border-radius:22px; border:1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.06); backdrop-filter: blur(14px); }

        .brand{ display:flex; align-items:center; gap:12px; }
        .mark{ width:44px; height:44px; border-radius:16px; background: linear-gradient(135deg, rgba(99,102,241,1), rgba(16,185,129,1)); box-shadow: 0 22px 60px rgba(0,0,0,0.55); position:relative; overflow:hidden; }
        .mark::after{ content:''; position:absolute; inset:-40px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent); transform: rotate(20deg) translateX(-60%); animation: sheen 3.8s ease-in-out infinite; }
        @keyframes sheen{ 0%,60%{ transform: rotate(20deg) translateX(-70%); opacity:0; } 75%{ opacity:1; } 100%{ transform: rotate(20deg) translateX(60%); opacity:0; } }

        .brandTitle{ font-weight:950; letter-spacing:-0.2px; font-size:16px; }
        .brandSub{ margin-top:2px; color:rgba(231,234,242,0.70); font-size:13px; }

        .headerRight{ display:flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
        .chip{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.18); color: rgba(231,234,242,0.92); font-weight:900; font-size:12px; }
        .chipIcon{ opacity:0.9; }

        /* ✅ Make desktop feel “filled” + remove dead space */
        .stage{
          margin-top:18px;
          display:grid;
          grid-template-columns: 1.15fr 0.85fr;
          gap:18px;
          align-items:start;
          min-height: calc(100vh - 170px);
        }

        /* ✅ Sticky login so right column looks intentional */
        .panel{
          position: sticky;
          top: 18px;
          align-self: start;
          display: grid;
          gap: 12px;
        }

        .panelInner{
          border-radius:26px;
          border:1px solid rgba(255,255,255,0.12);
          background: radial-gradient(520px 220px at 80% 0%, rgba(16,185,129,0.12), transparent 60%), radial-gradient(520px 220px at 10% 10%, rgba(99,102,241,0.10), transparent 60%), rgba(255,255,255,0.06);
          backdrop-filter: blur(16px);
          box-shadow: 0 34px 90px rgba(0,0,0,0.65);
          padding:18px;
          overflow:hidden;
          position: relative;
        }
        .panelInner::before{
          content:'';
          position:absolute;
          inset:-2px;
          background: linear-gradient(120deg, rgba(99,102,241,0.0), rgba(99,102,241,0.18), rgba(16,185,129,0.10), rgba(245,158,11,0.06), rgba(99,102,241,0.0));
          filter: blur(14px);
          opacity:0.55;
          pointer-events:none;
        }

        /* ✅ NEW right-column filler card */
        .panelExtra{
          border-radius:26px;
          border:1px solid rgba(255,255,255,0.10);
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(14px);
          box-shadow: 0 26px 70px rgba(0,0,0,0.45);
          padding:16px;
        }
        .extraTitle{ font-weight:980; letter-spacing:-0.2px; margin-bottom:12px; }
        .extraGrid{ display:grid; gap:10px; }
        .extraItem{ display:grid; grid-template-columns: 34px 1fr; gap:10px; align-items:start; }
        .extraKicker{
          width:30px; height:30px; border-radius:12px;
          display:grid; place-items:center;
          font-weight:980;
          border:1px solid rgba(255,255,255,0.12);
          background: rgba(0,0,0,0.18);
          color: rgba(231,234,242,0.90);
        }
        .extraLabel{ font-weight:960; }
        .extraText{ color: rgba(231,234,242,0.70); font-size:12.5px; line-height:1.35; margin-top:2px; }
        .extraTrust{
          margin-top:12px;
          padding-top:12px;
          border-top:1px solid rgba(255,255,255,0.10);
          display:flex; gap:10px; align-items:flex-start;
          color: rgba(231,234,242,0.68);
          font-size:12.5px;
          line-height:1.45;
        }
        .trustDot{
          width:10px; height:10px; border-radius:99px;
          background: rgba(99,102,241,0.95);
          box-shadow: 0 18px 40px rgba(0,0,0,0.45);
          margin-top:4px;
          flex: 0 0 auto;
        }

        .panelHead{ position:relative; display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
        .panelTitle{ font-size:18px; font-weight:980; letter-spacing:-0.2px; }
        .panelSub{ margin-top:4px; color: rgba(231,234,242,0.70); font-size:13px; line-height:1.4; }

        .miniSeal{ position:relative; width:48px; height:48px; display:grid; place-items:center; opacity:0.9; }
        .sealRing{ position:absolute; inset:0; border-radius:999px; border:1px solid rgba(255,255,255,0.16); background: rgba(0,0,0,0.18); }
        .sealText{ font-size:9px; letter-spacing:1.2px; font-weight:950; color: rgba(231,234,242,0.70); }

        .errorBox{ position:relative; margin-top:12px; border-radius:18px; border:1px solid rgba(239,68,68,0.25); background: rgba(239,68,68,0.10); padding:12px; }
        .errorTitle{ font-weight:980; margin-bottom:4px; }
        .errorText{ color: rgba(231,234,242,0.86); font-size:12.5px; line-height:1.45; }

        .form{ position:relative; margin-top:14px; display:grid; gap:12px; }
        .field{ display:grid; gap:7px; }
        .label{ font-size:12px; font-weight:900; color: rgba(231,234,242,0.70); }
        .input{
          width:100%;
          padding:13px 12px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.22);
          color:#e7eaf2;
          outline:none;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
          transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;
        }
        .input::placeholder{ color: rgba(231,234,242,0.45); }
        .input:focus{
          border-color: rgba(99,102,241,0.55);
          box-shadow: 0 0 0 4px rgba(99,102,241,0.16), inset 0 1px 0 rgba(255,255,255,0.06);
          transform: translateY(-1px);
        }

        .help{ color: rgba(231,234,242,0.62); font-size:12px; margin-top:2px; }

        .actions{ display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:4px; }
        .btnPrimary, .btn{
          padding:12px 12px;
          border-radius:16px;
          font-weight:980;
          cursor:pointer;
          border:1px solid rgba(255,255,255,0.14);
          background: rgba(255,255,255,0.06);
          color:#e7eaf2;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          transition: transform .12s ease, box-shadow .12s ease, opacity .12s ease;
          user-select:none;
        }
        .btnPrimary{
          border-color: rgba(99,102,241,0.45);
          background: linear-gradient(135deg, rgba(99,102,241,0.95), rgba(79,70,229,0.95));
          box-shadow: 0 18px 55px rgba(0,0,0,0.55);
        }
        .btnPrimary:hover, .btn:hover{ transform: translateY(-1px); }
        .btnPrimary:active, .btn:active{ transform: translateY(0px) scale(0.99); }
        .btnPrimary:disabled, .btn:disabled{ opacity:0.55; cursor:not-allowed; transform:none; }
        .arrow{ font-weight:980; opacity:0.95; }

        .tip{ margin-top:12px; border-radius:18px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.18); padding:12px; }
        .tipTitle{ font-weight:980; margin-bottom:5px; }
        .tipText{ color: rgba(231,234,242,0.70); font-size:12.5px; line-height:1.45; }

        /* Hero */
        .hero{ position:relative; display:grid; gap:14px; align-content:start; }
        .heroHead{ padding:20px 20px 0; }
        .badge{ display:inline-flex; align-items:center; gap:10px; padding:8px 12px; border-radius:999px; border:1px solid rgba(99,102,241,0.35); background: rgba(99,102,241,0.12); color: rgba(199,210,254,0.95); font-weight:950; font-size:12px; width:fit-content; }
        .pulseDot{ width:9px; height:9px; border-radius:99px; background: rgba(16,185,129,0.95); box-shadow: 0 0 0 0 rgba(16,185,129,0.35); animation: pulse 1.9s ease-out infinite; }
        @keyframes pulse{ 0%{ box-shadow:0 0 0 0 rgba(16,185,129,0.35);} 70%{ box-shadow:0 0 0 10px rgba(16,185,129,0.0);} 100%{ box-shadow:0 0 0 0 rgba(16,185,129,0.0);} }

        .h1{ margin:12px 0 10px; font-size:44px; line-height:1.02; letter-spacing:-0.6px; font-weight:980; max-width: 18ch; }
        .accent{ background: linear-gradient(90deg, rgba(16,185,129,1), rgba(99,102,241,1)); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .lead{ margin:0; color: rgba(231,234,242,0.74); font-size:15px; line-height:1.7; max-width: 62ch; }

        .pitchStack{ position:relative; border-radius:26px; padding:18px; border:1px solid rgba(255,255,255,0.10); background: radial-gradient(700px 260px at 20% 0%, rgba(99,102,241,0.18), transparent 60%), radial-gradient(700px 260px at 85% 10%, rgba(16,185,129,0.14), transparent 60%), rgba(255,255,255,0.06); backdrop-filter: blur(14px); box-shadow: 0 32px 90px rgba(0,0,0,0.60); overflow:hidden; }
        .pitchCard{ border-radius:22px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.22); }
        .pitchCardBack{ position:absolute; inset: 18px 18px auto auto; width: 92%; height: 85%; transform: translate3d(14px, 16px, 0) rotate(1.2deg); opacity:0.35; }
        .pitchCardMid{ position:absolute; inset: 18px 18px auto auto; width: 96%; height: 90%; transform: translate3d(8px, 8px, 0) rotate(0.6deg); opacity:0.55; }
        .pitchCardFront{ position:relative; padding:16px; border-radius:22px; background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03)), rgba(0,0,0,0.24); }
        .pitchTop{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; }
        .miniLabel{ font-size:12px; font-weight:900; color: rgba(231,234,242,0.62); }
        .bigTitle{ margin-top:4px; font-size:16px; font-weight:960; letter-spacing:-0.2px; }
        .verdict{ display:inline-flex; align-items:center; gap:10px; padding:8px 12px; border-radius:999px; border:1px solid rgba(16,185,129,0.28); background: rgba(16,185,129,0.12); color: rgba(209,250,229,0.95); font-weight:980; letter-spacing:0.6px; }
        .verdictDot{ width:10px; height:10px; border-radius:99px; background: rgba(34,197,94,0.95); box-shadow: 0 0 0 0 rgba(34,197,94,0.35); animation: pulse 2.1s ease-out infinite; }
        .pitchDivider{ height:1px; background: rgba(255,255,255,0.10); margin:14px 0; }
        .metrics{ display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }
        .metric{ border-radius:16px; border:1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.22); padding:12px; }
        .metricLabel{ font-size:12px; font-weight:900; color: rgba(231,234,242,0.65); }
        .metricValue{ margin-top:6px; font-size:18px; font-weight:980; letter-spacing:-0.2px; }
        .metricHint{ margin-top:3px; font-size:12px; color: rgba(231,234,242,0.62); }
        .reasons{ display:grid; gap:10px; }
        .reason{ display:grid; grid-template-columns: 14px 1fr; gap:10px; align-items:start; }
        .rIcon{ width:10px; height:10px; border-radius:99px; margin-top:6px; box-shadow: 0 18px 40px rgba(0,0,0,0.45); }
        .rGreen{ background: rgba(16,185,129,0.95); }
        .rIndigo{ background: rgba(99,102,241,0.95); }
        .rAmber{ background: rgba(245,158,11,0.95); }
        .reasonTitle{ font-weight:960; }
        .reasonText{ color: rgba(231,234,242,0.70); font-size:12.5px; line-height:1.45; }
        .ctaRow{ display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; }
        .ctaPill{ padding:8px 11px; border-radius:999px; border:1px solid rgba(255,255,255,0.12); background: rgba(0,0,0,0.18); font-size:12px; font-weight:950; color: rgba(231,234,242,0.90); }
        .ctaPill.pro{ border-color: rgba(99,102,241,0.35); background: rgba(99,102,241,0.12); color: rgba(199,210,254,0.95); }
        .scanline{ position:absolute; left:-40px; right:-40px; top:-30%; height:120px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent); transform: rotate(-12deg); animation: scan 4.8s ease-in-out infinite; opacity:0.55; pointer-events:none; }
        @keyframes scan{ 0%{ transform: translateY(-20%) rotate(-12deg); opacity:0; } 25%{ opacity:0.6; } 55%{ opacity:0.4; } 100%{ transform: translateY(160%) rotate(-12deg); opacity:0; } }
        .fineprint{ color: rgba(231,234,242,0.60); font-size:12px; padding: 0 2px; }

        .footer{ margin-top:16px; text-align:center; color: rgba(231,234,242,0.65); font-size:12px; padding-bottom:8px; }

        /* ✅ Mobile: login immediately visible (panel first), hero below */
        @media (max-width: 980px){
          .shell{ padding:14px; }
          .header{ flex-direction:column; align-items:flex-start; gap:10px; border-radius:20px; }
          .stage{ grid-template-columns: 1fr; gap:14px; min-height: auto; }
          .panel{ position: static; order: 1; }
          .hero{ order: 2; }
          .heroHead{ padding:12px 2px 0; }
          .h1{ font-size:34px; max-width: 22ch; }
          .metrics{ grid-template-columns: 1fr; }
          .actions{ grid-template-columns: 1fr; }

          /* ✅ Keep phone “clean”: hide the extra filler card on mobile */
          .panelExtra{ display:none; }

          /* ✅ Reduce confusion: push the preview down a bit */
          .pitchStack{ margin-top: 6px; }
        }
      `}</style>
    </main>
  )
}
