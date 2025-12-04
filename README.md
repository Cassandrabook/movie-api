# Filmapp med OMDb

## En enkel filmapp som hämtar data från OMDb API.

- Visar 30 populära filmer på startsidan (hårdkodade IMDb-ID:n)
- Sök efter filmer via titel
- Filtrera resultat på genre, regissör och år
- Klicka på en film för att se detaljer (beskrivning, info och betyg)


## API-nyckel (måste skapas lokalt)

Appen använder OMDb API, vilket kräver en egen API-nyckel. Av säkerhetsskäl finns ingen nyckel i detta repo.

1. Skapa en API-nyckel

Gå till: https://www.omdbapi.com/apikey.aspx

Registrera dig och hämta din gratis nyckel.

2. Skapa filen js/config.js

I projektets mapp, lägg till en fil med följande innehåll:

window.OMDB_API_KEY = "DIN_OMDB_API_NYCKEL_HÄR";

Notera: config.js är exkluderad via .gitignore och ska inte läggas upp i repot.

3. Kör projektet

Öppna index.html i webbläsaren eller via en lokal server.
