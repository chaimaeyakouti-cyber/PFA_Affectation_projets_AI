import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getGroupes, getProjets, getEncadrants, getChoix,
  getAffectations, lancerAffectation, validerAffectation, modifierAffectation
} from '../../services/api'

// ── Design tokens ──────────────────────────────────────────────
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
  success: '#059669',
  successBg: '#D1FAE5',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEF2F2',
}

// ── Types ───────────────────────────────────────────────────────
interface Etudiant { nom: string; email: string; filiere: string }
interface Groupe { id: number; nom: string; etudiants: Etudiant[] }
interface Encadrant { id: number; nom: string; email: string; specialite: string }
interface Projet { id: number; titre: string; description: string; encadrant_id: number }
interface Choix { id: number; groupe_id: number; projet_id: number; priorite: number }
interface Affectation { id: number; groupe_id: number; projet_id: number | null; valide: string }

type Tab = 'overview' | 'groupes' | 'affectation' | 'gestion'

// ── Helpers ─────────────────────────────────────────────────────
const statutBadge = (valide: string) => {
  if (valide === 'validé') return { bg: P.successBg, color: P.success, label: '✓ Validé' }
  if (valide === 'modifié') return { bg: '#DBEAFE', color: '#1E40AF', label: '✎ Modifié' }
  return { bg: P.warningBg, color: P.warning, label: '⏳ En attente' }
}

