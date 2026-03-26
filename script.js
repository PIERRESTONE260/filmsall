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
    let favorites = JSON.parse(localStorage.getItem('filmsall_favs')) ||[];
    let likesData = JSON.parse(localStorage.getItem('filmsall_likes')) || {};

    // --- 2. CHARGEMENT INTELLIGENT DES DONNÉES ---
    const jsonFile = window.isMusicPage ? 'musique.json' : 'films.json';

    fetch(jsonFile + '?t=' + Date.now()) // Anti-cache pour avoir les nouveautés direct
        .then(res => res.json())
        .then(data => {
            allData = data;
            
            // A. Affichage selon la page
            if (window.isGalleryPage) {
                displayGrid(data, 'gallery-container');
            } else if (window.isMusicPage) {
                displayGrid(data, 'music-container');
            } else {
                const movies = data.filter(i => i.type !== 'musique');
                loadHero(movies);
                displayCategories(movies);
            }
            
            // B. Cacher le Loader
            const loader = document.getElementById('loader');
            if(loader) loader.style.display = 'none';

            // C. Détection : Redirection depuis la Galerie ?
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
        .catch(err => console.error("Erreur de chargement:", err));

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
            const mainContainer = document.getElementById('main-container');
            const galleryContainer = document.getElementById('gallery-container');
            const musicContainer = document.getElementById('music-container');
            
            const activeMain = mainContainer || galleryContainer || musicContainer;
            if(!activeMain) return;

            if(val === "") {
                if(document.getElementById('hero-section')) document.getElementById('hero-section').style.display = 'flex';
                if(window.isGalleryPage || window.isMusicPage) displayGrid(allData, activeMain.id);
                else displayCategories(allData.filter(i => i.type !== 'musique'));
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
        const categories = [...new Set(list.map(m => m.categorie))];
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
        list.sort(() => Math.random() - 0.5); // Mélanger la grille
        list.forEach(item => container.appendChild(createCard(item, true)));
    }

    function createCard(item, isGrid) {
        const div = document.createElement('div');
        div.className = isGrid ? 'gallery-card' : 'movie-card';
        
        // Calcul des Likes
        let isLiked = likesData[item.id] ? true : false;
        let baseLikes = item.likes || 0;
        let displayLikes = baseLikes + (isLiked ? 1 : 0);
        let heartClass = isLiked ? "fas fa-heart active" : "far fa-heart";

        div.innerHTML = `
            <div class="like-badge">
                <i class="${heartClass} heart-icon" onclick="toggleLike(event, ${item.id}, this)"></i>
                <span class="like-count">${displayLikes}</span>
            </div>
            <img src="${item.image}" loading="lazy" alt="${item.titre}" onerror="this.src='logo/filmsall.png'">
        `;
        
        div.onclick = (e) => { 
            // Si on ne clique pas sur le cœur, on ouvre le film
            if(!e.target.classList.contains('heart-icon')) {
                if (window.isGalleryPage) {
                    window.location.href = `index.html?id=${item.id}`;
                } else {
                    openModal(item);
                }
            }
        };
        return div;
    }

    // --- 6. GESTION DES LIKES ---
    window.toggleLike = function(e, id, icon) {
        e.stopPropagation();
        let countSpan = icon.nextElementSibling;
        let current = parseInt(countSpan.innerText);
        
        if (likesData[id]) {
            delete likesData[id];
            icon.className = "far fa-heart heart-icon";
            countSpan.innerText = current - 1;
        } else {
            likesData[id] = true;
            icon.className = "fas fa-heart heart-icon active";
            countSpan.innerText = current + 1;
        }
        localStorage.setItem('filmsall_likes', JSON.stringify(likesData));
    };

    // --- 7. MODAL LECTEUR (LE CERVEAU) ---
    const modal = document.getElementById('video-modal');
    
    function openModal(data) {
        if(!modal) return;
        modal.style.display = 'flex';
        
        // A. Remplissage des textes
        document.getElementById('modal-title').innerText = data.titre;
        if(document.getElementById('modal-desc')) document.getElementById('modal-desc').innerText = data.description || "";
        if(document.getElementById('modal-year')) document.getElementById('modal-year').innerText = data.annee || "";
        if(document.getElementById('modal-cat')) document.getElementById('modal-cat').innerText = data.categorie || "";

        // B. Reset de la vidéo et affichage de la couverture
        const modalCover = document.getElementById('modal-cover');
        const videoWrapper = document.getElementById('video-wrapper');
        const actionGrid = document.getElementById('action-grid') || document.getElementById('movie-actions');
        const seriesArea = document.getElementById('series-area');

        modalCover.style.display = 'block';
        modalCover.style.backgroundImage = `url('${data.banner || data.image}')`;
        videoWrapper.style.display = 'none';
        videoWrapper.innerHTML = "";

        if(actionGrid) actionGrid.innerHTML = "";

        // C. Fonction pour lancer la vidéo (Avec le carré noir anti-flèche Drive)
        const playMedia = () => {
            if (!data.driveId) { alert("⚠️ Ce contenu sera bientôt disponible sur FILMSall !"); return; }
            modalCover.style.display = 'none';
            videoWrapper.style.display = 'block';
            
            // Le div .video-overlay-fix sert à cacher la flèche Google Drive !
            videoWrapper.innerHTML = `
                <div class="video-overlay-fix"></div> 
                <iframe src="https://drive.google.com/file/d/${data.driveId}/preview" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>
            `;
            document.querySelector('.modal-content').scrollTop = 0; // Remonte en haut
        };

        if(document.getElementById('center-play-btn')) {
            document.getElementById('center-play-btn').onclick = playMedia;
            document.getElementById('center-play-btn').style.display = 'block';
        }

        // D. Gestion du Type (Série, Musique, Film)
        if (data.type === 'serie' && seriesArea) {
            // SÉRIE
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
        else if (actionGrid) {
            // FILM OU MUSIQUE
            if(seriesArea) seriesArea.style.display = 'none';
            actionGrid.style.display = 'grid';
            actionGrid.className = 'action-grid'; // S'assure que c'est bien une grille
            
            // Bouton LECTURE
            const playBtn = document.createElement('button');
            playBtn.className = 'btn-action play';
            playBtn.innerHTML = '<i class="fas fa-play"></i> LECTURE';
            playBtn.onclick = playMedia;
            actionGrid.appendChild(playBtn);

            // Boutons TÉLÉCHARGEMENT
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

            // Bouton WHATSAPP
            actionGrid.innerHTML += `<a href="https://wa.me/?text=Regarde *${encodeURIComponent(data.titre)}* sur FILMSall ! C'est gratuit ici : ${window.location.href.split('?')[0]}" class="btn-action whatsapp" target="_blank"><i class="fab fa-whatsapp"></i> PARTAGER</a>`;
        }

        // ========================================================
        // E. ALGORITHME DE RECOMMANDATIONS ALÉATOIRES (MOVIEBOX)
        // ========================================================
        let recArea = document.getElementById('recommendations-area');
        if (recArea) recArea.remove(); // Nettoyer les anciennes suggestions

        recArea = document.createElement('div');
        recArea.id = 'recommendations-area';
        recArea.style.marginTop = "30px";
        recArea.style.borderTop = "1px solid #1f2937";
        recArea.style.paddingTop = "20px";
        recArea.innerHTML = `<h3 style="font-size: 16px; margin-bottom: 15px; color: white; border-left: 3px solid #E50914; padding-left: 8px;">Vous aimerez aussi</h3><div id="rec-grid" class="rec-grid"></div>`;
        
        document.getElementById('modal-info').appendChild(recArea);
        const recGrid = document.getElementById('rec-grid');
        
        // Prendre tout le catalogue SAUF le film actuel, et mélanger
        let mixedContent = allData.filter(item => item.id !== data.id);
        mixedContent.sort(() => Math.random() - 0.5);
        let suggestions = mixedContent.slice(0, 6); // Prendre 6 affiches

        suggestions.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'rec-card';
            card.style.cursor = "pointer";
            card.innerHTML = `
                <img src="${rec.image}" style="width:100%; border-radius:6px; aspect-ratio:2/3; object-fit:cover;" onerror="this.src='logo/filmsall.png'">
                <h4 style="font-size:11px; color:#ccc; margin-top:5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${rec.titre}</h4>
            `;
            
            card.onclick = () => {
                document.querySelector('.modal-content').scrollTop = 0; // Remonte en haut
                openModal(rec); // Ouvre ce nouveau film !
            };
            
            recGrid.appendChild(card);
        });
    }

    // --- 8. FERMETURE DU MODAL ---
    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; if(videoWrapper) videoWrapper.innerHTML = ""; };
    window.onclick = (e) => { if(e.target == modal) { modal.style.display = 'none'; if(videoWrapper) videoWrapper.innerHTML = ""; } };

    // --- 9. HERO SECTION (Bannière Principale) ---
    function loadHero(movies) {
        if(movies.length > 0 && document.getElementById('hero-section')) {
            const random = movies[Math.floor(Math.random() * movies.length)];
            document.getElementById('hero-section').style.backgroundImage = `url('${random.banner || random.image}')`;
            document.getElementById('hero-title').innerText = random.titre;
            if(document.getElementById('hero-desc')) document.getElementById('hero-desc').innerText = random.description || "";
            document.getElementById('hero-play').onclick = () => {
                openModal(random);
                if(random.driveId) setTimeout(() => document.getElementById('center-play-btn').click(), 300);
            };
        }
    }

    // --- 10. BANDEAU D'INSTALLATION PWA ---
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
        
        window.addEventListener('appinstalled', () => {
            installBanner.style.display = 'none';
        });
    }
});