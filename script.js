/* =========================================
   1. SERVICE WORKER (PWA INSTALLATION)
   ========================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker OK'))
            .catch(err => console.log('Erreur SW:', err));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    
    // --- VARIABLES GLOBALES ---
    let allData =[];

    // --- 2. CHARGEMENT INTELLIGENT ET NOTIFICATIONS ---
    const jsonFile = window.isMusicPage ? 'musique.json' : 'films.json';

    fetch(jsonFile + '?t=' + Date.now()) 
        .then(res => res.json())
        .then(data => {
            allData = data;
            
            // A. Filtrer l'affichage selon la page
            if (window.isGalleryPage) {
                displayGrid(data, 'gallery-container');
            } else if (window.isAnnoncesPage) {
                const annonces = data.filter(i => i.bientot === true || i.annee >= 2026);
                displayGrid(annonces, 'annonces-container');
            } else if (window.isMusicPage) {
                displayGrid(data, 'music-container');
            } else {
                const movies = data.filter(i => i.type !== 'musique' && i.bientot !== true);
                loadHeroAnimated(movies); 
                displayCategories(movies);
            }
            
            // B. Cacher le Loader
            const loader = document.getElementById('loader');
            if(loader) loader.style.display = 'none';

            // C. Système de Notifications Locales
            const dataType = window.isMusicPage ? 'musique' : 'films';
            const storageKey = `filmsall_last_count_${dataType}`;
            const previousCount = parseInt(localStorage.getItem(storageKey)) || data.length;

            if (data.length > previousCount) {
                const newItem = data[data.length - 1]; 
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Nouveauté sur FILMSall 🍿", {
                        body: `Nouveau : ${newItem.titre}`,
                        icon: "logo/filmsall.png"
                    });
                }
                showToastNotification(newItem);
            }
            localStorage.setItem(storageKey, data.length);

            // D. Redirection depuis la Galerie
            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');
            if (movieId) {
                const filmATrouver = allData.find(m => m.id == movieId);
                if (filmATrouver) {
                    openModal(filmATrouver);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        })
        .catch(err => console.error("Erreur de chargement JSON:", err));

    // --- 3. NAVBAR & MENU MOBILE ---
    const navbar = document.getElementById('navbar');
    if(navbar) {
        window.onscroll = () => { 
            if(window.scrollY > 50) navbar.classList.add('scrolled'); 
            else navbar.classList.remove('scrolled'); 
        };
    }
    const hamburger = document.getElementById('hamburger');
    if (hamburger) {
        hamburger.addEventListener('click', () => { 
            document.getElementById('nav-links').classList.toggle('active'); 
        });
    }

    // --- 4. MOTEUR DE RECHERCHE ---
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if(searchInput) {
        const performSearch = (e) => {
            const val = searchInput.value.toLowerCase();
            const activeMain = document.getElementById('main-container') || document.getElementById('gallery-container') || document.getElementById('music-container') || document.getElementById('annonces-container');
            if(!activeMain) return;

            if(val === "") {
                if(document.getElementById('hero-section')) document.getElementById('hero-section').style.display = 'flex';
                if(window.isGalleryPage || window.isMusicPage || window.isAnnoncesPage) displayGrid(allData, activeMain.id);
                else displayCategories(allData.filter(i => i.type !== 'musique' && i.bientot !== true));
            } else {
                if(document.getElementById('hero-section')) document.getElementById('hero-section').style.display = 'none';
                activeMain.innerHTML = `<h3 class="category-title" style="margin-left:4%;">Résultats de recherche</h3><div class="gallery-grid" id="search-results"></div>`;
                const results = allData.filter(m => m.titre.toLowerCase().includes(val));
                const row = document.getElementById('search-results');
                if(results.length === 0) row.innerHTML = "<p style='color:gray; padding-left:4%;'>Aucun résultat trouvé.</p>";
                results.forEach(item => row.appendChild(createCard(item, true)));
            }
        };
        searchInput.addEventListener('input', performSearch);
        if(searchBtn) searchBtn.addEventListener('click', performSearch);
    }

    // --- 5. FONCTIONS D'AFFICHAGE ---
    function displayCategories(list) {
        const container = document.getElementById('main-container');
        if(!container) return;
        container.innerHTML = "";
        const categories =[...new Set(list.map(m => m.categorie))];
        categories.forEach(cat => {
            const section = document.createElement('div');
            section.className = 'category-section';
            section.innerHTML = `<h3 class="category-title">${cat}</h3><div class="movie-row"></div>`;
            const row = section.querySelector('.movie-row');
            list.filter(m => m.categorie === cat).forEach(item => row.appendChild(createCard(item, false)));
            container.appendChild(section);
        });
    }

    function displayGrid(list, containerId) {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = "";
        list.sort(() => Math.random() - 0.5); 
        list.forEach(item => container.appendChild(createCard(item, true)));
    }

    // Création des cartes sur l'accueil et galerie (SANS likes ni vues)
    function createCard(item, isGrid) {
        const div = document.createElement('div');
        div.className = isGrid ? 'gallery-card' : 'movie-card';
        let badgeBientot = item.bientot ? `<div class="bientot-badge">2026</div>` : '';

        div.innerHTML = `
            ${badgeBientot}
            <img src="${item.image}" loading="lazy" alt="${item.titre}" onerror="this.src='logo/filmsall.png'" style="width:100%; height:100%;">
        `;
        
        div.onclick = (e) => { 
            if (window.isGalleryPage || window.isAnnoncesPage) {
                window.location.href = `index.html?id=${item.id}`;
            } else {
                openModal(item);
            }
        };
        return div;
    }

    // --- 6. MODAL LECTEUR (LE CERVEAU) ---
    const modal = document.getElementById('video-modal');
    
    function openModal(data) {
        if(!modal) return;
        modal.style.display = 'flex';
        
        document.getElementById('modal-title').innerText = data.titre;
        if(document.getElementById('modal-desc')) document.getElementById('modal-desc').innerText = data.description || "";
        if(document.getElementById('modal-year')) document.getElementById('modal-year').innerText = data.annee || "";
        if(document.getElementById('modal-cat')) document.getElementById('modal-cat').innerText = data.categorie || "";

        const modalCover = document.getElementById('modal-cover');
        const videoWrapper = document.getElementById('video-wrapper');
        const actionGrid = document.getElementById('action-grid') || document.getElementById('movie-actions');
        const seriesArea = document.getElementById('series-area');

        modalCover.style.display = 'block';
        modalCover.style.backgroundImage = `url('${data.banner || data.image}')`;
        videoWrapper.style.display = 'none';
        videoWrapper.innerHTML = "";

        if(actionGrid) actionGrid.innerHTML = "";

        // FONCTION LECTURE & MODE CINÉMA
        const playMedia = () => {
            if (!data.driveId) { alert("⚠️ Ce contenu sera bientôt disponible sur FILMSall !"); return; }
            
            document.body.classList.add('cinema-mode'); 
            modalCover.style.display = 'none';
            videoWrapper.style.display = 'block';
            
            videoWrapper.innerHTML = `
                <div class="video-overlay-fix"></div> 
                <iframe src="https://drive.google.com/file/d/${data.driveId}/preview" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>
            `;
            document.querySelector('.modal-content').scrollTop = 0; 
        };

        if(document.getElementById('center-play-btn')) {
            document.getElementById('center-play-btn').onclick = playMedia;
            document.getElementById('center-play-btn').style.display = 'block';
        }

        // GESTION DES SÉRIES
        if (data.type === 'serie' && seriesArea) {
            if(actionGrid) actionGrid.style.display = 'none';
            seriesArea.style.display = 'block';
            if(document.getElementById('center-play-btn')) document.getElementById('center-play-btn').style.display = 'none';
            
            const seasonSelect = document.getElementById('season-select');
            const episodesList = document.getElementById('episodes-list');
            seasonSelect.innerHTML = "";
            
            if (data.saisons) {
                data.saisons.forEach((s, idx) => seasonSelect.innerHTML += `<option value="${idx}">${s.nom}</option>`);
                const renderEp = (idx) => {
                    episodesList.innerHTML = "";
                    data.saisons[idx].episodes.forEach(ep => {
                        episodesList.innerHTML += `
                            <div class="episode-item" onclick="launchEp('${ep.driveId}')">
                                <div class="episode-title"><i class="fas fa-play-circle"></i> ${ep.titre}</div>
                                <a href="${ep.driveId ? `https://drive.google.com/uc?export=download&id=${ep.driveId}` : '#'}" class="episode-download" target="_blank" onclick="event.stopPropagation()"><i class="fas fa-download"></i></a>
                            </div>`;
                    });
                };
                renderEp(0);
                seasonSelect.onchange = (e) => renderEp(e.target.value);
                window.launchEp = (id) => { 
                    if(id && id !== 'undefined' && id !== "") { data.driveId = id; playMedia(); } 
                    else alert("Épisode bientôt disponible !"); 
                };
            }
        } 
        // GESTION FILMS ET MUSIQUE
        else if (actionGrid) {
            if(seriesArea) seriesArea.style.display = 'none';
            actionGrid.style.display = 'grid';
            actionGrid.className = 'action-grid';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'btn-action play';
            playBtn.innerHTML = '<i class="fas fa-play"></i> LECTURE';
            playBtn.onclick = playMedia;
            actionGrid.appendChild(playBtn);

            if (data.downloads) {
                if(data.downloads.video) actionGrid.innerHTML += `<a href="${data.downloads.video}" class="btn-action" target="_blank"><i class="fas fa-video"></i> MP4</a>`;
                if(data.downloads.audio) actionGrid.innerHTML += `<a href="${data.downloads.audio}" class="btn-action" target="_blank"><i class="fas fa-music"></i> MP3</a>`;
            } else {
                const dlBtn = document.createElement('a');
                dlBtn.className = 'btn-action';
                if(data.driveId) dlBtn.href = `https://drive.google.com/uc?export=download&id=${data.driveId}`;
                else { dlBtn.href = '#'; dlBtn.onclick = (e)=>{e.preventDefault(); alert("Bientôt disponible au téléchargement !");} }
                dlBtn.target = "_blank";
                dlBtn.innerHTML = '<i class="fas fa-download"></i> TÉLÉCHARGER';
                actionGrid.appendChild(dlBtn);
            }

            actionGrid.innerHTML += `<a href="https://wa.me/?text=Regarde *${encodeURIComponent(data.titre)}* sur FILMSall ! C'est gratuit ici : ${window.location.href.split('?')[0]}" class="btn-action whatsapp" target="_blank"><i class="fab fa-whatsapp"></i> PARTAGER</a>`;
        }

        // ========================================================
        // G. ALGORITHME DE RECOMMANDATIONS (TAILLE 100% ET FIXE)
        // ========================================================
        let recArea = document.getElementById('recommendations-area');
        if (recArea) recArea.remove(); 

        recArea = document.createElement('div');
        recArea.id = 'recommendations-area';
        recArea.style.marginTop = "30px";
        recArea.style.borderTop = "1px solid #1f2937";
        recArea.style.paddingTop = "20px";
        recArea.innerHTML = `<h3 style="font-size: 16px; margin-bottom: 15px; color: white; border-left: 3px solid #E50914; padding-left: 8px;">Vous aimerez aussi</h3><div id="rec-grid" class="rec-grid"></div>`;
        
        document.getElementById('modal-info').appendChild(recArea);
        const recGrid = document.getElementById('rec-grid');
        
        let mixedContent = allData.filter(item => item.id !== data.id);
        mixedContent.sort(() => Math.random() - 0.5);
        let suggestions = mixedContent.slice(0, 15); 

        suggestions.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'rec-card';
            
            let langue = rec.langue || "V.F.";
            let note = rec.note ? rec.note : (Math.random() * (9.5 - 6.0) + 6.0).toFixed(1);

            // L'image a width=100% et height=100% grâce au wrapper en CSS
            card.innerHTML = `
                <div class="rec-img-wrapper">
                    <div class="rec-lang">${langue}</div>
                    <img src="${rec.image}" alt="${rec.titre}" onerror="this.src='logo/filmsall.png'" width="100%" height="100%">
                    <i class="fas fa-download rec-dl"></i>
                    <span class="rec-rating">${note}</span>
                </div>
                <h4>${rec.titre}</h4>
            `;
            
            card.onclick = () => {
                document.querySelector('.modal-content').scrollTop = 0; 
                openModal(rec); 
            };
            recGrid.appendChild(card);
        });
    }

    // --- 7. FERMETURE DU MODAL ---
    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) closeBtn.onclick = () => { 
        modal.style.display = 'none'; 
        if(videoWrapper) videoWrapper.innerHTML = ""; 
        document.body.classList.remove('cinema-mode'); 
    };
    window.onclick = (e) => { 
        if(e.target == modal) { 
            modal.style.display = 'none'; 
            if(videoWrapper) videoWrapper.innerHTML = ""; 
            document.body.classList.remove('cinema-mode'); 
        } 
    };

    // --- 8. HERO SECTION (DIAPORAMA ANIMÉ) ---
    function loadHeroAnimated(movies) {
        const heroSection = document.getElementById('hero-section');
        const heroTitle = document.getElementById('hero-title');
        const heroDesc = document.getElementById('hero-desc');
        const heroPlay = document.getElementById('hero-play');

        if(movies.length > 0 && heroSection) {
            let featuredMovies = movies.filter(m => m.bientot);
            if(featuredMovies.length === 0) featuredMovies = movies; 
            
            featuredMovies.sort(() => Math.random() - 0.5);
            let currentIndex = 0;

            function changeSlide() {
                const currentMovie = featuredMovies[currentIndex];
                heroSection.style.backgroundImage = `url('${currentMovie.banner || currentMovie.image}')`;
                heroTitle.innerText = currentMovie.titre;
                if(heroDesc) heroDesc.innerText = currentMovie.description || "";
                heroPlay.onclick = () => {
                    openModal(currentMovie);
                    if(currentMovie.driveId) setTimeout(() => document.getElementById('center-play-btn').click(), 300);
                };
                currentIndex = (currentIndex + 1) % featuredMovies.length;
            }

            changeSlide();
            setInterval(changeSlide, 5000); 
        }
    }

    // --- 9. NOTIFICATIONS (TOAST) ---
    function showToastNotification(item) {
        let oldToast = document.getElementById('app-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'toast-notification';
        let typeText = item.type === 'musique' ? 'Nouveau Son' : (item.type === 'serie' ? 'Nouvelle Série' : 'Nouveau Film');

        toast.innerHTML = `
            <img src="${item.image}" onerror="this.src='logo/filmsall.png'">
            <div class="toast-text">
                <span class="toast-tag">${typeText}</span>
                <span class="toast-title">${item.titre}</span>
            </div>
            <i class="fas fa-chevron-right" style="margin-left:auto; color:rgba(255,255,255,0.5);"></i>
        `;
        toast.onclick = () => { toast.classList.remove('show'); openModal(item); };
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 1500);
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 600); }, 7000);
    }

    document.body.addEventListener('click', () => {
        if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
    }, { once: true });

    // --- 10. BANDEAU INSTALLATION PWA ---
    let deferredPrompt;
    const installBanner = document.getElementById('install-banner');
    if(installBanner) {
        window.addEventListener('beforeinstallprompt', (e) => { 
            e.preventDefault(); 
            deferredPrompt = e; 
            installBanner.style.display = 'flex'; 
        });
        document.getElementById('install-btn').onclick = async () => {
            if (deferredPrompt) { 
                deferredPrompt.prompt(); 
                const { outcome } = await deferredPrompt.userChoice; 
                if (outcome === 'accepted') installBanner.style.display = 'none'; 
            }
        };
        document.getElementById('close-install').onclick = () => installBanner.style.display = 'none';
        window.addEventListener('appinstalled', () => installBanner.style.display = 'none');
    }
});