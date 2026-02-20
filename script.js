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
    // Récupère les favoris du téléphone
    let favorites = JSON.parse(localStorage.getItem('filmsall_favs')) || [];

    // --- A. CHARGEMENT & LOADER ---
    fetch('films.json')
        .then(res => res.json())
        .then(data => {
            allMovies = data;
            loadHero(data);
            displayCategories(data);
            
            // CACHER LE LOADER QUAND TOUT EST PRÊT
            setTimeout(() => {
                document.getElementById('loader').style.display = 'none';
            }, 800);
        })
        .catch(err => {
            console.error(err);
            document.getElementById('loader').innerHTML = "<p>Erreur de connexion...</p>";
        });

    // --- B. INTERFACE ---
    const navbar = document.getElementById('navbar');
    window.onscroll = () => { 
        if(window.scrollY > 50) navbar.classList.add('scrolled'); 
        else navbar.classList.remove('scrolled'); 
    };
    document.getElementById('hamburger').addEventListener('click', () => { 
        document.getElementById('nav-links').classList.toggle('active'); 
    });

    // --- C. RECHERCHE ---
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
            
            const results = allMovies.filter(m => 
                m.titre.toLowerCase().includes(val) || 
                m.origine.toLowerCase().includes(val)
            );
            const row = document.getElementById('search-results');
            if(results.length === 0) row.innerHTML = "<p style='padding:20px; color:gray'>Aucun résultat.</p>";
            results.forEach(movie => row.appendChild(createCard(movie)));
        }
    };
    searchInput.addEventListener('input', performSearch);
    searchBtn.addEventListener('click', performSearch);

    // --- D. CATÉGORIES ---
    function displayCategories(movies) {
        const container = document.getElementById('main-container');
        container.innerHTML = "";
        
        const categories = [...new Set(movies.map(m => m.categorie))];
        const origins = [...new Set(movies.map(m => m.origine))];

        categories.forEach(cat => createSection(cat, movies.filter(m => m.categorie === cat), container));
        origins.forEach(orig => {
            if(orig !== "Monde") createSection(`Films - ${orig}`, movies.filter(m => m.origine === orig), container);
        });
    }

    function createSection(title, movies, container) {
        if(movies.length === 0) return;
        const section = document.createElement('div');
        section.className = 'category-section';
        section.innerHTML = `<h3 class="category-title">${title}</h3><div class="movie-row"></div>`;
        const row = section.querySelector('.movie-row');
        movies.forEach(movie => row.appendChild(createCard(movie)));
        container.appendChild(section);
    }

    // --- E. CRÉATION CARTE (AVEC CŒUR & ANTI-CASSE) ---
    function createCard(movie) {
        const div = document.createElement('div');
        div.className = 'movie-card';
        
        // Vérifie si le film est en favori
        const isFav = favorites.includes(movie.id);
        const heartClass = isFav ? "fas fa-heart active" : "far fa-heart";
        
        div.innerHTML = `
            <i class="heart-icon ${heartClass}" onclick="toggleFav(event, ${movie.id}, this)"></i>
            <img src="${movie.image}" loading="lazy" alt="${movie.titre}" onerror="this.src='logo/filmsall.png'">
        `;
        div.onclick = (e) => {
            if(!e.target.classList.contains('heart-icon')) openModal(movie);
        };
        return div;
    }

    // --- F. GESTION DES FAVORIS ---
    window.toggleFav = function(e, id, icon) {
        e.stopPropagation(); // Ne pas ouvrir le film
        if (favorites.includes(id)) {
            // Retirer
            favorites = favorites.filter(favId => favId !== id);
            icon.className = "heart-icon far fa-heart";
        } else {
            // Ajouter
            favorites.push(id);
            icon.className = "heart-icon fas fa-heart active";
            // Petite animation
            icon.style.transform = "scale(1.4)";
            setTimeout(()=> icon.style.transform = "scale(1)", 200);
        }
        localStorage.setItem('filmsall_favs', JSON.stringify(favorites));
    };

    // --- G. MODAL, DRIVE & WHATSAPP ---
    const modal = document.getElementById('video-modal');
    const videoWrapper = document.getElementById('video-wrapper');
    const modalCover = document.getElementById('modal-cover');
    const modalInfo = document.getElementById('modal-info');

    function openModal(movie) {
        modal.style.display = 'flex';
        document.getElementById('modal-title').innerText = movie.titre;
        document.getElementById('modal-desc').innerText = movie.description;
        document.getElementById('modal-year').innerText = movie.annee || "2024";
        document.getElementById('modal-origin').innerText = movie.origine;
        document.getElementById('modal-cat').innerText = movie.categorie;

        // Cœur dans le modal
        const favBtn = document.getElementById('modal-fav-btn');
        favBtn.className = favorites.includes(movie.id) ? "fas fa-heart" : "far fa-heart";
        favBtn.onclick = (e) => toggleFav(e, movie.id, favBtn);

        modalCover.style.display = 'block';
        modalCover.style.backgroundImage = `url('${movie.banner || movie.image}')`;
        modalInfo.style.display = 'block';
        videoWrapper.style.display = 'none';
        videoWrapper.innerHTML = "";

        // LECTURE
        const startVideo = () => {
            if (!movie.driveId) { alert(`⚠️ Bientôt disponible !`); return; }
            modalCover.style.display = 'none';
            modalInfo.style.display = 'none';
            videoWrapper.style.display = 'block';
            videoWrapper.innerHTML = `<iframe src="https://drive.google.com/file/d/${movie.driveId}/preview" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>`;
        };
        document.getElementById('modal-play').onclick = startVideo;
        document.getElementById('center-play-btn').onclick = startVideo;

        // TÉLÉCHARGEMENT
        const dlBtn = document.getElementById('modal-download');
        if (!movie.driveId) {
            dlBtn.removeAttribute('href'); dlBtn.style.opacity = "0.5"; dlBtn.innerHTML = '<i class="fas fa-clock"></i> Bientôt';
        } else {
            dlBtn.href = `https://drive.google.com/uc?export=download&id=${movie.driveId}`;
            dlBtn.style.opacity = "1"; dlBtn.innerHTML = '<i class="fas fa-download"></i> TÉLÉCHARGER';
        }

        // WHATSAPP (NOUVEAU !)
        const existingWa = document.getElementById('wa-btn');
        if(existingWa) existingWa.remove();
        
        const waBtn = document.createElement('a');
        waBtn.id = 'wa-btn';
        waBtn.className = 'btn-whatsapp';
        waBtn.innerHTML = '<i class="fab fa-whatsapp"></i> PARTAGER';
        waBtn.href = `https://wa.me/?text=Regarde *${encodeURIComponent(movie.titre)}* sur FILMSall ! C'est gratuit ici : ${window.location.href}`;
        document.querySelector('.modal-actions').appendChild(waBtn);
    }

    // --- H. FERMETURE & HERO ---
    function closeModal() { modal.style.display = 'none'; videoWrapper.innerHTML = ""; }
    document.querySelector('.close-modal').onclick = closeModal;
    window.onclick = (e) => { if(e.target == modal) closeModal(); };

    function loadHero(movies) {
        if(movies.length > 0) {
            const random = movies[Math.floor(Math.random() * movies.length)];
            document.getElementById('hero-section').style.backgroundImage = `url('${random.banner || random.image}')`;
            document.getElementById('hero-title').innerText = random.titre;
            document.getElementById('hero-desc').innerText = random.description;
            document.getElementById('hero-play').onclick = () => { openModal(random); if(random.driveId) setTimeout(() => document.getElementById('modal-play').click(), 300); };
            document.getElementById('hero-info').onclick = () => openModal(random);
        }
    }

    // --- I. INSTALLATION PWA ---
    let deferredPrompt;
    const installBanner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');
    const closeInstallBtn = document.getElementById('close-install');

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); deferredPrompt = e; installBanner.style.display = 'flex';
    });

    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') { deferredPrompt = null; installBanner.style.display = 'none'; }
        }
    });
    closeInstallBtn.addEventListener('click', () => { installBanner.style.display = 'none'; });
});