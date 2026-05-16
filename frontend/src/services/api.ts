import axios from 'axios'

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000'
})

// GROUPES
export const creerGroupe = (data: any) => API.post('/groupes/', data)
export const getGroupes = () => API.get('/groupes/')

// ENCADRANTS
export const creerEncadrant = (data: any) => API.post('/encadrants/', data)
export const getEncadrants = () => API.get('/encadrants/')

// PROJETS
export const creerProjet = (data: any) => API.post('/projets/', data)
export const getProjets = () => API.get('/projets/')

// CHOIX
export const creerChoix = (data: any) => API.post('/choix/', data)
export const getChoix = () => API.get('/choix/')

// AFFECTATION
export const lancerAffectation = () => API.post('/affecter/')
export const getAffectations = () => API.get('/affectations/')
export const validerAffectation = (id: number) => API.put(`/affectations/${id}/valider`)
export const modifierAffectation = (id: number, nouveau_projet_id: number) =>
  API.put(`/affectations/${id}/modifier?nouveau_projet_id=${nouveau_projet_id}`)