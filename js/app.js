// Hämtar min API-nyckel som jag lagt i config.js
// window.OMDB_API_KEY gör att nyckeln är tillgänglig globalt
const API_KEY = window.OMDB_API_KEY || "";
// Om den mot förmodan är undefined används en tom sträng för att undvika att koden kraschar

// Fallback-bild som används om en filmposter saknas eller om bilden inte går att ladda från OMDb
const FALLBACK_POSTER = "img/image_not_available1.94c0c57d.png";

// En hårdkodad lista med IMDb-ID för populära filmer
// Jag använder den här listan för att kunna visa “toppfilmer” på startsidan
// utan att behöva göra en sökning först
const TOP_MOVIE_IDS = [
  "tt0111161",
  "tt0068646",
  "tt0071562",
  "tt0468569",
  "tt0108052",
  "tt0050083",
  "tt0167260",
  "tt0110912",
  "tt0120737",
  "tt0137523",
  "tt0109830",
  "tt0080684",
  "tt1375666",
  "tt0167261",
  "tt0133093",
  "tt0099685",
  "tt0073486",
  "tt0816692",
  "tt0088763",
  "tt0102926",
  "tt0114369",
  "tt0118799",
  "tt0120815",
  "tt0120689",
  "tt0172495",
  "tt0060196",
  "tt0076759",
  "tt0103064",
  "tt0082971",
  "tt0114709"
];

// Sätter variabler och hämtar de HTML-element jag behöver jobba med i JavaScript
// genom deras id-attribut i html filen
const movieGrid = document.getElementById("movieGrid");
const statusText = document.getElementById("statusText");

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const resetButton = document.getElementById("resetButton");

const genreFilter = document.getElementById("genreFilter");
const directorFilter = document.getElementById("directorFilter");
const yearFilter = document.getElementById("yearFilter");

const modalBackdrop = document.getElementById("modalBackdrop");
const closeModalBtn = document.getElementById("closeModalBtn");
const modalTitle = document.getElementById("modalTitle");
const modalPoster = document.getElementById("modalPoster");
const modalTags = document.getElementById("modalTags");
const modalPlot = document.getElementById("modalPlot");
const modalInfo = document.getElementById("modalInfo");
const modalRatings = document.getElementById("modalRatings");

// Tillstånd/state variabler som håller nuvarande data i appen
let allMovies = []; // allMovies = alla filmer som finns i “resultatet” just nu (toppfilmer eller sökresultat)
let filteredMovies = []; // filteredMovies = samma filmer men efter att användaren har filtrerat på genre/regissör/år

// -------- API-hjälp --------
// Hjälpfunktion som hämtar detaljer om en film från OMDb baserat på IMDb-ID
// Jag använder async/await för att göra anropet asynkront så sidan inte låser sig
async function fetchMovieById(id) {
  const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${id}&plot=short`;
  const res = await fetch(url);
  return res.json(); // Omvandlar svaret till ett JavaScript-objekt
}

// -------- Startsida: toppfilmer --------
// Funktion som körs när sidan startar eller när användaren klickar på knappen "Visa toppfilmer igen"
// Den laddar in min hårkodade lista med toppfilmer och sorterar dem på betyg
async function loadTopMovies() {
  // Säkerhetskoll så att jag inte försöker anropa API:t utan att ha en nyckel
  if (!API_KEY) {
    statusText.textContent = "Ingen API-nyckel satt. Lägg in din nyckel i config.js.";
    return;
  }

  statusText.textContent = "Laddar populära filmer...";
  movieGrid.innerHTML = "";
  allMovies = [];
  filteredMovies = [];

  try {
    // För varje IMDb-ID i min lista skapar jag ett API-anrop
    const promises = TOP_MOVIE_IDS.map(id => fetchMovieById(id));
    // Promise.all väntar in alla anrop innan jag går vidare
    const results = await Promise.all(promises);

    // Filtrerar bort eventuella misslyckade svar
    allMovies = results.filter(m => m && m.Response !== "False");

    // Sorterar filmerna på imdbRating så att de med högst betyg hamnar först
    allMovies.sort((a, b) => {
      const ra = parseFloat(a.imdbRating || "0");
      const rb = parseFloat(b.imdbRating || "0");
      return rb - ra; // högst betyg först
    });

    // Text för att visa hur många toppfilmer som går att kolla på
    statusText.textContent = `Visar ${allMovies.length} populära filmer.`;

    // Bygger upp filtrens alternativ (genre, regissör, år) baserat på de hämtade filmerna
    renderFilters();
    // Skapar och lägger in alla filmkort i griden
    renderMovies();
  } catch (err) {
    // Om något går fel i hämtningen så skriver jag ut i konsolen
    // och visar ett felmeddelande för användaren
    console.error(err);
    statusText.textContent = "Ett fel uppstod när filmer skulle hämtas.";
  }
}

// -------- Sök --------
// Funktion som körs när användaren söker efter filmer baserat på sökordet och ersätter toppfilmerna
async function searchMovies() {
  const query = searchInput.value.trim();
  // Enkel validering: om sökfältet är tomt visar jag ett meddelande och avbryter
  if (!query) {
    statusText.textContent = "Skriv något att söka på.";
    return;
  }
  // Jag säkerställer att det finns en API-nyckel även när användaren söker
  // Utan nyckel ska jag inte försöka anropa OMDb, varken för startsidan eller vid sökning
  if (!API_KEY) {
    statusText.textContent = "Ingen API-nyckel satt. Lägg in din nyckel i config.js.";
    return;
  }

  statusText.textContent = "Söker efter filmer...";
  movieGrid.innerHTML = "";
  allMovies = [];
  filteredMovies = [];

  try {
    // Hämtar bara sida 1, max 10 träffar för att spara på API-anrop
    // encodeURIComponent används för att göra söksträngen säker i en URL
    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(
      query
    )}&page=1`;
    const res = await fetch(url);
    const data = await res.json();

    // Felmeddelande om OMDb svarar med ett fel
    if (data.Response === "False") {
      statusText.textContent = data.Error || "Inga filmer hittades.";
      return;
    }

    // Hämta detaljer för varje träff för att kunna visa genre, betyg, plot osv
    const detailPromises = data.Search.map(item => fetchMovieById(item.imdbID));
    const detailed = await Promise.all(detailPromises);

    // Filtrerar bort eventuella misslyckade svar
    allMovies = detailed.filter(m => m && m.Response !== "False");

    // Sorterar sökresultatet så att filmer med högst betyg kommer först
    allMovies.sort((a, b) => {
      const ra = parseFloat(a.imdbRating || "0");
      const rb = parseFloat(b.imdbRating || "0");
      return rb - ra;
    });

    // Visar hur många filmer som hittades för sökordet
    statusText.textContent = `Visar ${allMovies.length} träffar för "${query}".`;

    // Uppdaterar filter-menyerna utifrån sökresultatet
    renderFilters();

    // Skapar och lägger in filmkorten för sökresultatet
    renderMovies();
  } catch (err) {
    console.error(err);
    statusText.textContent = "Ett tekniskt fel uppstod vid sökning.";
  }
}

