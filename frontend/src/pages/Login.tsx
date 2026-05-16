import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const P = {
  deep: '#2D1B69',
  accent: '#7C3AED',
  light: '#EDE9FE',
  mid: '#6B46C1',
  border: '#DDD6FE',
  error: '#DC2626',
  muted: '#6B7280',
  text: '#1C1033',
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
        await axios.post('http://127.0.0.1:8000/register', form)
        setMode('login')
        setErreur('Compte créé ! Connectez-vous maintenant.')
      } else {
        const res = await axios.post('http://127.0.0.1:8000/login', {
          email: form.email,
          mot_de_passe: form.mot_de_passe
        })
        const user = res.data
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

  const handleGoogleLogin = () => {
    const email = prompt('Entrez votre email INPT (@inpt.ac.ma) :')
    if (!email) return
    if (!email.endsWith('@inpt.ac.ma')) {
      alert('Veuillez utiliser votre email INPT (@inpt.ac.ma)')
      return
    }
    axios.get(`http://127.0.0.1:8000/user-by-email?email=${email}`)
      .then(res => {
        localStorage.setItem('user', JSON.stringify(res.data))
        const role = res.data.role
        if (role === 'etudiant') navigate('/etudiant')
        else if (role === 'encadrant') navigate('/encadrant')
        else if (role === 'coordinateur') navigate('/coordinateur')
      })
      .catch(() => alert('Aucun compte trouvé pour cet email. Créez un compte d\'abord.'))
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F8F7FC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Crimson+Pro:wght@400;600;700&display=swap');`}</style>

      <div style={{ width: '100%', maxWidth: 460, padding: '0 20px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: P.deep, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px' }}>🎓</div>
          <h1 style={{ margin: 0, color: P.text, fontSize: 26, fontFamily: "'Crimson Pro', serif", fontWeight: 700 }}>PFA Affectation</h1>
          <p style={{ margin: '4px 0 0', color: P.muted, fontSize: 14 }}>INPT · Plateforme de gestion de projets</p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 20, border: `1px solid ${P.border}`, padding: '32px 36px', boxShadow: '0 4px 24px rgba(45,27,105,0.08)' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setErreur('') }} style={{
                flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                background: mode === m ? '#fff' : 'transparent',
                color: mode === m ? P.accent : P.muted,
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s'
              }}>
                {m === 'login' ? 'Se connecter' : 'Créer un compte'}
              </button>
            ))}
          </div>

          {/* Google Button */}
          <button onClick={handleGoogleLogin} style={{
            width: '100%', padding: '11px', borderRadius: 10, border: `1.5px solid ${P.border}`,
            background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: P.text,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20,
          }}>
            <img src="https://www.google.com/favicon.ico" width={18} height={18} alt="Google" />
            Continuer avec Google (@inpt.ac.ma)
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: P.border }} />
            <span style={{ color: P.muted, fontSize: 12 }}>ou</span>
            <div style={{ flex: 1, height: 1, background: P.border }} />
          </div>

          {/* Champs */}
          {mode === 'register' && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: P.text, marginBottom: 6 }}>Nom complet</label>
              <input
                value={form.nom}
                onChange={e => setForm({ ...form, nom: e.target.value })}
                placeholder="Votre nom"
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, color: P.text, boxSizing: 'border-box' }}
              />
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: P.text, marginBottom: 6 }}>Email INPT</label>
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="nom@inpt.ac.ma"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, color: P.text, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: mode === 'register' ? 16 : 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: P.text, marginBottom: 6 }}>Mot de passe</label>
            <input
              type="password"
              value={form.mot_de_passe}
              onChange={e => setForm({ ...form, mot_de_passe: e.target.value })}
              placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, color: P.text, boxSizing: 'border-box' }}
            />
          </div>

          {mode === 'register' && (
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: P.text, marginBottom: 6 }}>Rôle</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 14, color: P.text, boxSizing: 'border-box' }}
              >
                <option value="etudiant">🎓 Étudiant</option>
                <option value="encadrant">👨‍🏫 Encadrant</option>
                <option value="coordinateur">🗂️ Coordinateur</option>
              </select>
            </div>
          )}

          {erreur && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: erreur.includes('créé') ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${erreur.includes('créé') ? '#BBF7D0' : '#FECACA'}`, color: erreur.includes('créé') ? '#166534' : P.error, fontSize: 13, marginBottom: 16 }}>
              {erreur}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 10, border: 'none',
              background: P.accent, color: '#fff', fontSize: 15, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </div>
      </div>
    </div>
  )
}