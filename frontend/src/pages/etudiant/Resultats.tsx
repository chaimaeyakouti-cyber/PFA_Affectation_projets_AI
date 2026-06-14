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

const STATUTS_FINAUX = ['validé', 'modifié']

const statutStyle = (valide: string) => {
  switch (valide) {
    case 'validé': return { bg: '#D1FAE5', color: '#065F46', label: '✓ Validé' }
    case 'modifié': return { bg: '#DBEAFE', color: '#1E40AF', label: '✎ Modifié' }
    default: return { bg: '#FEF3C7', color: '#92400E', label: 'â³ En attente' }
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
  const resultatFinal = affectation && STATUTS_FINAUX.includes(affectation.valide) ? affectation : null

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

  const exporterPdf = () => {
    if (!resultatFinal || !groupe) return

    const membres = groupe.etudiants?.map(e => `${e.nom} ${e.prenom || ''}`.trim()).join(', ') || 'Non renseignés'
    const rang = resultatFinal.rang_obtenu ? `Choix n°${resultatFinal.rang_obtenu}` : 'Hors préférences'
    const contenu = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Résultat final d'affectation</title>
          <style>
            body { font-family: Arial, sans-serif; color: #102033; padding: 32px; }
            .header { border-bottom: 3px solid #0891B2; padding-bottom: 16px; margin-bottom: 24px; }
            h1 { margin: 0; color: #071B33; }
            .muted { color: #64748B; }
            .card { border: 1px solid #D8E3ED; border-radius: 12px; padding: 18px; margin-bottom: 16px; }
            .label { color: #64748B; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
            .value { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
            .badge { display: inline-block; background: #D1FAE5; color: #065F46; border-radius: 999px; padding: 6px 12px; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Résultat final d'affectation</h1>
            <p class="muted">PFA Affectation - Résultat validé par l'encadrant</p>
          </div>
          <div class="card">
            <div class="label">Groupe</div>
            <div class="value">${resultatFinal.groupe_nom}</div>
            <div class="label">Membres</div>
            <div class="value">${membres}</div>
            <div class="label">Projet affecté</div>
            <div class="value">${resultatFinal.projet_titre || 'Non renseigné'}</div>
            <p>${resultatFinal.projet_description || ''}</p>
            <div class="label">Encadrant</div>
            <div class="value">${resultatFinal.encadrant_nom || 'Non renseigné'}${resultatFinal.encadrant_email ? ` - ${resultatFinal.encadrant_email}` : ''}</div>
            <div class="label">Rang obtenu</div>
            <div class="value">${rang}</div>
            <span class="badge">${statutStyle(resultatFinal.valide).label}</span>
          </div>
        </body>
      </html>
    `

    const fenetre = window.open('', '_blank')
    if (!fenetre) return
    fenetre.document.write(contenu)
    fenetre.document.close()
    fenetre.focus()
    fenetre.print()
  }

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
          }}>Retour</button>
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
            Consultez le projet assigné à votre groupe après validation finale par l'encadrant.
          </p>
          {!loading && (
            <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
              {[
                { label: 'Mon groupe', val: groupe ? groupe.nom : '—' },
                { label: 'Statut', val: resultatFinal ? statutStyle(resultatFinal.valide).label : 'En attente de validation' },
                { label: 'Rang obtenu', val: resultatFinal?.rang_obtenu ? `Choix n°${resultatFinal.rang_obtenu}` : '—' },
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
            <div style={{ fontSize: 40, marginBottom: 16 }}>...</div>
            <p style={{ color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>Chargement des résultats...</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '20px 24px', color: '#DC2626', fontSize: 14, fontFamily: "Inter, system-ui, sans-serif" }}>
            Attention : {error}
          </div>
        )}

        {!loading && !error && !resultatFinal && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📭</div>
            <h2 style={{ margin: '0 0 10px', color: P.text, fontSize: 24 }}>Aucun résultat final disponible</h2>
            <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>
              Le résultat final sera disponible après validation de l'affectation par l'encadrant.
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

        {!loading && !error && resultatFinal && groupe && (
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
                  <div style={{ color: P.text, fontSize: 17, fontWeight: 600 }}>{resultatFinal.groupe_nom}</div>
                  <div style={{ color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>
                    {groupe.etudiants?.length || 0} membre(s)
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{
                  background: statutStyle(resultatFinal.valide).bg, color: statutStyle(resultatFinal.valide).color,
                  fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600,
                  padding: '5px 14px', borderRadius: 20,
                }}>
                  {statutStyle(resultatFinal.valide).label}
                </span>
                <button onClick={exporterPdf} style={{
                  background: P.accent, color: '#fff', border: 'none',
                  borderRadius: 9, padding: '8px 14px', cursor: 'pointer',
                  fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700,
                }}>
                  Exporter PDF
                </button>
              </div>
            </div>

            <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Projet affecté */}
              <div>
                <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Projet affecté</p>
                {resultatFinal.projet_titre ? (
                  <div style={{ background: P.light, borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${P.accent}` }}>
                    <div style={{ color: P.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{resultatFinal.projet_titre}</div>
                    <div style={{ color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 10 }}>
                      {resultatFinal.projet_description}
                    </div>

                    {/* Contact encadrant */}
                    {resultatFinal.encadrant_nom && (
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 14px', marginBottom: 8 }}>
                        <p style={{ margin: '0 0 4px', color: P.muted, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Encadrant</p>
                        <div style={{ color: P.text, fontSize: 13, fontWeight: 600 }}> {resultatFinal.encadrant_nom}</div>
                        {resultatFinal.encadrant_email && (
                          <div style={{ color: P.mid, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>
                            Email : <a href={`mailto:${resultatFinal.encadrant_email}`} style={{ color: P.mid }}>{resultatFinal.encadrant_email}</a>
                          </div>
                        )}
                      </div>
                    )}

                    {resultatFinal.rang_obtenu && (
                      <div style={{ marginTop: 8 }}>
                        <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 11, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                          Choix n°{resultatFinal.rang_obtenu}
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
                            <span style={{ marginLeft: 6, fontSize: 10, color: P.accent }}>Chef</span>
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
                          {c.priorite === resultatFinal.rang_obtenu && <span style={{ color: P.accent, fontSize: 11 }}>obtenu</span>}
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
