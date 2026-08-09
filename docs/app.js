// Состояние приложения
let currentUser = null;
let currentTab = 'albums';
let musicData = { albums: [], singles: [] };
let currentSortMode = 'date-desc'; // global sort
let currentTrackSort = 'order'; // order, rating, plays

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMsg = document.getElementById('welcome-msg');
const contentArea = document.getElementById('content-area');
const tabBtns = document.querySelectorAll('.tab-btn');
const globalSortSelect = document.getElementById('global-sort');

// Модальные окна
const albumModal = document.getElementById('album-modal');
const singleModal = document.getElementById('single-modal');
const albumDetailModal = document.getElementById('album-detail-modal');
const albumForm = document.getElementById('album-form');
const singleForm = document.getElementById('single-form');
const addTrackBtn = document.getElementById('add-track-btn');
const tracksContainer = document.getElementById('tracks-container');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    // Установка сегодняшней даты по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('album-date').value = today;
    document.getElementById('single-date').value = today;
});

function checkAuth() {
    const storedUser = localStorage.getItem('muzworm_user');
    if (storedUser) {
        currentUser = storedUser;
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block';
    welcomeMsg.textContent = `Привет, ${currentUser}!`;
    loadMusicData();
    renderContent();
}

function setupEventListeners() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        if (username) {
            localStorage.setItem('muzworm_user', username);
            currentUser = username;
            showApp();
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('muzworm_user');
        currentUser = null;
        showAuth();
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderContent();
        });
    });

    globalSortSelect.addEventListener('change', (e) => {
        currentSortMode = e.target.value;
        renderContent();
    });

    // Album Modal Close
    document.querySelectorAll('#album-modal .close').forEach(span => {
        span.onclick = () => albumModal.style.display = "none";
    });
    
    // Single Modal Close
    document.querySelectorAll('#single-modal .close').forEach(span => {
        span.onclick = () => singleModal.style.display = "none";
    });

    window.onclick = (event) => {
        if (event.target == albumModal) albumModal.style.display = "none";
        if (event.target == singleModal) singleModal.style.display = "none";
        if (event.target == albumDetailModal) closeAlbumDetail();
    };

    addTrackBtn.addEventListener('click', () => addTrackField());
    
    albumForm.addEventListener('submit', saveAlbum);
    singleForm.addEventListener('submit', saveSingle);
}

function loadMusicData() {
    const key = `muzworm_music_${currentUser}`;
    const data = localStorage.getItem(key);
    if (data) {
        musicData = JSON.parse(data);
    } else {
        musicData = { albums: [], singles: [] };
    }
}

function saveMusicData() {
    const key = `muzworm_music_${currentUser}`;
    localStorage.setItem(key, JSON.stringify(musicData));
    renderContent();
}

