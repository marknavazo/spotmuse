// Official Spotify logo SVG (public domain, from Wikimedia Commons)
// https://en.wikipedia.org/wiki/File:Spotify_icon.svg
export default function SpotifyIcon({ style = {}, ...props }) {
  return (
    <svg viewBox="0 0 1134 1134" width="1em" height="1em" style={style} {...props}>
      <circle cx="567" cy="567" r="567" fill="#1ED760" />
      <path
        d="M896 738c-10-15-30-19-45-9-124 76-281 93-467 42-17-5-35 5-40 22-5 17 5 35 22 40 200 56 372 37 510-48 15-10 19-30 9-45zm62-132c-13-20-40-26-60-13-142 87-358 112-527 51-21-7-44 4-51 25-7 21 4 44 25 51 188 65 426 38 588-56 20-13 26-40 13-60zm-6-138c-170-99-453-108-617-6-22 13-29 41-16 62 13 22 41 29 62 16 143-84 400-76 548 5 22 13 50 6 62-16 13-22 6-50-16-62z"
        fill="#fff"
      />
    </svg>
  );
}
