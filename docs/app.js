// Состояние приложения
let currentUser = null;
let currentTab = 'albums';
let musicData = { albums: [], singles: [] };
let currentViewIndex = null; // Индекс элемента для детального просмотра

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMsg = document.getElementById('welcome-msg');
const contentArea = document.getElementById('items-list');
const tabBtns = document.querySelectorAll('.tab-btn');
const sortSelect = document.getElementById('sort-select');
const addBtn = document.getElementById('add-btn');

// Модальные окна
const albumDetailModal = document.getElementById('album-detail-modal');
const singleDetailModal = document.getElementById('single-detail-modal');
const albumFormModal = document.getElementById('album-form-modal');
const singleFormModal = document.getElementById('single-form-modal');

// Формы
const albumForm = document.getElementById('album-form');
const singleForm = document.getElementById('single-form');
const tracksContainer = document.getElementById('tracks-container');
const addTrackBtn = document.getElementById('add-track-btn');

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
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
    updateControls();
    renderList();
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
            updateControls();
            renderList();
        });
    });

    sortSelect.addEventListener('change', renderList);
    addBtn.addEventListener('click', () => openFormModal());

    // Закрытие модалок
    document.querySelectorAll('.close').forEach(span => {
        span.onclick = function() {
            this.closest('.modal').style.display = "none";
        }
    });
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) event.target.style.display = "none";
    };

    addTrackBtn.addEventListener('click', () => addTrackField());
    albumForm.addEventListener('submit', saveAlbum);
    singleForm.addEventListener('submit', saveSingle);

    // Кнопки действий в детальном просмотре
    document.getElementById('edit-album-btn').onclick = () => { closeModals(); openFormModal(currentViewIndex); };
    document.getElementById('delete-album-btn').onclick = () => deleteItem(currentViewIndex);
    document.getElementById('edit-single-btn').onclick = () => { closeModals(); openFormModal(currentViewIndex); };
    document.getElementById('delete-single-btn').onclick = () => deleteItem(currentViewIndex);
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
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
    renderList();
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
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU');
}

function getMonthYear(dateStr) {
    if (!dateStr) return 'Без даты';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
}

function updateControls() {
    const prefix = currentTab === 'albums' ? 'альбом' : 'сингл';
    addBtn.textContent = `+ Добавить ${prefix}`;
    
    // Сброс сортировки при переключении табов можно добавить здесь, если нужно
}

function getSortedList() {
    let list = currentTab === 'albums' ? [...musicData.albums] : [...musicData.singles];
    const sortType = sortSelect.value;

    list.sort((a, b) => {
        if (sortType === 'rating-desc') return b.rating - a.rating;
        if (sortType === 'rating-asc') return a.rating - b.rating;
        if (sortType === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortType === 'date-asc') return new Date(a.date) - new Date(b.date);
        return 0;
    });

    // Группировка по месяцам не требуется в самом массиве, но рендеринг может учитывать
    // Для простоты возвращаем плоский отсортированный список, а заголовки месяцев добавим в renderList
    return list;
}

function renderList() {
    contentArea.innerHTML = '';
    const sortedList = getSortedList();
    
    if (sortedList.length === 0) {
        contentArea.innerHTML = `<p style="text-align:center; color:#777; margin-top:50px;">Список пуст. Добавьте первый ${currentTab === 'albums' ? 'альбом' : 'сингл'}!</p>`;
        return;
    }

    let lastMonth = '';

    sortedList.forEach((item, originalIndex) => {
        // Находим оригинальный индекс в массиве musicData для корректного удаления/редактирования
        // Так как мы сортируем копию, нам нужно найти item в исходном массиве или хранить ID.
        // Для упрощения будем искать по совпадению свойств (в реальном проекте лучше использовать UUID)
        const sourceList = currentTab === 'albums' ? musicData.albums : musicData.singles;
        const realIndex = sourceList.indexOf(item);

        // Заголовок месяца
        const itemMonth = getMonthYear(item.date);
        if (itemMonth !== lastMonth) {
            const monthHeader = document.createElement('h3');
            monthHeader.style.color = '#1db954';
            monthHeader.style.marginTop = '20px';
            monthHeader.style.fontSize = '0.9rem';
            monthHeader.style.textTransform = 'uppercase';
            monthHeader.textContent = itemMonth;
            contentArea.appendChild(monthHeader);
            lastMonth = itemMonth;
        }

        const card = document.createElement('div');
        card.className = 'compact-card';
        card.onclick = () => openDetailModal(realIndex);

        let chartInfo = '';
        if (currentTab === 'albums' && item.chartName && item.chartPos) {
            chartInfo = `<span style="font-size:0.75rem; color:#1db954; margin-top:2px;">#${item.chartPos} ${escapeHtml(item.chartName)}</span>`;
        }

        card.innerHTML = `
            <div class="card-main-info">
                <div class="card-title">${escapeHtml(item.title)}</div>
                <div class="card-sub">${escapeHtml(item.artist)}</div>
                ${chartInfo}
            </div>
            <div class="card-rating-badge">${parseFloat(item.rating).toFixed(1)}</div>
        `;
        contentArea.appendChild(card);
    });
}

// --- Детальный просмотр ---

