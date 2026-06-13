import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjets, getAffectations, getGroupes } from '../../services/api'

const CHARGE_MAX_ENCADRANT = 5
const STATUTS_FINAUX = ['validé', 'modifié']

function EncadrantDashboard() {
  const navigate = useNavigate()
  const [nbProjets, setNbProjets] = useState(0)
  const [nbValides, setNbValides] = useState(0)
  const [nbAttente, setNbAttente] = useState(0)
  const [nomEncadrant, setNomEncadrant] = useState('')
  const [mesProjets, setMesProjets] = useState<any[]>([])
  const [groupes, setGroupes] = useState<any[]>([])
  const [resultatsFinaux, setResultatsFinaux] = useState<any[]>([])
  const chargePct = Math.min(100, Math.round((nbProjets / CHARGE_MAX_ENCADRANT) * 100))
  const chargeMaxAtteinte = nbProjets >= CHARGE_MAX_ENCADRANT

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.nom) setNomEncadrant(user.nom)

    Promise.all([getProjets(), getAffectations(), getGroupes()]).then(([projRes, affRes, groupesRes]) => {
      const mesProjets = projRes.data.filter((p: any) => p.encadrant_id === user.encadrant_id)
      setMesProjets(mesProjets)
      setGroupes(groupesRes.data)
      setNbProjets(mesProjets.length)

      const mesProjetsIds = mesProjets.map((p: any) => p.id)
      const mesAffectations = affRes.data.filter((a: any) => mesProjetsIds.includes(a.projet_id))
      setResultatsFinaux(mesAffectations.filter((a: any) => STATUTS_FINAUX.includes(a.valide)))

      setNbValides(mesAffectations.filter((a: any) => STATUTS_FINAUX.includes(a.valide)).length)
      setNbAttente(mesAffectations.filter((a: any) => a.valide === 'en_attente').length)
    })
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Navbar */}
      <nav className="bg-[#071B33] text-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#0891B2] p-2 rounded-lg text-xl">👨‍🏫</div>
          <div>
            <p className="font-bold text-lg">PFA Affectation</p>
            <p className="text-cyan-100 text-xs">INPT · Plateforme de gestion de projets</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-[#0891B2] px-4 py-2 rounded-full">
          <div className="bg-[#06B6D4] rounded-full w-8 h-8 flex items-center justify-center font-bold">
            {nomEncadrant.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm">{nomEncadrant || 'Encadrant'}</span>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#071B33] to-[#0E7490] text-white px-8 py-12">
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest">
          Tableau de bord
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">Bienvenue, {nomEncadrant} !</h1>
        <p className="text-cyan-100 max-w-lg">
          Proposez vos sujets de projets, consultez les affectations et validez les résultats du moteur IA.
        </p>

        {/* Stats */}
        <div className="flex gap-10 mt-8">
          <div>
            <p className="text-2xl font-bold">{nbProjets}</p>
            <p className="text-cyan-100 text-sm">Projets proposés</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{nbValides}</p>
            <p className="text-cyan-100 text-sm">Affectations validées</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{nbAttente}</p>
            <p className="text-cyan-100 text-sm">En attente</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{nbProjets}/{CHARGE_MAX_ENCADRANT}</p>
            <p className="text-cyan-100 text-sm">Charge encadrant</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 py-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Que souhaitez-vous faire ?</h2>
        <p className="text-gray-500 mb-6 text-sm">Suivez les étapes dans l'ordre pour gérer les projets.</p>

        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 mb-6">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Charge d'encadrement</h3>
              <p className="text-gray-500 text-sm">
                La charge correspond au nombre de projets proposés par l'encadrant.
              </p>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full font-semibold ${chargeMaxAtteinte ? 'bg-red-50 text-red-700' : 'bg-cyan-50 text-cyan-800'}`}>
              {chargeMaxAtteinte ? 'Charge maximale atteinte' : 'Charge disponible'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{nbProjets} projet(s) proposé(s)</span>
            <span>Capacité maximale : {CHARGE_MAX_ENCADRANT}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={chargeMaxAtteinte ? 'h-full bg-red-500 rounded-full' : 'h-full bg-[#0891B2] rounded-full'}
              style={{ width: `${chargePct}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Projets proposés</h3>
              <p className="text-gray-500 text-sm">
                Liste des sujets déposés par cet encadrant.
              </p>
            </div>
            <span className="bg-cyan-50 text-cyan-800 text-xs px-3 py-1 rounded-full font-semibold">
              {mesProjets.length} projet(s)
            </span>
          </div>

          {mesProjets.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <p className="font-semibold text-slate-700">Aucun projet proposé pour le moment.</p>
              <p className="text-sm text-slate-500 mt-1">
                Les nouveaux sujets apparaîtront ici après leur création.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mesProjets.map((projet: any) => (
                <div key={projet.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-bold text-slate-900">{projet.titre}</h4>
                    <span className="shrink-0 bg-white text-cyan-800 border border-cyan-100 text-xs px-2 py-1 rounded-full font-semibold">
                      {projet.domaine || 'Projet'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                    {projet.description || 'Aucune description renseignée.'}
                  </p>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      Compétences requises
                    </p>
                    <p className="text-sm text-slate-700">
                      {projet.competences_requises || 'Non précisées'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow p-6 border border-gray-100 mb-6">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Résultats finaux validés</h3>
              <p className="text-gray-500 text-sm">
                Affectations confirmées après validation ou réaffectation par l'encadrant.
              </p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-semibold">
              {resultatsFinaux.length} résultat(s)
            </span>
          </div>

          {resultatsFinaux.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
              <p className="font-semibold text-slate-700">Aucun résultat final pour le moment.</p>
              <p className="text-sm text-slate-500 mt-1">
                Les résultats apparaîtront ici après validation des affectations.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                  <tr>
                    <th className="text-left px-4 py-3">Groupe</th>
                    <th className="text-left px-4 py-3">Projet affecté</th>
                    <th className="text-left px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {resultatsFinaux.map((aff: any) => {
                    const projet = mesProjets.find((p: any) => p.id === aff.projet_id)
                    const groupe = groupes.find((g: any) => g.id === aff.groupe_id)
                    return (
                      <tr key={aff.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold text-slate-900">{groupe?.nom || `Groupe #${aff.groupe_id}`}</td>
                        <td className="px-4 py-3 text-slate-700">{projet?.titre || `Projet #${aff.projet_id}`}</td>
                        <td className="px-4 py-3">
                          <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold">
                            {aff.valide === 'modifié' ? 'Réaffectée' : 'Validée'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-cyan-50 p-3 rounded-xl text-2xl">📋</div>
              <span className="bg-cyan-50 text-cyan-800 text-xs px-2 py-1 rounded-full font-medium">Étape 1</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Proposer un projet</h3>
            <p className="text-gray-500 text-sm mb-4">
              Soumettez un sujet avec titre, description et compétences requises.
            </p>
            <button
              onClick={() => navigate('/encadrant/proposer-projet')}
              className="w-full bg-[#0891B2] text-white py-2 rounded-xl hover:bg-[#0B2A45] transition-all font-medium"
            >
              Proposer un projet →
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-cyan-50 p-3 rounded-xl text-2xl">✅</div>
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">Étape 2</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Valider les affectations</h3>
            <p className="text-gray-500 text-sm mb-4">
              Consultez les résultats du moteur IA et validez ou modifiez les affectations.
            </p>
            <button
              onClick={() => navigate('/encadrant/valider')}
              className="w-full bg-[#0891B2] text-white py-2 rounded-xl hover:bg-[#0B2A45] transition-all font-medium"
            >
              Voir les affectations →
            </button>
          </div>

        </div>

        <button
          onClick={() => {
            localStorage.removeItem('user')
            localStorage.removeItem('access_token')
            navigate('/')
          }}
          className="mt-8 text-gray-400 hover:text-red-500 text-sm"
        >
          → Se déconnecter
        </button>
      </div>
    </div>
  )
}

export default EncadrantDashboard
