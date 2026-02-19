/* =========================================
   1. ENREGISTREMENT PWA (SERVICE WORKER)
   ========================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker enregistré !Scope:', reg.scope))
            .catch(err => console.log('Erreur SW:', err));
    });
}

/* =========================================
   2. LOGIQUE PRINCIPALE DE L'APPLICATION
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
    
    let allMovies = []; // Stocke tous les films pour la recherche

    // --- A. CHARGEMENT DES DONNÉES ---
    fetch('films.json')
        .then(res => res.json())
        .then(data => {
            allMovies = data;
            loadHero(data);
            displayCategories(data);
        })
        .catch(err => console.error("Erreur chargement JSON:", err));

    // --- B. INTERFACE (Navbar & Menu) ---
    const navbar = document.getElementById('navbar');
    window.onscroll = () => { 
        if(window.scrollY > 50) navbar.classList.add('scrolled'); 
        else navbar.classList.remove('scrolled'); 
    };

    document.getElementById('hamburger').addEventListener('click', () => { 
        document.getElementById('nav-links').classList.toggle('active'); 
    });

    // --- C. MOTEUR DE RECHERCHE ---
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    const performSearch = () => {
        const val = searchInput.value.toLowerCase();
        const main = document.getElementById('main-container');
        
        if(val === "") {
            document.getElementById('hero-section').style.display = 'flex';
            displayCategories(allMovies); // Remettre l'accueil normal
        } else {
            document.getElementById('hero-section').style.display = 'none';
            main.innerHTML = `<div class="category-section"><h3 class="category-title">Résultats de recherche</h3><div class="movie-row" id="search-results" style="flex-wrap: wrap;"></div></div>`;
            
            const results = allMovies.filter(m => 
                m.titre.toLowerCase().includes(val) || 
                m.origine.toLowerCase().includes(val) ||
                m.categorie.toLowerCase().includes(val)
            );

            const row = document.getElementById('search-results');
            if(results.length === 0) row.innerHTML = "<p style='padding:20px; color:gray'>Aucun film trouvé...</p>";
            
            results.forEach(movie => {
                const card = document.createElement('div');
                card.className = 'movie-card';
                card.innerHTML = `<img src="${movie.image}" loading="lazy" alt="${movie.titre}">`;
                card.onclick = () => openModal(movie);
                row.appendChild(card);
            });
        }
    };

    searchInput.addEventListener('input', performSearch);
    searchBtn.addEventListener('click', performSearch);

    // --- D. AFFICHAGE PAR CATÉGORIES ---
    function displayCategories(movies) {
        const container = document.getElementById('main-container');
        container.innerHTML = "";
        
        const categories = [...new Set(movies.map(m => m.categorie))];
        const origins = [...new Set(movies.map(m => m.origine))];

        // Affichage par Genre
        categories.forEach(cat => createSection(cat, movies.filter(m => m.categorie === cat), container));
        
        // Affichage par Pays (sauf "Monde")
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
        
        movies.forEach(movie => {
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `<img src="${movie.image}" loading="lazy" alt="${movie.titre}">`;
            card.onclick = () => openModal(movie);
            row.appendChild(card);
        });
        container.appendChild(section);
    }

    // --- E. MODAL & LOGIQUE GOOGLE DRIVE ---
    const modal = document.getElementById('video-modal');
    const videoWrapper = document.getElementById('video-wrapper');
    const modalCover = document.getElementById('modal-cover');
    const modalInfo = document.getElementById('modal-info');

    function openModal(movie) {
        modal.style.display = 'flex';
        
        // Remplissage des infos
        document.getElementById('modal-title').innerText = movie.titre;
        document.getElementById('modal-desc').innerText = movie.description;
        document.getElementById('modal-year').innerText = movie.annee || "2024";
        document.getElementById('modal-origin').innerText = movie.origine;
        document.getElementById('modal-cat').innerText = movie.categorie;

        // Reset de l'interface (Image visible, Vidéo cachée)
        modalCover.style.display = 'block';
        modalCover.style.backgroundImage = `url('${movie.banner || movie.image}')`;
        modalInfo.style.display = 'block';
        videoWrapper.style.display = 'none';
        videoWrapper.innerHTML = ""; // On vide le lecteur précédent

        // --- GESTION DU BOUTON "REGARDER" ---
        const startVideo = () => {
            // Vérification : Si l'ID est vide, on affiche "Bientôt"
            if (!movie.driveId || movie.driveId === "") {
                alert(`⚠️ Le film "${movie.titre}" sera bientôt disponible sur FILMSall !`);
                return;
            }

            // Sinon, on lance la vidéo
            modalCover.style.display = 'none';
            modalInfo.style.display = 'none';
            videoWrapper.style.display = 'block';
            
            // Injection de l'iframe Google Drive (Preview Mode)
            videoWrapper.innerHTML = `
                <iframe src="https://drive.google.com/file/d/${movie.driveId}/preview" 
                allow="autoplay; fullscreen" 
                style="width:100%; height:100%; border:none;"></iframe>
            `;
        };

        // On attache l'action aux boutons Play
        document.getElementById('modal-play').onclick = startVideo;
        document.getElementById('center-play-btn').onclick = startVideo;

        // --- GESTION DU BOUTON "TÉLÉCHARGER" ---
        const dlBtn = document.getElementById('modal-download');
        
        if (!movie.driveId || movie.driveId === "") {
            // Si pas de film -> Bouton inactif
            dlBtn.removeAttribute('href');
            dlBtn.style.opacity = "0.5";
            dlBtn.innerHTML = '<i class="fas fa-clock"></i> Bientôt';
            dlBtn.onclick = (e) => { e.preventDefault(); alert("Bientôt disponible au téléchargement !"); };
        } else {
            // Si film dispo -> Vrai lien de téléchargement
            dlBtn.href = `https://drive.google.com/uc?export=download&id=${movie.driveId}`;
            dlBtn.style.opacity = "1";
            dlBtn.innerHTML = '<i class="fas fa-download"></i> TÉLÉCHARGER';
            dlBtn.onclick = null; // On retire le blocage
        }
    }

    // --- F. FERMETURE DU MODAL ---
    function closeModal() {
        modal.style.display = 'none';
        videoWrapper.innerHTML = ""; // Coupe le son et la vidéo immédiatement
    }
    document.querySelector('.close-modal').onclick = closeModal;
    window.onclick = (e) => { if(e.target == modal) closeModal(); };

    // --- G. HERO SECTION (Film Aléatoire) ---
    function loadHero(movies) {
        if(movies.length > 0) {
            const random = movies[Math.floor(Math.random() * movies.length)];
            document.getElementById('hero-section').style.backgroundImage = `url('${random.banner || random.image}')`;
            document.getElementById('hero-title').innerText = random.titre;
            document.getElementById('hero-desc').innerText = random.description;
            
            // Le bouton du Hero ouvre le modal puis lance la lecture
            document.getElementById('hero-play').onclick = () => { 
                openModal(random); 
                // Petit délai pour simuler le clic sur lecture si le film est dispo
                if(random.driveId) {
                    setTimeout(() => document.getElementById('modal-play').click(), 300);
                }
            };
            document.getElementById('hero-info').onclick = () => openModal(random);
        }
    }

    // --- H. GESTION DE L'INSTALLATION PWA (Bouton Bas de Page) ---
    let deferredPrompt;
    const installBanner = document.getElementById('install-banner');
    const installBtn = document.getElementById('install-btn');
    const closeInstallBtn = document.getElementById('close-install');

    // 1. Détecter si l'installation est possible (Chrome/Android/PC)
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBanner.style.display = 'flex'; // Afficher le bandeau
    });

    // 2. Quand on clique sur "INSTALLER"
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Résultat : ${outcome}`);
            
            if (outcome === 'accepted') {
                deferredPrompt = null;
                installBanner.style.display = 'none';
            }
        }
    });

    // 3. Quand on clique sur "X" (Fermer)
    closeInstallBtn.addEventListener('click', () => {
        installBanner.style.display = 'none';
    });

    // 4. Si l'app est déjà installée
    window.addEventListener('appinstalled', () => {
        installBanner.style.display = 'none';
        console.log('FILMSall est installé !');
    });
});