// ══════════════════════════════════════════════════════════════════
export default function CoordinateurDashboard() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('overview')

  // Data
  const [groupes, setGroupes] = useState<Groupe[]>([])
  const [projets, setProjets] = useState<Projet[]>([])
  const [encadrants, setEncadrants] = useState<Encadrant[]>([])
  const [choix, setChoix] = useState<Choix[]>([])
  const [affectations, setAffectations] = useState<Affectation[]>([])
  const [loading, setLoading] = useState(true)

  // Affectation
  const [launching, setLaunching] = useState(false)
  const [launchResult, setLaunchResult] = useState<any[] | null>(null)
  const [launchError, setLaunchError] = useState('')
  const [launchSuccess, setLaunchSuccess] = useState(false)

  // Gestion
  const [modifId, setModifId] = useState<number | null>(null)
  const [newProjetId, setNewProjetId] = useState<number | ''>('')
  const [actionMsg, setActionMsg] = useState('')
  const [actionError, setActionError] = useState('')

  const loadAll = async () => {
    setLoading(true)
    try {
      const [g, p, e, c, a] = await Promise.all([
        getGroupes(), getProjets(), getEncadrants(), getChoix(), getAffectations()
      ])
      setGroupes(g.data)
      setProjets(p.data)
      setEncadrants(e.data)
      setChoix(c.data)
      setAffectations(a.data)
    } catch (_) {}
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // ── Lookups ──────────────────────────────────────────────────
  const getGroupe = (id: number) => groupes.find(g => g.id === id)
  const getProjet = (id: number | null) => id ? projets.find(p => p.id === id) : null
  const getEncadrant = (id: number) => encadrants.find(e => e.id === id)
  const getChoixGroupe = (gid: number) => choix.filter(c => c.groupe_id === gid).sort((a, b) => a.priorite - b.priorite)

  // ── Actions ──────────────────────────────────────────────────
  const handleLancer = async () => {
    setLaunching(true); setLaunchError(''); setLaunchSuccess(false)
    try {
      const res = await lancerAffectation()
      setLaunchResult(res.data.affectations)
      setLaunchSuccess(true)
      await loadAll()
    } catch (e: any) {
      setLaunchError(e?.response?.data?.detail || 'Erreur lors du lancement.')
    } finally { setLaunching(false) }
  }

  const handleValider = async (id: number) => {
    setActionMsg(''); setActionError('')
    try {
      await validerAffectation(id)
      setActionMsg(`Affectation #${id} validée avec succès.`)
      await loadAll()
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || 'Erreur lors de la validation.')
    }
  }

  const handleModifier = async (id: number) => {
    if (!newProjetId) return setActionError('Sélectionnez un projet.')
    setActionMsg(''); setActionError('')
    try {
      await modifierAffectation(id, Number(newProjetId))
      setActionMsg(`Affectation #${id} modifiée avec succès.`)
      setModifId(null); setNewProjetId('')
      await loadAll()
    } catch (e: any) {
      setActionError(e?.response?.data?.detail || 'Erreur lors de la modification.')
    }
  }

  // ── Stats ────────────────────────────────────────────────────
  const stats = {
    groupes: groupes.length,
    projets: projets.length,
    choix: choix.length,
    affectes: affectations.length,
    valides: affectations.filter(a => a.valide === 'validé').length,
    enAttente: affectations.filter(a => a.valide === 'en_attente').length,
    sansChoix: groupes.filter(g => getChoixGroupe(g.id).length === 0).length,
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: '📊' },
    { id: 'groupes', label: 'Groupes & Choix', icon: '👥' },
    { id: 'affectation', label: 'Lancer l\'affectation', icon: '⚙️' },
    { id: 'gestion', label: 'Gérer les affectations', icon: '✅' },
  ]

  // ════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: P.bg, fontFamily: "'Crimson Pro', Georgia, serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        input, select, button { font-family: 'DM Sans', sans-serif !important; }
        .tab-btn { transition: all 0.2s; cursor: pointer; }
        .tab-btn:hover { background: rgba(255,255,255,0.15) !important; }
        .action-btn { transition: all 0.18s; cursor: pointer; }
        .action-btn:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
        .action-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .stat-card:hover { box-shadow: 0 6px 24px rgba(107,70,193,0.13); transform: translateY(-2px); }
        .stat-card { transition: all 0.2s; }
        .row-hover:hover { background: #F5F3FF !important; }
        .field-input:focus { outline: none; border-color: ${P.accent} !important; box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: P.deep, borderBottom: `3px solid ${P.accent}`, padding: '0 40px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎓</div>
            <div>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>PFA Affectation</div>
              <div style={{ color: '#C4B5FD', fontSize: 11, fontFamily: "'DM Sans'", fontWeight: 300 }}>INPT · Espace Coordinateur</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#C4B5FD', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>
              ↻ Actualiser
            </button>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14 }}>C</div>
            <span style={{ color: '#C4B5FD', fontSize: 13 }}>Coordinateur</span>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{ background: `linear-gradient(135deg, ${P.deep} 0%, #4A2C8C 55%, ${P.mid} 100%)`, padding: '36px 40px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h1 style={{ margin: '0 0 6px', color: '#fff', fontSize: 30, fontWeight: 700 }}>Tableau de bord Coordinateur</h1>
          <p style={{ margin: '0 0 28px', color: '#C4B5FD', fontSize: 14, fontFamily: "'DM Sans'", fontWeight: 300 }}>
            Supervisez les groupes, lancez l'algorithme d'affectation et gérez les résultats.
          </p>
          {/* Quick stats */}
          {!loading && (
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { label: 'Groupes', val: stats.groupes, icon: '👥' },
                { label: 'Projets', val: stats.projets, icon: '📁' },
                { label: 'Choix soumis', val: stats.choix, icon: '📋' },
                { label: 'Affectations', val: stats.affectes, icon: '🎯' },
                { label: 'Validées', val: stats.valides, icon: '✅' },
              ].map(s => (
                <div key={s.label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '12px 20px', minWidth: 100 }}>
                  <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                  <div style={{ color: '#C4B5FD', fontSize: 11, fontFamily: "'DM Sans'" }}>{s.icon} {s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── TAB NAV ── */}
      <div style={{ background: P.deep, borderBottom: `1px solid rgba(255,255,255,0.1)` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className="tab-btn"
              onClick={() => setTab(t.id)}
              style={{
                background: tab === t.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                border: 'none',
                borderBottom: tab === t.id ? `2px solid ${P.accent}` : '2px solid transparent',
                color: tab === t.id ? '#fff' : '#C4B5FD',
                padding: '14px 20px',
                fontSize: 13,
                fontWeight: tab === t.id ? 500 : 400,
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: P.muted, fontFamily: "'DM Sans'" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>Chargement des données...
          </div>
        ) : (
          <>
            {/* ══ TAB: OVERVIEW ══ */}
            {tab === 'overview' && (
              <div>
                <h2 style={{ margin: '0 0 24px', color: P.text, fontSize: 24, fontWeight: 600 }}>Vue d'ensemble</h2>

                {/* Status cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
                  {[
                    { title: 'Groupes sans choix', val: stats.sansChoix, icon: '⚠️', bg: stats.sansChoix > 0 ? P.warningBg : P.successBg, color: stats.sansChoix > 0 ? P.warning : P.success, desc: stats.sansChoix > 0 ? 'Groupes n\'ayant pas encore soumis leurs préférences' : 'Tous les groupes ont soumis leurs choix ✓' },
                    { title: 'En attente de validation', val: stats.enAttente, icon: '🕐', bg: P.warningBg, color: P.warning, desc: 'Affectations générées mais pas encore validées' },
                    { title: 'Affectations validées', val: stats.valides, icon: '✅', bg: P.successBg, color: P.success, desc: `Sur ${stats.affectes} affectation(s) au total` },
                  ].map(c => (
                    <div key={c.title} className="stat-card" style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '24px 28px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <span style={{ fontSize: 28 }}>{c.icon}</span>
                        <span style={{ background: c.bg, color: c.color, fontSize: 22, fontWeight: 700, padding: '4px 14px', borderRadius: 10 }}>{c.val}</span>
                      </div>
                      <div style={{ color: P.text, fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{c.title}</div>
                      <div style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans'", lineHeight: 1.5 }}>{c.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Projets par encadrant */}
                <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '24px 28px', marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 20px', color: P.text, fontSize: 17, fontWeight: 600 }}>Projets par encadrant</h3>
                  {encadrants.length === 0 ? (
                    <p style={{ color: P.muted, fontFamily: "'DM Sans'", fontSize: 13 }}>Aucun encadrant enregistré.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                      {encadrants.map(enc => {
                        const lesProjets = projets.filter(p => p.encadrant_id === enc.id)
                        return (
                          <div key={enc.id} style={{ background: P.light, borderRadius: 10, padding: '16px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>
                                {enc.nom?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <div style={{ color: P.text, fontSize: 14, fontWeight: 600 }}>{enc.nom}</div>
                                <div style={{ color: P.muted, fontSize: 11, fontFamily: "'DM Sans'" }}>{enc.specialite}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {lesProjets.length === 0 ? (
                                <span style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans'" }}>Aucun projet proposé</span>
                              ) : lesProjets.map(p => (
                                <div key={p.id} style={{ background: '#fff', borderRadius: 7, padding: '8px 12px', fontSize: 13, color: P.text, fontFamily: "'DM Sans'" }}>
                                  📁 {p.titre}
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Quick actions */}
                <div style={{ background: P.light, borderRadius: 14, border: `1px solid ${P.border}`, padding: '20px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: P.text, fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Prêt à lancer l'affectation ?</div>
                    <div style={{ color: P.muted, fontSize: 13, fontFamily: "'DM Sans'" }}>
                      {stats.sansChoix > 0 ? `⚠️ ${stats.sansChoix} groupe(s) n'ont pas encore soumis leurs choix.` : '✅ Tous les groupes ont soumis leurs choix.'}
                    </div>
                  </div>
                  <button className="action-btn" onClick={() => setTab('affectation')} style={{
                    background: P.accent, color: '#fff', border: 'none',
                    borderRadius: 10, padding: '12px 24px', fontSize: 14, fontWeight: 500,
                  }}>
                    Aller à l'affectation →
                  </button>
                </div>
              </div>
            )}

            {/* ══ TAB: GROUPES ══ */}
            {tab === 'groupes' && (
              <div>
                <h2 style={{ margin: '0 0 8px', color: P.text, fontSize: 24, fontWeight: 600 }}>Groupes & Choix de projets</h2>
                <p style={{ margin: '0 0 28px', color: P.muted, fontSize: 14, fontFamily: "'DM Sans'" }}>{groupes.length} groupe(s) enregistré(s)</p>

                {groupes.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0', color: P.muted, fontFamily: "'DM Sans'" }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
                    Aucun groupe enregistré pour le moment.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {groupes.map(g => {
                      const lesChoix = getChoixGroupe(g.id)
                      return (
                        <div key={g.id} style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
                          {/* Group header */}
                          <div style={{ background: P.light, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16 }}>👥</div>
                              <div>
                                <div style={{ color: P.text, fontSize: 16, fontWeight: 600 }}>{g.nom}</div>
                                <div style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans'" }}>{g.etudiants?.length || 0} membre(s)</div>
                              </div>
                            </div>
                            <span style={{
                              background: lesChoix.length >= 3 ? P.successBg : P.warningBg,
                              color: lesChoix.length >= 3 ? P.success : P.warning,
                              fontSize: 12, fontFamily: "'DM Sans'", fontWeight: 600,
                              padding: '4px 12px', borderRadius: 20,
                            }}>
                              {lesChoix.length >= 3 ? '✓ Choix complets' : `${lesChoix.length}/3 choix`}
                            </span>
                          </div>

                          <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                            {/* Membres */}
                            <div>
                              <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 11, fontFamily: "'DM Sans'", textTransform: 'uppercase', letterSpacing: 1 }}>Membres</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {g.etudiants?.map((e, i) => (
                                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: P.light, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.mid, fontSize: 12, fontWeight: 700 }}>
                                      {e.nom?.[0]?.toUpperCase()}
                                    </div>
                                    <div>
                                      <div style={{ color: P.text, fontSize: 13, fontFamily: "'DM Sans'" }}>{e.nom}</div>
                                      <div style={{ color: P.muted, fontSize: 11, fontFamily: "'DM Sans'" }}>{e.filiere} · {e.email}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Choix */}
                            <div>
                              <p style={{ margin: '0 0 10px', color: P.muted, fontSize: 11, fontFamily: "'DM Sans'", textTransform: 'uppercase', letterSpacing: 1 }}>Choix de projets</p>
                              {lesChoix.length === 0 ? (
                                <div style={{ color: P.warning, fontSize: 13, fontFamily: "'DM Sans'", background: P.warningBg, borderRadius: 8, padding: '10px 14px' }}>⚠️ Aucun choix soumis</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                  {lesChoix.map(c => {
                                    const p = getProjet(c.projet_id)
                                    return (
                                      <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                          width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                          background: c.priorite === 1 ? P.accent : c.priorite === 2 ? '#A78BFA' : '#C4B5FD',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                          color: '#fff', fontSize: 11, fontWeight: 700,
                                        }}>{c.priorite}</div>
                                        <div style={{ color: P.text, fontSize: 13, fontFamily: "'DM Sans'" }}>{p?.titre || `Projet #${c.projet_id}`}</div>
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

            {/* ══ TAB: AFFECTATION ══ */}
            {tab === 'affectation' && (
              <div>
                <h2 style={{ margin: '0 0 8px', color: P.text, fontSize: 24, fontWeight: 600 }}>Lancer l'affectation</h2>
                <p style={{ margin: '0 0 32px', color: P.muted, fontSize: 14, fontFamily: "'DM Sans'" }}>
                  L'algorithme affecte automatiquement chaque groupe à un projet selon ses préférences et la disponibilité des projets.
                </p>

                {/* Pre-launch checklist */}
                <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '24px 28px', marginBottom: 24 }}>
                  <h3 style={{ margin: '0 0 18px', color: P.text, fontSize: 16, fontWeight: 600 }}>Vérifications avant lancement</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                      { ok: stats.groupes > 0, label: `${stats.groupes} groupe(s) enregistré(s)`, detail: 'Des groupes doivent exister pour lancer l\'affectation' },
                      { ok: stats.projets > 0, label: `${stats.projets} projet(s) disponible(s)`, detail: 'Des projets doivent être proposés par les encadrants' },
                      { ok: stats.choix > 0, label: `${stats.choix} choix soumis`, detail: 'Au moins un groupe doit avoir soumis ses préférences' },
                      { ok: stats.sansChoix === 0, label: `Groupes sans choix : ${stats.sansChoix}`, detail: stats.sansChoix > 0 ? 'Certains groupes n\'ont pas encore soumis leurs préférences' : 'Tous les groupes ont soumis leurs choix' },
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', borderRadius: 10, background: item.ok ? P.successBg : P.warningBg }}>
                        <span style={{ fontSize: 18 }}>{item.ok ? '✅' : '⚠️'}</span>
                        <div>
                          <div style={{ color: item.ok ? P.success : P.warning, fontSize: 14, fontWeight: 600 }}>{item.label}</div>
                          <div style={{ color: item.ok ? '#047857' : '#92400E', fontSize: 12, fontFamily: "'DM Sans'" }}>{item.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Launch button */}
                <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, padding: '28px 32px', textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 14 }}>⚙️</div>
                  <h3 style={{ margin: '0 0 8px', color: P.text, fontSize: 20, fontWeight: 600 }}>Algorithme d'affectation</h3>
                  <p style={{ margin: '0 0 28px', color: P.muted, fontSize: 14, fontFamily: "'DM Sans'", maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>
                    Le lancement remplace les affectations existantes. Cette opération est réversible via la gestion manuelle.
                  </p>

                  {launchError && (
                    <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 10, background: P.errorBg, color: P.error, fontSize: 13, fontFamily: "'DM Sans'" }}>
                      ⚠️ {launchError}
                    </div>
                  )}

                  <button
                    className="action-btn"
                    onClick={handleLancer}
                    disabled={launching || stats.choix === 0}
                    style={{
                      background: P.accent, color: '#fff', border: 'none',
                      borderRadius: 12, padding: '16px 40px', fontSize: 16,
                      fontWeight: 600, letterSpacing: 0.3,
                    }}
                  >
                    {launching ? '⚙️ Affectation en cours...' : '🚀 Lancer l\'affectation'}
                  </button>
                </div>

                {/* Results */}
                {launchSuccess && launchResult && (
                  <div>
                    <div style={{ background: P.successBg, border: `1px solid #A7F3D0`, borderRadius: 12, padding: '16px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 22 }}>🎉</span>
                      <div>
                        <div style={{ color: P.success, fontSize: 15, fontWeight: 600 }}>Affectation terminée avec succès !</div>
                        <div style={{ color: '#047857', fontSize: 13, fontFamily: "'DM Sans'" }}>{launchResult.length} groupe(s) affecté(s). Passez à l'onglet "Gérer" pour valider.</div>
                      </div>
                    </div>
                    <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
                      <div style={{ padding: '16px 24px', borderBottom: `1px solid ${P.border}` }}>
                        <h3 style={{ margin: 0, color: P.text, fontSize: 16, fontWeight: 600 }}>Résultats générés</h3>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: P.light }}>
                            {['Groupe', 'Projet affecté', 'Statut'].map(h => (
                              <th key={h} style={{ padding: '12px 24px', textAlign: 'left', color: P.muted, fontSize: 11, fontFamily: "'DM Sans'", fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {launchResult.map((r, i) => (
                            <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${P.border}` }}>
                              <td style={{ padding: '14px 24px', color: P.text, fontSize: 14, fontFamily: "'DM Sans'", fontWeight: 500 }}>{r.groupe}</td>
                              <td style={{ padding: '14px 24px', color: P.text, fontSize: 14, fontFamily: "'DM Sans'" }}>{r.projet_affecte}</td>
                              <td style={{ padding: '14px 24px' }}>
                                <span style={{ background: P.warningBg, color: P.warning, fontSize: 11, fontFamily: "'DM Sans'", fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>⏳ En attente</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══ TAB: GESTION ══ */}
            {tab === 'gestion' && (
              <div>
                <h2 style={{ margin: '0 0 8px', color: P.text, fontSize: 24, fontWeight: 600 }}>Gérer les affectations</h2>
                <p style={{ margin: '0 0 28px', color: P.muted, fontSize: 14, fontFamily: "'DM Sans'" }}>
                  Validez ou modifiez manuellement chaque affectation.
                </p>

                {/* Messages */}
                {actionMsg && (
                  <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 10, background: P.successBg, color: P.success, fontSize: 13, fontFamily: "'DM Sans'", display: 'flex', justifyContent: 'space-between' }}>
                    ✅ {actionMsg}
                    <button onClick={() => setActionMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.success, fontSize: 16 }}>×</button>
                  </div>
                )}
                {actionError && (
                  <div style={{ marginBottom: 20, padding: '12px 18px', borderRadius: 10, background: P.errorBg, color: P.error, fontSize: 13, fontFamily: "'DM Sans'", display: 'flex', justifyContent: 'space-between' }}>
                    ⚠️ {actionError}
                    <button onClick={() => setActionError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: P.error, fontSize: 16 }}>×</button>
                  </div>
                )}

                {affectations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '70px 0', color: P.muted, fontFamily: "'DM Sans'" }}>
                    <div style={{ fontSize: 48, marginBottom: 14 }}>📭</div>
                    <div style={{ fontSize: 16, marginBottom: 8 }}>Aucune affectation générée</div>
                    <div style={{ fontSize: 13, marginBottom: 24 }}>Lancez d'abord l'algorithme depuis l'onglet "Lancer l'affectation".</div>
                    <button className="action-btn" onClick={() => setTab('affectation')} style={{ background: P.accent, color: '#fff', border: 'none', borderRadius: 10, padding: '11px 24px', fontSize: 14 }}>
                      Aller à l'affectation →
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {affectations.map(aff => {
                      const groupe = getGroupe(aff.groupe_id)
                      const projet = getProjet(aff.projet_id)
                      const lesChoix = getChoixGroupe(aff.groupe_id)
                      const st = statutBadge(aff.valide)
                      const estModifie = modifId === aff.id

                      return (
                        <div key={aff.id} style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
                          {/* Card top */}
                          <div style={{ background: P.light, padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans'" }}>#{aff.id}</span>
                              <span style={{ color: P.text, fontSize: 15, fontWeight: 600 }}>{groupe?.nom || `Groupe #${aff.groupe_id}`}</span>
                              <span style={{ color: P.muted, fontSize: 12, fontFamily: "'DM Sans'" }}>· {groupe?.etudiants?.length || 0} membre(s)</span>
                            </div>
                            <span style={{ background: st.bg, color: st.color, fontSize: 11, fontFamily: "'DM Sans'", fontWeight: 600, padding: '4px 12px', borderRadius: 20 }}>
                              {st.label}
                            </span>
                          </div>

                          <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>
                              {/* Projet affecté */}
                              <div>
                                <p style={{ margin: '0 0 8px', color: P.muted, fontSize: 11, fontFamily: "'DM Sans'", textTransform: 'uppercase', letterSpacing: 1 }}>Projet affecté</p>
                                <div style={{ background: projet ? P.light : P.errorBg, borderRadius: 8, padding: '10px 14px', borderLeft: `3px solid ${projet ? P.accent : P.error}` }}>
                                  <div style={{ color: P.text, fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans'" }}>{projet?.titre || 'Aucun projet'}</div>
                                </div>
                              </div>

                              {/* Encadrant */}
                              <div>
                                <p style={{ margin: '0 0 8px', color: P.muted, fontSize: 11, fontFamily: "'DM Sans'", textTransform: 'uppercase', letterSpacing: 1 }}>Encadrant</p>
                                <div style={{ color: P.text, fontSize: 13, fontFamily: "'DM Sans'" }}>
                                  {projet ? (getEncadrant(projet.encadrant_id)?.nom || '—') : '—'}
                                </div>
                              </div>

                              {/* Choix correspondant */}
                              <div>
                                <p style={{ margin: '0 0 8px', color: P.muted, fontSize: 11, fontFamily: "'DM Sans'", textTransform: 'uppercase', letterSpacing: 1 }}>Rang du choix obtenu</p>
                                {(() => {
                                  const rank = lesChoix.findIndex(c => c.projet_id === aff.projet_id)
                                  if (rank === -1) return <span style={{ color: P.warning, fontSize: 13, fontFamily: "'DM Sans'" }}>⚠️ Hors préférences</span>
                                  const colors = ['#7C3AED', '#A78BFA', '#C4B5FD']
                                  return (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: colors[rank], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>{rank + 1}</div>
                                      <span style={{ color: P.text, fontSize: 13, fontFamily: "'DM Sans'" }}>{rank === 0 ? '1er choix ✓' : rank === 1 ? '2ème choix' : '3ème choix'}</span>
                                    </div>
                                  )
                                })()}
                              </div>
                            </div>

                            {/* Modifier panel */}
                            {estModifie && (
                              <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '16px 20px', marginBottom: 16, border: `1px solid ${P.border}` }}>
                                <p style={{ margin: '0 0 10px', color: P.text, fontSize: 13, fontFamily: "'DM Sans'", fontWeight: 500 }}>Choisir un nouveau projet :</p>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <select
                                    className="field-input"
                                    value={newProjetId}
                                    onChange={e => setNewProjetId(Number(e.target.value))}
                                    style={{ flex: 1, padding: '10px 14px', borderRadius: 8, fontSize: 13, border: `1.5px solid ${P.border}`, color: P.text, background: '#fff' }}
                                  >
                                    <option value="">Sélectionner un projet...</option>
                                    {projets.map(p => (
                                      <option key={p.id} value={p.id}>{p.titre}</option>
                                    ))}
                                  </select>
                                  <button className="action-btn" onClick={() => handleModifier(aff.id)} style={{ background: P.mid, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500 }}>
                                    Confirmer
                                  </button>
                                  <button className="action-btn" onClick={() => { setModifId(null); setNewProjetId('') }} style={{ background: '#F3F4F6', color: P.muted, border: 'none', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                                    Annuler
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 10 }}>
                              {aff.valide !== 'validé' && (
                                <button className="action-btn" onClick={() => handleValider(aff.id)} style={{
                                  background: P.success, color: '#fff', border: 'none',
                                  borderRadius: 8, padding: '9px 20px', fontSize: 13, fontWeight: 500,
                                }}>
                                  ✓ Valider
                                </button>
                              )}
                              <button className="action-btn" onClick={() => { setModifId(estModifie ? null : aff.id); setNewProjetId('') }} style={{
                                background: estModifie ? '#F3F4F6' : P.light,
                                color: estModifie ? P.muted : P.mid,
                                border: `1px solid ${P.border}`, borderRadius: 8,
                                padding: '9px 20px', fontSize: 13, fontWeight: 500,
                              }}>
                                {estModifie ? '✕ Annuler' : '✎ Modifier'}
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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