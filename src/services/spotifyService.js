import axios from 'axios'

const SPOTIFY_BASE = 'https://api.spotify.com/v1'
const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

let cachedToken = null
let tokenExpiry = 0

async function getAccessToken() {
  // Si hay token válido en cache, úsalo
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  // Obtener nuevo token
  const credentials = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)
  const response = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  )

  cachedToken = response.data.access_token
  tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000 // 1 min de margen
  return cachedToken
}

export async function searchAlbums(q) {
  const token = await getAccessToken()
  const res = await axios.get(`${SPOTIFY_BASE}/search`, {
    params: { q, type: 'album', limit: 20 },
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.albums.items
}

export async function getAlbumById(id) {
  const token = await getAccessToken()
  const res = await axios.get(`${SPOTIFY_BASE}/albums/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data
}
