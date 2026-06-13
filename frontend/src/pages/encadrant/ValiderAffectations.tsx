import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getAffectations, validerAffectation, getProjets,
  getGroupes, getChoix, reaffecterGroupe,
} from '../../services/api'

interface Etudiant { nom: string; prenom?: string; filiere: string; stacks?: string | null }
interface Groupe { id: number; nom: string; etudiants: Etudiant[] }
interface Projet { id: number; titre: string; description: string; competences_requises: string; encadrant_id: number }
interface Choix { id: number; groupe_id: number; projet_id: number; priorite: number }
interface Affectation { id: number; groupe_id: number; projet_id: number | null; valide: string }

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
}

// ── Calcul d'un score d'adéquation simple : recouvrement stacks ↔ compétences ──
function calculerAdequation(etudiants: Etudiant[], competencesRequises: string): number {
  const requis = competencesRequises
    .toLowerCase()
    .split(/[,;/]+/)
    .map(s => s.trim())
    .filter(Boolean)
  if (requis.length === 0) return 0

  const stacksGroupe = etudiants
    .flatMap(e => (e.stacks || '').toLowerCase().split(/[,;/]+/))
    .map(s => s.trim())
    .filter(Boolean)

  if (stacksGroupe.length === 0) return 0

  const matched = requis.filter(r => stacksGroupe.some(s => s.includes(r) || r.includes(s)))
  return Math.round((matched.length / requis.length) * 100)
}

function vœuLabel(rang: number | null): { label: string; bg: string; color: string } {
  if (rang === 1) return { label: '1er vœu', bg: '#EDE9FE', color: '#6D28D9' }
  if (rang === 2) return { label: '2ème vœu', bg: '#EDE9FE', color: '#6D28D9' }
  if (rang === 3) return { label: '3ème vœu', bg: '#EDE9FE', color: '#6D28D9' }
  return { label: 'Hors vœux', bg: P.warningBg, color: P.warning }
}

function statutLabel(valide: string): { label: string; bg: string; color: string } {
  if (valide === 'validé') return { label: 'Validée', bg: P.successBg, color: P.success }
  if (valide === 'modifié') return { label: 'Réaffectée', bg: P.light, color: P.mid }
  return { label: 'En attente', bg: P.warningBg, color: P.warning }
}

