// Hämta API-nyckeln från config.js (window.OMDB_API_KEY sätts där)
const API_KEY = window.OMDB_API_KEY || "";

// Fallback-bild om poster saknas eller inte kan laddas
const FALLBACK_POSTER = "img/image_not_available1.94c0c57d.png";

// Fast lista med populära filmer (IMDb IDs) som används på startsidan
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
  "tt0082971"
];

// DOM-element
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

// Tillstånd
let allMovies = [];
let filteredMovies = [];

// -------- API-hjälp --------

async function fetchMovieById(id) {
  const url = `https://www.omdbapi.com/?apikey=${API_KEY}&i=${id}&plot=short`;
  const res = await fetch(url);
  return res.json();
}

// -------- Startsida: toppfilmer --------

async function loadTopMovies() {
  if (!API_KEY) {
    statusText.textContent = "Ingen API-nyckel satt. Lägg in din nyckel i config.js.";
    return;
  }

  statusText.textContent = "Laddar populära filmer...";
  movieGrid.innerHTML = "";
  allMovies = [];
  filteredMovies = [];

  try {
    const promises = TOP_MOVIE_IDS.map(id => fetchMovieById(id));
    const results = await Promise.all(promises);

    allMovies = results.filter(m => m && m.Response !== "False");

    allMovies.sort((a, b) => {
      const ra = parseFloat(a.imdbRating || "0");
      const rb = parseFloat(b.imdbRating || "0");
      return rb - ra; // högst betyg först
    });

    statusText.textContent = `Visar ${allMovies.length} populära filmer.`;
    renderFilters();
    renderMovies();
  } catch (err) {
    console.error(err);
    statusText.textContent = "Ett fel uppstod när filmer skulle hämtas.";
  }
}

// -------- Sök --------

