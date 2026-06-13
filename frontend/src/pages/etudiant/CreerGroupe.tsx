import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { creerGroupe, getProjets, creerChoix, getMonGroupe } from '../../services/api'

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

interface Etudiant { nom: string; prenom: string; email: string; filiere: string }
interface Projet { id: number; titre: string; description: string; encadrant_id: number }
interface GroupeExistant {
  id: number
  nom: string
  chef_nom?: string
  competences_techniques?: string
  soft_skills?: string
  etudiants: any[]
}

type Step = 'groupe' | 'choix' | 'done'

type SkillCategory = { title: string; items: string[] }

const technicalSkillCategories: SkillCategory[] = [
  { title: 'Developpement web', items: ['React', 'Angular', 'Vue.js', 'Node.js', 'FastAPI', 'Django', 'REST API'] },
  { title: 'Developpement mobile', items: ['Flutter', 'React Native', 'Android', 'iOS'] },
  { title: 'IA & Data', items: ['Python', 'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'SQL'] },
  { title: 'Cloud & DevOps', items: ['Docker', 'Kubernetes', 'AWS/Azure/GCP', 'CI/CD', 'Linux'] },
  { title: 'Cybersecurite', items: ['Securite web', 'Pentest', 'Cryptographie', 'IAM', 'Reseaux'] },
  { title: 'Design & Produit', items: ['UI/UX', 'Figma', 'Prototypage', 'Accessibilite'] },
]

const softSkillCategories: SkillCategory[] = [
  {
    title: 'Soft skills du groupe',
    items: ['Communication', 'Organisation', 'Travail en equipe', 'Leadership', 'Autonomie', 'Redaction', 'Presentation', 'Gestion du temps', 'Resolution de problemes'],
  },
]

export default function CreerGroupe() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('groupe')

  // Utilisateur connecté
  const [currentUser] = useState<any>(() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} }
  })

  // Step 1 - Groupe
  const [nomGroupe, setNomGroupe] = useState('')
  const [etudiants, setEtudiants] = useState<Etudiant[]>([])
  const [selectedTechSkills, setSelectedTechSkills] = useState<string[]>([])
  const [selectedSoftSkills, setSelectedSoftSkills] = useState<string[]>([])
  const [groupeId, setGroupeId] = useState<number | null>(null)
  const [loadingGroupe, setLoadingGroupe] = useState(false)
  const [errGroupe, setErrGroupe] = useState('')

  // Step 2 - Choix
  const [projets, setProjets] = useState<Projet[]>([])
  const [choix, setChoix] = useState([
    { priorite: 1, projet_id: null as number | null },
    { priorite: 2, projet_id: null as number | null },
    { priorite: 3, projet_id: null as number | null },
  ])
  const [loadingChoix, setLoadingChoix] = useState(false)
  const [errChoix, setErrChoix] = useState('')

  // Groupe existant de l'utilisateur
  const [monGroupe, setMonGroupe] = useState<GroupeExistant | null>(null)
  const [loadingCheck, setLoadingCheck] = useState(true)

  // ── Initialisation ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingCheck(true)
      try {
        // Charger les projets
        const p = await getProjets()
        setProjets(p.data)

        // Vérifier si l'utilisateur a déjà un groupe
        if (currentUser?.id && currentUser?.groupe_id) {
          const g = await getMonGroupe(currentUser.id)
          setMonGroupe(g.data)
        }
      } catch (_) {}
      setLoadingCheck(false)
    }

    // Pré-remplir le premier étudiant avec les infos du compte connecté
    if (currentUser?.nom) {
      const parts = (currentUser.nom || '').trim().split(' ')
      setEtudiants([{
        nom: currentUser.nom || '',
        prenom: parts.slice(1).join(' ') || parts[0] || '',
        email: currentUser.email || '',
        filiere: '',
      }])
    } else {
      setEtudiants([{ nom: '', prenom: '', email: '', filiere: '' }])
    }

    init()
  }, [])

  // ── Handlers groupe ─────────────────────────────────────────
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

  const toggleSkill = (skill: string, selected: string[], setter: (skills: string[]) => void) => {
    setter(selected.includes(skill) ? selected.filter(s => s !== skill) : [...selected, skill])
  }

  const handleCreerGroupe = async () => {
    setErrGroupe('')
    if (!nomGroupe.trim()) return setErrGroupe('Le nom du groupe est requis.')
    if (selectedTechSkills.length === 0) return setErrGroupe('Selectionnez au moins une competence technique du groupe.')
    if (selectedSoftSkills.length === 0) return setErrGroupe('Selectionnez au moins une soft skill du groupe.')
    if (etudiants.some(e => !e.nom.trim() || !e.email.trim() || !e.filiere.trim()))
      return setErrGroupe('Tous les champs des étudiants sont requis.')

    setLoadingGroupe(true)
    try {
      const etudiantsFormatted = etudiants.map((e, idx) => {
        const parts = e.nom.trim().split(' ')
        return {
          nom: parts[0] || '',
          prenom: parts.slice(1).join(' ') || parts[0] || '',
          filiere: e.filiere,
          // Lier le 1er étudiant au compte connecté
          utilisateur_id: idx === 0 ? (currentUser?.id || null) : null,
        }
      })

      const res = await creerGroupe({
        nom: nomGroupe,
        competences_techniques: selectedTechSkills,
        soft_skills: selectedSoftSkills,
        etudiants: etudiantsFormatted,
        createur_id: currentUser?.id || null,  // ← Lier le créateur au groupe
      })

      const newGroupeId = res.data.id
      setGroupeId(newGroupeId)

      // Mettre à jour le localStorage avec le groupe_id
      const updatedUser = { ...currentUser, groupe_id: newGroupeId }
      localStorage.setItem('user', JSON.stringify(updatedUser))

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

  // Utiliser son groupe existant pour soumettre des choix
  const handleUtiliserMonGroupe = () => {
    if (!monGroupe) return
    setGroupeId(monGroupe.id)
    setStep('choix')
  }

  // ── Handlers choix ──────────────────────────────────────────
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
              Renseignez le nom du groupe et les informations de chaque membre (1 à 3 personnes).
            </p>

            {/* ← NOUVEAU : Groupe existant détecté */}
            {monGroupe && (
              <div style={{ background: P.warningBg, border: '1px solid #FCD34D', borderRadius: 12, padding: '18px 22px', marginBottom: 28 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: '0 0 4px', color: P.warningText, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}>
                      📁 Vous avez déjà un groupe : <strong>{monGroupe.nom}</strong>
                    </p>
                    <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                      {monGroupe.etudiants?.length || 0} membre(s) · Voulez-vous soumettre vos choix de projets avec ce groupe ?
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

              {/* ← NOUVEAU : Bandeau "pré-rempli depuis votre compte" */}
              {currentUser?.nom && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>👤</span>
                  <span style={{ color: '#1E40AF', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif" }}>
                    Les informations du <strong>premier membre ont été pré-remplies</strong> depuis votre compte <em>({currentUser.email})</em>.
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

              <div style={{ background: '#F0FDFA', border: '1px solid #99F6E4', borderRadius: 12, padding: '16px 18px', marginBottom: 28 }}>
                <div style={{ color: P.text, fontSize: 14, fontWeight: 800, marginBottom: 5 }}>
                  Chef de groupe : {currentUser?.nom || 'compte connecte'}
                </div>
                <div style={{ color: P.muted, fontSize: 13, lineHeight: 1.55 }}>
                  Le chef de groupe est le seul membre ayant acces a la plateforme. Les competences cochees ci-dessous servent au moteur d'affectation pour mesurer l'adequation avec les projets.
                </div>
              </div>

              <SkillSelector
                title="Competences techniques du groupe"
                required
                categories={technicalSkillCategories}
                selected={selectedTechSkills}
                onToggle={skill => toggleSkill(skill, selectedTechSkills, setSelectedTechSkills)}
              />

              <SkillSelector
                title="Soft skills du groupe"
                required
                categories={softSkillCategories}
                selected={selectedSoftSkills}
                onToggle={skill => toggleSkill(skill, selectedSoftSkills, setSelectedSoftSkills)}
              />

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
                          {/* ← NOUVEAU : Badge "Vous" pour le premier membre */}
                          {i === 0 && currentUser?.nom && (
                            <span style={{ background: P.accent, color: '#fff', fontSize: 10, fontFamily: "Inter, system-ui, sans-serif", padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                              Vous
                            </span>
                          )}
                        </div>
                        {etudiants.length > 1 && (
                          <button className="remove-btn" onClick={() => removeEtudiant(i)} style={{ background: 'transparent', border: 'none', color: P.muted, cursor: 'pointer', fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", borderRadius: 6, padding: '4px 10px' }}>
                            ✕ Retirer
                          </button>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        {([
                          { field: 'nom' as keyof Etudiant, label: 'Nom complet', placeholder: 'Nom Prénom' },
                          { field: 'email' as keyof Etudiant, label: 'Email INPT', placeholder: 'nom@inpt.ac.ma' },
                        ]).map(f => (
                          <div key={f.field}>
                            <label style={{ display: 'block', color: P.text, fontSize: 12, fontFamily: "Inter, system-ui, sans-serif", marginBottom: 6 }}>{f.label}</label>
                            <input
                              className="field-input"
                              value={e[f.field]}
                              onChange={ev => updateEtudiant(i, f.field, ev.target.value)}
                              placeholder={f.placeholder}
                              // ← NOUVEAU : champs en lecture seule pour le 1er membre (email pré-rempli)
                              readOnly={i === 0 && f.field === 'email' && !!currentUser?.email}
                              style={{
                                width: '100%', padding: '10px 12px', borderRadius: 8, fontSize: 13,
                                border: `1.5px solid ${P.border}`, background: (i === 0 && f.field === 'email' && currentUser?.email) ? '#F0F9FF' : '#fff',
                                color: P.text, cursor: (i === 0 && f.field === 'email' && currentUser?.email) ? 'default' : 'text',
                              }}
                            />
                          </div>
                        ))}
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
            <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>
              Sélectionnez 3 projets différents par ordre de préférence.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {choix.map((c) => (
                <div key={c.priorite} style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, padding: '24px 28px' }}>
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
                disabled={loadingChoix}
                style={{ flex: 1, background: P.accent, color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 500, cursor: 'pointer' }}
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

function SkillSelector({
  title,
  required = false,
  categories,
  selected,
  onToggle,
}: {
  title: string
  required?: boolean
  categories: SkillCategory[]
  selected: string[]
  onToggle: (skill: string) => void
}) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <label style={{ color: P.text, fontSize: 14, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 700 }}>
          {title} {required && <span style={{ color: P.error }}>*</span>}
        </label>
        <span style={{ color: selected.length ? P.mid : P.muted, background: selected.length ? P.light : '#F8FAFC', border: `1px solid ${P.border}`, borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
          {selected.length} selection(s)
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12 }}>
        {categories.map(category => (
          <div key={category.title} style={{ background: '#F8FAFC', border: `1px solid ${P.border}`, borderRadius: 12, padding: '14px 14px' }}>
            <div style={{ color: P.text, fontSize: 13, fontWeight: 800, marginBottom: 10 }}>{category.title}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {category.items.map(skill => {
                const checked = selected.includes(skill)
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => onToggle(skill)}
                    style={{
                      border: checked ? `1px solid ${P.accent}` : `1px solid ${P.border}`,
                      background: checked ? P.light : '#fff',
                      color: checked ? P.mid : P.text,
                      borderRadius: 999,
                      padding: '7px 11px',
                      fontSize: 12,
                      fontWeight: checked ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {checked ? '✓ ' : ''}{skill}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
