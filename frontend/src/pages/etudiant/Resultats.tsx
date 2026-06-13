import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMonAffectation, getMonGroupe, getMesChoix, getProjets } from '../../services/api'

const P = {
  bg: '#F5F8FB',
  card: '#FFFFFF',
  deep: '#071B33',
  mid: '#0E7490',
  light: '#E0F2FE',
  accent: '#0891B2',
  text: '#102033',
  muted: '#6B7280',
  border: '#D8E3ED',
}

interface Groupe { id: number; nom: string; chef_id?: number | null; etudiants: { nom: string; prenom: string; filiere: string; stacks?: string }[] }
interface Projet { id: number; titre: string; description: string }
interface Choix { id: number; groupe_id: number; projet_id: number; priorite: number; locked?: number }

interface MonAffectation {
  affectation_id: number
  groupe_nom: string
  projet_titre: string | null
  projet_description: string | null
  encadrant_nom: string | null
  encadrant_email: string | null
  valide: string
  rang_obtenu: number | null
}

const statutStyle = (valide: string) => {
  switch (valide) {
    case 'validé': return { bg: '#D1FAE5', color: '#065F46', label: '✓ Validé' }
    case 'modifié': return { bg: '#DBEAFE', color: '#1E40AF', label: '✎ Modifié' }
    default: return { bg: '#FEF3C7', color: '#92400E', label: '⏳ En attente' }
  }
}

