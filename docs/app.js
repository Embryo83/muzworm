// Состояние приложения
let currentUser = null;
let currentTab = 'albums';
let musicData = { albums: [], singles: [] };
let currentAlbumForDetail = null; // Для хранения текущего просматриваемого альбома

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMsg = document.getElementById('welcome-msg');
const contentArea = document.getElementById('content-area');
const cardsContainer = document.getElementById('cards-container');
const tabBtns = document.querySelectorAll('.tab-btn');

// Модалки
const albumModal = document.getElementById('album-modal');
const singleModal = document.getElementById('single-modal');
const albumDetailModal = document.getElementById('album-detail-modal');
const albumForm = document.getElementById('album-form');
const singleForm = document.getElementById('single-form');
const addTrackBtn = document.getElementById('add-track-btn');
const tracksContainer = document.getElementById('tracks-container');

// Топы
const albumTopMonthInput = document.getElementById('album-top-month');
const trackTopMonthInput = document.getElementById('track-top-month');
const albumTopList = document.getElementById('album-top-list');
const trackTopList = document.getElementById('track-top-list');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
    setDefaultDates();
});

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const monthInputVal = today.substring(0, 7); // YYYY-MM
    
    if(albumTopMonthInput) albumTopMonthInput.value = monthInputVal;
    if(trackTopMonthInput) trackTopMonthInput.value = monthInputVal;
}

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
    
    // Установка текущей даты для инпутов в модалках при первом открытии
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('album-date').value = today;
    document.getElementById('single-date').value = today;

    renderContent();
    renderTops();
});

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
            renderTops();
        });
    });

    // Закрытие модалок
    document.querySelectorAll('.close').forEach(span => {
        span.onclick = function() {
            albumModal.style.display = "none";
            singleModal.style.display = "none";
            albumDetailModal.style.display = "none";
        }
    });

    window.onclick = (event) => {
        if (event.target == albumModal) albumModal.style.display = "none";
        if (event.target == singleModal) singleModal.style.display = "none";
        if (event.target == albumDetailModal) albumDetailModal.style.display = "none";
    };

    addTrackBtn.addEventListener('click', addTrackField);
    albumForm.addEventListener('submit', saveAlbum);
    singleForm.addEventListener('submit', saveSingle);

    // Изменение месяца в топах
    albumTopMonthInput.addEventListener('change', renderTops);
    trackTopMonthInput.addEventListener('change', renderTops);

    // Сортировка в детальном просмотре
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderDetailTracks(e.target.dataset.sort);
        });
    });
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
    renderTops();
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

function renderContent() {
    cardsContainer.innerHTML = '';
    
    // Хедер с кнопкой и фильтрами
    const headerDiv = document.createElement('div');
    headerDiv.className = 'content-header';
    
    const title = document.createElement('h2');
    title.textContent = currentTab === 'albums' ? 'Мои Альбомы' : 'Мои Синглы';
    
    const controls = document.createElement('div');
    controls.className = 'controls-row';
    
    // Кнопка добавить
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.textContent = `+ Добавить ${currentTab === 'albums' ? 'альбом' : 'сингл'}`;
    addBtn.onclick = (e) => {
        e.stopPropagation(); // Чтобы не триггерить клик по карточке если бы он был
        openModal(currentTab);
    };
    
    // Сортировка списка (по дате оценки)
    const sortSelect = document.createElement('select');
    sortSelect.onchange = (e) => renderCardsList(e.target.value);
    sortSelect.innerHTML = `
        <option value="date_desc">Сначала новые (по дате оценки)</option>
        <option value="date_asc">Сначала старые (по дате оценки)</option>
        <option value="rating_desc">По рейтингу (высокий)</option>
        <option value="rating_asc">По рейтингу (низкий)</option>
    `;

    controls.appendChild(sortSelect);
    controls.appendChild(addBtn);
    
    headerDiv.appendChild(title);
    headerDiv.appendChild(controls);
    cardsContainer.appendChild(headerDiv);

    // Контейнер для карточек
    const listContainer = document.createElement('div');
    listContainer.id = 'main-cards-list';
    cardsContainer.appendChild(listContainer);

    renderCardsList('date_desc');
}