function openDetailModal(index) {
    currentViewIndex = index;
    const item = currentTab === 'albums' ? musicData.albums[index] : musicData.singles[index];
    
    if (currentTab === 'albums') {
        document.getElementById('detail-title').textContent = item.title;
        document.getElementById('detail-artist').textContent = item.artist;
        document.getElementById('detail-rating').textContent = parseFloat(item.rating).toFixed(1);
        document.getElementById('detail-date').textContent = `Оценка от: ${formatDate(item.date)}`;
        
        let chartText = '';
        if (item.chartName && item.chartPos) {
            chartText = `Топ #${item.chartPos} ${item.chartName}`;
            document.getElementById('detail-chart-info').style.display = 'inline-block';
            document.getElementById('detail-chart-info').textContent = chartText;
        } else {
            document.getElementById('detail-chart-info').style.display = 'none';
        }

        const tracksList = document.getElementById('detail-tracks-list');
        tracksList.innerHTML = '';
        
        if (item.tracks && item.tracks.length > 0) {
            // Сортировка треков по рейтингу (убывание)
            const sortedTracks = [...item.tracks].sort((a, b) => b.rating - a.rating);
            
            sortedTracks.forEach(track => {
                const row = document.createElement('div');
                row.className = 'track-row';
                const plays = track.plays ? `• ${track.plays} прослушиваний` : '';
                row.innerHTML = `
                    <div>
                        <span>${escapeHtml(track.name)}</span>
                        <span class="track-plays-info">${plays}</span>
                    </div>
                    <span style="color:#ffd700; font-weight:bold;">${parseFloat(track.rating).toFixed(1)}</span>
                `;
                tracksList.appendChild(row);
            });
        } else {
            tracksList.innerHTML = '<div style="color:#777; text-align:center;">Треков нет</div>';
        }
        
        albumDetailModal.style.display = 'block';
    } else {
        document.getElementById('single-detail-title').textContent = item.title;
        document.getElementById('single-detail-artist').textContent = item.artist;
        document.getElementById('single-detail-rating').textContent = parseFloat(item.rating).toFixed(1);
        document.getElementById('single-detail-date').textContent = `Оценка от: ${formatDate(item.date)}`;
        singleDetailModal.style.display = 'block';
    }
}

// --- Формы добавления/редактирования ---

function openFormModal(editIndex = null) {
    const isAlbum = currentTab === 'albums';
    const modal = isAlbum ? albumFormModal : singleFormModal;
    const form = isAlbum ? albumForm : singleForm;
    const titleEl = document.getElementById(isAlbum ? 'album-form-title' : 'single-form-title');
    
    form.reset();
    if (isAlbum) tracksContainer.innerHTML = '';
    
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
            document.getElementById('album-chart-name').value = item.chartName || '';
            document.getElementById('album-chart-pos').value = item.chartPos || '';
            if (item.tracks) {
                item.tracks.forEach(track => addTrackField(track.name, track.rating, track.plays));
            }
        }
        
        titleEl.textContent = `Редактировать ${isAlbum ? 'альбом' : 'сингл'}`;
    } else {
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = '';
        titleEl.textContent = `Добавить ${isAlbum ? 'альбом' : 'сингл'}`;
        if (isAlbum) addTrackField(); // Один пустой трек по умолчанию
    }
    
    modal.style.display = "block";
}

function addTrackField(name = '', rating = '', plays = '') {
    const div = document.createElement('div');
    div.className = 'track-input-group';
    div.innerHTML = `
        <input type="text" placeholder="Название трека" class="track-name" value="${escapeHtml(name)}" required>
        <input type="number" placeholder="Рейт" step="0.1" min="0" max="5" class="track-rating" value="${rating}" style="width: 50px;" required>
        <input type="number" placeholder="Просл." class="track-plays" value="${plays}" style="width: 60px;">
        <button type="button" class="remove-track-btn" onclick="this.parentElement.remove()">×</button>
    `;
    tracksContainer.appendChild(div);
}

function saveAlbum(e) {
    e.preventDefault();
    const id = document.getElementById('album-id').value;
    const artist = document.getElementById('album-artist').value;
    const title = document.getElementById('album-title').value;
    const rating = parseFloat(document.getElementById('album-rating').value);
    const date = document.getElementById('album-date').value;
    const chartName = document.getElementById('album-chart-name').value;
    const chartPos = document.getElementById('album-chart-pos').value;
    
    const tracks = [];
    document.querySelectorAll('.track-input-group').forEach(group => {
        const tName = group.querySelector('.track-name').value;
        const tRating = parseFloat(group.querySelector('.track-rating').value);
        const tPlays = group.querySelector('.track-plays').value;
        if (tName) {
            tracks.push({ name: tName, rating: tRating, plays: tPlays ? parseInt(tPlays) : 0 });
        }
    });

    const album = { artist, title, rating, date, chartName, chartPos, tracks };

    if (id === '') {
        musicData.albums.push(album);
    } else {
        musicData.albums[id] = album;
    }
    
    saveMusicData();
    albumFormModal.style.display = "none";
    // Если мы были в детальном просмотре этого же альбома, обновить его не получится просто так, 
    // поэтому просто закрываем все модалки и перерисовываем список. Пользователь откроет снова.
    albumDetailModal.style.display = "none"; 
}

function saveSingle(e) {
    e.preventDefault();
    const id = document.getElementById('single-id').value;
    const artist = document.getElementById('single-artist').value;
    const title = document.getElementById('single-title').value;
    const rating = parseFloat(document.getElementById('single-rating').value);
    const date = document.getElementById('single-date').value;
    
    const single = { artist, title, rating, date };

    if (id === '') {
        musicData.singles.push(single);
    } else {
        musicData.singles[id] = single;
    }
    
    saveMusicData();
    singleFormModal.style.display = "none";
    singleDetailModal.style.display = "none";
}

function deleteItem(index) {
    if(confirm('Вы уверены, что хотите удалить эту запись?')) {
        if (currentTab === 'albums') {
            musicData.albums.splice(index, 1);
        } else {
            musicData.singles.splice(index, 1);
        }
        saveMusicData();
        albumDetailModal.style.display = "none";
        singleDetailModal.style.display = "none";
    }
}