export default function ValiderAffectations() {
  const navigate = useNavigate()
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [choix, setChoix] = useState<Choix[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  // Modal de réaffectation
  const [modalAffId, setModalAffId] = useState<number | null>(null)

  const loadAll = async () => {
    setLoading(true)
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const [affRes, projRes, groupRes, choixRes] = await Promise.all([
      getAffectations(), getProjets(), getGroupes(), getChoix(),
    ])

    const tousProjets: Projet[] = projRes.data
    setProjets(tousProjets)
    setGroupes(groupRes.data)
    setChoix(choixRes.data)

    const mesProjetsIds = tousProjets
      .filter(p => p.encadrant_id === user.encadrant_id)
      .map(p => p.id)

    setAffectations(
      affRes.data.filter((a: Affectation) => mesProjetsIds.includes(a.projet_id as number))
    )
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  const getGroupe = (id: number) => groupes.find(g => g.id === id)
  const getProjet = (id: number | null) => id ? projets.find(p => p.id === id) : null
  const getRangVoeu = (groupeId: number, projetId: number | null) => {
    if (!projetId) return null
    const c = choix.find(c => c.groupe_id === groupeId && c.projet_id === projetId)
    return c?.priorite ?? null
  }

  // Groupes éligibles à un projet (qui l'ont mis dans leurs vœux, et pas déjà affectés)
  const groupesEligibles = (projetId: number | null, groupeActuelId: number) => {
    if (!projetId) return []
    const idsAffectes = affectations.map(a => a.groupe_id)
    const candidatIds = choix
      .filter(c => c.projet_id === projetId)
      .map(c => c.groupe_id)
    return groupes.filter(g =>
      candidatIds.includes(g.id) &&
      g.id !== groupeActuelId &&
      !idsAffectes.includes(g.id)
    )
  }

  const groupesDisponibles = (groupeActuelId: number) => {
    const idsAffectes = affectations.map(a => a.groupe_id)
    return groupes.filter(g => g.id !== groupeActuelId && !idsAffectes.includes(g.id))
  }

  const handleValider = async (id: number) => {
    await validerAffectation(id)
    setMessage('Affectation validée ✅')
    await loadAll()
  }

  const handleReaffecter = async (affId: number, nouveauGroupeId: number) => {
    await reaffecterGroupe(affId, nouveauGroupeId)
    setMessage('Affectation réaffectée à un autre groupe ✅')
    setModalAffId(null)
    await loadAll()
  }

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; }
        .action-btn { transition: all 0.18s ease; cursor: pointer; }
        .action-btn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(0.96); }
        .action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .group-pick { transition: all 0.15s ease; cursor: pointer; }
        .group-pick:hover { border-color: ${P.accent} !important; background: ${P.light} !important; }
      `}</style>

      {/* Navbar */}
      <nav style={{ background: P.deep, color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: P.accent, padding: '8px 10px', borderRadius: 10, fontSize: 20 }}>👨‍🏫</div>
          <div>
            <p style={{ fontWeight: 700, margin: 0 }}>PFA Affectation</p>
            <p style={{ color: '#A5F3FC', fontSize: 12, margin: 0 }}>INPT · Plateforme de gestion de projets</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: P.accent, padding: '6px 16px', borderRadius: 999 }}>
          <div style={{ background: '#06B6D4', borderRadius: '50%', width: 32, height: 32, display: 'grid', placeItems: 'center', fontWeight: 700 }}>E</div>
          <span style={{ fontSize: 13 }}>Espace Encadrant</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }}
          style={{ background: '#fff', color: P.deep, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, border: 'none' }}
        >
          Déconnexion
        </button>
      </nav>

      {/* Hero */}
      <div style={{ background: `linear-gradient(90deg, ${P.deep}, ${P.mid})`, color: '#fff', padding: '36px 32px' }}>
        <span style={{ background: 'rgba(255,255,255,0.2)', fontSize: 11, padding: '4px 12px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 1 }}>Étape 2</span>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '14px 0 6px' }}>Valider les affectations</h1>
        <p style={{ color: '#A5F3FC', margin: 0 }}>Consultez, validez ou réaffectez les résultats du moteur IA.</p>
      </div>

      {/* Contenu */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '36px 24px' }}>

        {message && (
          <div style={{ background: P.successBg, color: P.success, padding: '12px 18px', borderRadius: 12, marginBottom: 22, fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 18 }}>×</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: P.muted }}>⏳ Chargement...</div>
        ) : affectations.length === 0 ? (
          <div style={{ background: P.card, borderRadius: 16, padding: 50, textAlign: 'center', border: `1px solid ${P.border}` }}>
            <p style={{ fontSize: 40, margin: 0 }}>📭</p>
            <p style={{ fontWeight: 700, color: P.text, marginTop: 12 }}>Aucune affectation disponible pour le moment.</p>
            <p style={{ color: P.muted, fontSize: 13 }}>Le coordinateur doit d'abord lancer le moteur IA.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {affectations.map(aff => {
              const groupe = getGroupe(aff.groupe_id)
              const projet = getProjet(aff.projet_id)
              const rang = getRangVoeu(aff.groupe_id, aff.projet_id)
              const voeu = vœuLabel(rang)
              const statut = statutLabel(aff.valide)
              const adequation = groupe && projet
                ? calculerAdequation(groupe.etudiants, projet.competences_requises)
                : 0
              const eligibles = groupesEligibles(aff.projet_id, aff.groupe_id)
              const disponibles = groupesDisponibles(aff.groupe_id)
              const candidats = eligibles.length > 0 ? eligibles : disponibles

              return (
                <div key={aff.id} style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: 24 }}>
                  {/* Titre projet */}
                  <h3 style={{ margin: '0 0 6px', color: P.text, fontSize: 18, fontWeight: 800 }}>
                    {projet?.titre || `Projet #${aff.projet_id}`}
                  </h3>

                  {/* Groupe + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span style={{ color: P.muted, fontSize: 14 }}>
                      👥 Groupe : <strong style={{ color: P.text }}>{groupe?.nom || `#${aff.groupe_id}`}</strong>
                    </span>
                    <span style={{ background: voeu.bg, color: voeu.color, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{voeu.label}</span>
                    <span style={{ background: statut.bg, color: statut.color, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{statut.label}</span>
                  </div>

                  {/* Membres */}
                  {groupe && groupe.etudiants?.length > 0 && (
                    <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                      <div style={{ color: P.muted, fontSize: 12, marginBottom: 8 }}>Membres du groupe :</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {groupe.etudiants.map((e, i) => (
                          <span key={i} style={{ background: '#fff', border: `1px solid ${P.border}`, borderRadius: 999, padding: '6px 14px', fontSize: 13, color: P.text }}>
                            {e.nom} {e.prenom || ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Score d'adéquation */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: P.muted, marginBottom: 6 }}>
                      <span>Score d'adéquation :</span>
                      <span style={{ fontWeight: 700, color: P.text }}>{adequation}%</span>
                    </div>
                    <div style={{ background: '#E5E7EB', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                      <div style={{ background: P.success, height: '100%', width: `${adequation}%`, borderRadius: 999, transition: 'width 0.3s' }} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handleValider(aff.id)}
                      disabled={aff.valide === 'validé'}
                      className="action-btn"
                      style={{
                        flex: 1, background: P.success, color: '#fff', border: 'none',
                        borderRadius: 10, padding: '12px 18px', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      {aff.valide === 'validé' ? '✅ Déjà validée' : <>✓ Valider l'affectation</>}
                    </button>
                    <button
                      onClick={() => setModalAffId(aff.id)}
                      className="action-btn"
                      style={{
                        background: '#fff', color: P.text, border: `1px solid ${P.border}`,
                        borderRadius: 10, padding: '12px 18px', fontWeight: 700, fontSize: 14,
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      Refuser / réaffecter
                    </button>
                  </div>

                  {/* ── Modal de réaffectation ── */}
                  {modalAffId === aff.id && (
                    <div style={{
                      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
                    }}>
                      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: P.text }}>Refuser et réaffecter</h3>
                        <p style={{ color: P.muted, fontSize: 13, marginBottom: 18 }}>
                          {eligibles.length > 0
                            ? 'Groupes ayant choisi ce projet et encore disponibles.'
                            : 'Aucun autre groupe n’a choisi ce projet. Les groupes libres sont proposés en alternative.'}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {candidats.length === 0 && (
                            <div style={{ background: P.warningBg, color: P.warning, borderRadius: 12, padding: 14, fontSize: 13, fontWeight: 700 }}>
                              Aucun autre groupe disponible pour cette réaffectation.
                            </div>
                          )}
                          {candidats.map(g => (
                            <div
                              key={g.id}
                              className="group-pick"
                              onClick={() => handleReaffecter(aff.id, g.id)}
                              style={{
                                border: `1.5px solid ${P.border}`,
                                borderRadius: 12, padding: 14,
                                background: '#fff',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontWeight: 700, color: P.text }}>
                                👥 {g.nom}
                              </div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {g.etudiants?.map((e, i) => (
                                  <span key={i} style={{ background: P.light, color: P.mid, borderRadius: 999, padding: '4px 10px', fontSize: 12 }}>
                                    {e.nom} {e.prenom || ''}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => setModalAffId(null)}
                          style={{ width: '100%', marginTop: 18, background: '#F1F5F9', color: P.text, border: 'none', borderRadius: 10, padding: '12px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <button
          onClick={() => navigate('/encadrant')}
          style={{ marginTop: 28, color: P.muted, fontSize: 13, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Retour au dashboard
        </button>
      </div>
    </div>
  )
}