function renderCardsList(sortType = 'date_desc') {
    const listContainer = document.getElementById('main-cards-list');
    listContainer.innerHTML = '';
    
    let list = currentTab === 'albums' ? [...musicData.albums] : [...musicData.singles];

    // Сортировка
    list.sort((a, b) => {
        const dateA = new Date(a.date || '1970-01-01');
        const dateB = new Date(b.date || '1970-01-01');
        const rateA = parseFloat(a.rating) || 0;
        const rateB = parseFloat(b.rating) || 0;

        if (sortType === 'date_desc') return dateB - dateA;
        if (sortType === 'date_asc') return dateA - dateB;
        if (sortType === 'rating_desc') return rateB - rateA;
        if (sortType === 'rating_asc') return rateA - rateB;
        return 0;
    });

    if (list.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#777';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.padding = '20px';
        emptyMsg.textContent = `Пока нет ${currentTab === 'albums' ? 'альбомов' : 'синглов'}. Добавьте первый!`;
        listContainer.appendChild(emptyMsg);
        return;
    }

    list.forEach((item, index) => {
        // Находим реальный индекс в исходном массиве для редактирования/удаления
        const originalIndex = (currentTab === 'albums' ? musicData.albums : musicData.singles).indexOf(item);
        
        const card = document.createElement('div');
        card.className = 'card';
        
        // Клик по карточке открывает детали (только для альбомов)
        if (currentTab === 'albums') {
            card.onclick = (e) => {
                // Игнорируем клики по кнопкам действий
                if(e.target.closest('.card-actions')) return;
                openAlbumDetail(originalIndex);
            };
        }

        let metaHtml = `<div class="card-meta">
            <span class="meta-item rating-stars">★ ${item.rating}</span>
            <span class="meta-item">📅 ${item.date || 'Нет даты'}</span>`;
        
        if (currentTab === 'albums' && item.chartName) {
            metaHtml += `<span class="meta-item">🏆 ${item.chartName} #${item.chartPos || '?'}</span>`;
        }
        metaHtml += `</div>`;

        card.innerHTML = `
            <div class="card-info">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.artist)}</p>
                ${metaHtml}
            </div>
            <div class="card-actions">
                ${currentTab === 'albums' ? '<button class="view-btn" title="Открыть трек-лист">👁</button>' : ''}
                <button class="edit-btn" onclick="event.stopPropagation(); editItem(${originalIndex})">✎</button>
                <button class="delete-btn" onclick="event.stopPropagation(); deleteItem(${originalIndex})">🗑</button>
            </div>
        `;
        
        listContainer.appendChild(card);
    });
}

function renderTops() {
    const albumMonth = albumTopMonthInput.value;
    const trackMonth = trackTopMonthInput.value;

    // ТОП-10 Альбомов
    let albumsToSort = musicData.albums.filter(a => a.date && a.date.startsWith(albumMonth));
    albumsToSort.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    const top10Albums = albumsToSort.slice(0, 10);

    albumTopList.innerHTML = '';
    if (top10Albums.length === 0) {
        albumTopList.innerHTML = '<div style="color:#666; font-size:0.8rem; text-align:center; padding:10px;">Нет данных за этот месяц</div>';
    } else {
        top10Albums.forEach((alb, idx) => {
            const div = document.createElement('div');
            div.className = 'top-item';
            div.innerHTML = `
                <span class="top-rank">#${idx + 1}</span>
                <span class="top-info" title="${escapeHtml(alb.title)}">${escapeHtml(alb.title)}</span>
                <span class="top-val">★${alb.rating}</span>
            `;
            div.onclick = () => openAlbumDetail(musicData.albums.indexOf(alb));
            div.style.cursor = 'pointer';
            albumTopList.appendChild(div);
        });
    }

    // ТОП-20 Треков (из альбомов за выбранный месяц)
    // Собираем все треки из альбомов, оцененных в выбранный месяц
    let allTracks = [];
    albumsToSort.forEach(alb => {
        if (alb.tracks) {
            alb.tracks.forEach(t => {
                allTracks.push({
                    name: t.name,
                    rating: parseFloat(t.rating) || 0,
                    plays: parseInt(t.plays) || 0,
                    parentAlbum: alb.title,
                    parentArtist: alb.artist,
                    originalAlbumObj: alb
                });
            });
        }
    });

    allTracks.sort((a, b) => b.rating - a.rating);
    const top20Tracks = allTracks.slice(0, 20);

    trackTopList.innerHTML = '';
    if (top20Tracks.length === 0) {
        trackTopList.innerHTML = '<div style="color:#666; font-size:0.8rem; text-align:center; padding:10px;">Нет треков за этот месяц</div>';
    } else {
        top20Tracks.forEach((trk, idx) => {
            const div = document.createElement('div');
            div.className = 'top-item';
            div.innerHTML = `
                <span class="top-rank">#${idx + 1}</span>
                <div class="top-info" style="display:flex; flex-direction:column;">
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(trk.name)}</span>
                    <span style="font-size:0.75rem; color:#666;">${escapeHtml(trk.parentArtist)}</span>
                </div>
                <span class="top-val">★${trk.rating}</span>
            `;
            // Клик по треку открывает альбом
            div.onclick = () => {
                const realIdx = musicData.albums.indexOf(trk.originalAlbumObj);
                if(realIdx !== -1) openAlbumDetail(realIdx);
            };
            div.style.cursor = 'pointer';
            trackTopList.appendChild(div);
        });
    }
}

