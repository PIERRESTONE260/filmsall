if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

document.addEventListener("DOMContentLoaded", () => {
    let allData = [];

    const dlTabs = document.querySelectorAll('.dl-tab');
    if(dlTabs.length > 0) {
        dlTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                dlTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.dl-tab-content').forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById('tab-' + tab.getAttribute('data-target')).classList.add('active');
            });
        });
    }

    const urlsToFetch =[];
    if (window.isMusicPage) urlsToFetch.push('musique.json');
    else if (window.isGalleryPage || window.isAnnoncesPage) urlsToFetch.push('films.json');
    else urlsToFetch.push('films.json', 'musique.json');

    Promise.all(urlsToFetch.map(u => fetch(u + '?t=' + Date.now()).then(r => r.json()).catch(() =>[])))
        .then(results => {
            allData = results.flat();
            
            const pendingDl = localStorage.getItem('pending_download');
            if (window.location.pathname.includes('telechargement.html') && pendingDl) {
                const dlInfo = JSON.parse(pendingDl);
                localStorage.removeItem('pending_download');
                const localTab = document.querySelector('[data-target="local"]');
                if(localTab) localTab.click();
                startActiveDownload(dlInfo.url, dlInfo.name);
            }

            if (window.isGalleryPage) displayGrid(allData, 'gallery-container');
            else if (window.isAnnoncesPage) displayGrid(allData.filter(i => i.bientot === true || i.annee >= 2026), 'annonces-container');
            else if (window.isMusicPage) displayGrid(allData.filter(i => i.type === 'musique'), 'music-container');
            else if (document.getElementById('filter-tabs')) applyFilter('tout');
            
            const loader = document.getElementById('loader');
            if(loader) loader.style.display = 'none';

            const dataType = window.isMusicPage ? 'musique' : 'films';
            const storageKey = `filmsall_last_count_${dataType}`;
            const previousCount = parseInt(localStorage.getItem(storageKey)) || allData.length;
            const unreadCount = allData.length - previousCount;

            if (window.isAnnoncesPage) {
                localStorage.setItem(storageKey, allData.length);
                if ('clearAppBadge' in navigator) navigator.clearAppBadge();
            } else if (unreadCount > 0) {
                const newItem = allData[allData.length - 1]; 
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification("Nouveauté sur FILMSall", { body: `Nouveau : ${newItem.titre}`, icon: "logo/filmsall.png" });
                }
                showToastNotification(newItem);
                if ('setAppBadge' in navigator) navigator.setAppBadge(unreadCount).catch(err => console.log(err));
                
                const bellIcons = document.querySelectorAll('.fa-bell');
                bellIcons.forEach(bell => {
                    const navItem = bell.parentElement;
                    if(!navItem.querySelector('.notification-badge')) {
                        navItem.innerHTML += `<span class="notification-badge">${unreadCount}</span>`;
                    }
                });
            }

            const urlParams = new URLSearchParams(window.location.search);
            const movieId = urlParams.get('id');
            if (movieId && !pendingDl) {
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
        else if (filterType === 'animation') filtered = allData.filter(i => i.categorie.includes('Animation') && i.bientot !== true);
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

    function saveDownloadHistory(fileName) {
        let dlHistory = JSON.parse(localStorage.getItem('filmsall_downloads')) || [];
        dlHistory.unshift({ title: fileName, date: new Date().toLocaleDateString() });
        localStorage.setItem('filmsall_downloads', JSON.stringify(dlHistory));
        if (typeof renderFullHistory === "function") {
            renderFullHistory();
        }
    }

    function startActiveDownload(fileUrl, fileName) {
        const localList = document.getElementById('local-files-list');
        if(!localList) return;

        const emptyMsg = localList.querySelector('.dl-empty');
        if(emptyMsg) emptyMsg.remove();

        const progressDiv = document.createElement('div');
        progressDiv.className = 'dl-progress-container';
        progressDiv.style.display = 'flex';
        progressDiv.innerHTML = `
            <div class="dl-info">
                <span style="color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:60%;">${fileName}</span>
                <span class="dl-percent" style="color:white; font-weight:bold;">0%</span>
            </div>
            <div class="dl-bar-bg">
                <div class="dl-fill"></div>
            </div>
        `;
        localList.insertBefore(progressDiv, localList.firstChild);

        const percentTxt = progressDiv.querySelector('.dl-percent');
        const fillBar = progressDiv.querySelector('.dl-fill');

        const xhr = new XMLHttpRequest();
        xhr.open('GET', fileUrl, true);
        xhr.responseType = 'blob'; 

        xhr.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = Math.round((event.loaded / event.total) * 100);
                percentTxt.innerText = percentComplete + '%';
                fillBar.style.width = percentComplete + '%';
            } else {
                percentTxt.innerText = 'En cours...';
                fillBar.style.width = '50%';
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                percentTxt.innerText = 'Terminé';
                fillBar.style.width = '100%';
                saveDownloadHistory(fileName);
                
                const blob = xhr.response;
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                setTimeout(() => progressDiv.remove(), 3000);
            } else {
                percentTxt.innerText = 'Erreur';
                fillBar.style.background = 'red';
                setTimeout(() => { window.open(fileUrl, '_blank'); progressDiv.remove(); }, 2000);
            }
        };
        xhr.onerror = () => {
            percentTxt.innerText = 'Redirection...';
            setTimeout(() => { window.open(fileUrl, '_blank'); progressDiv.remove(); }, 1000);
        };
        xhr.send();
    }

    const btnImportLocal = document.getElementById('btn-import-local');
    const localFilesList = document.getElementById('local-files-list');

    if (btnImportLocal && localFileInput) {
        btnImportLocal.onclick = () => localFileInput.click();
        localFileInput.onchange = (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;
            
            if(localFilesList) localFilesList.innerHTML = ""; 
            
            files.forEach(file => {
                const item = document.createElement('div');
                item.className = 'episode-item';
                const isAudio = file.type.includes('audio');
                const icon = isAudio ? 'fa-music' : 'fa-video';
                
                item.innerHTML = `
                    <div class="episode-title"><i class="fas ${icon}"></i> <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;">${file.name}</span></div>
                    <i class="fas fa-play-circle" style="color:var(--primary); font-size:24px;"></i>
                `;
                
                item.onclick = () => {
                    const fileURL = URL.createObjectURL(file);
                    if(modal) {
                        modal.style.display = 'flex';
                        document.getElementById('modal-title').innerText = file.name;
                        const modalCover = document.getElementById('modal-cover');
                        const videoWrapper = document.getElementById('video-wrapper');
                        const modalInfo = document.getElementById('modal-info');
                        
                        if(modalCover) modalCover.style.display = 'none';
                        if(modalInfo) modalInfo.style.display = 'block';
                        videoWrapper.style.display = 'block';
                        document.body.classList.add('cinema-mode');
                        
                        let mediaTag = isAudio ? 'audio' : 'video';
                        videoWrapper.innerHTML = `
                            <${mediaTag} controls autoplay style="width:100%; height:100%; object-fit:contain; background:black;">
                                <source src="${fileURL}" type="${file.type}">
                            </${mediaTag}>
                        `;
                    }
                };
                if(localFilesList) localFilesList.appendChild(item);
            });
        };
    }

    function openModal(data) {
        if(!modal) return;
        modal.style.display = 'flex';
        
        document.getElementById('modal-title').innerText = data.titre;
        if(document.getElementById('modal-desc')) document.getElementById('modal-desc').innerText = data.description || "";
        if(document.getElementById('modal-year')) document.getElementById('modal-year').innerText = data.annee || "";
        if(document.getElementById('modal-cat')) document.getElementById('modal-cat').innerText = data.categorie || "";

        const modalCover = document.getElementById('modal-cover');
        const videoWrapper = document.getElementById('video-wrapper');
        const actionGrid = document.getElementById('action-grid');
        const seriesArea = document.getElementById('series-area');

        if(modalCover) {
            modalCover.style.display = 'block';
            modalCover.style.backgroundImage = `url('${data.banner || data.image}')`;
        }
        if(videoWrapper) {
            videoWrapper.style.display = 'none';
            videoWrapper.innerHTML = "";
        }
        if(actionGrid) actionGrid.innerHTML = "";

        const handleDownloadRedirection = (fileUrl, fileName) => {
            if(!fileUrl) { alert("Lien indisponible !"); return; }
            localStorage.setItem('pending_download', JSON.stringify({ url: fileUrl, name: fileName }));
            window.location.href = 'telechargement.html';
        };

        const playMedia = () => {
            if (!data.driveId) { alert("Bientôt disponible !"); return; }
            document.body.classList.add('cinema-mode'); 
            if(modalCover) modalCover.style.display = 'none';
            if(videoWrapper) {
                videoWrapper.style.display = 'block';
                videoWrapper.innerHTML = `
                    <div class="video-overlay-fix"></div> 
                    <iframe src="https://drive.google.com/file/d/${data.driveId}/preview" allow="autoplay; fullscreen" style="width:100%; height:100%; border:none;"></iframe>
                `;
            }
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
                
                const renderEp = (idx, showAll = false) => {
                    episodesList.innerHTML = "";
                    const currentSeason = data.saisons[idx];
                    
                    const oldBtn = document.getElementById('btn-load-more');
                    if (oldBtn) oldBtn.remove();

                    const epsToShow = showAll ? currentSeason.episodes : currentSeason.episodes.slice(0, 3);

                    epsToShow.forEach((ep, i) => {
                        const sNum = (idx + 1).toString().padStart(2, '0');
                        const eNum = (i + 1).toString().padStart(2, '0');
                        
                        const item = document.createElement('div');
                        item.className = 'episode-item';
                        item.innerHTML = `
                            <div class="episode-title"><i class="fas fa-play-circle"></i> S${sNum} EP${eNum}</div>
                            <div class="episode-meta">${ep.titre}</div>
                            <a href="#" class="episode-download" onclick="event.stopPropagation()"><i class="fas fa-download"></i></a>
                        `;
                        item.onclick = () => { if(ep.driveId && ep.driveId !== "") { data.driveId = ep.driveId; playMedia(); } else alert("Épisode bientôt disponible !"); };
                        
                        const dlLink = item.querySelector('.episode-download');
                        dlLink.onclick = (e) => {
                            e.preventDefault(); e.stopPropagation();
                            if(ep.driveId) {
                                const dlUrl = `https://drive.usercontent.google.com/download?id=${ep.driveId}&export=download&confirm=t`;
                                handleDownloadRedirection(dlUrl, `${data.titre}_S${sNum}E${eNum}.mp4`);
                            }
                            else alert("Bientôt !");
                        }
                        
                        episodesList.appendChild(item);
                    });

                    if (!showAll && currentSeason.episodes.length > 3) {
                        const moreBtn = document.createElement('div');
                        moreBtn.className = 'episode-more';
                        moreBtn.innerHTML = 'Tous les épisodes';
                        moreBtn.onclick = () => renderEp(idx, true);
                        episodesList.appendChild(moreBtn);
                    }
                };

                renderEp(0);
                seasonSelect.onchange = (e) => renderEp(parseInt(e.target.value), false);
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
                if(data.downloads.video) {
                    const btnVid = document.createElement('button');
                    btnVid.className = 'btn-action';
                    btnVid.innerHTML = '<i class="fas fa-video"></i> MP4';
                    btnVid.onclick = () => handleDownloadRedirection(data.downloads.video, `${data.titre}.mp4`);
                    actionGrid.appendChild(btnVid);
                }
                if(data.downloads.audio) {
                    const btnAud = document.createElement('button');
                    btnAud.className = 'btn-action';
                    btnAud.innerHTML = '<i class="fas fa-music"></i> MP3';
                    btnAud.onclick = () => handleDownloadRedirection(data.downloads.audio, `${data.titre}.mp3`);
                    actionGrid.appendChild(btnAud);
                }
            } else {
                const dlBtn = document.createElement('button');
                dlBtn.className = 'btn-action';
                if(data.driveId) {
                    const driveDlLink = `https://drive.usercontent.google.com/download?id=${data.driveId}&export=download&confirm=t`;
                    dlBtn.onclick = () => handleDownloadRedirection(driveDlLink, `${data.titre}.mp4`);
                    dlBtn.innerHTML = '<i class="fas fa-download"></i> TÉLÉCHARGER';
                } else { 
                    dlBtn.onclick = (e)=>{e.preventDefault(); alert("Bientôt !");} 
                    dlBtn.innerHTML = '<i class="fas fa-clock"></i> BIENTÔT';
                    dlBtn.style.opacity = "0.5";
                }
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
        
        const modalInfo = document.getElementById('modal-info');
        if(modalInfo) modalInfo.appendChild(recArea);
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
            card.onclick = () => { if(modalInfo) modalInfo.scrollTop = 0; openModal(rec); };
            if(recGrid) recGrid.appendChild(card);
        });
    }

    const closeBtn = document.querySelector('.close-modal');
    if(closeBtn) closeBtn.onclick = () => { modal.style.display = 'none'; const videoWrapper = document.getElementById('video-wrapper'); if(videoWrapper) videoWrapper.innerHTML = ""; document.body.classList.remove('cinema-mode'); };
    window.onclick = (e) => { if(e.target == modal) { modal.style.display = 'none'; const videoWrapper = document.getElementById('video-wrapper'); if(videoWrapper) videoWrapper.innerHTML = ""; document.body.classList.remove('cinema-mode'); } };

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
                if(heroTitle) heroTitle.innerText = currentMovie.titre;
                if(heroDesc) heroDesc.innerText = currentMovie.description || "";
                if(heroPlay) heroPlay.onclick = () => {
                    openModal(currentMovie);
                    if(currentMovie.driveId) setTimeout(() => { const playBtn = document.getElementById('center-play-btn'); if(playBtn) playBtn.click(); }, 300);
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
        setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { if(toast.parentNode) toast.remove(); }, 600); }, 7000);
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
        const installBtn = document.getElementById('install-btn');
        if(installBtn) installBtn.onclick = async () => {
            if (deferredPrompt) { 
                deferredPrompt.prompt(); 
                const { outcome } = await deferredPrompt.userChoice; 
                if (outcome === 'accepted') installBanner.style.display = 'none'; 
            }
        };
        const closeInstallBtn = document.getElementById('close-install');
        if(closeInstallBtn) closeInstallBtn.onclick = () => installBanner.style.display = 'none';
        window.addEventListener('appinstalled', () => installBanner.style.display = 'none');
    }
});