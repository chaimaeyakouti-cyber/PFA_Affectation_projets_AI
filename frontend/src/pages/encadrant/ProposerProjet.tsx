import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { creerProjet } from '../../services/api'

function ProposerProjet() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    titre: '',
    description: '',
    competences_requises: '',
  })
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')
  const [encadrantId, setEncadrantId] = useState<number | null>(null)
  const [nomEncadrant, setNomEncadrant] = useState('')

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    if (user?.encadrant_id) {
      setEncadrantId(user.encadrant_id)
      setNomEncadrant(user.nom)
    } else {
      setErreur('Compte encadrant non lié. Recréez votre compte.')
    }
  }, [])

  const handleSubmit = async () => {
    if (!form.titre || !form.description || !form.competences_requises) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    if (!encadrantId) {
      setErreur('Encadrant introuvable. Reconnectez-vous.')
      return
    }
    try {
      await creerProjet({ ...form, encadrant_id: encadrantId })
      setMessage('Projet proposé avec succès ✅')
      setErreur('')
      setForm({ titre: '', description: '', competences_requises: '' })
    } catch {
      setErreur('Erreur lors de la création du projet.')
    }
  }

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
          <div className="bg-[#06B6D4] rounded-full w-8 h-8 flex items-center justify-center font-bold">E</div>
          <span className="text-sm">{nomEncadrant || 'Encadrant'}</span>
        </div>
        <button
          onClick={() => { localStorage.removeItem('user'); localStorage.removeItem('access_token'); navigate('/') }}
          className="bg-white text-[#071B33] px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Déconnexion
        </button>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-r from-[#071B33] to-[#0E7490] text-white px-8 py-10">
        <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full uppercase tracking-widest">
          Étape 1
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">Proposer un projet</h1>
        <p className="text-cyan-100">Soumettez un sujet avec ses détails et compétences requises.</p>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="bg-white rounded-2xl shadow p-8 border border-gray-100">

          {/* Info encadrant */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-4 py-3 mb-6 text-cyan-800 text-sm">
            📋 Vous proposez ce projet en tant que <strong>{nomEncadrant}</strong>
          </div>

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6">
              {message}
            </div>
          )}
          {erreur && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
              {erreur}
            </div>
          )}

          {/* Titre */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Titre du projet</label>
            <input
              type="text"
              placeholder="Ex: Application de gestion RH"
              value={form.titre}
              onChange={e => setForm({ ...form, titre: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              placeholder="Décrivez le projet en quelques lignes..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 resize-none"
            />
          </div>

          {/* Compétences */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Compétences requises</label>
            <input
              type="text"
              placeholder="Ex: Python, React, SQL"
              value={form.competences_requises}
              onChange={e => setForm({ ...form, competences_requises: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-[#0891B2] text-white py-3 rounded-xl font-semibold hover:bg-[#0B2A45] transition-all"
          >
            Soumettre le projet →
          </button>
        </div>

        <button
          onClick={() => navigate('/encadrant')}
          className="mt-6 text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Retour au dashboard
        </button>
      </div>
    </div>
  )
}

export default ProposerProjet
