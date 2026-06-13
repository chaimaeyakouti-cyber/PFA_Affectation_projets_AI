import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  creerGroupe, getProjets, creerChoix, getMonGroupe,
  lierGroupe, getMesChoix, modifierChoix,
} from '../../services/api'

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
  error: '#DC2626',
  success: '#059669',
  successBg: '#D1FAE5',
  warningBg: '#FFFBEB',
  warningText: '#92400E',
}

interface EtudiantForm { nom: string; prenom: string; filiere: string; stacks: string }
interface Projet { id: number; titre: string; description: string; encadrant_id: number }
interface GroupeExistant { id: number; nom: string; chef_id?: number | null; etudiants: any[] }

type Step = 'groupe' | 'choix' | 'done'

export default function CreerGroupe() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('groupe')

  // Utilisateur connecté
  const [currentUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })

  // Step 1 - Groupe
  const [nomGroupe, setNomGroupe] = useState('')
  const [etudiants, setEtudiants] = useState<EtudiantForm[]>([])
  const [groupeId, setGroupeId] = useState<number | null>(null)
  const [loadingGroupe, setLoadingGroupe] = useState(false)
  const [errGroupe, setErrGroupe] = useState('')

  // Step 2 - Choix
  const [projets, setProjets] = useState<Projet[]>([])
  const [choix, setChoix] = useState([
    { priorite: 1, projet_id: null as number | null, choix_id: null as number | null },
    { priorite: 2, projet_id: null as number | null, choix_id: null as number | null },
    { priorite: 3, projet_id: null as number | null, choix_id: null as number | null },
  ])
  const [choixVerrouilles, setChoixVerrouilles] = useState(false)
  const [loadingChoix, setLoadingChoix] = useState(false)
  const [errChoix, setErrChoix] = useState('')
  const [okChoix, setOkChoix] = useState('')

  // Groupe existant de l'utilisateur
  const [monGroupe, setMonGroupe] = useState<GroupeExistant | null>(null)
  const [loadingCheck, setLoadingCheck] = useState(true)

  // ── Initialisation ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingCheck(true)
      try {
        const p = await getProjets()
        setProjets(p.data)

        if (currentUser?.id) {
          try {
            const g = await getMonGroupe(currentUser.id)
            setMonGroupe(g.data)
          } catch (_) {
            setMonGroupe(null)
          }
        }
      } catch (_) {}
      setLoadingCheck(false)
    }

    // Pré-remplir le premier étudiant (= chef de groupe) avec les infos du compte connecté
    if (currentUser?.nom) {
      const parts = (currentUser.nom || '').trim().split(' ')
      setEtudiants([{
        nom: parts[0] || currentUser.nom,
        prenom: parts.slice(1).join(' ') || parts[0] || '',
        filiere: '',
        stacks: '',
      }])
    } else {
      setEtudiants([{ nom: '', prenom: '', filiere: '', stacks: '' }])
    }

    init()
  }, [])

  // Charger les choix existants si on a déjà un groupe (étape "choix")
  const chargerChoixExistants = async (gId: number) => {
    try {
      const c = await getMesChoix(currentUser.id)
      const mesChoix = c.data as any[]
      if (mesChoix.length > 0) {
        setChoixVerrouilles(!!mesChoix[0].locked)
        setChoix(prev => prev.map(slot => {
          const found = mesChoix.find(mc => mc.priorite === slot.priorite)
          return found
            ? { ...slot, projet_id: found.projet_id, choix_id: found.id }
            : slot
        }))
      }
    } catch (_) {}
  }

  // ── Handlers groupe ─────────────────────────────────────────
  const addEtudiant = () => {
    if (etudiants.length < 3) setEtudiants([...etudiants, { nom: '', prenom: '', filiere: '', stacks: '' }])
  }

  const removeEtudiant = (i: number) => {
    // Le chef de groupe (index 0) ne peut pas être retiré
    if (i === 0) return
    if (etudiants.length > 1) setEtudiants(etudiants.filter((_, idx) => idx !== i))
  }

  const updateEtudiant = (i: number, field: keyof EtudiantForm, val: string) => {
    const updated = [...etudiants]
    updated[i] = { ...updated[i], [field]: val }
    setEtudiants(updated)
  }

  const handleCreerGroupe = async () => {
    setErrGroupe('')
    if (!nomGroupe.trim()) return setErrGroupe('Le nom du groupe est requis.')
    if (etudiants.some(e => !e.nom.trim() || !e.filiere.trim()))
      return setErrGroupe('Le nom et la filière sont requis pour chaque membre.')

    setLoadingGroupe(true)
    try {
      const etudiantsFormatted = etudiants.map(e => ({
        nom: e.nom.trim(),
        prenom: e.prenom.trim() || e.nom.trim(),
        filiere: e.filiere,
        stacks: e.stacks?.trim() || null,
      }))

      const res = await creerGroupe({
        nom: nomGroupe,
        etudiants: etudiantsFormatted,
      })

      const newGroupeId = res.data.id
      setGroupeId(newGroupeId)

      // Lier l'utilisateur connecté comme chef du groupe créé
      if (currentUser?.id) {
        await lierGroupe(currentUser.id, newGroupeId)
        const updatedUser = { ...currentUser, groupe_id: newGroupeId }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }

      setStep('choix')
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setErrGroupe(
        typeof detail === 'string' ? detail :
        Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') :
        'Erreur lors de la création du groupe.'
      )
    } finally {
      setLoadingGroupe(false)
    }
  }

  // Utiliser son groupe existant pour soumettre / modifier des choix
  const handleUtiliserMonGroupe = async () => {
    if (!monGroupe) return
    setGroupeId(monGroupe.id)
    await chargerChoixExistants(monGroupe.id)
    setStep('choix')
  }

  // ── Handlers choix ──────────────────────────────────────────
  const handleChoixChange = (priorite: number, projet_id: number) => {
    if (choixVerrouilles) return
    setChoix(prev => prev.map(c => c.priorite === priorite ? { ...c, projet_id } : c))
  }

  const handleSoumettreChoix = async () => {
    setErrChoix(''); setOkChoix('')
    if (choix.some(c => c.projet_id === null)) return setErrChoix('Veuillez sélectionner 3 projets différents.')
    const ids = choix.map(c => c.projet_id)
    if (new Set(ids).size !== 3) return setErrChoix('Les 3 projets doivent être différents.')
    if (!groupeId) return setErrChoix('Groupe introuvable.')

    setLoadingChoix(true)
    try {
      // Si des choix existent déjà (choix_id non null) → modifier au lieu de créer
      const dejaSoumis = choix.some(c => c.choix_id !== null)

      if (dejaSoumis) {
        for (const c of choix) {
          if (c.choix_id) {
            await modifierChoix(c.choix_id, { projet_id: c.projet_id as number, priorite: c.priorite })
          } else {
            await creerChoix({ groupe_id: groupeId, projet_id: c.projet_id, priorite: c.priorite })
          }
        }
        setOkChoix('Vos choix ont été mis à jour ✓')
        setStep('done')
      } else {
        for (const c of choix) {
          await creerChoix({ groupe_id: groupeId, projet_id: c.projet_id, priorite: c.priorite })
        }
        setStep('done')
      }
    } catch (e: any) {
      const detail = e?.response?.data?.detail
      setErrChoix(
        typeof detail === 'string' ? detail :
        Array.isArray(detail) ? detail.map((d: any) => d.msg).join(', ') :
        'Erreur lors de la soumission des choix.'
      )
    } finally {
      setLoadingChoix(false)
    }
  }

  const filieres = ['ICCN', 'DATA', 'SmartICT', 'ASEDS', 'CLOUD', 'AMOA', 'SesNum']

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select { font-family: Inter, system-ui, sans-serif !important; }
        .field-input { transition: border-color 0.2s, box-shadow 0.2s; }
        .field-input:focus { outline: none; border-color: ${P.accent} !important; box-shadow: 0 0 0 3px rgba(8,145,178,0.14); }
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
            <button onClick={() => navigate('/etudiant')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>← Retour</button>
            <span style={{ color: '#A5F3FC', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>Groupe & Choix de projets</span>
          </div>
          {/* Progress */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(['groupe', 'choix', 'done'] as Step[]).map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: step === s ? P.accent : (['groupe', 'choix', 'done'].indexOf(step) > i ? '#10B981' : 'rgba(255,255,255,0.2)'),
                  color: '#fff', fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500,
                }}>
                  {['groupe', 'choix', 'done'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.3)' }} />}
              </div>
            ))}
          </div>
          <button onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }} style={{ background: '#fff', border: 'none', color: P.deep, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700 }}>
            Déconnexion
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>

        {/* ─── CHARGEMENT ─── */}
        {loadingCheck && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: P.muted, fontFamily: "Inter, system-ui, sans-serif" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>Vérification de votre compte...
          </div>
        )}

        {/* ─── STEP 1: CRÉER GROUPE ─── */}
        {!loadingCheck && step === 'groupe' && (
          <div>
            <h1 style={{ margin: '0 0 6px', color: P.text, fontSize: 30, fontWeight: 700 }}>Créer votre groupe</h1>
            <p style={{ margin: '0 0 28px', color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>
              Renseignez le nom du groupe et les informations de chaque membre (1 à 3 personnes). Le premier membre devient automatiquement <strong>chef de groupe</strong>.
            </p>

            {/* Groupe existant détecté */}
            {monGroupe && (
              <div style={{ background: P.warningBg, border: '1px solid #FCD34D', borderRadius: 12, padding: '18px 22px', marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', color: P.warningText, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}>
                      📁 Vous avez déjà un groupe : <strong>{monGroupe.nom}</strong>
                    </p>
                    <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                      {monGroupe.etudiants?.length || 0} membre(s) · Voulez-vous soumettre ou modifier vos choix de projets ?
                    </p>
                  </div>
                  <button
                    onClick={handleUtiliserMonGroupe}
                    style={{ background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500, whiteSpace: 'nowrap', marginLeft: 16 }}
                  >
                    Utiliser ce groupe →
                  </button>
                </div>
              </div>
            )}

            <div style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: '32px 36px' }}>

              {/* Bandeau "pré-rempli depuis votre compte" */}
              {currentUser?.nom && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>👤</span>
                  <span style={{ color: '#1E40AF', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                    Le premier membre (<strong>chef de groupe</strong>) a été pré-rempli depuis votre compte <em>({currentUser.email})</em>.
                  </span>
                </div>
              )}

              {/* Nom du groupe */}
              <div style={{ marginBottom: 28 }}>
                <label style={{ display: 'block', color: P.text, fontSize: 14, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500, marginBottom: 8 }}>
                  Nom du groupe <span style={{ color: P.error }}>*</span>
                </label>
                <input
                  className="field-input"
                  value={nomGroupe}
                  onChange={e => setNomGroupe(e.target.value)}
                  placeholder="Ex : Groupe Alpha"
                  style={{ width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 15, border: `1.5px solid ${P.border}`, background: P.bg, color: P.text }}
                />
              </div>

              {/* Étudiants */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <label style={{ color: P.text, fontSize: 14, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500 }}>
                    Membres du groupe <span style={{ color: P.muted, fontWeight: 400 }}>({etudiants.length}/3)</span>
                  </label>
                  {etudiants.length < 3 && (
                    <button className="add-btn" onClick={addEtudiant} style={{ background: P.light, color: P.mid, border: `1px solid ${P.border}`, borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500 }}>
                      + Ajouter un membre
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {etudiants.map((e, i) => (
                    <div key={i} style={{ background: P.light, borderRadius: 12, padding: '20px 24px', position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: P.mid, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}>Étudiant {i + 1}</span>
                          {i === 0 && (
                            <span style={{ background: P.accent, color: '#fff', fontSize: 10, fontFamily: "Inter, system-ui, sans-serif", padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                              👑 Chef de groupe
                            </span>
                          )}
                        </div>
                        {etudiants.length > 1 && i !== 0 && (
                          <button className="remove-btn" onClick={() => removeEtudiant(i)} style={{ background: 'transparent', border: 'none', color: P.muted, cursor: 'pointer', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", borderRadius: 6, padding: '4px 10px' }}>
                            ✕ Retirer
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 6 }}>Nom</label>
                          <input
                            className="field-input"
                            value={e.nom}
                            onChange={ev => updateEtudiant(i, 'nom', ev.target.value)}
                            placeholder="Nom"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: `1.5px solid ${P.border}`, background: '#fff', color: P.text }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 6 }}>Prénom</label>
                          <input
                            className="field-input"
                            value={e.prenom}
                            onChange={ev => updateEtudiant(i, 'prenom', ev.target.value)}
                            placeholder="Prénom"
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: `1.5px solid ${P.border}`, background: '#fff', color: P.text }}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                        <div>
                          <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 6 }}>Filière</label>
                          <select
                            className="field-input"
                            value={e.filiere}
                            onChange={ev => updateEtudiant(i, 'filiere', ev.target.value)}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: `1.5px solid ${P.border}`, background: '#fff', color: P.text }}
                          >
                            <option value="">Sélectionner...</option>
                            {filieres.map(f => <option key={f} value={f}>{f}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 6 }}>
                            Stacks / Compétences <span style={{ color: P.muted, fontWeight: 400 }}>(ex: Python, React, Docker)</span>
                          </label>
                          <input
                            className="field-input"
                            value={e.stacks}
                            onChange={ev => updateEtudiant(i, 'stacks', ev.target.value)}
                            placeholder="Python, React, Machine Learning..."
                            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13, border: `1.5px solid ${P.border}`, background: '#fff', color: P.text }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {errGroupe && (
                <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: P.error, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                  ⚠️ {errGroupe}
                </div>
              )}

              <button
                className="submit-btn"
                onClick={handleCreerGroupe}
                disabled={loadingGroupe}
                style={{ marginTop: 28, width: '100%', background: P.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500, cursor: 'pointer' }}
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
            <p style={{ margin: '0 0 16px', color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>
              Sélectionnez 3 projets différents par ordre de préférence.
            </p>

            {choixVerrouilles && (
              <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 8, background: P.warningBg, border: '1px solid #FCD34D', color: P.warningText, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                🔒 L'affectation a déjà été lancée par le coordinateur — vos choix sont verrouillés et ne peuvent plus être modifiés.
              </div>
            )}

            {okChoix && (
              <div style={{ marginBottom: 20, padding: '12px 16px', borderRadius: 8, background: P.successBg, border: '1px solid #A7F3D0', color: P.success, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                ✓ {okChoix}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {choix.map((c) => (
                <div key={c.priorite} style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: '24px 28px', opacity: choixVerrouilles ? 0.7 : 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: c.priorite === 1 ? '#0891B2' : c.priorite === 2 ? '#22D3EE' : '#A5F3FC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 14, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700,
                    }}>{c.priorite}</div>
                    <div>
                      <div style={{ color: P.text, fontSize: 16, fontWeight: 600 }}>
                        {c.priorite === 1 ? '1er choix' : c.priorite === 2 ? '2ème choix' : '3ème choix'}
                      </div>
                      <div style={{ color: P.muted, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif" }}>
                        {c.priorite === 1 ? 'Votre projet préféré' : c.priorite === 2 ? 'Deuxième préférence' : 'Alternative'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {projets.map(p => {
                      const selectedByOther = choix.filter(ch => ch.priorite !== c.priorite).some(ch => ch.projet_id === p.id)
                      const isSelected = c.projet_id === p.id
                      const disabled = selectedByOther || choixVerrouilles
                      return (
                        <div
                          key={p.id}
                          className={!disabled ? 'proj-card' : ''}
                          onClick={() => !disabled && handleChoixChange(c.priorite, p.id)}
                          style={{
                            padding: '14px 16px', borderRadius: 10,
                            border: isSelected ? `2px solid ${P.accent}` : `1.5px solid ${P.border}`,
                            background: isSelected ? P.light : selectedByOther ? '#F9FAFB' : '#fff',
                            opacity: selectedByOther ? 0.4 : 1,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <div style={{ color: P.text, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", fontWeight: isSelected ? 600 : 400, marginBottom: 4 }}>
                            {isSelected && <span style={{ color: P.accent }}>✓ </span>}{p.titre}
                          </div>
                          <div style={{ color: P.muted, fontSize: 11, fontFamily: "Inter, system-ui, sans-serif" }}>
                            {p.description?.slice(0, 60)}{p.description?.length > 60 ? '...' : ''}
                          </div>
                        </div>
                      )
                    })}
                    {projets.length === 0 && (
                      <div style={{ color: P.muted, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", padding: '12px 0' }}>
                        Aucun projet disponible pour l'instant.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {errChoix && (
              <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: P.error, fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                ⚠️ {errChoix}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
              <button onClick={() => setStep('groupe')} style={{ background: P.light, color: P.mid, border: `1px solid ${P.border}`, borderRadius: 12, padding: '13px 24px', fontSize: 14, fontFamily: "Inter, system-ui, sans-serif", cursor: 'pointer' }}>
                ← Retour
              </button>
              <button
                className="submit-btn"
                onClick={handleSoumettreChoix}
                disabled={loadingChoix || choixVerrouilles}
                style={{ flex: 1, background: P.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500, cursor: 'pointer' }}
              >
                {loadingChoix ? 'Soumission...' : choix.some(c => c.choix_id !== null) ? 'Mettre à jour mes choix →' : 'Soumettre mes choix →'}
              </button>
            </div>
          </div>
        )}

        {/* ─── DONE ─── */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
            <h1 style={{ margin: '0 0 12px', color: P.text, fontSize: 32, fontWeight: 700 }}>Dossier soumis avec succès !</h1>
            <p style={{ margin: '0 0 40px', color: P.muted, fontSize: 16, fontFamily: "Inter, system-ui, sans-serif", maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Votre groupe a été créé et vos 3 choix de projets ont été enregistrés. Les résultats seront disponibles après le traitement par le coordinateur.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
              <button onClick={() => navigate('/etudiant/resultats')} style={{ background: P.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500, cursor: 'pointer' }}>
                Voir mes résultats
              </button>
              <button onClick={() => navigate('/etudiant')} style={{ background: P.light, color: P.mid, border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 28px', fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", cursor: 'pointer' }}>
                Tableau de bord
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}