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
export const supprimerGroupe  = (id: number) => API.delete(`/groupes/${id}`)

// ── ETUDIANTS ────────────────────────────────────
export const getEtudiants     = ()          => API.get('/etudiants/')

// ── ENCADRANTS ───────────────────────────────────
export const creerEncadrant   = (data: any) => API.post('/encadrants/', data)
export const getEncadrants    = ()          => API.get('/encadrants/')

// ── PROJETS ──────────────────────────────────────
export const creerProjet      = (data: any) => API.post('/projets/', data)
export const getProjets       = ()          => API.get('/projets/')

// ── CHOIX ────────────────────────────────────────
export const creerChoix       = (data: any) => API.post('/choix/', data)
export const getChoix         = ()          => API.get('/choix/')
export const getMesChoix      = (userId: number) => API.get(`/mes-choix/${userId}`)

// ── AFFECTATIONS ─────────────────────────────────
export const lancerAffectation   = ()                              => API.post('/affecter/')
export const getAffectations     = ()                              => API.get('/affectations/')
export const getMonAffectation   = (userId: number)                => API.get(`/mon-affectation/${userId}`)
export const validerAffectation  = (id: number)                    => API.put(`/affectations/${id}/valider`)
export const modifierAffectation = (id: number, nouveau_projet_id: number) =>
  API.put(`/affectations/${id}/modifier?nouveau_projet_id=${nouveau_projet_id}`)

// ── AUTH ─────────────────────────────────────────
export const registerUser     = (data: any) => API.post('/register', data)
export const loginUser        = (data: any) => API.post('/login', data)
export const getUserByEmail   = (email: string) => API.get(`/user-by-email?email=${encodeURIComponent(email)}`)
export const lierGroupe       = (userId: number, groupeId: number) =>
  API.put(`/users/${userId}/lier-groupe/${groupeId}`)
