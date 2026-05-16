import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProjets, getAffectations } from '../../services/api'

function EncadrantDashboard() {
  const navigate = useNavigate()
  const [nbProjets, setNbProjets] = useState(0)
  const [nbValides, setNbValides] = useState(0)
  const [nbAttente, setNbAttente] = useState(0)
  const [nomEncadrant, setNomEncadrant] = useState('')

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.nom) setNomEncadrant(user.nom)

    // Récupérer les projets de cet encadrant
    getProjets().then(res => {
      const mesProjets = res.data.filter((p: any) => p.encadrant_id === user.encadrant_id)
      setNbProjets(mesProjets.length)
    })

    // Récupérer les affectations
    getAffectations().then(res => {
      const valides = res.data.filter((a: any) => a.valide === 'validé').length
      const attente = res.data.filter((a: any) => a.valide === 'en_attente').length
      setNbValides(valides)
      setNbAttente(attente)
    })
  }, [])

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
          <div className="bg-purple-500 rounded-full w-8 h-8 flex items-center justify-center font-bold">
            {nomEncadrant.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm">{nomEncadrant || 'Encadrant'}</span>
        </div>
      </nav>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-600 text-white px-8 py-12">
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest">
          Tableau de bord
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">Bienvenue, {nomEncadrant} !</h1>
        <p className="text-purple-200 max-w-lg">
          Proposez vos sujets de projets, consultez les affectations et validez les résultats du moteur IA.
        </p>

        {/* Stats */}
        <div className="flex gap-10 mt-8">
          <div>
            <p className="text-2xl font-bold">{nbProjets}</p>
            <p className="text-purple-300 text-sm">Projets proposés</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{nbValides}</p>
            <p className="text-purple-300 text-sm">Affectations validées</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{nbAttente}</p>
            <p className="text-purple-300 text-sm">En attente</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-8 py-10 max-w-5xl mx-auto">
        <h2 className="text-xl font-bold text-gray-800 mb-1">Que souhaitez-vous faire ?</h2>
        <p className="text-gray-500 mb-6 text-sm">Suivez les étapes dans l'ordre pour gérer les projets.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-purple-100 p-3 rounded-xl text-2xl">📋</div>
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full font-medium">Étape 1</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Proposer un projet</h3>
            <p className="text-gray-500 text-sm mb-4">
              Soumettez un sujet avec titre, description et compétences requises.
            </p>
            <button
              onClick={() => navigate('/encadrant/proposer-projet')}
              className="w-full bg-purple-700 text-white py-2 rounded-xl hover:bg-purple-800 transition-all font-medium"
            >
              Proposer un projet →
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-purple-100 p-3 rounded-xl text-2xl">✅</div>
              <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full font-medium">Étape 2</span>
            </div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">Valider les affectations</h3>
            <p className="text-gray-500 text-sm mb-4">
              Consultez les résultats du moteur IA et validez ou modifiez les affectations.
            </p>
            <button
              onClick={() => navigate('/encadrant/valider')}
              className="w-full bg-purple-700 text-white py-2 rounded-xl hover:bg-purple-800 transition-all font-medium"
            >
              Voir les affectations →
            </button>
          </div>

        </div>

        <button
          onClick={() => {
            localStorage.removeItem('user')
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