// -------- Rendering av filmer & filter --------
// Ansvarar för att visa filmerna i griden utifrån nuvarande data och valda filter
function renderMovies() {
  movieGrid.innerHTML = "";

  // Läser av de aktuella värdena i filter-menyerna och sätter variabler
  const genre = genreFilter.value;
  const director = directorFilter.value;
  const year = yearFilter.value;

  // Filtrerar filmerna på genre, regissör och år beroende på vad användaren valt i dropdown-menyerna
  filteredMovies = allMovies.filter(movie => {
    if (genre && (!movie.Genre || !movie.Genre.includes(genre))) return false;
    if (director && movie.Director !== director) return false;
    if (year && movie.Year !== year) return false;
    return true;
  });

  // totalMovies håller koll på hur många filmer som finns kvar efter filtrering
  const totalMovies = filteredMovies.length;

  // Om inga filmer matchar sökning + filter visar jag ett meddelande istället för ett filmkort
  if (totalMovies === 0) {
    movieGrid.innerHTML = "<p>Inga filmer matchar sökning eller filter.</p>";
    return;
  }

  // Loopar igenom alla filtrerade filmer och skapar ett kort för varje
  filteredMovies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";

    // Om OMDb saknar poster används min egen fallback-bild
    const img = document.createElement("img");
    img.src =
      movie.Poster && movie.Poster !== "N/A"
        ? movie.Poster
        : FALLBACK_POSTER;
    img.alt = movie.Title;
    // Om bildlänken är trasig byter jag till fallback-bilden
    img.onerror = () => {
      img.onerror = null;
      img.src = FALLBACK_POSTER;
    };

    // Skapar de HTML-element som utgör textdelen av filmkortet (titel + år + genre)
    // "content" är en container <div> som håller alla texter i kortet
    const content = document.createElement("div");
    content.className = "movie-card-content";

    // Skapar ett <p>-element för filmtiteln och lägger till en klass för styling
    const titleEl = document.createElement("p");
    titleEl.className = "movie-title";
    titleEl.textContent = movie.Title;

    // Skapar ett <p>-element som visar år + genre för filmen
    const metaEl = document.createElement("p");
    metaEl.className = "movie-meta";
    metaEl.textContent = `${movie.Year} • ${movie.Genre || "Okänd genre"}`;

    // Lägger in titel- och meta-elementen i content-diven
    content.appendChild(titleEl);
    content.appendChild(metaEl);

    // Lägger till både bilden och text-innehållet i själva filmkortet
    card.appendChild(img);
    card.appendChild(content);

    // När man klickar på kortet öppnas en modal med mer info om filmen
    // Här kopplar jag klickhändelsen på kortet till funktionen openModal
    // och skickar med den specifika filmen som argument
    card.addEventListener("click", () => openModal(movie));

    // Här lägger jag in det färdiga kortet (card) i själva griden (movieGrid),
    // alltså in i det element i HTML där alla filmkort ska visas
    movieGrid.appendChild(card);
  });
}