export default function Resultats() {
  const navigate = useNavigate()
  const [currentUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })
  const [loading, setLoading] = useState(true)
  const [groupe, setGroupe] = useState<Groupe | null>(null)
  const [affectation, setAffectation] = useState<MonAffectation | null>(null)
  const [choix, setChoix] = useState<Choix[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      if (!currentUser?.id) {
        setError('Connectez-vous pour consulter votre résultat.')
        setLoading(false)
        return
      }

      try {
        const [g, p] = await Promise.all([getMonGroupe(currentUser.id), getProjets()])
        setGroupe(g.data)
        setProjets(p.data)

        try {
          const c = await getMesChoix(currentUser.id)
          setChoix(c.data.sort((a: Choix, b: Choix) => a.priorite - b.priorite))
        } catch (_) {
          setChoix([])
        }

        try {
          const a = await getMonAffectation(currentUser.id)
          setAffectation(a.data)
        } catch (_) {
          setAffectation(null)
        }
      } catch (_) {
        setError('Impossible de charger votre groupe. Vérifiez que vous avez créé un groupe.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getProjetTitre = (id: number) => projets.find(p => p.id === id)?.titre || `Projet #${id}`

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        .aff-card { transition: box-shadow 0.2s; }
        .aff-card:hover { box-shadow: 0 8px 30px rgba(8,145,178,0.1); }
      `}</style>

      {/* Header */}
      <header style={{ background: P.deep, borderBottom: `3px solid ${P.accent}`, padding: '0 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 68 }}>
          <button onClick={() => navigate('/etudiant')} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif",
          }}>← Retour</button>
          <span style={{ color: '#A5F3FC', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>Résultats d'affectation</span>
          <button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }} style={{
            marginLeft: 'auto', background: '#fff', border: 'none', color: P.deep,
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700,
          }}>Déconnexion</button>
        </div>
      </header>

      {/* Page hero */}
      <div style={{ background: `linear-gradient(135deg, ${P.deep} 0%, #0B2A45 60%, ${P.mid} 100%)`, padding: '40px 40px 36px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px', color: '#fff', fontSize: 32, fontWeight: 700 }}>Résultats d'affectation</h1>
          <p style={{ margin: 0, color: '#A5F3FC', fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 300 }}>
            Consultez le projet assigné à votre groupe après traitement algorithmique.
          </p>
          {!loading && (
            <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
              {[
                { label: 'Mon groupe', val: groupe ? groupe.nom : '—' },
                { label: 'Statut', val: affectation ? statutStyle(affectation.valide).label : 'En attente' },
                { label: 'Rang obtenu', val: affectation?.rang_obtenu ? `Choix n°${affectation.rang_obtenu}` : '—' },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                  <div style={{ color: '#A5F3FC', fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px' }}>

        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>Chargement des résultats...</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '20px 24px', color: '#DC2626', fontSize: 14, fontFamily: "Inter, system-ui, sans-serif" }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && !affectation && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📭</div>
            <h2 style={{ margin: '0 0 10px', color: P.text, fontSize: 24 }}>Aucun résultat disponible</h2>
            <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>
              L'affectation n'a pas encore été lancée par le coordinateur. Revenez plus tard.
            </p>
            <button onClick={() => navigate('/etudiant')} style={{
              background: P.accent, color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 28px', fontSize: 14,
              fontFamily: "Inter, system-ui, sans-serif", cursor: 'pointer',
            }}>
              Retour au tableau de bord
            </button>
          </div>
        )}

        {!loading && !error && affectation && groupe && (
          <div className="aff-card" style={{
            background: P.card, borderRadius: 16, border: `1px solid ${P.border}`,
            overflow: 'hidden',
          }}>
            {/* Card header */}
            <div style={{ background: P.light, padding: '18px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>
                  👥
                </div>
                <div>
                  <div style={{ color: P.text, fontSize: 17, fontWeight: 600 }}>{affectation.groupe_nom}</div>
                  <div style={{ color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>
                    {groupe.etudiants?.length || 0} membre(s)
                  </div>
                </div>
              </div>
              <span style={{
                background: statutStyle(affectation.valide).bg, color: statutStyle(affectation.valide).color,
                fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600,
                padding: '5px 14px', borderRadius: 20,
              }}>
                {statutStyle(affectation.valide).label}
              </span>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Projet affecté */}
              <div>
                <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Projet affecté</p>
                {affectation.projet_titre ? (
                  <div style={{ background: P.light, borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${P.accent}` }}>
                    <div style={{ color: P.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{affectation.projet_titre}</div>
                    <div style={{ color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 10 }}>
                      {affectation.projet_description}
                    </div>

                    {/* Contact encadrant */}
                    {affectation.encadrant_nom && (
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <p style={{ margin: '0 0 4px', color: P.muted, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Encadrant</p>
                        <div style={{ color: P.text, fontSize: 13, fontWeight: 600 }}>👨‍🏫 {affectation.encadrant_nom}</div>
                        {affectation.encadrant_email && (
                          <div style={{ color: P.mid, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>
                            ✉️ <a href={`mailto:${affectation.encadrant_email}`} style={{ color: P.mid }}>{affectation.encadrant_email}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {affectation.rang_obtenu && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 11, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                          ✓ Choix n°{affectation.rang_obtenu}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '14px 18px', color: '#DC2626', fontSize: 14, fontFamily: "Inter, system-ui, sans-serif" }}>
                    Aucun projet disponible
                  </div>
                )}
              </div>

              {/* Membres + choix */}
              <div>
                <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Membres</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {groupe.etudiants?.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: P.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.mid, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}>
                        {e.nom?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ color: P.text, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                          {e.nom} {e.prenom}
                          {groupe.chef_id != null && i === 0 && (
                            <span style={{ marginLeft: 6, fontSize: 10, color: P.accent }}>👑</span>
                          )}
                        </div>
                        <div style={{ color: P.muted, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif" }}>
                          {e.filiere}{e.stacks ? ` · ${e.stacks}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {choix.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <p style={{ margin: '0 0 8px', color: P.muted, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Choix soumis</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {choix.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.priorite === 1 ? P.accent : c.priorite === 2 ? '#22D3EE' : '#A5F3FC', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700 }}>{c.priorite}</span>
                          <span style={{ color: P.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>{getProjetTitre(c.projet_id)}</span>
                          {c.priorite === affectation.rang_obtenu && <span style={{ color: P.accent, fontSize: 11 }}>✓</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}