function escapeHtml(text) {
    if (!text) return '';
    return text.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatDate(dateStr) {
    if(!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' });
}

function getSortValue(item) {
    if (currentSortMode === 'rating-desc') return -parseFloat(item.rating || 0);
    if (currentSortMode === 'rating-asc') return parseFloat(item.rating || 0);
    if (currentSortMode === 'date-asc') return new Date(item.date || '1970-01-01');
    // date-desc (default)
    return -new Date(item.date || '1970-01-01');
}

function renderContent() {
    contentArea.innerHTML = '';
    
    const header = document.createElement('div');
    header.style.marginBottom = '10px';
    header.innerHTML = `<h2>${currentTab === 'albums' ? 'Мои Альбомы' : 'Мои Синглы'}</h2>`;
    
    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn';
    addBtn.style.width = 'auto';
    addBtn.style.float = 'right';
    addBtn.textContent = `+ Добавить ${currentTab === 'albums' ? 'альбом' : 'сингл'}`;
    addBtn.onclick = (e) => {
        e.stopPropagation();
        openModal(currentTab);
    };
    
    header.appendChild(addBtn);
    contentArea.appendChild(header);

    let list = currentTab === 'albums' ? [...musicData.albums] : [...musicData.singles];
    
    // Сортировка списка
    list.sort((a, b) => getSortValue(a) - getSortValue(b));

    if (list.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#777';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.marginTop = '50px';
        emptyMsg.textContent = `Пока нет ${currentTab === 'albums' ? 'альбомов' : 'синглов'}. Добавьте первый!`;
        contentArea.appendChild(emptyMsg);
        return;
    }

    list.forEach((item, originalIndex) => {
        // Находим реальный индекс в исходном массиве для редактирования/удаления
        const realIndex = (currentTab === 'albums' ? musicData.albums : musicData.singles).indexOf(item);

        const card = document.createElement('div');
        card.className = 'card';
        
        // Клик по карточке открывает детали (только для альбомов)
        if (currentTab === 'albums') {
            card.onclick = (e) => {
                // Игнорируем клик если нажали на кнопки действий
                if(e.target.closest('.card-actions')) return;
                openAlbumDetail(realIndex);
            };
        }

        let infoHtml = `<div class="card-info">
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.artist)}</p>`;
        
        if (currentTab === 'albums' && item.chartName) {
            infoHtml += `<p class="track-preview">🏆 ${escapeHtml(item.chartName)} #${item.chartPos}</p>`;
        }
        infoHtml += `</div>`;
        
        const metaHtml = `
            <div class="card-meta">
                <span class="rating-badge">★ ${parseFloat(item.rating).toFixed(1)}</span>
                <div class="card-actions">
                    <button class="edit-btn" onclick="event.stopPropagation(); editItem(${realIndex})">✎</button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteItem(${realIndex})">🗑</button>
                </div>
            </div>
        `;
        
        card.innerHTML = infoHtml + metaHtml;
        contentArea.appendChild(card);
    });
}

function openModal(type, editIndex = null) {
    const isAlbum = type === 'albums';
    const modal = isAlbum ? albumModal : singleModal;
    const form = isAlbum ? albumForm : singleForm;
    const titleEl = document.getElementById(isAlbum ? 'album-modal-title' : 'single-modal-title');
    
    form.reset();
    tracksContainer.innerHTML = '';
    
    // Дата по умолчанию сегодня
    const today = new Date().toISOString().split('T')[0];

    if (editIndex !== null) {
        const item = isAlbum ? musicData.albums[editIndex] : musicData.singles[editIndex];
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = editIndex;
        document.getElementById(isAlbum ? 'album-artist' : 'single-artist').value = item.artist;
        document.getElementById(isAlbum ? 'album-title' : 'single-title').value = item.title;
        document.getElementById(isAlbum ? 'album-rating' : 'single-rating').value = item.rating;
        document.getElementById(isAlbum ? 'album-date' : 'single-date').value = item.date || today;
        
        if(isAlbum) {
            document.getElementById('album-chart-name').value = item.chartName || '';
            document.getElementById('album-chart-pos').value = item.chartPos || '';
        }

        titleEl.textContent = `Редактировать ${isAlbum ? 'альбом' : 'сингл'}`;
        
        if (isAlbum && item.tracks) {
            item.tracks.forEach(track => addTrackField(track.name, track.rating, track.plays));
        } else if (isAlbum) {
            addTrackField(); // Один пустой трек по умолчанию при создании
        }
    } else {
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = '';
        document.getElementById(isAlbum ? 'album-date' : 'single-date').value = today;
        titleEl.textContent = `Добавить ${isAlbum ? 'альбом' : 'сингл'}`;
        if(isAlbum) addTrackField();
    }
    
    modal.style.display = "block";
}

function addTrackField(name = '', rating = '', plays = '') {
    const div = document.createElement('div');
    div.className = 'track-input-group';
    // Убедимся, что rating и plays имеют значения по умолчанию для видимости
    const rVal = rating !== '' ? rating : '0.0';
    const pVal = plays !== '' ? plays : '0';
    
    div.innerHTML = `
        <input type="text" placeholder="Название трека" class="track-name" value="${escapeHtml(name)}" required style="flex: 2;">
        <input type="number" step="0.1" min="0" max="5" placeholder="Оц." class="track-rating" value="${rVal}" style="width: 50px;" required>
        <input type="number" min="0" placeholder="Просл." class="track-plays" value="${pVal}" style="width: 60px;">
        <button type="button" class="remove-track-btn" onclick="this.parentElement.remove()">×</button>
    `;
    tracksContainer.appendChild(div);
}

function saveAlbum(e) {
    e.preventDefault();
    const id = document.getElementById('album-id').value;
    const artist = document.getElementById('album-artist').value;
    const title = document.getElementById('album-title').value;
    const rating = document.getElementById('album-rating').value;
    const date = document.getElementById('album-date').value;
    const chartName = document.getElementById('album-chart-name').value;
    const chartPos = document.getElementById('album-chart-pos').value;
    
    const tracks = [];
    document.querySelectorAll('.track-input-group').forEach(group => {
        const tName = group.querySelector('.track-name').value;
        const tRating = group.querySelector('.track-rating').value;
        const tPlays = group.querySelector('.track-plays').value;
        if(tName) {
            tracks.push({ 
                name: tName, 
                rating: parseFloat(tRating) || 0, 
                plays: parseInt(tPlays) || 0 
            });
        }
    });

    const album = { artist, title, rating: parseFloat(rating), date, chartName, chartPos, tracks };

    if (id === '') {
        musicData.albums.push(album);
    } else {
        musicData.albums[id] = album;
    }
    
    saveMusicData();
    albumModal.style.display = "none";
}

function saveSingle(e) {
    e.preventDefault();
    const id = document.getElementById('single-id').value;
    const artist = document.getElementById('single-artist').value;
    const title = document.getElementById('single-title').value;
    const rating = document.getElementById('single-rating').value;
    const date = document.getElementById('single-date').value;
    
    const single = { artist, title, rating: parseFloat(rating), date };

    if (id === '') {
        musicData.singles.push(single);
    } else {
        musicData.singles[id] = single;
    }
    
    saveMusicData();
    singleModal.style.display = "none";
}

// --- Детальный просмотр альбома ---

window.openAlbumDetail = function(index) {
    const album = musicData.albums[index];
    if (!album) return;

    const content = document.getElementById('album-detail-content');
    
    // Сохраняем индекс для кнопок редактирования/удаления внутри модалки
    content.dataset.index = index;

    let tracksHtml = '';
    // Копируем треки для сортировки без изменения оригинала
    let displayTracks = [...(album.tracks || [])];
    
    // Применяем текущую сортировку треков
    if (currentTrackSort === 'rating') {
        displayTracks.sort((a, b) => b.rating - a.rating);
    } else if (currentTrackSort === 'plays') {
        displayTracks.sort((a, b) => b.plays - a.plays);
    }
    // 'order' оставляет как есть

    displayTracks.forEach((t, i) => {
        tracksHtml += `
            <li class="track-item-full">
                <div>
                    <span style="color:#777; margin-right:10px;">${i+1}.</span>
                    <span>${escapeHtml(t.name)}</span>
                </div>
                <div style="display:flex; align-items:center;">
                    <span style="color:#f1c40f; font-weight:bold;">${t.rating.toFixed(1)}</span>
                    <span class="track-plays-count">▶ ${t.plays}</span>
                </div>
            </li>
        `;
    });

    content.innerHTML = `
        <div class="detail-header">
            <h2>${escapeHtml(album.title)}</h2>
            <div class="detail-meta">${escapeHtml(album.artist)}</div>
            <div class="detail-meta">
                Оценка: <span style="color:#f1c40f; font-weight:bold;">${parseFloat(album.rating).toFixed(1)}</span> | 
                Дата: ${formatDate(album.date)}
            </div>
            ${album.chartName ? `<div class="detail-meta">🏆 ${escapeHtml(album.chartName)} #${album.chartPos}</div>` : ''}
        </div>
        
        <div class="sort-tracks-bar">
            <span style="font-size:0.8rem; color:#aaa; align-self:center; margin-right:5px;">Сорт. треков:</span>
            <button onclick="setTrackSort('order')" class="${currentTrackSort==='order'?'active':''}">По порядку</button>
            <button onclick="setTrackSort('rating')" class="${currentTrackSort==='rating'?'active':''}">По рейтингу</button>
            <button onclick="setTrackSort('plays')" class="${currentTrackSort==='plays'?'active':''}">По прослуш.</button>
        </div>

        <ul class="track-list-full">
            ${tracksHtml}
        </ul>

        <div style="margin-top: 20px; display:flex; gap:10px;">
            <button class="edit-btn" style="flex:1" onclick="closeAlbumDetail(); editItem(${index})">Редактировать</button>
            <button class="delete-btn" style="flex:1" onclick="closeAlbumDetail(); deleteItem(${index})">Удалить</button>
        </div>
    `;

    albumDetailModal.style.display = "block";
};

window.setTrackSort = function(mode) {
    currentTrackSort = mode;
    const index = document.getElementById('album-detail-content').dataset.index;
    openAlbumDetail(parseInt(index));
};

window.closeAlbumDetail = function() {
    albumDetailModal.style.display = "none";
};

// Глобальные функции для доступа из HTML
window.editItem = function(index) {
    openModal(currentTab, index);
};

window.deleteItem = function(index) {
    if(confirm('Вы уверены, что хотите удалить эту запись?')) {
        if (currentTab === 'albums') {
            musicData.albums.splice(index, 1);
        } else {
            musicData.singles.splice(index, 1);
        }
        saveMusicData();
        if(albumDetailModal.style.display === 'block') closeAlbumDetail();
    }
};
