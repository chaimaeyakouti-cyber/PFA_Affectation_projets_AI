import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import EtudiantDashboard from './pages/etudiant/EtudiantDashboard'
import CreerGroupe from './pages/etudiant/CreerGroupe'
import Resultats from './pages/etudiant/Resultats'
import EncadrantDashboard from './pages/encadrant/EncadrantDashboard'
import ProposerProjet from './pages/encadrant/ProposerProjet'
import ValiderAffectations from './pages/encadrant/ValiderAffectations'
import CoordinateurDashboard from './pages/coordinateur/CoordinateurDashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/etudiant" element={<EtudiantDashboard />} />
        <Route path="/etudiant/creer-groupe" element={<CreerGroupe />} />
        <Route path="/etudiant/resultats" element={<Resultats />} />
        <Route path="/encadrant" element={<EncadrantDashboard />} />
        <Route path="/encadrant/proposer-projet" element={<ProposerProjet />} />
        <Route path="/encadrant/valider" element={<ValiderAffectations />} />
        <Route path="/coordinateur" element={<CoordinateurDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App