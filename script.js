/* =========================================
   1. SERVICE WORKER (PWA)
   ========================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW OK'))
            .catch(err => console.log('SW Fail:', err));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    
    let allMovies = [];
    let favorites = JSON.parse(localStorage.getItem('filmsall_favs')) || [];

    // --- CHARGEMENT ---
    fetch('films.json?t=' + Date.now())
        .then(res => res.json())
        .then(data => {
            allMovies = data;
            loadHero(data);
            displayCategories(data);
            setTimeout(() => document.getElementById('loader').style.display = 'none', 800);

            // === NOUVEAU : DÉTECTION REDIRECTION GALERIE ===
            // On regarde si l'adresse contient "?id=..."
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');

            if (movieId) {
                // On cherche le film qui a cet ID
                const filmATrouver = allMovies.find(m => m.id == movieId);
                if (filmATrouver) {
                    // On ouvre le modal directement !
                    openModal(filmATrouver);
                    // On nettoie l'URL pour que ça ne le refasse pas si on recharge
                    window.history.replaceState({}, document.title, "index.html");
                }
            }
            // ===============================================
        })
        .catch(err => {
            console.error(err);
            document.getElementById('loader').innerHTML = "<p>Erreur de connexion...</p>";
        });

    // Navbar
    const navbar = document.getElementById('navbar');
    window.onscroll = () => { if(window.scrollY > 50) navbar.classList.add('scrolled'); else navbar.classList.remove('scrolled'); };
    document.getElementById('hamburger').addEventListener('click', () => { document.getElementById('nav-links').classList.toggle('active'); });

    // Recherche
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const performSearch = () => {
        const val = searchInput.value.toLowerCase();
        const main = document.getElementById('main-container');
        if(val === "") {
            document.getElementById('hero-section').style.display = 'flex';
            displayCategories(allMovies);
        } else {
            document.getElementById('hero-section').style.display = 'none';
            main.innerHTML = `<div class="category-section"><h3 class="category-title">Résultats</h3><div class="movie-row" id="search-results" style="flex-wrap: wrap;"></div></div>`;
            const results = allMovies.filter(m => m.titre.toLowerCase().includes(val));
            const row = document.getElementById('search-results');
            if(results.length === 0) row.innerHTML = "<p style='padding:20px; color:gray'>Aucun résultat.</p>";
            results.forEach(movie => row.appendChild(createCard(movie)));
        }
    };
    searchInput.addEventListener('input', performSearch);
    searchBtn.addEventListener('click', performSearch);

    // Affichage Catégories
    function displayCategories(movies) {
        const container = document.getElementById('main-container');
        container.innerHTML = "";
        const categories = [...new Set(movies.map(m => m.categorie))];
        categories.forEach(cat => createSection(cat, movies.filter(m => m.categorie === cat), container));
    }

    function createSection(title, movies, container) {
        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<h3 class="category-title">${title}</h3><div class="movie-row"></div>`;
        const row = section.querySelector('.movie-row');
        movies.forEach(movie => row.appendChild(createCard(movie)));
        container.appendChild(section);
    }

    function createCard(movie) {
        const div = document.createElement('div');
        div.className = 'movie-card';
        const isFav = favorites.includes(movie.id);
        const heartClass = isFav ? "fas fa-heart active" : "far fa-heart";
        div.innerHTML = `
            <i class="heart-icon ${heartClass}" onclick="toggleFav(event, ${movie.id}, this)"></i>
            <img src="${movie.image}" loading="lazy" alt="${movie.titre}" onerror="this.src='logo/filmsall.png'">
        `;
        div.onclick = (e) => { if(!e.target.classList.contains('heart-icon')) openModal(movie); };
        return div;
    }

    // Gestion Favoris
    window.toggleFav = function(e, id, icon) {
        e.stopPropagation();
        if (favorites.includes(id)) {
            favorites = favorites.filter(favId => favId !== id);
            icon.className = "heart-icon far fa-heart";
        } else {
            favorites.push(id);
            icon.className = "heart-icon fas fa-heart active";
        }
        localStorage.setItem('filmsall_favs', JSON.stringify(favorites));
    };

    // --- MODAL ---
    const modal = document.getElementById('video-modal');
    const videoWrapper = document.getElementById('video-wrapper');
    const modalCover = document.getElementById('modal-cover');
    const modalInfo = document.getElementById('modal-info');
    const movieActions = document.getElementById('movie-actions'); 
    const seriesArea = document.getElementById('series-area');

    function openModal(data) {
        modal.style.display = 'flex';
        document.getElementById('modal-title').innerText = data.titre;
        document.getElementById('modal-desc').innerText = data.description;
        document.getElementById('modal-year').innerText = data.annee || "2024";
        document.getElementById('modal-origin').innerText = data.origine;
        document.getElementById('modal-cat').innerText = data.categorie;

        const favBtn = document.getElementById('modal-fav-btn');
        favBtn.className = favorites.includes(data.id) ? "fas fa-heart" : "far fa-heart";
        favBtn.onclick = (e) => toggleFav(e, data.id, favBtn);

        modalCover.style.display = 'block';
        modalCover.style.backgroundImage = `url('${data.banner || data.image}')`;
        modalInfo.style.display = 'block';
        videoWrapper.style.display = 'none';
        videoWrapper.innerHTML = "";

        // WhatsApp
        const existingWa = document.getElementById('wa-btn');
        if(existingWa) existingWa.remove();
        const waBtn = document.createElement('a');
        waBtn.id = 'wa-btn'; waBtn.className = 'btn-whatsapp';
        waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> PARTAGER';
        waBtn.href = `https://wa.me/?text=Regarde *${encodeURIComponent(data.titre)}* sur FILMSall ! ${window.location.href.split('?')[0]}`;
        modalInfo.appendChild(waBtn);

        if (data.type === 'serie') {
            movieActions.style.display = 'none';
            seriesArea.style.display = 'block';
            document.getElementById('center-play-btn').style.display = 'none';
            setupSeriesLogic(data);
        } else {
            movieActions.style.display = 'flex';
            seriesArea.style.display = 'none';
            document.getElementById('center-play-btn').style.display = 'block';
            setupMovieLogic(data);
        }
    }

    function setupMovieLogic(movie) {
        const playFilm = () => {
            if (!movie.driveId) { alert("Bientôt disponible !"); return; }
            launchPlayer(movie.driveId);
        };
        document.getElementById('modal-play').onclick = playFilm;
        document.getElementById('center-play-btn').onclick = playFilm;
        
        const dlBtn = document.getElementById('modal-download');
        if(movie.driveId) dlBtn.href = `https://drive.google.com/uc?export=download&id=${movie.driveId}`;
        else { dlBtn.removeAttribute('href'); dlBtn.onclick = (e) => {e.preventDefault(); alert("Bientôt !");} }
    }

    function setupSeriesLogic(serie) {
        const seasonSelect = document.getElementById('season-select');
        const episodesList = document.getElementById('episodes-list');
        seasonSelect.innerHTML = "";
        serie.saisons.forEach((saison, index) => {
            const option = document.createElement('option');
            option.value = index; option.innerText = saison.nom; seasonSelect.appendChild(option);
        });
        const renderEpisodes = (seasonIndex) => {
            episodesList.innerHTML = "";
            serie.saisons[seasonIndex].episodes.forEach(ep => {
                const item = document.createElement('div');
                item.className = 'episode-item';
                item.innerHTML = `<div class="episode-title"><i class="fas fa-play-circle"></i> ${ep.titre}</div><a href="https://drive.google.com/uc?export=download&id=${ep.driveId}" class="episode-download" target="_blank"><i class="fas fa-download"></i></a>`;
                item.onclick = () => { if(!ep.driveId) alert("Bientôt"); else launchPlayer(ep.driveId); };
                episodesList.appendChild(item);
            });
        };
        renderEpisodes(0);
        seasonSelect.onchange = (e) => renderEpisodes(e.target.value);
    }

    function launchPlayer(driveId) {
        modalCover.style.display = 'none'; modalInfo.style.display = 'none'; videoWrapper.style.display = 'block';
        videoWrapper.innerHTML = `<iframe src="https://drive.google.com/file/d/${driveId}/preview" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>`;
    }

    function closeModal() { modal.style.display = 'none'; videoWrapper.innerHTML = ""; }
    document.querySelector('.close-modal').onclick = closeModal;
    window.onclick = (e) => { if(e.target == modal) closeModal(); };

    function loadHero(movies) {
        if(movies.length > 0) {
            const random = movies[Math.floor(Math.random() * movies.length)];
            document.getElementById('hero-section').style.backgroundImage = `url('${random.banner || random.image}')`;
            document.getElementById('hero-title').innerText = random.titre;
            document.getElementById('hero-desc').innerText = random.description;
            document.getElementById('hero-play').onclick = () => openModal(random);
            document.getElementById('hero-info').onclick = () => openModal(random);
        }
    }

    // PWA Install
    let deferredPrompt;
    const installBanner = document.getElementById('install-banner');
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; installBanner.style.display = 'flex'; });
    document.getElementById('install-btn').addEventListener('click', async () => {
        if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') { deferredPrompt = null; installBanner.style.display = 'none'; } }
    });
    document.getElementById('close-install').addEventListener('click', () => { installBanner.style.display = 'none'; });
});