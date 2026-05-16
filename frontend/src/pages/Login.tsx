import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState('')

  const handleLogin = () => {
    if (role === 'etudiant') navigate('/etudiant')
    else if (role === 'encadrant') navigate('/encadrant')
    else if (role === 'coordinateur') navigate('/coordinateur')
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-md w-full max-w-md">
        
        {/* Titre */}
        <h1 className="text-2xl font-bold text-center text-blue-700 mb-2">
          Affectation des Projets
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Choisissez votre rôle pour continuer
        </p>

        {/* Sélection du rôle */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setRole('etudiant')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              role === 'etudiant'
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            🎓 Étudiant (Représentant du groupe)
          </button>

          <button
            onClick={() => setRole('encadrant')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              role === 'encadrant'
                ? 'border-green-500 bg-green-50 text-green-700 font-semibold'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            👨‍🏫 Encadrant
          </button>

          <button
            onClick={() => setRole('coordinateur')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              role === 'coordinateur'
                ? 'border-purple-500 bg-purple-50 text-purple-700 font-semibold'
                : 'border-gray-200 hover:border-purple-300'
            }`}
          >
            🗂️ Coordinateur
          </button>
        </div>

        {/* Bouton continuer */}
        <button
          onClick={handleLogin}
          disabled={!role}
          className="mt-6 w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Continuer →
        </button>

      </div>
    </div>
  )
}

export default Login