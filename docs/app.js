// Состояние приложения
let currentUser = null;
let currentTab = 'albums';
let musicData = { albums: [], singles: [] };

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMsg = document.getElementById('welcome-msg');
const contentArea = document.getElementById('content-area');
const tabBtns = document.querySelectorAll('.tab-btn');
const leftSidebar = document.getElementById('left-sidebar');
const rightSidebar = document.getElementById('right-sidebar');

// Модальные окна
const albumModal = document.getElementById('album-modal');
const singleModal = document.getElementById('single-modal');
const albumDetailModal = document.getElementById('album-detail-modal');
const albumForm = document.getElementById('album-form');
const singleForm = document.getElementById('single-form');
const addTrackBtn = document.getElementById('add-track-btn');
const tracksContainer = document.getElementById('tracks-container');

// Селекторы дат для ТОПов
const topAlbumsSelect = document.getElementById('top-albums-month');
const topTracksSelect = document.getElementById('top-tracks-month');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    populateMonthSelectors();
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
    appContainer.style.display = 'flex'; // Flex for layout
    welcomeMsg.textContent = `Привет, ${currentUser}!`;
    loadMusicData();
    renderContent();
}

function setupEventListeners() {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username');
        const username = usernameInput.value.trim();
        if (username) {
            localStorage.setItem('muzworm_user', username);
            currentUser = username;
            usernameInput.value = '';
            showApp();
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('muzworm_user');
        currentUser = null;
        musicData = { albums: [], singles: [] };
        showAuth();
    });

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            
            // Показать/скрыть сайдбары только для альбомов
            if (currentTab === 'albums') {
                leftSidebar.classList.add('visible');
                rightSidebar.classList.add('visible');
            } else {
                leftSidebar.classList.remove('visible');
                rightSidebar.classList.remove('visible');
            }
            
            renderContent();
        });
    });

    // Закрытие модалок
    document.querySelectorAll('.close').forEach(span => {
        span.onclick = function() {
            this.closest('.modal').style.display = "none";
        }
    });

    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = "none";
        }
    };

    addTrackBtn.addEventListener('click', addTrackField);
    albumForm.addEventListener('submit', saveAlbum);
    singleForm.addEventListener('submit', saveSingle);

    // Изменение месяца в ТОПах
    topAlbumsSelect.addEventListener('change', renderTopAlbums);
    topTracksSelect.addEventListener('change', renderTopTracks);
}

