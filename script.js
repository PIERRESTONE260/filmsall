if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker OK'))
            .catch(err => console.log('Erreur SW:', err));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    let allData =[];

    const urlsToFetch =[];
    if (window.isMusicPage) urlsToFetch.push('musique.json');
    else if (window.isGalleryPage || window.isAnnoncesPage) urlsToFetch.push('films.json');
    else urlsToFetch.push('films.json', 'musique.json');

    Promise.all(urlsToFetch.map(u => fetch(u + '?t=' + Date.now()).then(r => r.json()).catch(() =>[])))
        .then(results => {
            allData = results.flat();
            
            if (window.isGalleryPage) {
                displayGrid(allData, 'gallery-container');
            } else if (window.isAnnoncesPage) {
                const annonces = allData.filter(i => i.bientot === true || i.annee >= 2026);
                displayGrid(annonces, 'annonces-container');
            } else if (window.isMusicPage) {
                displayGrid(allData.filter(i => i.type === 'musique'), 'music-container');
            } else {
                applyFilter('tout');
            }
            
            const loader = document.getElementById('loader');
            if(loader) loader.style.display = 'none';

            const dataType = window.isMusicPage ? 'musique' : 'films';
            const storageKey = `filmsall_last_count_${dataType}`;
            const previousCount = parseInt(localStorage.getItem(storageKey)) || allData.length;

            if (allData.length > previousCount) {
                const newItem = allData[allData.length - 1]; 
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Nouveauté sur FILMSall 🍿", { body: `Nouveau : ${newItem.titre}`, icon: "logo/filmsall.png" });
                }
                showToastNotification(newItem);
            }
            localStorage.setItem(storageKey, allData.length);

            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');
            if (movieId) {
                const filmATrouver = allData.find(m => m.id == movieId);
                if (filmATrouver) {
                    openModal(filmATrouver);
                    setTimeout(() => { const playBtn = document.getElementById('modal-play'); if(playBtn) playBtn.click(); }, 600);
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            }
        });

    const navbar = document.getElementById('navbar');
    if(navbar) {
        window.onscroll = () => { 
            if(window.scrollY > 50) navbar.classList.add('scrolled'); 
            else navbar.classList.remove('scrolled'); 
        };
    }

    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            const activeMain = document.getElementById('main-container') || document.getElementById('gallery-container') || document.getElementById('music-container') || document.getElementById('annonces-container');
            if(!activeMain) return;

            if(val === "") {
                if(document.getElementById('hero-section')) document.getElementById('hero-section').style.display = 'flex';
                if(window.isGalleryPage || window.isMusicPage || window.isAnnoncesPage) displayGrid(allData, activeMain.id);
                else {
                    const activeTab = document.querySelector('.filter-tab.active');
                    if(activeTab) applyFilter(activeTab.getAttribute('data-filter'));
                }
            } else {
                if(document.getElementById('hero-section')) document.getElementById('hero-section').style.display = 'none';
                activeMain.innerHTML = `<h3 class="category-title" style="margin-left:4%;">Résultats</h3><div class="gallery-grid" id="search-results"></div>`;
                const results = allData.filter(m => m.titre.toLowerCase().includes(val));
                const row = document.getElementById('search-results');
                if(results.length === 0) row.innerHTML = "<p style='color:gray; padding-left:4%;'>Aucun résultat trouvé.</p>";
                results.forEach(item => row.appendChild(createCard(item, true)));
            }
        });
    }

    const filterTabs = document.querySelectorAll('.filter-tab');
    if (filterTabs.length > 0) {
        filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                filterTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                applyFilter(e.target.getAttribute('data-filter'));
            });
        });
    }

    window.applyFilter = function(filterType) {
        let filtered =[];
        if (filterType === 'tout') filtered = allData.filter(i => i.type !== 'musique' && i.bientot !== true);
        else if (filterType === 'film') filtered = allData.filter(i => i.type === 'film' && i.bientot !== true);
        else if (filterType === 'serie') filtered = allData.filter(i => i.type === 'serie' && i.bientot !== true);
        else if (filterType === 'animation') filtered = allData.filter(i => i.type === 'anime' && i.bientot !== true);
        else if (filterType === 'manga') filtered = allData.filter(i => i.type === 'manga' && i.bientot !== true);
        else if (filterType === 'musique') filtered = allData.filter(i => i.type === 'musique');

        const mainContainer = document.getElementById('main-container');
        if(mainContainer) {
            loadHeroAnimated(filtered);
            displayCategories(filtered);
        }
    }

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

    function createCard(item, isGrid) {
        const div = document.createElement('div');
        div.className = isGrid ? 'gallery-card' : 'movie-card';
        
        let badgeBientot = item.bientot ? `<div class="bientot-badge">2026</div>` : '';
        let langue = item.langue || "V.F.";
        let note = item.note ? item.note : (Math.random() * (9.5 - 6.0) + 6.0).toFixed(1);

        div.innerHTML = `
            ${badgeBientot}
            <div class="card-lang">${langue}</div>
            <img src="${item.image}" loading="lazy" alt="${item.titre}" onerror="this.src='logo/filmsall.png'" width="100%" height="100%">
            <span class="card-rating">${note}</span>
        `;
        
        div.onclick = () => { 
            if (window.isGalleryPage || window.isAnnoncesPage) {
                window.location.href = `index.html?id=${item.id}`;
            } else {
                openModal(item);
            }
        };
        return div;
    }

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

        const playMedia = () => {
            if (!data.driveId) { alert("⚠️ Ce contenu sera bientôt disponible sur FILMSall !"); return; }
            document.body.classList.add('cinema-mode'); 
            modalCover.style.display = 'none';
            videoWrapper.style.display = 'block';
            
            videoWrapper.innerHTML = `
                <div class="video-overlay-fix"></div> 
                <iframe src="https://drive.google.com/file/d/${data.driveId}/preview" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>
            `;
        };

        if(document.getElementById('center-play-btn')) {
            document.getElementById('center-play-btn').onclick = playMedia;
            document.getElementById('center-play-btn').style.display = 'block';
        }

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
                window.launchEp = (id) => { if(id && id !== 'undefined' && id !== "") { data.driveId = id; playMedia(); } else alert("Épisode bientôt disponible !"); };
            }
        } 
        else if (actionGrid) {
            if(seriesArea) seriesArea.style.display = 'none';
            actionGrid.style.display = 'grid';
            actionGrid.className = 'action-grid';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'btn-action play';
            playBtn.innerHTML = '<i class="fas fa-play"></i> LECTURE';
            playBtn.id = 'modal-play'; 
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

        let recArea = document.getElementById('recommendations-area');
        if (recArea) recArea.remove(); 

        recArea = document.createElement('div');
        recArea.id = 'recommendations-area';
        recArea.style.marginTop = "30px";
        recArea.style.borderTop = "1px solid #1f2937";
        recArea.style.paddingTop = "20px";
        recArea.innerHTML = `<h3 style="font-size: 18px; margin-bottom: 15px; color: white; font-weight: bold;">Pour toi</h3><div id="rec-grid" class="rec-grid"></div>`;
        
        document.getElementById('modal-info').appendChild(recArea);
        const recGrid = document.getElementById('rec-grid');
        
        let mixedContent = allData.filter(item => item.id !== data.id && item.bientot !== true);
        mixedContent.sort(() => Math.random() - 0.5);
        let suggestions = mixedContent.slice(0, 6); 

        suggestions.forEach(rec => {
            const card = document.createElement('div');
            card.className = 'rec-card';
            
            let langue = rec.langue || "V.F.";
            let note = rec.note ? rec.note : (Math.random() * (9.5 - 6.0) + 6.0).toFixed(1);

            card.innerHTML = `
                <div class="rec-img-wrapper">
                    <div class="card-lang">${langue}</div>
                    <img src="${rec.image}" alt="${rec.titre}" onerror="this.src='logo/filmsall.png'" width="100%" height="100%">
                    <span class="card-rating">${note}</span>
                </div>
            `;
            card.onclick = () => { document.querySelector('.modal-info').scrollTop = 0; openModal(rec); };
            recGrid.appendChild(card);
        });
    }

    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; if(videoWrapper) videoWrapper.innerHTML = ""; document.body.classList.remove('cinema-mode'); };
    window.onclick = (e) => { if(e.target == modal) { modal.style.display = 'none'; if(videoWrapper) videoWrapper.innerHTML = ""; document.body.classList.remove('cinema-mode'); } };

    function loadHeroAnimated(movies) {
        const heroSection = document.getElementById('hero-section');
        const heroTitle = document.getElementById('hero-title');
        const heroDesc = document.getElementById('hero-desc');
        const heroPlay = document.getElementById('hero-play');

        if(movies.length > 0 && heroSection) {
            let featuredMovies = movies.filter(m => m.bientot !== true);
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

    function showToastNotification(item) {
        let oldToast = document.getElementById('app-toast');
        if (oldToast) oldToast.remove();

        const toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.className = 'toast-notification';
        let typeText = item.type === 'musique' ? 'Nouveau Son' : (item.type === 'serie' ? 'Nouvelle Série' : (item.type === 'anime' ? 'Nouvel Animé' : 'Nouveau Film'));

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