import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser } from '../services/api'

const P = {
  navy: '#071B33',
  navy2: '#0B2A45',
  cyan: '#0891B2',
  teal: '#0F766E',
  soft: '#E0F2FE',
  border: '#D8E3ED',
  error: '#DC2626',
  muted: '#64748B',
  text: '#102033',
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ nom: '', email: '', mot_de_passe: '', role: 'etudiant' })
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setErreur('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await registerUser(form)
        setMode('login')
        setErreur('Compte créé. Connectez-vous maintenant.')
      } else {
        const res = await loginUser({
          email: form.email,
          mot_de_passe: form.mot_de_passe,
        })
        const { user, access_token } = res.data
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('user', JSON.stringify(user))
        if (user.role === 'etudiant') navigate('/etudiant')
        else if (user.role === 'encadrant') navigate('/encadrant')
        else if (user.role === 'coordinateur') navigate('/coordinateur')
      }
    } catch (e: any) {
      setErreur(e?.response?.data?.detail || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F8FB', fontFamily: 'Inter, system-ui, sans-serif', display: 'grid', placeItems: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 1080, display: 'grid', gridTemplateColumns: '1.05fr 0.95fr', background: '#fff', border: `1px solid ${P.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 70px rgba(7,27,51,0.12)' }}>
        <section style={{ background: `linear-gradient(135deg, ${P.navy} 0%, ${P.navy2} 58%, ${P.cyan} 100%)`, color: '#fff', padding: '56px 52px', minHeight: 620, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 54 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(255,255,255,0.14)', display: 'grid', placeItems: 'center', fontSize: 22 }}>🎓</div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>PFA Affectation</div>
                <div style={{ fontSize: 12, color: '#A5F3FC' }}>INPT · Plateforme académique IA</div>
              </div>
            </div>

            <div style={{ maxWidth: 480 }}>
              <div style={{ display: 'inline-flex', padding: '6px 12px', borderRadius: 999, background: 'rgba(6,182,212,0.16)', color: '#A5F3FC', fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 22 }}>
                Affectation équitable des projets
              </div>
              <h1 style={{ margin: 0, fontSize: 44, lineHeight: 1.05, letterSpacing: -0.4, fontWeight: 800 }}>
                Un espace clair pour piloter les choix, les conflits et les résultats.
              </h1>
              <p style={{ margin: '22px 0 0', color: '#D9F7FB', fontSize: 16, lineHeight: 1.7 }}>
                Étudiants, encadrants et coordinateurs travaillent dans le même flux : groupes, projets, préférences et validation finale.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['IA', 'Gale-Shapley'],
              ['3', 'choix par groupe'],
              ['1', 'vue coordinateur'],
            ].map(([value, label]) => (
              <div key={label} style={{ border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>
                <div style={{ color: '#A5F3FC', fontSize: 12 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ padding: '54px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ margin: '0 0 8px', color: P.text, fontSize: 28, fontWeight: 800 }}>
              {mode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p style={{ margin: 0, color: P.muted, fontSize: 14 }}>
              Utilisez votre compte INPT pour accéder à votre espace.
            </p>
          </div>

          <div style={{ display: 'flex', background: '#EEF6FA', borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErreur('') }} style={{
                flex: 1, padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? P.cyan : P.muted,
                boxShadow: mode === m ? '0 6px 18px rgba(7,27,51,0.08)' : 'none',
              }}>
                {m === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          {mode === 'register' && (
            <Field label="Nom complet">
              <input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} placeholder="Votre nom" style={inputStyle} />
            </Field>
          )}

          <Field label="Email INPT">
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nom@inpt.ac.ma" style={inputStyle} />
          </Field>

          <Field label="Mot de passe">
            <input type="password" value={form.mot_de_passe} onChange={e => setForm({ ...form, mot_de_passe: e.target.value })} placeholder="••••••••" style={inputStyle} />
          </Field>

          {mode === 'register' && (
            <Field label="Rôle">
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                <option value="etudiant">Étudiant</option>
                <option value="encadrant">Encadrant</option>
                <option value="coordinateur">Coordinateur</option>
              </select>
            </Field>
          )}

          {erreur && (
            <div style={{ padding: '12px 14px', borderRadius: 10, background: erreur.includes('Compte') ? '#ECFDF5' : '#FEF2F2', border: `1px solid ${erreur.includes('Compte') ? '#A7F3D0' : '#FECACA'}`, color: erreur.includes('Compte') ? P.teal : P.error, fontSize: 13, marginBottom: 16 }}>
              {erreur}
            </div>
          )}

          <button onClick={handleSubmit} disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: 10, border: 'none',
            background: P.cyan, color: '#fff', fontSize: 15, fontWeight: 800,
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
          }}>
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>

          <p style={{ margin: '18px 0 0', color: P.muted, fontSize: 12, textAlign: 'center' }}>
            La connexion Google sera activée après configuration OAuth officielle.
          </p>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 16 }}>
      <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 7 }}>{label}</span>
      {children}
    </label>
  )
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 10,
  border: `1.5px solid ${P.border}`,
  fontSize: 14,
  color: P.text,
  boxSizing: 'border-box',
  background: '#fff',
}