function loadMusicData() {
    const key = `muzworm_music_${currentUser}`;
    const data = localStorage.getItem(key);
    if (data) {
        try {
            musicData = JSON.parse(data);
            // Миграция данных если нужно
            if (!musicData.albums) musicData.albums = [];
            if (!musicData.singles) musicData.singles = [];
        } catch (e) {
            console.error("Ошибка загрузки данных", e);
            musicData = { albums: [], singles: [] };
        }
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

function getMonthKey(dateStr) {
    if (!dateStr) return 'unknown';
    return dateStr.substring(0, 7); // YYYY-MM
}

function getMonthLabel(key) {
    if (key === 'unknown') return 'Без даты';
    const [year, month] = key.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleString('ru-RU', { year: 'numeric', month: 'long' });
}

function populateMonthSelectors() {
    const months = new Set();
    months.add('all');
    
    [...musicData.albums, ...musicData.singles].forEach(item => {
        if (item.date) months.add(getMonthKey(item.date));
    });

    const sortedMonths = Array.from(months).sort().reverse();
    const optionsHtml = sortedMonths.map(m => 
        `<option value="${m}">${m === 'all' ? 'Все время' : getMonthLabel(m)}</option>`
    ).join('');

    topAlbumsSelect.innerHTML = optionsHtml;
    topTracksSelect.innerHTML = optionsHtml;
}

function renderContent() {
    contentArea.innerHTML = '';
    populateMonthSelectors(); // Обновить списки месяцев при рендере

    const headerRow = document.createElement('div');
    headerRow.style.display = 'flex';
    headerRow.style.justifyContent = 'space-between';
    headerRow.style.alignItems = 'center';
    headerRow.style.marginBottom = '20px';
    
    const title = document.createElement('h2');
    title.textContent = currentTab === 'albums' ? 'Мои Альбомы' : 'Мои Синглы';
    title.style.margin = '0';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn';
    addBtn.style.width = 'auto';
    addBtn.textContent = `+ Добавить ${currentTab === 'albums' ? 'альбом' : 'сингл'}`;
    addBtn.onclick = (e) => {
        e.stopPropagation();
        openModal(currentTab);
    };
    
    headerRow.appendChild(title);
    headerRow.appendChild(addBtn);
    contentArea.appendChild(headerRow);

    const list = currentTab === 'albums' ? musicData.albums : musicData.singles;

    // Сортировка по умолчанию: новые сначала (по дате оценки)
    const sortedList = [...list].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
    });

    if (sortedList.length === 0) {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.color = '#777';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '40px';
        emptyMsg.innerHTML = `Пока нет ${currentTab === 'albums' ? 'альбомов' : 'синглов'}.<br>Добавьте первый, нажав кнопку выше!`;
        contentArea.appendChild(emptyMsg);
        
        // Очистить топы если пусто
        if(currentTab === 'albums') {
            document.getElementById('top-albums-list').innerHTML = '<div style="color:#555;font-size:0.8rem;text-align:center">Нет данных</div>';
            document.getElementById('top-tracks-list').innerHTML = '<div style="color:#555;font-size:0.8rem;text-align:center">Нет данных</div>';
        }
        return;
    }

    sortedList.forEach((item, originalIndex) => {
        // Находим реальный индекс в исходном массиве для удаления/редактирования
        const realIndex = list.indexOf(item);
        
        const card = document.createElement('div');
        card.className = 'card';
        
        // Клик по карточке открывает детали (только для альбомов)
        if (currentTab === 'albums') {
            card.onclick = (e) => {
                // Игнорируем клик если нажали на кнопки действий
                if (!e.target.closest('.card-actions')) {
                    openAlbumDetail(realIndex);
                }
            };
        }

        let metaHtml = `<span class="card-rating">★ ${item.rating}</span>`;
        if (item.date) {
            const d = new Date(item.date);
            metaHtml += `<span>📅 ${d.toLocaleDateString('ru-RU')}</span>`;
        }
        if (currentTab === 'albums' && item.chartPlace) {
            metaHtml += `<span>🏆 ${escapeHtml(item.chartPlace)}</span>`;
        }

        card.innerHTML = `
            <div class="card-info">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.artist)}</p>
                <div class="card-meta">${metaHtml}</div>
            </div>
            <div class="card-actions">
                ${currentTab === 'albums' ? `<button class="view-btn" onclick="event.stopPropagation(); openAlbumDetail(${realIndex})">👁</button>` : ''}
                <button class="edit-btn" onclick="event.stopPropagation(); editItem(${realIndex})">✎</button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteItem(${realIndex})">🗑</button>
            </div>
        `;
        
        contentArea.appendChild(card);
    });

    if (currentTab === 'albums') {
        renderTopAlbums();
        renderTopTracks();
    }
}

// --- ЛОГИКА ТОПОВ ---

function renderTopAlbums() {
    const container = document.getElementById('top-albums-list');
    const selectedMonth = topAlbumsSelect.value;
    
    let filtered = musicData.albums.filter(a => {
        if (selectedMonth === 'all') return true;
        return getMonthKey(a.date) === selectedMonth;
    });

    // Сортировка по рейтингу (убывание)
    filtered.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    
    // Топ 10
    const top10 = filtered.slice(0, 10);

    if (top10.length === 0) {
        container.innerHTML = '<div style="color:#555;font-size:0.8rem;text-align:center;padding:10px">Нет альбомов за этот период</div>';
        return;
    }

    container.innerHTML = top10.map((item, idx) => `
        <div class="top-list-item">
            <span class="top-rank">#${idx + 1}</span>
            <div class="top-info">
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.title)}</div>
                <div style="font-size:0.8rem; color:#777;">${escapeHtml(item.artist)}</div>
            </div>
            <span class="top-rating">${item.rating}</span>
        </div>
    `).join('');
}

