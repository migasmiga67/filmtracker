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

## Dostęp do TMDB na Vercel

Ustaw `VITE_TMBD_TOKEN` (API Read Access Token) lub `VITE_TMBD_KEY` (API Key) w zmiennych projektu Vercel dla odpowiedniego środowiska i wykonaj Redeploy. Wystarczy jedna z nich. Nazwy `VITE_TMBD_TOKEN` i `VITE_TMBD_KEY` mają pierwszeństwo. Wielkość liter ma znaczenie — używaj dokładnie tych nazw. Dla zgodności obsługiwane są też `TMBD_TOKEN` / `TMBD_KEY`, następnie `VITE_TMDB_TOKEN` / `VITE_TMDB_KEY`, a następnie `TMB_TOKEN` / `TMB_KEY`. Token ma pierwszeństwo przed kluczem API. Wszystkie te wartości trafiają do kodu przeglądarki i nie są sekretami serwera. Inne zmienne środowiska serwera nie są przez tę konfigurację udostępniane frontendowi.

## Funkcje

- **Start:** losowanie z listy „Do obejrzenia” (bez powtarzania poprzedniego wyboru, jeśli są inne tytuły), rozpoczęte seriale z postępem i następnym nieoznaczonym odcinkiem.
- **Biblioteka:** wyszukiwanie po tytule, filtry rodzaju, statusu, gatunku, roku i kolekcji; sortowanie według daty dodania, oceny TMDB, roku lub tytułu.
- **Kolekcje:** tworzenie, zmiana nazwy, usuwanie i przypisywanie tytułów na stronie filmu/serialu. Jeden tytuł może należeć do wielu kolekcji. Usunięcie kolekcji nie usuwa biblioteki; usunięcie pozycji z biblioteki usuwa jej przypisania.
- **Odkrywaj:** popularne filmy/seriale, filmy aktualnie w kinach w Polsce, emitowane seriale i rekomendacje TMDB dla wybranego tytułu z biblioteki. Dostępna jest paginacja i ponawianie żądań.
- **Szczegóły tytułu:** dostępność w Polsce z podziałem na abonament, bezpłatny dostęp, reklamy, wypożyczenie i zakup (TMDB / JustWatch), niezależna obsługa błędów platform.
- **Statystyki:** obejrzane filmy, ukończone seriale, odcinki, szacowany czas oglądania i najczęściej oglądane gatunki. Czas seriali korzysta ze średniej długości odcinka; brakujące dane nie są zgadywane.

Starsze wpisy zachowują dotychczasowe dane. W Bibliotece przycisk **Uzupełnij dane** pobiera ich metadane TMDB. Nowo dodawane tytuły otrzymują je automatycznie, jeśli API jest dostępne. Postęp obejmuje znane odcinki regularnych sezonów; wskazanie następnego odcinka nie oznacza, że miał już premierę. Status „Obejrzane” liczy cały znany serial jako ukończony.

Funkcje biblioteki i kolekcji działają w trybie lokalnym i z MongoDB. Wyszukiwanie, odkrywanie, metadane i platformy wymagają dostępu do TMDB. Dane filmowe: TMDB; produkt nie jest zatwierdzony ani certyfikowany przez TMDB.

Po aktualizacji **najpierw wdróż backend na Render, następnie frontend na Vercel**, aby API kolekcji było dostępne. Nie potrzeba nowych zmiennych środowiskowych ani ręcznej migracji istniejących wpisów.

Testy logiki frontendu: `npm test`. Testy HTTP/MongoDB: `cd backend && npm test` (uruchomiona baza).
