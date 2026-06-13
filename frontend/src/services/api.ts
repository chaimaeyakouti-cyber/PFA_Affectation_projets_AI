import axios from 'axios'

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000'
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

API.interceptors.response.use(
  response => response,
  error => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

// ── GROUPES ──────────────────────────────────────
export const creerGroupe      = (data: any) => API.post('/groupes/', data)
export const getGroupes       = ()          => API.get('/groupes/')
export const getMonGroupe     = (userId: number) => API.get(`/mon-groupe/${userId}`)

// Le backend attend user_id en query param : DELETE /groupes/{groupe_id}?user_id=...
export const supprimerGroupe  = (groupeId: number, userId: number) =>
  API.delete(`/groupes/${groupeId}`, { params: { user_id: userId } })

// ── ETUDIANTS ────────────────────────────────────
export const getEtudiants     = ()          => API.get('/etudiants/')

// ── ENCADRANTS ───────────────────────────────────
export const creerEncadrant   = (data: any) => API.post('/encadrants/', data)
export const getEncadrants    = ()          => API.get('/encadrants/')

// ── PROJETS ──────────────────────────────────────
export const creerProjet             = (data: any) => API.post('/projets/', data)
export const getProjets              = ()          => API.get('/projets/')
export const getProjetsAvecEncadrant = ()          => API.get('/projets-avec-encadrant/')

// ── CHOIX ────────────────────────────────────────
export const creerChoix       = (data: any) => API.post('/choix/', data)
export const getChoix         = ()          => API.get('/choix/')

// Pas d'endpoint /mes-choix/{userId} côté backend.
// On récupère le groupe de l'utilisateur, puis on filtre /choix/ par groupe_id.
export const getMesChoix = async (userId: number) => {
  const groupeRes = await API.get(`/mon-groupe/${userId}`)
  const groupeId  = groupeRes.data.id
  const choixRes  = await API.get('/choix/')
  return {
    ...choixRes,
    data: choixRes.data.filter((c: any) => c.groupe_id === groupeId),
  }
}

export const reaffecterGroupe = (affId: number, nouveauGroupeId: number) =>
  API.put(`/affectations/${affId}/reaffecter?nouveau_groupe_id=${nouveauGroupeId}`)

// Modifier un choix existant (tant que non verrouillé)
export const modifierChoix = (choixId: number, data: { projet_id: number; priorite: number }) =>
  API.put(`/choix/${choixId}`, data)

// Réinitialiser tous les choix d'un groupe
export const resetChoix = (groupeId: number) => API.delete(`/choix/groupe/${groupeId}`)

// ── AFFECTATIONS ─────────────────────────────────
// config optionnelle : poids_priorite, poids_adequation, poids_charge,
// interdire_double, respecter_capacite_max, ordre_soumission
export const lancerAffectation = (config?: {
  poids_priorite?: number
  poids_adequation?: number
  poids_charge?: number
  interdire_double?: boolean
  respecter_capacite_max?: boolean
  ordre_soumission?: boolean
}) => API.post('/affecter/', config ?? null)

export const getAffectations     = ()                              => API.get('/affectations/')
export const getMonAffectation   = (userId: number)                => API.get(`/mon-affectation/${userId}`)
export const validerAffectation  = (id: number)                    => API.put(`/affectations/${id}/valider`)
export const modifierAffectation = (id: number, nouveau_projet_id: number) =>
  API.put(`/affectations/${id}/modifier?nouveau_projet_id=${nouveau_projet_id}`)

// ── EXPORT ───────────────────────────────────────
export const exportJson = () => API.get('/admin/export?format=json')
export const exportCsv  = () => API.get('/admin/export?format=csv', { responseType: 'blob' })

// ── AUTH ─────────────────────────────────────────
export const registerUser   = (data: any) => API.post('/register', data)
export const loginUser      = (data: any) => API.post('/login', data)
export const getUserByEmail = (email: string) => API.get(`/user-by-email?email=${encodeURIComponent(email)}`)
export const lierGroupe      = (userId: number, groupeId: number) =>
  API.put(`/users/${userId}/lier-groupe/${groupeId}`)
