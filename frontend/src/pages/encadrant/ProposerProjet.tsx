import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { creerProjet, getEncadrants } from '../../services/api'

function ProposerProjet() {
  const navigate = useNavigate()
  const [encadrants, setEncadrants] = useState<any[]>([])
  const [form, setForm] = useState({
    titre: '',
    description: '',
    competences_requises: '',
    encadrant_id: ''
  })
  const [message, setMessage] = useState('')
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    getEncadrants().then(res => setEncadrants(res.data))
  }, [])

  const handleSubmit = async () => {
    if (!form.titre || !form.description || !form.competences_requises || !form.encadrant_id) {
      setErreur('Veuillez remplir tous les champs.')
      return
    }
    try {
      await creerProjet({ ...form, encadrant_id: parseInt(form.encadrant_id) })
      setMessage('Projet proposé avec succès ✅')
      setErreur('')
      setForm({ titre: '', description: '', competences_requises: '', encadrant_id: '' })
    } catch {
      setErreur('Erreur lors de la création du projet.')
    }
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
          Étape 1
        </span>
        <h1 className="text-3xl font-bold mt-4 mb-2">Proposer un projet</h1>
        <p className="text-purple-200">Soumettez un sujet avec ses détails et compétences requises.</p>
      </div>

      {/* Formulaire */}
      <div className="max-w-2xl mx-auto px-8 py-10">
        <div className="bg-white rounded-2xl shadow p-8 border border-gray-100">

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

          {/* Encadrant */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Encadrant</label>
            <select
              value={form.encadrant_id}
              onChange={e => setForm({ ...form, encadrant_id: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Sélectionnez un encadrant</option>
              {encadrants.map((enc: any) => (
                <option key={enc.id} value={enc.id}>
                  {enc.prenom} {enc.nom}
                </option>
              ))}
            </select>
          </div>

          {/* Titre */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Titre du projet</label>
            <input
              type="text"
              placeholder="Ex: Application de gestion RH"
              value={form.titre}
              onChange={e => setForm({ ...form, titre: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
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
              className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-purple-700 text-white py-3 rounded-xl font-semibold hover:bg-purple-800 transition-all"
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