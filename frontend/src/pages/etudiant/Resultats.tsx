import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAffectations, getGroupes, getProjets, getChoix } from '../../services/api'

const P = {
  bg: '#F8F7FC',
  card: '#FFFFFF',
  deep: '#2D1B69',
  mid: '#6B46C1',
  light: '#EDE9FE',
  accent: '#7C3AED',
  text: '#1C1033',
  muted: '#6B7280',
  border: '#DDD6FE',
}

interface Affectation { id: number; groupe_id: number; projet_id: number | null; valide: string }
interface Groupe { id: number; nom: string; etudiants: { nom: string; email: string; filiere: string }[] }
interface Projet { id: number; titre: string; description: string; encadrant_id: number }
interface Choix { id: number; groupe_id: number; projet_id: number; priorite: number }

const statutStyle = (valide: string) => {
  switch (valide) {
    case 'validé': return { bg: '#D1FAE5', color: '#065F46', label: '✓ Validé' }
    case 'modifié': return { bg: '#DBEAFE', color: '#1E40AF', label: '✎ Modifié' }
    default: return { bg: '#FEF3C7', color: '#92400E', label: '⏳ En attente' }
  }
}

export default function Resultats() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [choix, setChoix] = useState<Choix[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const [a, g, p, c] = await Promise.all([
          getAffectations(), getGroupes(), getProjets(), getChoix()
        ])
        setAffectations(a.data)
        setGroupes(g.data)
        setProjets(p.data)
        setChoix(c.data)
      } catch (_) {
        setError('Impossible de charger les données. Vérifiez que le serveur est actif.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const getGroupe = (id: number) => groupes.find(g => g.id === id)
  const getProjet = (id: number | null) => id ? projets.find(p => p.id === id) : null
  const getChoixGroupe = (groupe_id: number) =>
    choix.filter(c => c.groupe_id === groupe_id).sort((a, b) => a.priorite - b.priorite)

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'Crimson Pro', 'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .aff-card { transition: box-shadow 0.2s; }
        .aff-card:hover { box-shadow: 0 8px 30px rgba(107,70,193,0.1); }
      `}</style>

      {/* Header */}
      <header style={{ background: P.deep, borderBottom: `3px solid ${P.accent}`, padding: '0 40px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16, height: 68 }}>
          <button onClick={() => navigate('/etudiant')} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
            borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
          }}>← Retour</button>
          <span style={{ color: '#C4B5FD', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Résultats d'affectation</span>
        </div>
      </header>

      {/* Page hero */}
      <div style={{ background: `linear-gradient(135deg, ${P.deep} 0%, #4A2C8C 60%, ${P.mid} 100%)`, padding: '40px 40px 36px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 8px', color: '#fff', fontSize: 32, fontWeight: 700 }}>Résultats d'affectation</h1>
          <p style={{ margin: 0, color: '#C4B5FD', fontSize: 15, fontFamily: "'DM Sans', sans-serif", fontWeight: 300 }}>
            Consultez les projets assignés à chaque groupe après traitement algorithmique.
          </p>
          {!loading && (
            <div style={{ display: 'flex', gap: 28, marginTop: 28 }}>
              {[
                { label: 'Total groupes', val: affectations.length },
                { label: 'Affectations validées', val: affectations.filter(a => a.valide === 'validé').length },
                { label: 'En attente', val: affectations.filter(a => a.valide === 'en_attente').length },
              ].map(s => (
                <div key={s.label}>
                  <div style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>{s.val}</div>
                  <div style={{ color: '#C4B5FD', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
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
            <p style={{ color: P.muted, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>Chargement des résultats...</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '20px 24px', color: '#DC2626', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && affectations.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>📭</div>
            <h2 style={{ margin: '0 0 10px', color: P.text, fontSize: 24 }}>Aucun résultat disponible</h2>
            <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
              L'affectation n'a pas encore été lancée par le coordinateur. Revenez plus tard.
            </p>
            <button onClick={() => navigate('/etudiant')} style={{
              background: P.accent, color: '#fff', border: 'none',
              borderRadius: 12, padding: '12px 28px', fontSize: 14,
              fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
            }}>
              Retour au tableau de bord
            </button>
          </div>
        )}

        {!loading && !error && affectations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {affectations.map(aff => {
              const groupe = getGroupe(aff.groupe_id)
              const projet = getProjet(aff.projet_id)
              const choixGroupe = getChoixGroupe(aff.groupe_id)
              const statut = statutStyle(aff.valide)
              const isMyChoice = choixGroupe.some(c => c.projet_id === aff.projet_id)
              const myChoixRank = choixGroupe.findIndex(c => c.projet_id === aff.projet_id) + 1

              return (
                <div key={aff.id} className="aff-card" style={{
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
                        <div style={{ color: P.text, fontSize: 17, fontWeight: 600 }}>{groupe?.nom || `Groupe #${aff.groupe_id}`}</div>
                        <div style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                          {groupe?.etudiants?.length || 0} membre(s)
                        </div>
                      </div>
                    </div>
                    <span style={{
                      background: statut.bg, color: statut.color,
                      fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                      padding: '5px 14px', borderRadius: 20,
                    }}>
                      {statut.label}
                    </span>
                  </div>

                  <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {/* Projet affecté */}
                    <div>
                      <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Projet affecté</p>
                      {projet ? (
                        <div style={{ background: P.light, borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${P.accent}` }}>
                          <div style={{ color: P.text, fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{projet.titre}</div>
                          <div style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{projet.description?.slice(0, 100)}{projet.description?.length > 100 ? '...' : ''}</div>
                          {isMyChoice && (
                            <div style={{ marginTop: 8 }}>
                              <span style={{ background: '#D1FAE5', color: '#065F46', fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, padding: '2px 10px', borderRadius: 20 }}>
                                ✓ Choix n°{myChoixRank}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ background: '#FEF2F2', borderRadius: 10, padding: '14px 18px', color: '#DC2626', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                          Aucun projet disponible
                        </div>
                      )}
                    </div>

                    {/* Membres + choix */}
                    <div>
                      <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Membres</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {groupe?.etudiants?.map((e, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: P.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.mid, fontSize: 11, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>
                              {e.nom?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ color: P.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>{e.nom}</div>
                              <div style={{ color: P.muted, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{e.filiere}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {choixGroupe.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                          <p style={{ margin: '0 0 8px', color: P.muted, fontSize: 11, fontFamily: "'DM Sans', sans-serif", textTransform: 'uppercase', letterSpacing: 1 }}>Choix soumis</p>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {choixGroupe.map(c => {
                              const p = getProjet(c.projet_id)
                              return (
                                <div key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.priorite === 1 ? P.accent : c.priorite === 2 ? '#A78BFA' : '#C4B5FD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>{c.priorite}</span>
                                  <span style={{ color: P.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>{p?.titre || `Projet #${c.projet_id}`}</span>
                                  {aff.projet_id === c.projet_id && <span style={{ color: P.accent, fontSize: 11 }}>✓</span>}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}