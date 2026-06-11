import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGroupes,
  getProjets,
  getEncadrants,
  getChoix,
  getAffectations,
  lancerAffectation,
  supprimerGroupe,
} from '../../services/api'

const P = {
  bg: '#F5F8FB',
  card: '#FFFFFF',
  deep: '#071B33',
  mid: '#0E7490',
  light: '#E0F2FE',
  accent: '#0891B2',
  text: '#102033',
  muted: '#64748B',
  border: '#D8E3ED',
  success: '#059669',
  successBg: '#D1FAE5',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEF2F2',
}

interface Etudiant { nom: string; prenom?: string; email?: string; filiere: string }
interface Groupe { id: number; nom: string; etudiants: Etudiant[] }
interface Encadrant { id: number; nom: string; prenom?: string; email: string; specialite?: string }
interface Projet { id: number; titre: string; description: string; encadrant_id: number }
interface Choix { id: number; groupe_id: number; projet_id: number; priorite: number }
interface Affectation { id: number; groupe_id: number; projet_id: number | null; valide: string }

type Tab = 'overview' | 'groupes' | 'affectation'

export default function CoordinateurDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [encadrants, setEncadrants] = useState<Encadrant[]>([])
  const [choix, setChoix] = useState<Choix[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [loading, setLoading] = useState(true)
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<any[] | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [g, p, e, c, a] = await Promise.all([
        getGroupes(), getProjets(), getEncadrants(), getChoix(), getAffectations(),
      ])
      setGroupes(g.data)
      setProjets(p.data)
      setEncadrants(e.data)
      setChoix(c.data)
      setAffectations(a.data)
    } catch (_) {
      setError('Impossible de charger les données.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const getProjet = (id: number | null) => id ? projets.find(p => p.id === id) : null
  const getChoixGroupe = (gid: number) => choix.filter(c => c.groupe_id === gid).sort((a, b) => a.priorite - b.priorite)

  const stats = {
    groupes: groupes.length,
    projets: projets.length,
    choix: choix.length,
    affectes: affectations.length,
    valides: affectations.filter(a => a.valide === 'validé').length,
    enAttente: affectations.filter(a => a.valide === 'en_attente').length,
    sansChoix: groupes.filter(g => getChoixGroupe(g.id).length === 0).length,
  }

  const handleLogout = () => {
    localStorage.removeItem('user')
    localStorage.removeItem('access_token')
    navigate('/')
  }

  const handleLancer = async () => {
    setLaunching(true)
    setError('')
    setMessage('')
    try {
      const res = await lancerAffectation()
      setLaunchResult(res.data.affectations)
      setMessage('Affectation générée. Les encadrants peuvent maintenant valider leurs affectations.')
      await loadAll()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erreur lors du lancement.')
    } finally {
      setLaunching(false)
    }
  }

  const handleSupprimerGroupe = async (groupe: Groupe) => {
    const ok = window.confirm(`Supprimer le groupe "${groupe.nom}" ? Ses étudiants, choix et affectations seront retirés.`)
    if (!ok) return

    setError('')
    setMessage('')
    try {
      await supprimerGroupe(groupe.id)
      setMessage(`Groupe "${groupe.nom}" supprimé.`)
      await loadAll()
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Erreur lors de la suppression du groupe.')
    }
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Vue d’ensemble', icon: '📊' },
    { id: 'groupes', label: 'Groupes & choix', icon: '👥' },
    { id: 'affectation', label: 'Lancer le moteur', icon: '⚙️' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        button, input, select { font-family: Inter, system-ui, sans-serif !important; }
        .tab-btn, .action-btn { transition: all 0.18s ease; cursor: pointer; }
        .tab-btn:hover { background: rgba(255,255,255,0.13) !important; }
        .action-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(0.96); }
        .action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .card-hover { transition: all 0.18s ease; }
        .card-hover:hover { box-shadow: 0 10px 28px rgba(8,145,178,0.12); transform: translateY(-1px); }
      `}</style>

      <header style={{ background: P.deep, borderBottom: `3px solid ${P.accent}`, padding: '0 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: P.accent, display: 'grid', placeItems: 'center', fontSize: 18 }}>🎓</div>
            <div>
              <div style={{ color: '#fff', fontWeight: 700 }}>PFA Affectation</div>
              <div style={{ color: '#A5F3FC', fontSize: 12 }}>INPT · Espace Coordinateur</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={loadAll} className="action-btn" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#A5F3FC', borderRadius: 8, padding: '7px 14px', fontSize: 12 }}>
              Actualiser
            </button>
            <button onClick={handleLogout} className="action-btn" style={{ background: '#fff', border: 'none', color: P.deep, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700 }}>
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <section style={{ background: `linear-gradient(135deg, ${P.deep} 0%, #0B2A45 55%, ${P.mid} 100%)`, padding: '38px 40px 30px', color: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 800 }}>Tableau de bord Coordinateur</h1>
          <p style={{ margin: '0 0 26px', color: '#A5F3FC', fontSize: 14 }}>
            Supervisez les groupes et lancez le moteur d’affectation. La validation finale reste du côté des encadrants.
          </p>
          {!loading && (
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                ['Groupes', stats.groupes],
                ['Projets', stats.projets],
                ['Choix soumis', stats.choix],
                ['Affectations générées', stats.affectes],
                ['En attente encadrants', stats.enAttente],
              ].map(([label, val]) => (
                <div key={label} style={{ minWidth: 128, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 16px' }}>
                  <div style={{ fontSize: 24, fontWeight: 800 }}>{val}</div>
                  <div style={{ color: '#A5F3FC', fontSize: 12 }}>{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <nav style={{ background: P.deep, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className="tab-btn" style={{
              background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? `2px solid ${P.accent}` : '2px solid transparent',
              color: tab === t.id ? '#fff' : '#A5F3FC',
              padding: '14px 20px',
              fontSize: 13,
              fontWeight: tab === t.id ? 700 : 500,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '34px 40px' }}>
        {message && <Alert kind="success" text={message} onClose={() => setMessage('')} />}
        {error && <Alert kind="error" text={error} onClose={() => setError('')} />}

        {loading ? (
          <Empty icon="⏳" title="Chargement des données..." />
        ) : (
          <>
            {tab === 'overview' && (
              <div>
                <h2 style={titleStyle}>Vue d’ensemble</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18, marginBottom: 28 }}>
                  <StatusCard title="Groupes sans choix" value={stats.sansChoix} good={stats.sansChoix === 0} description={stats.sansChoix === 0 ? 'Tous les groupes ont soumis leurs choix.' : 'Ces groupes doivent compléter leurs préférences.'} />
                  <StatusCard title="Affectations à valider" value={stats.enAttente} good={stats.enAttente === 0} description="Ces affectations sont traitées par les encadrants." />
                  <StatusCard title="Affectations validées" value={stats.valides} good={stats.valides > 0} description={`Sur ${stats.affectes} affectation(s) générée(s).`} />
                </div>

                <div style={panelStyle}>
                  <h3 style={sectionTitleStyle}>Projets par encadrant</h3>
                  {encadrants.length === 0 ? (
                    <p style={mutedStyle}>Aucun encadrant enregistré.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                      {encadrants.map(enc => {
                        const lesProjets = projets.filter(p => p.encadrant_id === enc.id)
                        return (
                          <div key={enc.id} style={{ background: P.light, borderRadius: 10, padding: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <Avatar label={enc.nom} />
                              <div>
                                <div style={{ fontWeight: 700, color: P.text }}>{enc.nom}</div>
                                <div style={{ color: P.muted, fontSize: 12 }}>{enc.email}</div>
                              </div>
                            </div>
                            {lesProjets.length === 0 ? (
                              <span style={mutedStyle}>Aucun projet proposé</span>
                            ) : lesProjets.map(p => (
                              <div key={p.id} style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', marginTop: 6, fontSize: 13, color: P.text }}>
                                {p.titre}
                              </div>
                            ))}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === 'groupes' && (
              <div>
                <h2 style={titleStyle}>Groupes & choix de projets</h2>
                <p style={{ ...mutedStyle, marginBottom: 24 }}>{groupes.length} groupe(s) enregistré(s). Le coordinateur peut supprimer un groupe si nécessaire.</p>
                {groupes.length === 0 ? (
                  <Empty icon="📭" title="Aucun groupe enregistré pour le moment." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {groupes.map(groupe => {
                      const lesChoix = getChoixGroupe(groupe.id)
                      return (
                        <div key={groupe.id} className="card-hover" style={panelStyle}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
                            <div>
                              <h3 style={{ margin: '0 0 6px', color: P.text, fontSize: 18 }}>{groupe.nom}</h3>
                              <p style={{ margin: 0, color: P.muted, fontSize: 13 }}>{groupe.etudiants?.length || 0} membre(s) · {lesChoix.length} choix soumis</p>
                            </div>
                            <button onClick={() => handleSupprimerGroupe(groupe)} className="action-btn" style={{ background: P.errorBg, color: P.error, border: '1px solid #FECACA', borderRadius: 9, padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>
                              Supprimer
                            </button>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                            <div>
                              <div style={labelStyle}>Membres</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {groupe.etudiants?.map((e, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar label={e.nom} small />
                                    <div>
                                      <div style={{ color: P.text, fontSize: 13, fontWeight: 700 }}>{e.nom} {e.prenom || ''}</div>
                                      <div style={{ color: P.muted, fontSize: 12 }}>{e.filiere}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <div style={labelStyle}>Choix de projets</div>
                              {lesChoix.length === 0 ? (
                                <div style={{ background: P.warningBg, color: P.warning, borderRadius: 9, padding: 12, fontSize: 13 }}>Aucun choix soumis</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {lesChoix.map(c => {
                                    const projet = getProjet(c.projet_id)
                                    return (
                                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <span style={{ width: 26, height: 26, borderRadius: 999, background: c.priorite === 1 ? P.accent : c.priorite === 2 ? '#22D3EE' : '#A5F3FC', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 800 }}>{c.priorite}</span>
                                        <span style={{ color: P.text, fontSize: 13 }}>{projet?.titre || `Projet #${c.projet_id}`}</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {tab === 'affectation' && (
              <div>
                <h2 style={titleStyle}>Lancer le moteur d’affectation</h2>
                <p style={{ ...mutedStyle, marginBottom: 24 }}>Le coordinateur lance uniquement le calcul. Les encadrants valident ensuite les affectations liées à leurs projets.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 22 }}>
                  {[
                    { ok: stats.groupes > 0, label: `${stats.groupes} groupe(s) enregistré(s)` },
                    { ok: stats.projets > 0, label: `${stats.projets} projet(s) disponible(s)` },
                    { ok: stats.choix > 0, label: `${stats.choix} choix soumis` },
                    { ok: stats.sansChoix === 0, label: `Groupes sans choix : ${stats.sansChoix}` },
                  ].map(item => (
                    <div key={item.label} style={{ background: item.ok ? P.successBg : P.warningBg, borderRadius: 10, padding: '13px 15px', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span>{item.ok ? '✅' : '⚠️'}</span>
                      <span style={{ color: item.ok ? P.success : P.warning, fontWeight: 700, fontSize: 14 }}>{item.label}</span>
                    </div>
                  ))}
                </div>

                <div style={{ ...panelStyle, textAlign: 'center', padding: 34 }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>⚙️</div>
                  <h3 style={{ margin: '0 0 8px', color: P.text, fontSize: 22 }}>Moteur IA d’affectation</h3>
                  <p style={{ ...mutedStyle, maxWidth: 520, margin: '0 auto 24px' }}>
                    Le lancement remplace les affectations existantes et crée de nouveaux résultats en attente de validation encadrant.
                  </p>
                  <button onClick={handleLancer} disabled={launching || stats.choix === 0} className="action-btn" style={{ background: P.accent, color: '#fff', border: 'none', borderRadius: 11, padding: '14px 34px', fontSize: 15, fontWeight: 800 }}>
                    {launching ? 'Affectation en cours...' : 'Lancer le moteur'}
                  </button>
                </div>

                {launchResult && (
                  <div style={{ ...panelStyle, marginTop: 22, overflow: 'hidden', padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: `1px solid ${P.border}`, fontWeight: 800, color: P.text }}>Résultats générés</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: P.light }}>
                          {['Groupe', 'Projet affecté', 'Rang obtenu'].map(h => (
                            <th key={h} style={{ textAlign: 'left', padding: '12px 20px', color: P.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.7 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {launchResult.map((r, i) => (
                          <tr key={i} style={{ borderBottom: `1px solid ${P.border}` }}>
                            <td style={tdStyle}>{r.groupe}</td>
                            <td style={tdStyle}>{r.projet_affecte}</td>
                            <td style={tdStyle}>{r.rang_obtenu ? `Choix ${r.rang_obtenu}` : 'Hors préférences'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}

function StatusCard({ title, value, good, description }: { title: string; value: number; good: boolean; description: string }) {
  return (
    <div className="card-hover" style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ color: P.text, fontWeight: 800 }}>{title}</div>
        <span style={{ background: good ? P.successBg : P.warningBg, color: good ? P.success : P.warning, borderRadius: 10, padding: '4px 12px', fontWeight: 800, fontSize: 20 }}>{value}</span>
      </div>
      <p style={{ ...mutedStyle, margin: 0 }}>{description}</p>
    </div>
  )
}

function Alert({ kind, text, onClose }: { kind: 'success' | 'error'; text: string; onClose: () => void }) {
  const success = kind === 'success'
  return (
    <div style={{ marginBottom: 18, padding: '12px 16px', borderRadius: 10, background: success ? P.successBg : P.errorBg, color: success ? P.success : P.error, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 700 }}>
      <span>{text}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18 }}>×</button>
    </div>
  )
}

function Empty({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '70px 20px', color: P.muted }}>
      <div style={{ fontSize: 46, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 700 }}>{title}</div>
    </div>
  )
}

function Avatar({ label, small = false }: { label: string; small?: boolean }) {
  const size = small ? 28 : 36
  return (
    <div style={{ width: size, height: size, borderRadius: 999, background: P.accent, color: '#fff', display: 'grid', placeItems: 'center', fontSize: small ? 12 : 14, fontWeight: 800, flexShrink: 0 }}>
      {(label?.[0] || '?').toUpperCase()}
    </div>
  )
}

const titleStyle = { margin: '0 0 8px', color: P.text, fontSize: 24, fontWeight: 800 }
const sectionTitleStyle = { margin: '0 0 18px', color: P.text, fontSize: 17, fontWeight: 800 }
const panelStyle = { background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '22px 24px', boxShadow: '0 10px 28px rgba(7,27,51,0.05)' }
const mutedStyle = { color: P.muted, fontSize: 13, lineHeight: 1.55 }
const labelStyle = { color: P.muted, fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 0.9, fontWeight: 800, marginBottom: 10 }
const tdStyle = { padding: '13px 20px', color: P.text, fontSize: 14 }