function renderTopTracks() {
    const container = document.getElementById('top-tracks-list');
    const selectedMonth = topTracksSelect.value;

    // Сбор всех треков из альбомов за выбранный месяц
    let allTracks = [];
    
    musicData.albums.forEach(album => {
        if (selectedMonth !== 'all' && getMonthKey(album.date) !== selectedMonth) return;
        
        if (album.tracks) {
            album.tracks.forEach(track => {
                allTracks.push({
                    title: track.name,
                    artist: album.artist, // Или можно указать "Various" если нужно
                    albumTitle: album.title,
                    rating: track.rating,
                    plays: track.plays || 0
                });
            });
        }
    });

    // Сортировка треков по рейтингу (убывание)
    allTracks.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));

    const top20 = allTracks.slice(0, 20);

    if (top20.length === 0) {
        container.innerHTML = '<div style="color:#555;font-size:0.8rem;text-align:center;padding:10px">Нет треков за этот период</div>';
        return;
    }

    container.innerHTML = top20.map((track, idx) => `
        <div class="top-list-item">
            <span class="top-rank">#${idx + 1}</span>
            <div class="top-info">
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(track.title)}</div>
                <div style="font-size:0.8rem; color:#777;">${escapeHtml(track.artist)} • ${escapeHtml(track.albumTitle)}</div>
            </div>
            <span class="top-rating">${track.rating}</span>
        </div>
    `).join('');
}

// --- МОДАЛКИ И ФОРМЫ ---

function openModal(type, editIndex = null) {
    const isAlbum = type === 'albums';
    const modal = isAlbum ? albumModal : singleModal;
    const form = isAlbum ? albumForm : singleForm;
    const titleEl = document.getElementById(isAlbum ? 'album-modal-title' : 'single-modal-title');
    
    form.reset();
    tracksContainer.innerHTML = '';
    
    // Установка сегодняшней даты по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById(isAlbum ? 'album-date' : 'single-date').value = today;

    if (editIndex !== null) {
        const item = isAlbum ? musicData.albums[editIndex] : musicData.singles[editIndex];
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = editIndex;
        document.getElementById(isAlbum ? 'album-artist' : 'single-artist').value = item.artist;
        document.getElementById(isAlbum ? 'album-title' : 'single-title').value = item.title;
        document.getElementById(isAlbum ? 'album-rating' : 'single-rating').value = item.rating;
        document.getElementById(isAlbum ? 'album-date' : 'single-date').value = item.date || today;
        
        if (isAlbum) {
            document.getElementById('album-chart-place').value = item.chartPlace || '';
            if (item.tracks) {
                item.tracks.forEach(track => addTrackField(track.name, track.rating, track.plays));
            } else {
                addTrackField(); // Один пустой если нет треков
            }
        }
        
        titleEl.textContent = `Редактировать ${isAlbum ? 'альбом' : 'сингл'}`;
    } else {
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = '';
        titleEl.textContent = `Добавить ${isAlbum ? 'альбом' : 'сингл'}`;
        if(isAlbum) addTrackField(); 
    }
    
    modal.style.display = "block";
}

