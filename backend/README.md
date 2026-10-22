# Klaps API

Node.js 22+ (sprawdzone na 24), Express 5 i MongoDB 8. API działa pod `/api` i jest zgodne z klientem w `src/api.js`.

## Lokalny start

```bash
cd backend
npm ci
docker compose up -d
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Wpisz wygenerowany losowy sekret w JWT_SECRET w .env.
npm run dev
```

Jeśli port 27017 jest już zajęty przez MongoDB, użyj istniejącej instancji i pomiń Docker Compose. `MONGODB_URI` może również wskazywać MongoDB Atlas. Nie zapisuj haseł ani `.env` w Git. Kontener udostępnia port wyłącznie na localhost; jego dane przechowuje wolumen `mongo_data`. `docker compose down` zachowuje dane, `down -v` je usuwa.

Sprawdzenie gotowości: `curl --fail http://127.0.0.1:3001/api/health`.

Frontend uruchom z głównego folderu repozytorium:

```bash
VITE_USE_MOCK=false VITE_API_URL=http://localhost:3001/api npm run dev
```

Można też ustawić te dwie zmienne w lokalnym `.env` frontendu. Po zmianie zmiennych zrestartuj Vite. Konta z localStorage nie są przenoszone — zarejestruj konto w backendzie. Dane filmów nadal pobierane są bezpośrednio z TMDB; token TMDB konfiguruje się osobno we frontendzie.

## Konfiguracja

- `MONGODB_URI`: wymagany adres MongoDB.
- `JWT_SECRET`: wymagany losowy sekret, minimum 32 znaki. Tokeny wygasają po 7 dniach. Zmiana sekretu unieważnia istniejące sesje.
- `PORT`: domyślnie 3001; `HOST`: domyślnie `0.0.0.0`.
- `CORS_ORIGINS`: dozwolone adresy frontendu oddzielone przecinkami, bez końcowego `/`. Domyślnie localhost i 127.0.0.1 na porcie 5173.

Produkcja: `npm ci --omit=dev` i `npm start`; użyj HTTPS przez reverse proxy, prywatnej/uwierzytelnionej MongoDB i trwałych sekretów z konfiguracji hostingu. Nie wystawiaj lokalnego Compose bez uwierzytelnienia do Internetu. Express domyślnie nie ufa nagłówkom proxy — przy wdrożeniu ustaw znane zaufane przeskoki w aplikacji, zamiast ufać dowolnym nagłówkom klienta. Limiter logowania/rejestracji ma wspólny limit 20 prób na 15 minut na IP, przechowywany w pamięci procesu; wiele instancji wymaga wspólnego magazynu limitera.

Wylogowanie w obecnym frontendzie usuwa token lokalnie. Backend nie oferuje zdalnego unieważniania pojedynczej sesji ani resetowania hasła. Biblioteka i opinie zwracane są bez paginacji, zgodnie z aktualnym kontraktem frontendu.

## Testy integracyjne

Uruchom MongoDB, następnie `npm test` w `backend`. Opcjonalnie ustaw `TEST_MONGODB_URI`. Każdy przebieg tworzy unikalną bazę `klaps_test_*` i usuwa tylko ją po zakończeniu; użytkownik testowy MongoDB musi mieć odpowiednie uprawnienia. Testy wykonują rzeczywiste żądania HTTP i operacje MongoDB: autoryzację, prywatność bibliotek, walidację, opinie, trwałość danych, CORS oraz limitowanie prób.

## API

Wszystkie poniższe ścieżki mają prefiks `/api`. Oprócz `GET /health`, `POST /auth/register`, `POST /auth/login` i preflight CORS wymagają `Authorization: Bearer <token>` — także `/auth/me`.

| Metoda | Ścieżka | Dane |
|---|---|---|
| POST | /auth/register | `{name,email,password}` → `{token,user}` |
| POST | /auth/login | `{email,password}` → `{token,user}` |
| GET | /auth/me | `{id,name,email}` |
| GET | /library | lista pozycji zalogowanego użytkownika |
| PUT | /library/:mediaType/:tmdbId | `{title,posterPath?,status,episodes?}` → zapisana pozycja |
| DELETE | /library/:mediaType/:tmdbId | `{ok:true}` |
| GET | /reviews/:mediaType/:tmdbId | `{average,count,mine,reviews}` |
| PUT | /reviews/:mediaType/:tmdbId | `{rating,text?}` → zapisana opinia |

`mediaType`: `movie` lub `tv`; `tmdbId`: dodatnia bezpieczna liczba całkowita. `status`: `watchlist`, `watching` (tylko seriale), `watched`. Odcinki serialu: np. `1x1`. Ocena: liczba całkowita 1–5. Nazwa: 1–80 znaków, hasło: co najmniej 6 znaków i najwyżej 72 bajty UTF-8, tekst opinii: maksymalnie 1000 znaków. Czas aktualizacji i właściciel pochodzą z serwera. Każda osoba ma jedną opinię na tytuł; ponowny PUT ją aktualizuje. Średnia uwzględnia też oceny bez tekstu; publiczna lista zawiera wyłącznie opinie z tekstem, bez e-maili i identyfikatorów użytkowników.

Błędy mają format `{message}` (przy walidacji również `errors`): 400 niepoprawne dane, 401 brak/wygasła sesja, 403 niedozwolone źródło, 404 brak trasy, 409 konflikt, 413 za duże żądanie, 429 limit prób, 500 błąd serwera. Health zwraca 503 po utracie połączenia z bazą.

## Kolekcje i metadane biblioteki

Pozycje biblioteki obsługują opcjonalne `year`, `genres` (nazwy), `tmdbRating` (0–10), `runtime`, `episodeRuntime` (minuty), `totalEpisodes`, `seasons: [{number,count}]` i `metadataVersion: 1`. Pole `createdAt` jest nadawane przez serwer i służy do sortowania według daty dodania. Starsze dokumenty działają bez tych pól. Oceny TMDB są danymi katalogowymi, odrębnymi od opinii użytkowników Klaps.

API kolekcji wymaga tokena i działa tylko na danych zalogowanej osoby:

| Metoda | Ścieżka (prefiks `/api`) | Działanie |
|---|---|---|
| GET | /collections | `[{id,name,items:[{mediaType,tmdbId}]}]` |
| POST | /collections | `{name}` → nowa kolekcja, status 201 |
| PUT | /collections/:id | `{name}` → zmiana nazwy |
| DELETE | /collections/:id | usunięcie kolekcji, biblioteka zostaje |
| PUT | /collections/:id/items/:mediaType/:tmdbId | przypisanie istniejącego tytułu z własnej biblioteki, bez duplikatów |
| DELETE | /collections/:id/items/:mediaType/:tmdbId | usunięcie przypisania |

Nazwa: 1–80 znaków. Obca lub nieistniejąca kolekcja zwraca 404. Usunięcie tytułu z biblioteki usuwa jego przypisania do kolekcji użytkownika.
