import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAffectations, validerAffectation, getProjets, modifierAffectation } from '../../services/api'

function ValiderAffectations() {
  const navigate = useNavigate()
  const [affectations, setAffectations] = useState<any[]>([])
  const [projets, setProjets] = useState<any[]>([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    getAffectations().then(res => setAffectations(res.data))
    getProjets().then(res => setProjets(res.data))
  }, [])

  const handleValider = async (id: number) => {
    await validerAffectation(id)
    setMessage(`Affectation ${id} validée ✅`)
    getAffectations().then(res => setAffectations(res.data))
  }

  const handleModifier = async (id: number, nouveau_projet_id: number) => {
    await modifierAffectation(id, nouveau_projet_id)
    setMessage(`Affectation ${id} modifiée ✅`)
    getAffectations().then(res => setAffectations(res.data))
  }

  const getBadgeColor = (statut: string) => {
    if (statut === 'validé') return 'bg-green-100 text-green-700'
    if (statut === 'modifié') return 'bg-blue-100 text-blue-700'
    return 'bg-yellow-100 text-yellow-700'
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-purple-900 text-white px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-700 p-2 rounded-lg text-xl">👨‍🏫</div>
          <div>
            <p className="font-bold text-lg">PFA Affectation</p>
            <p className="text-purple-300 text-xs">INPT · Plateforme de gestion de projets</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-purple-700 px-4 py-2 rounded-full">
          <div className="bg-purple-500 rounded-full w-8 h-8 flex items-center justify-center font-bold">E</div>
          <span className="text-sm">Espace Encadrant</span>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-600 text-white px-8 py-10">
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest">
          Étape 2
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">Valider les affectations</h1>
        <p className="text-purple-200">Consultez, validez ou modifiez les résultats du moteur IA.</p>
      </div>

      {/* Contenu */}
      <div className="max-w-4xl mx-auto px-8 py-10">

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
            {message}
          </div>
        )}

        {affectations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400 border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-medium">Aucune affectation disponible pour le moment.</p>
            <p className="text-sm mt-1">Le coordinateur doit d'abord lancer le moteur IA.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {affectations.map((aff: any) => (
              <div key={aff.id} className="bg-white rounded-2xl shadow p-6 border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Affectation #{aff.id}</p>
                    <p className="font-semibold text-gray-800">Groupe ID : {aff.groupe_id}</p>
                    <p className="text-gray-500 text-sm">Projet ID : {aff.projet_id}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getBadgeColor(aff.valide)}`}>
                    {aff.valide}
                  </span>
                </div>

                {/* Modifier le projet */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Changer le projet affecté</label>
                  <select
                    onChange={e => handleModifier(aff.id, parseInt(e.target.value))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    defaultValue=""
                  >
                    <option value="" disabled>Sélectionner un nouveau projet...</option>
                    {projets.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.titre}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => handleValider(aff.id)}
                  disabled={aff.valide === 'validé'}
                  className="w-full bg-purple-700 text-white py-2 rounded-xl hover:bg-purple-800 transition-all font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {aff.valide === 'validé' ? '✅ Déjà validée' : 'Valider cette affectation'}
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => navigate('/encadrant')}
          className="mt-8 text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Retour au dashboard
        </button>
      </div>
    </div>
  )
}

export default ValiderAffectations