function addTrackField(name = '', rating = '', plays = '') {
    const div = document.createElement('div');
    div.className = 'track-input-group';
    div.innerHTML = `
        <span style="color:#555; cursor:move;">☰</span>
        <input type="text" placeholder="Название трека" class="track-name" value="${escapeHtml(name)}" required>
        <input type="number" placeholder="Рейт" class="track-rating" step="0.1" min="0" max="5" value="${rating}" style="width: 50px;" required>
        <input type="number" placeholder="Просл" class="track-plays" value="${plays}" style="width: 60px;" title="Количество прослушиваний">
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
    const chartPlace = document.getElementById('album-chart-place').value;
    
    const tracks = [];
    document.querySelectorAll('.track-input-group').forEach(group => {
        const tName = group.querySelector('.track-name').value;
        const tRating = group.querySelector('.track-rating').value;
        const tPlays = group.querySelector('.track-plays').value;
        if(tName) {
            tracks.push({ 
                name: tName, 
                rating: tRating, 
                plays: tPlays ? parseInt(tPlays) : 0 
            });
        }
    });

    const album = { artist, title, rating, date, chartPlace, tracks };

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
    
    const single = { artist, title, rating, date };

    if (id === '') {
        musicData.singles.push(single);
    } else {
        musicData.singles[id] = single;
    }
    
    saveMusicData();
    singleModal.style.display = "none";
}

// --- ДЕТАЛЬНЫЙ ПРОСМОТР АЛЬБОМА ---

function openAlbumDetail(index) {
    const album = musicData.albums[index];
    if (!album) return;

    const content = document.getElementById('album-detail-content');
    
    // Сохраняем индекс для кнопок редактирования внутри модалки
    content.dataset.index = index;

    let tracksHtml = '';
    if (album.tracks && album.tracks.length > 0) {
        // По умолчанию сортируем как в оригинале (порядок добавления)
        const sortedTracks = [...album.tracks]; 
        
        tracksHtml = sortedTracks.map((track, i) => `
            <div class="track-row">
                <span class="track-num">${i + 1}</span>
                <span class="track-name">${escapeHtml(track.name)}</span>
                <div class="track-stats">
                    <span><span class="stat-label">Рейт:</span> ${track.rating}</span>
                    <span><span class="stat-label">Просл:</span> ${track.plays || 0}</span>
                </div>
            </div>
        `).join('');
    } else {
        tracksHtml = '<div style="text-align:center; color:#555; padding:20px;">Треков нет</div>';
    }

    content.innerHTML = `
        <div class="detail-header">
            <h2 class="detail-title">${escapeHtml(album.title)}</h2>
            <h3 class="detail-artist">${escapeHtml(album.artist)}</h3>
            <div class="detail-meta">
                <span>⭐ Рейтинг: <strong style="color:#f1c40f">${album.rating}</strong></span>
                <span>📅 Дата: ${album.date ? new Date(album.date).toLocaleDateString('ru-RU') : '-'}</span>
                ${album.chartPlace ? `<span>🏆 Топ: ${escapeHtml(album.chartPlace)}</span>` : ''}
            </div>
        </div>
        
        <div class="detail-controls">
            <label style="color:#aaa; font-size:0.9rem; align-self:center;">Сортировка треков:</label>
            <select id="detail-sort-select" class="sort-select" onchange="sortDetailTracks(${index}, this.value)">
                <option value="original">По порядку добавления</option>
                <option value="rating_desc">По рейтингу (высокий primero)</option>
                <option value="plays_desc">По прослушиваниям</option>
            </select>
            <button class="edit-btn" onclick="editItem(${index}); document.getElementById('album-detail-modal').style.display='none'">Редактировать альбом</button>
        </div>

        <div id="detail-tracks-list">
            ${tracksHtml}
        </div>
    `;

    albumDetailModal.style.display = "block";
}

window.sortDetailTracks = function(index, sortType) {
    const album = musicData.albums[index];
    if (!album || !album.tracks) return;

    let sorted = [...album.tracks];

    if (sortType === 'rating_desc') {
        sorted.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sortType === 'plays_desc') {
        sorted.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    }
    // original - оставляем как есть

    const container = document.getElementById('detail-tracks-list');
    container.innerHTML = sorted.map((track, i) => `
        <div class="track-row">
            <span class="track-num">${i + 1}</span>
            <span class="track-name">${escapeHtml(track.name)}</span>
            <div class="track-stats">
                <span><span class="stat-label">Рейт:</span> ${track.rating}</span>
                <span><span class="stat-label">Просл:</span> ${track.plays || 0}</span>
            </div>
        </div>
    `).join('');
};

// Глобальные функции
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
        // Если открыта детальная модалка, закрываем её
        albumDetailModal.style.display = "none";
    }
};
