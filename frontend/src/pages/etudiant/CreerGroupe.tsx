import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { creerGroupe, getProjets, creerChoix, getGroupes } from '../../services/api'

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
  error: '#DC2626',
  success: '#059669',
}

interface Etudiant { nom: string; prenom: string; email: string; filiere: string }
interface Projet { id: number; titre: string; description: string; encadrant_id: number }

type Step = 'groupe' | 'choix' | 'done'

export default function CreerGroupe() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('groupe')

  // Step 1 - Groupe
  const [nomGroupe, setNomGroupe] = useState('')
  const [etudiants, setEtudiants] = useState<Etudiant[]>([{ nom: '', prenom: '', email: '', filiere: '' }])
  const [groupeId, setGroupeId] = useState<number | null>(null)
  const [loadingGroupe, setLoadingGroupe] = useState(false)
  const [errGroupe, setErrGroupe] = useState('')

  // Step 2 - Choix
  const [projets, setProjets] = useState<Projet[]>([])
  const [choix, setChoix] = useState<{ priorite: number; projet_id: number | null }[]>([
    { priorite: 1, projet_id: null },
    { priorite: 2, projet_id: null },
    { priorite: 3, projet_id: null },
  ])
  const [loadingChoix, setLoadingChoix] = useState(false)
  const [errChoix, setErrChoix] = useState('')

  // Check if groupe already exists
  const [existingGroupe, setExistingGroupe] = useState<any>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [p, g] = await Promise.all([getProjets(), getGroupes()])
        setProjets(p.data)
        if (g.data.length > 0) setExistingGroupe(g.data[g.data.length - 1])
      } catch (_) {}
    }
    load()
  }, [])

  const addEtudiant = () => {
    if (etudiants.length < 3) setEtudiants([...etudiants, { nom: '', prenom: '', email: '', filiere: '' }])
  }

  const removeEtudiant = (i: number) => {
    if (etudiants.length > 1) setEtudiants(etudiants.filter((_, idx) => idx !== i))
  }

  const updateEtudiant = (i: number, field: keyof Etudiant, val: string) => {
    const updated = [...etudiants]
    updated[i] = { ...updated[i], [field]: val }
    setEtudiants(updated)
  }

  const handleCreerGroupe = async () => {
    setErrGroupe('')
    if (!nomGroupe.trim()) return setErrGroupe('Le nom du groupe est requis.')
    if (etudiants.some(e => !e.nom.trim() || !e.email.trim() || !e.filiere.trim()))
      return setErrGroupe('Tous les champs des étudiants sont requis.')

    setLoadingGroupe(true)
    try {
      // Séparer "Nom complet" en nom + prenom pour le backend
      const etudiantsFormatted = etudiants.map(e => {
        const parts = e.nom.trim().split(' ')
        return {
          nom: parts[0] || '',
          prenom: parts.slice(1).join(' ') || parts[0] || '',
          filiere: e.filiere
        }
      })

      const res = await creerGroupe({ nom: nomGroupe, etudiants: etudiantsFormatted })
      setGroupeId(res.data.id)
      setStep('choix')
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setErrGroupe(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d.msg).join(', ')
            : 'Erreur lors de la création du groupe.'
      )
    } finally {
      setLoadingGroupe(false)
    }
  }

  const handleUseExisting = () => {
    setGroupeId(existingGroupe.id)
    setStep('choix')
  }

  const handleChoixChange = (priorite: number, projet_id: number) => {
    setChoix(prev => prev.map(c => c.priorite === priorite ? { ...c, projet_id } : c))
  }

  const handleSoumettreChoix = async () => {
    setErrChoix('')
    if (choix.some(c => c.projet_id === null)) return setErrChoix('Veuillez sélectionner 3 projets différents.')
    const ids = choix.map(c => c.projet_id)
    if (new Set(ids).size !== 3) return setErrChoix('Les 3 projets doivent être différents.')
    if (!groupeId) return setErrChoix('Groupe introuvable.')

    setLoadingChoix(true)
    try {
      for (const c of choix) {
        await creerChoix({ groupe_id: groupeId, projet_id: c.projet_id, priorite: c.priorite })
      }
      setStep('done')
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setErrChoix(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d.msg).join(', ')
            : 'Erreur lors de la soumission des choix.'
      )
    } finally {
      setLoadingChoix(false)
    }
  }

  const filieres = ['ICCN', 'DATA', 'SmartICT', 'ASEDS', 'CLOUD', 'AMOA', 'SesNum']

  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'Crimson Pro', 'Georgia', serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        input, select { font-family: 'DM Sans', sans-serif !important; }
        .field-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input:focus { outline: none; border-color: ${P.accent} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
        .remove-btn:hover { background: #FEE2E2 !important; color: ${P.error} !important; }
        .add-btn:hover { background: ${P.light} !important; }
        .submit-btn { transition: background 0.2s, transform 0.15s; }
        .submit-btn:hover:not(:disabled) { background: ${P.deep} !important; transform: translateY(-1px); }
        .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .proj-card { transition: border-color 0.2s, background 0.2s; cursor: pointer; }
        .proj-card:hover { border-color: ${P.accent} !important; }
      `}</style>

      {/* Header */}
      <header style={{ background: P.deep, borderBottom: `3px solid ${P.accent}`, padding: '0 40px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => navigate('/etudiant')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>← Retour</button>
            <span style={{ color: '#C4B5FD', fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>Groupe & Choix de projets</span>
          </div>
          {/* Progress */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['groupe', 'choix', 'done'] as Step[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === s ? P.accent : ((['groupe', 'choix', 'done'].indexOf(step) > i) ? '#10B981' : 'rgba(255,255,255,0.2)'),
                  color: '#fff', fontSize: 12, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                }}>
                  {['groupe', 'choix', 'done'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.3)' }} />}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

        {/* ─── STEP 1: CRÉER GROUPE ─── */}
        {step === 'groupe' && (
          <div>
            <h1 style={{ margin: '0 0 6px', color: P.text, fontSize: 30, fontWeight: 700 }}>Créer votre groupe</h1>
            <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>Renseignez le nom du groupe et les informations de chaque étudiant (1 à 3 membres).</p>

            {/* Existing group notice */}
            {existingGroupe && (
              <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, color: '#92400E', fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>⚠️ Un groupe existe déjà : <strong>{existingGroupe.nom}</strong></p>
                  <p style={{ margin: '4px 0 0', color: '#B45309', fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>Utilisez-le ou créez-en un nouveau.</p>
                </div>
                <button onClick={handleUseExisting} style={{ background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                  Utiliser ce groupe
                </button>
              </div>
            )}

            <div style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: '32px 36px' }}>
              {/* Nom du groupe */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: P.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500, marginBottom: 8 }}>
                  Nom du groupe <span style={{ color: P.error }}>*</span>
                </label>
                <input
                  className="field-input"
                  value={nomGroupe}
                  onChange={e => setNomGroupe(e.target.value)}
                  placeholder="Ex : Groupe Alpha"
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15,
                    border: `1.5px solid ${P.border}`, background: P.bg, color: P.text,
                  }}
                />
              </div>

              {/* Étudiants */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <label style={{ color: P.text, fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
                    Membres du groupe <span style={{ color: P.muted, fontWeight: 400 }}>({etudiants.length}/3)</span>
                  </label>
                  {etudiants.length < 3 && (
                    <button className="add-btn" onClick={addEtudiant} style={{
                      background: P.light, color: P.mid, border: `1px solid ${P.border}`,
                      borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13,
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                    }}>
                      + Ajouter un membre
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {etudiants.map((e, i) => (
                    <div key={i} style={{ background: P.light, borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ color: P.mid, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}>Étudiant {i + 1}</span>
                        {etudiants.length > 1 && (
                          <button className="remove-btn" onClick={() => removeEtudiant(i)} style={{
                            background: 'transparent', border: 'none', color: P.muted,
                            cursor: 'pointer', fontSize: 13, fontFamily: "'DM Sans', sans-serif", borderRadius: 6, padding: '4px 10px',
                          }}>✕ Retirer</button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {([
                          { field: 'nom', label: 'Nom complet', placeholder: 'Nom Prénom' },
                          { field: 'email', label: 'Email INPT', placeholder: 'nom@inpt.ac.ma' },
                        ] as { field: keyof Etudiant; label: string; placeholder: string }[]).map(f => (
                          <div key={f.field}>
                            <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>{f.label}</label>
                            <input
                              className="field-input"
                              value={e[f.field]}
                              onChange={ev => updateEtudiant(i, f.field, ev.target.value)}
                              placeholder={f.placeholder}
                              style={{
                                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                                border: `1.5px solid ${P.border}`, background: '#fff', color: P.text,
                              }}
                            />
                          </div>
                        ))}
                        <div>
                          <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "'DM Sans', sans-serif", marginBottom: 6 }}>Filière</label>
                          <select
                            className="field-input"
                            value={e.filiere}
                            onChange={ev => updateEtudiant(i, 'filiere', ev.target.value)}
                            style={{
                              width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                              border: `1.5px solid ${P.border}`, background: '#fff', color: P.text,
                            }}
                          >
                            <option value="">Sélectionner...</option>
                            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {errGroupe && (
                <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: P.error, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  ⚠️ {errGroupe}
                </div>
              )}

              <button
                className="submit-btn"
                onClick={handleCreerGroupe}
                disabled={loadingGroupe}
                style={{
                  marginTop: 28, width: '100%', background: P.accent, color: '#fff',
                  border: 'none', borderRadius: 12, padding: '14px', fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer',
                }}
              >
                {loadingGroupe ? 'Création en cours...' : 'Créer le groupe et passer aux choix →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 2: CHOIX DE PROJETS ─── */}
        {step === 'choix' && (
          <div>
            <h1 style={{ margin: '0 0 6px', color: P.text, fontSize: 30, fontWeight: 700 }}>Choix de projets</h1>
            <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 15, fontFamily: "'DM Sans', sans-serif" }}>
              Sélectionnez 3 projets différents par ordre de préférence. Le système d'affectation prendra en compte vos priorités.
            </p>

            {/* Priority slots */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {choix.map((c) => (
                <div key={c.priorite} style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: '24px 28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: c.priorite === 1 ? '#7C3AED' : c.priorite === 2 ? '#A78BFA' : '#C4B5FD',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                      fontSize: 14, fontFamily: "'DM Sans', sans-serif", fontWeight: 700,
                    }}>
                      {c.priorite}
                    </div>
                    <div>
                      <div style={{ color: P.text, fontSize: 16, fontWeight: 600 }}>
                        {c.priorite === 1 ? '1er choix' : c.priorite === 2 ? '2ème choix' : '3ème choix'}
                      </div>
                      <div style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                        {c.priorite === 1 ? 'Votre projet préféré' : c.priorite === 2 ? 'Deuxième préférence' : 'Alternative'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {projets.map(p => {
                      const selectedByOther = choix.filter(ch => ch.priorite !== c.priorite).some(ch => ch.projet_id === p.id)
                      const isSelected = c.projet_id === p.id
                      return (
                        <div
                          key={p.id}
                          className={!selectedByOther ? 'proj-card' : ''}
                          onClick={() => !selectedByOther && handleChoixChange(c.priorite, p.id)}
                          style={{
                            padding: '14px 16px', borderRadius: 10,
                            border: isSelected ? `2px solid ${P.accent}` : `1.5px solid ${P.border}`,
                            background: isSelected ? P.light : selectedByOther ? '#F9FAFB' : '#fff',
                            opacity: selectedByOther ? 0.4 : 1,
                            cursor: selectedByOther ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div style={{ color: P.text, fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: isSelected ? 600 : 400, marginBottom: 4 }}>
                            {isSelected && <span style={{ color: P.accent }}>✓ </span>}{p.titre}
                          </div>
                          <div style={{ color: P.muted, fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                            {p.description?.slice(0, 60)}{p.description?.length > 60 ? '...' : ''}
                          </div>
                        </div>
                      )
                    })}
                    {projets.length === 0 && (
                      <div style={{ color: P.muted, fontSize: 13, fontFamily: "'DM Sans', sans-serif", padding: '12px 0' }}>Aucun projet disponible pour l'instant.</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errChoix && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: P.error, fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                ⚠️ {errChoix}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button onClick={() => setStep('groupe')} style={{
                background: P.light, color: P.mid, border: `1px solid ${P.border}`,
                borderRadius: 12, padding: '13px 24px', fontSize: 14,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}>
                ← Retour
              </button>
              <button
                className="submit-btn"
                onClick={handleSoumettreChoix}
                disabled={loadingChoix}
                style={{
                  flex: 1, background: P.accent, color: '#fff', border: 'none',
                  borderRadius: 12, padding: '14px', fontSize: 15,
                  fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer',
                }}
              >
                {loadingChoix ? 'Soumission...' : 'Soumettre mes choix →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── DONE ─── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
            <h1 style={{ margin: '0 0 12px', color: P.text, fontSize: 32, fontWeight: 700 }}>Dossier soumis avec succès !</h1>
            <p style={{ margin: '0 0 40px', color: P.muted, fontSize: 16, fontFamily: "'DM Sans', sans-serif", maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Votre groupe a été créé et vos 3 choix de projets ont été enregistrés. Les résultats seront disponibles après le traitement par le coordinateur.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
              <button onClick={() => navigate('/etudiant/resultats')} style={{
                background: P.accent, color: '#fff', border: 'none',
                borderRadius: 12, padding: '14px 28px', fontSize: 15,
                fontFamily: "'DM Sans', sans-serif", fontWeight: 500, cursor: 'pointer',
              }}>
                Voir les résultats
              </button>
              <button onClick={() => navigate('/etudiant')} style={{
                background: P.light, color: P.mid, border: `1px solid ${P.border}`,
                borderRadius: 12, padding: '14px 28px', fontSize: 15,
                fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
              }}>
                Tableau de bord
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}