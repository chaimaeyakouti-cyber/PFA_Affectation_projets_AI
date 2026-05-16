import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getGroupes, getChoix, getAffectations } from '../../services/api'

const palette = {
  bg: '#F8F7FC',
  card: '#FFFFFF',
  deepPurple: '#2D1B69',
  midPurple: '#6B46C1',
  lightPurple: '#EDE9FE',
  accent: '#7C3AED',
  text: '#1C1033',
  muted: '#6B7280',
  border: '#DDD6FE',
}

export default function EtudiantDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ groupes: 0, choix: 0, affectations: 0 })

  useEffect(() => {
    const load = async () => {
      try {
        const [g, c, a] = await Promise.all([getGroupes(), getChoix(), getAffectations()])
        setStats({ groupes: g.data.length, choix: c.data.length, affectations: a.data.length })
      } catch (_) {}
    }
    load()
  }, [])

  const cards = [
    {
      title: 'Mon Groupe',
      description: 'Créer votre groupe de projet et ajouter vos coéquipiers (max 3 membres).',
      icon: '👥',
      path: '/etudiant/creer-groupe',
      badge: stats.groupes > 0 ? `${stats.groupes} groupe(s)` : null,
      cta: 'Accéder',
    },
    {
      title: 'Choix de Projets',
      description: 'Soumettez vos 3 projets préférés par ordre de préférence.',
      icon: '📋',
      path: '/etudiant/creer-groupe',
      badge: stats.choix > 0 ? `${stats.choix} choix` : null,
      cta: 'Choisir',
    },
    {
      title: 'Résultats d\'Affectation',
      description: 'Consultez le projet qui vous a été attribué après traitement par le système.',
      icon: '🎯',
      path: '/etudiant/resultats',
      badge: stats.affectations > 0 ? 'Disponible' : 'En attente',
      badgeType: stats.affectations > 0 ? 'success' : 'pending',
      cta: 'Voir',
    },
  ]

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, fontFamily: "'Crimson Pro', 'Georgia', serif" }}>
      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .nav-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .nav-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(107, 70, 193, 0.15); }
        .cta-btn { transition: background 0.2s, transform 0.15s; }
        .cta-btn:hover { background: ${palette.deepPurple} !important; transform: scale(1.02); }
      `}</style>

      {/* Header */}
      <header style={{
        background: palette.deepPurple,
        borderBottom: `3px solid ${palette.accent}`,
        padding: '0 40px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
            <div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 600, letterSpacing: 0.3 }}>PFA Affectation</div>
              <div style={{ color: palette.border, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>INPT · Plateforme de gestion de projets</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>É</div>
            <span style={{ color: palette.border, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Espace Étudiant</span>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${palette.deepPurple} 0%, #4A2C8C 60%, ${palette.midPurple} 100%)`,
        padding: '52px 40px 48px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 14px', marginBottom: 16 }}>
            <span style={{ color: '#C4B5FD', fontSize: 12, fontFamily: "'DM Sans', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase' }}>Tableau de bord</span>
          </div>
          <h1 style={{ margin: '0 0 10px', color: '#fff', fontSize: 36, fontWeight: 700, lineHeight: 1.2, letterSpacing: -0.5 }}>
            Bienvenue sur votre espace
          </h1>
          <p style={{ margin: 0, color: '#C4B5FD', fontSize: 16, fontFamily: "'DM Sans', sans-serif", fontWeight: 300, maxWidth: 520 }}>
            Gérez votre groupe, soumettez vos préférences de projet et suivez votre affectation depuis un seul espace.
          </p>

          {/* Stats bar */}
          <div style={{ display: 'flex', gap: 32, marginTop: 36 }}>
            {[
              { label: 'Groupes enregistrés', value: stats.groupes },
              { label: 'Choix soumis', value: stats.choix },
              { label: 'Affectations', value: stats.affectations },
            ].map(s => (
              <div key={s.label}>
                <div style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: '#C4B5FD', fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 40px' }}>
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ margin: '0 0 6px', color: palette.text, fontSize: 22, fontWeight: 600, letterSpacing: -0.3 }}>Que souhaitez-vous faire ?</h2>
          <p style={{ margin: 0, color: palette.muted, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Suivez les étapes dans l'ordre pour compléter votre dossier de projet.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {cards.map((card, i) => (
            <div
              key={card.title}
              className="nav-card"
              style={{
                background: palette.card,
                borderRadius: 16,
                border: `1px solid ${palette.border}`,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
              }}
            >
              {/* Step badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: palette.lightPurple,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22,
                }}>
                  {card.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                  <span style={{
                    background: palette.lightPurple, color: palette.midPurple,
                    fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                    padding: '2px 10px', borderRadius: 20, letterSpacing: 0.5,
                  }}>
                    Étape {i + 1}
                  </span>
                  {card.badge && (
                    <span style={{
                      background: card.badgeType === 'success' ? '#D1FAE5' : '#FEF3C7',
                      color: card.badgeType === 'success' ? '#065F46' : '#92400E',
                      fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                      padding: '2px 8px', borderRadius: 20,
                    }}>
                      {card.badge}
                    </span>
                  )}
                </div>
              </div>

              <h3 style={{ margin: '0 0 10px', color: palette.text, fontSize: 19, fontWeight: 600 }}>{card.title}</h3>
              <p style={{ margin: '0 0 28px', color: palette.muted, fontSize: 14, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, flexGrow: 1 }}>{card.description}</p>

              <button
                className="cta-btn"
                onClick={() => navigate(card.path)}
                style={{
                  background: palette.accent, color: '#fff',
                  border: 'none', borderRadius: 10, padding: '12px 0',
                  fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                  cursor: 'pointer', width: '100%', letterSpacing: 0.3,
                }}
              >
                {card.cta} →
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 40, padding: '20px 24px', borderRadius: 12,
          background: palette.lightPurple, border: `1px solid ${palette.border}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <p style={{ margin: 0, color: palette.midPurple, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <strong>Rappel :</strong> Vous devez d'abord créer votre groupe, puis soumettre vos 3 choix de projets par ordre de préférence. Les résultats seront disponibles après le traitement par le coordinateur.
          </p>
        </div>
      </main>
    </div>
  )
}