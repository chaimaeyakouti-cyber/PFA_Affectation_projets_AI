import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getMonGroupe, getMonAffectation } from '../../services/api'

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
  success: '#059669',
  successBg: '#D1FAE5',
  warningBg: '#FEF3C7',
  warningText: '#92400E',
}

interface MonGroupe {
  id: number
  nom: string
  etudiants: { nom: string; prenom: string; filiere: string }[]
}

interface MonAffectation {
  affectation_id: number
  groupe_nom: string
  projet_titre: string | null
  projet_description: string | null
  valide: string
}

export default function EtudiantDashboard() {
  const navigate = useNavigate()
  const [currentUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })

  const [monGroupe, setMonGroupe] = useState<MonGroupe | null>(null)
  const [monAffectation, setMonAffectation] = useState<MonAffectation | null>(null)
  const [loadingGroupe, setLoadingGroupe] = useState(true)
  const [loadingAff, setLoadingAff] = useState(true)

  useEffect(() => {
    const loadPersonal = async () => {
      if (!currentUser?.id) {
        setLoadingGroupe(false)
        setLoadingAff(false)
        return
      }

      // Charger le groupe personnel
      if (currentUser.groupe_id) {
        try {
          const g = await getMonGroupe(currentUser.id)
          setMonGroupe(g.data)
        } catch (_) {}
      }
      setLoadingGroupe(false)

      // Charger l'affectation personnelle
      try {
        const a = await getMonAffectation(currentUser.id)
        setMonAffectation(a.data)
      } catch (_) {}
      setLoadingAff(false)
    }
    loadPersonal()
  }, [])

  // Statut de l'affectation
  const affStatut = monAffectation
    ? monAffectation.valide === 'validé'
      ? { bg: palette.successBg, color: palette.success, label: '✓ Validée', icon: '🎉' }
      : monAffectation.valide === 'modifié'
      ? { bg: '#DBEAFE', color: '#1E40AF', label: 'Modifiée', icon: '✎' }
      : { bg: palette.warningBg, color: palette.warningText, label: 'En attente', icon: '⏳' }
    : null

  return (
    <div style={{ minHeight: '100vh', background: palette.bg, fontFamily: "'Crimson Pro', 'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .nav-card { transition: transform 0.2s ease, box-shadow 0.2s ease; cursor: pointer; }
        .nav-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(107,70,193,0.15); }
        .cta-btn { transition: background 0.2s, transform 0.15s; }
        .cta-btn:hover { background: ${palette.deepPurple} !important; transform: scale(1.02); }
      `}</style>

      {/* Header */}
      <header style={{ background: palette.deepPurple, borderBottom: `3px solid ${palette.accent}`, padding: '0 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 72 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
            <div>
              <div style={{ color: '#fff', fontSize: 17, fontWeight: 600 }}>PFA Affectation</div>
              <div style={{ color: palette.border, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>INPT · Plateforme de gestion de projets</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: palette.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>
              {currentUser?.nom?.[0]?.toUpperCase() || 'É'}
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{currentUser?.nom || 'Étudiant'}</div>
              <div style={{ color: '#C4B5FD', fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{currentUser?.email}</div>
            </div>
            <button onClick={() => { localStorage.removeItem('user'); navigate('/') }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#C4B5FD', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginLeft: 8 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <div style={{ background: `linear-gradient(135deg, ${palette.deepPurple} 0%, #4A2C8C 60%, ${palette.midPurple} 100%)`, padding: '48px 40px 44px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: '4px 14px', marginBottom: 14 }}>
            <span style={{ color: '#C4B5FD', fontSize: 12, fontFamily: "'DM Sans', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase' }}>Tableau de bord</span>
          </div>
          <h1 style={{ margin: '0 0 8px', color: '#fff', fontSize: 34, fontWeight: 700 }}>
            Bonjour, {currentUser?.nom?.split(' ')[0] || 'étudiant'} 👋
          </h1>
          <p style={{ margin: 0, color: '#C4B5FD', fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
            Gérez votre groupe, soumettez vos préférences et suivez votre affectation.
          </p>
        </div>
      </div>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 40px' }}>

        {/* ── BLOC PERSONNALISÉ : Mon Groupe + Mon Affectation ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 36 }}>

          {/* Mon Groupe */}
          <div style={{ background: palette.card, borderRadius: 16, border: `1px solid ${palette.border}`, padding: '28px 28px', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: palette.lightPurple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👥</div>
                <h3 style={{ margin: 0, color: palette.text, fontSize: 17, fontWeight: 600 }}>Mon Groupe</h3>
              </div>
            </div>

            {loadingGroupe ? (
              <div style={{ color: palette.muted, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</div>
            ) : monGroupe ? (
              <div>
                <div style={{ background: palette.lightPurple, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
                  <div style={{ color: palette.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{monGroupe.nom}</div>
                  <div style={{ color: palette.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{monGroupe.etudiants?.length} membre(s)</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {monGroupe.etudiants?.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: palette.lightPurple, display: 'flex', alignItems: 'center', justifyContent: 'center', color: palette.midPurple, fontSize: 11, fontWeight: 700 }}>
                        {e.nom?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: palette.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{e.nom} {e.prenom}</div>
                        <div style={{ color: palette.muted, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{e.filiere}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: palette.warningBg, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ margin: '0 0 4px', color: palette.warningText, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    ⚠️ Vous n'avez pas encore de groupe
                  </p>
                  <p style={{ margin: 0, color: '#B45309', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                    Créez votre groupe et soumettez vos choix de projets.
                  </p>
                </div>
                <button
                  className="cta-btn"
                  onClick={() => navigate('/etudiant/creer-groupe')}
                  style={{ width: '100%', background: palette.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px', fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}
                >
                  Créer mon groupe →
                </button>
              </div>
            )}
          </div>

          {/* Mon Affectation */}
          <div style={{ background: palette.card, borderRadius: 16, border: `1px solid ${palette.border}`, padding: '28px 28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: palette.lightPurple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎯</div>
              <h3 style={{ margin: 0, color: palette.text, fontSize: 17, fontWeight: 600 }}>Mon Affectation</h3>
            </div>

            {loadingAff ? (
              <div style={{ color: palette.muted, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</div>
            ) : monAffectation ? (
              <div>
                <div style={{ marginBottom: 14 }}>
                  <span style={{ background: affStatut!.bg, color: affStatut!.color, fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
                    {affStatut!.icon} {affStatut!.label}
                  </span>
                </div>
                {monAffectation.projet_titre ? (
                  <div style={{ background: palette.lightPurple, borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${palette.accent}` }}>
                    <div style={{ color: palette.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
                      📁 {monAffectation.projet_titre}
                    </div>
                    {monAffectation.projet_description && (
                      <div style={{ color: palette.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.5 }}>
                        {monAffectation.projet_description.slice(0, 120)}{monAffectation.projet_description.length > 120 ? '...' : ''}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ color: '#DC2626', fontSize: 13, fontFamily: "'DM Sans', sans-serif", background: '#FEF2F2', borderRadius: 10, padding: '12px 16px' }}>
                    Aucun projet disponible assigné
                  </div>
                )}
                <button
                  onClick={() => navigate('/etudiant/resultats')}
                  style={{ marginTop: 14, width: '100%', background: 'transparent', color: palette.accent, border: `1.5px solid ${palette.accent}`, borderRadius: 10, padding: '10px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer' }}
                >
                  Voir le détail complet →
                </button>
              </div>
            ) : (
              <div>
                <div style={{ background: '#F3F4F6', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                  <p style={{ margin: 0, color: palette.muted, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                    {!monGroupe
                      ? 'Créez votre groupe pour obtenir une affectation'
                      : 'L\'affectation n\'a pas encore été lancée par le coordinateur'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 6px', color: palette.text, fontSize: 20, fontWeight: 600 }}>Actions rapides</h2>
          <p style={{ margin: '0 0 20px', color: palette.muted, fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            {monGroupe ? 'Votre groupe est créé. Vous pouvez modifier vos choix ou consulter les résultats.' : 'Suivez les étapes pour soumettre votre dossier.'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {[
            {
              title: monGroupe ? 'Modifier mon groupe' : 'Créer mon groupe',
              description: monGroupe
                ? `Groupe "${monGroupe.nom}" — ${monGroupe.etudiants?.length} membre(s). Mettez à jour les informations ou soumettez de nouveaux choix.`
                : 'Créez votre groupe et ajoutez vos coéquipiers (1 à 3 membres).',
              icon: '👥',
              path: '/etudiant/creer-groupe',
              badge: monGroupe ? '✓ Créé' : 'À faire',
              badgeOk: !!monGroupe,
              cta: monGroupe ? 'Modifier' : 'Créer',
              step: 1,
            },
            {
              title: 'Choix de Projets',
              description: 'Soumettez vos 3 projets préférés par ordre de préférence. Modifiables tant que l\'affectation n\'est pas lancée.',
              icon: '📋',
              path: '/etudiant/creer-groupe',
              badge: monGroupe ? 'Accéder' : 'Groupe requis',
              badgeOk: !!monGroupe,
              cta: 'Choisir',
              step: 2,
            },
            {
              title: 'Résultats',
              description: 'Consultez le projet qui vous a été attribué par le système d\'affectation automatique.',
              icon: '🎯',
              path: '/etudiant/resultats',
              badge: monAffectation ? affStatut!.label : 'En attente',
              badgeOk: !!(monAffectation && monAffectation.valide === 'validé'),
              cta: 'Voir',
              step: 3,
            },
          ].map((card, i) => (
            <div
              key={card.title}
              className="nav-card"
              style={{ background: palette.card, borderRadius: 16, border: `1px solid ${palette.border}`, padding: '28px 24px', display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: palette.lightPurple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {card.icon}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                  <span style={{ background: palette.lightPurple, color: palette.midPurple, fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, padding: '2px 10px', borderRadius: 20 }}>
                    Étape {card.step}
                  </span>
                  <span style={{ background: card.badgeOk ? palette.successBg : palette.warningBg, color: card.badgeOk ? palette.success : palette.warningText, fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                    {card.badge}
                  </span>
                </div>
              </div>
              <h3 style={{ margin: '0 0 8px', color: palette.text, fontSize: 17, fontWeight: 600 }}>{card.title}</h3>
              <p style={{ margin: '0 0 24px', color: palette.muted, fontSize: 13, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, flexGrow: 1 }}>{card.description}</p>
              <button
                className="cta-btn"
                onClick={() => navigate(card.path)}
                style={{ background: palette.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 0', fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer', width: '100%' }}
              >
                {card.cta} →
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 32, padding: '18px 22px', borderRadius: 12, background: palette.lightPurple, border: `1px solid ${palette.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <p style={{ margin: 0, color: palette.midPurple, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
            <strong>Rappel :</strong> Créez votre groupe, soumettez vos 3 choix de projets par ordre de préférence. Les résultats seront visibles ici dès que le coordinateur aura lancé l'affectation.
          </p>
        </div>
      </main>
    </div>
  )
}