function openModal(type, editIndex = null) {
    const isAlbum = type === 'albums';
    const modal = isAlbum ? albumModal : singleModal;
    const form = isAlbum ? albumForm : singleForm;
    const titleEl = document.getElementById(isAlbum ? 'album-modal-title' : 'single-modal-title');
    
    form.reset();
    tracksContainer.innerHTML = '';
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
    div.innerHTML = `
        <input type="text" placeholder="Название трека" class="track-name" value="${escapeHtml(name)}" required>
        <input type="number" placeholder="Оценка" class="track-rating" step="0.1" min="0" max="5" value="${rating}" style="width: 60px;" required>
        <input type="number" placeholder="Просл." class="track-plays" min="0" value="${plays}" style="width: 70px;" title="Количество прослушиваний">
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
        const tPlays = group.querySelector('.track-plays').value || 0;
        if(tName) tracks.push({ name: tName, rating: tRating, plays: tPlays });
    });

    const album = { artist, title, rating, date, chartName, chartPos, tracks };

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

// Детальный просмотр альбома
function openAlbumDetail(index) {
    const album = musicData.albums[index];
    if (!album) return;

    currentAlbumForDetail = album; // Сохраняем ссылку для сортировки

    document.getElementById('detail-title').textContent = album.title;
    document.getElementById('detail-artist').textContent = album.artist;
    document.getElementById('detail-rating').textContent = `${album.rating} / 5.0`;
    document.getElementById('detail-date').textContent = album.date || 'Не указана';
    
    const chartInfoEl = document.getElementById('detail-chart-info');
    if (album.chartName) {
        chartInfoEl.style.display = 'inline-block';
        document.getElementById('detail-chart').textContent = `${album.chartName} #${album.chartPos || '?'}`;
    } else {
        chartInfoEl.style.display = 'none';
    }

    // Сброс сортировки на "По порядку"
    document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.sort-btn[data-sort="original"]').classList.add('active');

    renderDetailTracks('original');
    albumDetailModal.style.display = "block";
}

function renderDetailTracks(sortType) {
    const container = document.getElementById('detail-tracks-list');
    container.innerHTML = '';
    
    if (!currentAlbumForDetail || !currentAlbumForDetail.tracks) {
        container.innerHTML = '<div style="text-align:center; color:#666;">Треков нет</div>';
        return;
    }

    let tracks = [...currentAlbumForDetail.tracks];
    
    // Добавляем оригинальный индекс для сортировки "По порядку"
    tracks = tracks.map((t, i) => ({...t, _origIdx: i}));

    if (sortType === 'rating') {
        tracks.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    } else if (sortType === 'plays') {
        tracks.sort((a, b) => parseInt(b.plays) - parseInt(a.plays));
    } else {
        // original
        tracks.sort((a, b) => a._origIdx - b._origIdx);
    }

    tracks.forEach((t, i) => {
        const div = document.createElement('div');
        div.className = 'detail-track-item';
        div.innerHTML = `
            <div class="detail-track-info">
                <span class="track-name">${i+1}. ${escapeHtml(t.name)}</span>
                <span class="track-stats">★ ${t.rating} • ▶ ${t.plays || 0}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

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
    }
};