// Bygger upp alternativen i filter-menyerna genre, regissör och år
// genom att titta på alla filmer som finns i allMovies
function renderFilters() {
  // Set är en inbyggd typ i JavaScript som lagrar unika värden
  // Här använder jag Set för att samla genrer, regissörer och år utan dubbletter
  const genres = new Set();
  const directors = new Set();
  const years = new Set();

  // Går igenom alla filmer och samlar unika genrer, regissörer och år
  allMovies.forEach(movie => {
    if (movie.Genre) {
      movie.Genre.split(",").forEach(g => genres.add(g.trim()));
    }
    if (movie.Director && movie.Director !== "N/A") {
      directors.add(movie.Director.trim());
    }
    if (movie.Year) {
      years.add(movie.Year.trim());
    }
  });

  // Bygger upp genre-listan
  genreFilter.innerHTML = '<option value="">Alla genrer</option>';
  Array.from(genres)
    .sort()
    .forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      genreFilter.appendChild(opt);
    });

  // Bygger upp regissörs-listan
  directorFilter.innerHTML = '<option value="">Alla regissörer</option>';
  Array.from(directors)
    .sort()
    .forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      directorFilter.appendChild(opt);
    });

  // Bygger upp år-listan
  yearFilter.innerHTML = '<option value="">Alla år</option>';
  Array.from(years)
    .sort((a, b) => b - a)
    .forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearFilter.appendChild(opt);
    });
}

// -------- Modal --------
// Fyller modalen med data från den film som användaren klickat på
// och visar modalen som en pop-up över sidan
function openModal(movie) {
  modalTitle.textContent = `${movie.Title} (${movie.Year})`;

  // Poster-bild med fallback om det saknas eller blir fel
  modalPoster.src =
    movie.Poster && movie.Poster !== "N/A"
      ? movie.Poster
      : FALLBACK_POSTER;
  modalPoster.onerror = () => {
    modalPoster.onerror = null;
    modalPoster.src = FALLBACK_POSTER;
  };

  // Taggar för varje genre
  modalTags.innerHTML = "";
  if (movie.Genre) {
    movie.Genre.split(",").forEach(g => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = g.trim();
      modalTags.appendChild(tag);
    });
  }

  // Filmbeskrivning
  modalPlot.textContent =
    movie.Plot && movie.Plot !== "N/A"
      ? movie.Plot
      : "Ingen beskrivning tillgänglig.";

  // modalInfo är den del av modalen där jag visar extra information om filmen,
  // till exempel regissör, skådespelare, land, språk och längd
  // Här nollställer jag innehållet innan jag fyller på med ny info
  modalInfo.innerHTML = "";

  const infoItems = [
    { label: "Regissör", value: movie.Director || "Okänd" },
    { label: "Skådespelare", value: movie.Actors || "Okänt" },
    { label: "Land", value: movie.Country || "Okänt" },
    { label: "Språk", value: movie.Language || "Okänt" },
    { label: "Längd", value: movie.Runtime || "Okänd" }
  ];

  // Här går jag igenom infoItems-arrayen och skapar en <p>-rad för varje informationsrad
  // Varje rad får en label och ett värde, som sedan läggs in i modalInfo
  // så att användaren ser detaljerad info om filmen
  infoItems.forEach(item => {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
    modalInfo.appendChild(p);
  });

  // Visar ett enkelt samlat betyg istället för alla olika källor
  modalRatings.innerHTML = "";
  let rating = "Ingen rating tillgänglig";

  if (movie.imdbRating && movie.imdbRating !== "N/A") {
    rating = `${movie.imdbRating}/10`;
  }

  const h3 = document.createElement("h3");
  h3.textContent = `Betyg: ${rating}`;
  modalRatings.appendChild(h3);

  // Visar själva modalen genom att lägga till en CSS-klass på bakgrunden
  modalBackdrop.classList.add("active");
}

// Stänger modalen genom att ta bort CSS-klassen som gör den synlig
function closeModal() {
  modalBackdrop.classList.remove("active");
}

// -------- Event listeners --------
// När man klickar på sök-knappen körs searchMovies
searchButton.addEventListener("click", searchMovies);

// Gör så att man kan trycka Enter i sökfältet för att söka
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchMovies();
});

// Återställer sökningen genom att ta bort texten och ladda tillbaka toppfilmerna på startsidan
resetButton.addEventListener("click", () => {
  searchInput.value = "";
  loadTopMovies();
});

// När användaren ändrar ett filter uppdaterar jag listan med filmer
genreFilter.addEventListener("change", () => {
  renderMovies();
});
directorFilter.addEventListener("change", () => {
  renderMovies();
});
yearFilter.addEventListener("change", () => {
  renderMovies();
});

// Stäng-knapp i modalen
closeModalBtn.addEventListener("click", closeModal);
// Stänger modalen om man klickar på den mörka bakgrunden utanför modalen
modalBackdrop.addEventListener("click", e => {
  if (e.target === modalBackdrop) closeModal();
});

// -------- Init --------
// När sidan har laddats klart kör jag loadTopMovies()
// så att användaren direkt ser en lista med filmer på startsidan
window.addEventListener("load", loadTopMovies);
