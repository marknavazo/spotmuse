# SpotMuse

SpotMuse es una aplicación creada con React + Firebase + Material UI. Permite buscar álbumes usando la API de Spotify, guardar álbumes en tu colección, recibir recomendaciones de amigos y aceptarlas para incorporarlas a tu lista. Incluye login social con Google y almacenamiento en Firestore.

## Características

- React (Vite)
- Material UI para estilos
- Firebase Auth (Google) + Firestore
- Tests con Vitest
- GitHub Actions para deploy a Firebase
- Copilot agents (plantillas) para generar código/documentación
- Mis álbumes / Álbumes recomendados (aceptar recomendaciones)
- Compartir álbumes con amigos

## Quickstart

1. Clona el repositorio.
2. Copia `.env.example` a `.env` y rellena las variables.
3. `npm install`
4. `npm run dev`

## Deploy

1. Instala Firebase CLI: `npm i -g firebase-tools`
2. `firebase login`
3. `firebase use --add` (elige el proyecto)
4. `npm run build`
5. `npm run deploy`

## Notas

- No subas tus credenciales a Git.
- Usa `VITE_SPOTIFY_TOKEN` o implementa el flujo OAuth de Spotify para tokens de usuario.
