// Simple events service using Ticketmaster Discovery API
// Requires env var VITE_TICKETMASTER_API_KEY

const API_KEY = import.meta.env.VITE_TICKETMASTER_API_KEY;
const BASE = 'https://app.ticketmaster.com/discovery/v2';

function mapEvent(e) {
  return {
    id: e.id,
    name: e.name,
    date: e.dates?.start?.dateTime || e.dates?.start?.localDate,
    url: e.url,
    city: e._embedded?.venues?.[0]?.city?.name || '',
    venue: e._embedded?.venues?.[0]?.name || '',
  };
}

export async function getArtistEvents(artistName) {
  if (!API_KEY) return [];
  const url = `${BASE}/events.json?apikey=${API_KEY}&keyword=${encodeURIComponent(artistName)}&classificationName=Music&size=20`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  const events = data?._embedded?.events || [];
  return events.map(mapEvent);
}