async function searchMovies() {
  const query = searchInput.value.trim();
  if (!query) {
    statusText.textContent = "Skriv något att söka på.";
    return;
  }

  if (!API_KEY) {
    statusText.textContent = "Ingen API-nyckel satt. Lägg in din nyckel i config.js.";
    return;
  }

  statusText.textContent = "Söker efter filmer...";
  movieGrid.innerHTML = "";
  allMovies = [];
  filteredMovies = [];

  try {
    // Hämta bara sida 1 (max 10 träffar) för att spara API-anrop
    const url = `https://www.omdbapi.com/?apikey=${API_KEY}&s=${encodeURIComponent(
      query
    )}&page=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.Response === "False") {
      statusText.textContent = data.Error || "Inga filmer hittades.";
      return;
    }

    // Hämta detaljer för varje träff
    const detailPromises = data.Search.map(item => fetchMovieById(item.imdbID));
    const detailed = await Promise.all(detailPromises);

    allMovies = detailed.filter(m => m && m.Response !== "False");

    allMovies.sort((a, b) => {
      const ra = parseFloat(a.imdbRating || "0");
      const rb = parseFloat(b.imdbRating || "0");
      return rb - ra;
    });

    statusText.textContent = `Visar ${allMovies.length} träffar för "${query}".`;
    renderFilters();
    renderMovies();
  } catch (err) {
    console.error(err);
    statusText.textContent = "Ett tekniskt fel uppstod vid sökning.";
  }
}

// -------- Rendering av filmer & filter --------

function renderMovies() {
  movieGrid.innerHTML = "";

  const g = genreFilter.value;
  const d = directorFilter.value;
  const y = yearFilter.value;

  // Filtrera resultatet baserat på valda filter
  filteredMovies = allMovies.filter(movie => {
    if (g && (!movie.Genre || !movie.Genre.includes(g))) return false;
    if (d && movie.Director !== d) return false;
    if (y && movie.Year !== y) return false;
    return true;
  });

  const totalMovies = filteredMovies.length;

  if (totalMovies === 0) {
    movieGrid.innerHTML = "<p>Inga filmer matchar sökning eller filter.</p>";
    return;
  }

  // Visa alla filtrerade filmer (ingen pagination längre)
  filteredMovies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "movie-card";

    const img = document.createElement("img");
    img.src =
      movie.Poster && movie.Poster !== "N/A"
        ? movie.Poster
        : FALLBACK_POSTER;
    img.alt = movie.Title;
    img.onerror = () => {
      img.onerror = null;
      img.src = FALLBACK_POSTER;
    };

    const content = document.createElement("div");
    content.className = "movie-card-content";

    const titleEl = document.createElement("p");
    titleEl.className = "movie-title";
    titleEl.textContent = movie.Title;

    const metaEl = document.createElement("p");
    metaEl.className = "movie-meta";
    metaEl.textContent = `${movie.Year} • ${movie.Genre || "Okänd genre"}`;

    content.appendChild(titleEl);
    content.appendChild(metaEl);

    card.appendChild(img);
    card.appendChild(content);

    card.addEventListener("click", () => openModal(movie));

    movieGrid.appendChild(card);
  });
}

function renderFilters() {
  const genres = new Set();
  const directors = new Set();
  const years = new Set();

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

  genreFilter.innerHTML = '<option value="">Alla genrer</option>';
  Array.from(genres)
    .sort()
    .forEach(g => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      genreFilter.appendChild(opt);
    });

  directorFilter.innerHTML = '<option value="">Alla regissörer</option>';
  Array.from(directors)
    .sort()
    .forEach(d => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      directorFilter.appendChild(opt);
    });

  yearFilter.innerHTML = '<option value="">Alla år</option>';
  Array.from(years)
    .sort()
    .forEach(y => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      yearFilter.appendChild(opt);
    });
}

// -------- Modal --------

function openModal(movie) {
  modalTitle.textContent = `${movie.Title} (${movie.Year})`;

  modalPoster.src =
    movie.Poster && movie.Poster !== "N/A"
      ? movie.Poster
      : FALLBACK_POSTER;
  modalPoster.onerror = () => {
    modalPoster.onerror = null;
    modalPoster.src = FALLBACK_POSTER;
  };

  // Genre-tags
  modalTags.innerHTML = "";
  if (movie.Genre) {
    movie.Genre.split(",").forEach(g => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = g.trim();
      modalTags.appendChild(tag);
    });
  }

  // Beskrivning
  modalPlot.textContent =
    movie.Plot && movie.Plot !== "N/A"
      ? movie.Plot
      : "Ingen beskrivning tillgänglig.";

  // Info (regissör, skådisar osv)
  modalInfo.innerHTML = "";

  const infoItems = [
    { label: "Regissör", value: movie.Director || "Okänd" },
    { label: "Skådespelare", value: movie.Actors || "Okänt" },
    { label: "Land", value: movie.Country || "Okänt" },
    { label: "Språk", value: movie.Language || "Okänt" },
    { label: "Längd", value: movie.Runtime || "Okänd" }
  ];

  infoItems.forEach(item => {
    const p = document.createElement("p");
    p.innerHTML = `<strong>${item.label}:</strong> ${item.value}`;
    modalInfo.appendChild(p);
  });

  // Betyg – bara en enkel rad
  modalRatings.innerHTML = "";
  let rating = "Ingen rating tillgänglig";

  if (movie.imdbRating && movie.imdbRating !== "N/A") {
    rating = `${movie.imdbRating}/10`;
  }

  const h3 = document.createElement("h3");
  h3.textContent = `Betyg: ${rating}`;
  modalRatings.appendChild(h3);

  modalBackdrop.classList.add("active");
}

function closeModal() {
  modalBackdrop.classList.remove("active");
}

// -------- Event listeners --------

searchButton.addEventListener("click", searchMovies);
searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") searchMovies();
});

resetButton.addEventListener("click", () => {
  searchInput.value = "";
  loadTopMovies();
});

genreFilter.addEventListener("change", () => {
  renderMovies();
});
directorFilter.addEventListener("change", () => {
  renderMovies();
});
yearFilter.addEventListener("change", () => {
  renderMovies();
});

closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", e => {
  if (e.target === modalBackdrop) closeModal();
});

// -------- Init --------

window.addEventListener("load", loadTopMovies);
