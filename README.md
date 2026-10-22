# Klaps – tracker filmów i seriali

## Uruchomienie
```bash
npm install
npm run dev
```
Domyślnie `VITE_USE_MOCK=true` w `.env`: konta, listy i opinie zapisują się w localStorage,
a filmy/seriale, plakaty, opisy i odcinki pochodzą z prawdziwego TMDB.
Backend Node.js + MongoDB jest w folderze [`backend`](backend/README.md). Aby go podłączyć, uruchom go zgodnie z instrukcją i ustaw `VITE_USE_MOCK=false` oraz `VITE_API_URL=http://localhost:3001/api`.

## Kontrakt API (Node.js + MongoDB)
Ścieżki mają prefiks `/api`. Wszystkie poza `POST /auth/register`, `POST /auth/login` i `GET /health` wymagają nagłówka `Authorization: Bearer <token>` (także `/auth/me`).
Błędy: status 4xx/5xx i JSON `{ "message": "..." }`.

| Metoda | Ścieżka | Body | Odpowiedź |
|---|---|---|---|
| POST | /auth/register | `{name,email,password}` | `{token, user:{id,name,email}}` |
| POST | /auth/login | `{email,password}` | `{token, user}` |
| GET | /auth/me | | `user` |
| GET | /library | | `[item]` |
| PUT | /library/:mediaType/:tmdbId | `item` (upsert) | `item` |
| DELETE | /library/:mediaType/:tmdbId | | `{ok:true}` |
| GET | /reviews/:mediaType/:tmdbId | | `{average, count, mine, reviews:[{userName,rating,text,updatedAt}]}` |
| PUT | /reviews/:mediaType/:tmdbId | `{rating(1-5), text}` | review |

`item`: `{ tmdbId:Number, mediaType:'movie'|'tv', title, posterPath, status:'watchlist'|'watching'|'watched', episodes:['1x1','1x2',...], updatedAt }`

`mine` to opinia zalogowanego użytkownika (lub `null`); `reviews` zawiera tylko opinie z tekstem, bez e-maili i id użytkowników.

## Uwaga o bezpieczeństwie
Zmienne `VITE_*` trafiają do kodu w przeglądarce, więc token TMDB jest publicznie widoczny.
Token jest tylko do odczytu, ale docelowo lepiej przepuszczać zapytania do TMDB przez własne API.
