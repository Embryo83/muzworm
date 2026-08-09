// Состояние приложения
let currentUser = null;
let currentTab = 'albums';
let currentSort = 'date_desc';
let musicData = { albums: [], singles: [] };

// Элементы DOM
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const welcomeMsg = document.getElementById('welcome-msg');
const contentArea = document.getElementById('content-area');
const tabBtns = document.querySelectorAll('.tab-btn');
const sortSelect = document.getElementById('sort-select');

// Модальные окна
const albumModal = document.getElementById('album-modal');
const singleModal = document.getElementById('single-modal');
const albumForm = document.getElementById('album-form');
const singleForm = document.getElementById('single-form');
const addTrackBtn = document.getElementById('add-track-btn');
const tracksContainer = document.getElementById('tracks-container');

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
    
    // Установка сегодняшней даты по умолчанию
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('album-date').value = today;
    document.getElementById('single-date').value = today;
    
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

    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderContent();
    });

    // Album Modal
    document.querySelectorAll('#album-modal .close').forEach(span => {
        span.onclick = () => albumModal.style.display = "none";
    });
    
    // Single Modal
    document.querySelectorAll('#single-modal .close').forEach(span => {
        span.onclick = () => singleModal.style.display = "none";
    });

    window.onclick = (event) => {
        if (event.target == albumModal) albumModal.style.display = "none";
        if (event.target == singleModal) singleModal.style.display = "none";
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

// Сортировка данных
function getSortedData(list) {
    const sorted = [...list];
    switch(currentSort) {
        case 'rating_desc': sorted.sort((a, b) => b.rating - a.rating); break;
        case 'rating_asc': sorted.sort((a, b) => a.rating - b.rating); break;
        case 'date_desc': sorted.sort((a, b) => new Date(b.date) - new Date(a.date)); break;
        case 'date_asc': sorted.sort((a, b) => new Date(a.date) - new Date(b.date)); break;
        case 'alpha_asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'alpha_desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
    }
    return sorted;
}

// Группировка по месяцам
function groupByMonth(list) {
    const groups = {};
    list.forEach(item => {
        const dateObj = new Date(item.date);
        const monthKey = dateObj.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        // Capitalize first letter
        const key = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);
        
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    return groups;
}

function renderContent() {
    contentArea.innerHTML = '';
    
    let list = currentTab === 'albums' ? musicData.albums : musicData.singles;
    const sortedList = getSortedData(list);
    const groupedData = groupByMonth(sortedList);

    if (Object.keys(groupedData).length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#777';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.marginTop = '40px';
        emptyMsg.textContent = `Пока нет записей. Добавьте первую!`;
        contentArea.appendChild(emptyMsg);
        return;
    }

    // Рендеринг по группам (месяцам)
    for (const [month, items] of Object.entries(groupedData)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'month-group';
        
        const title = document.createElement('div');
        title.className = 'month-title';
        title.textContent = month;
        groupDiv.appendChild(title);

        items.forEach(item => {
            // Находим оригинальный индекс для редактирования/удаления
            const originalIndex = currentTab === 'albums' 
                ? musicData.albums.findIndex(i => i === item) 
                : musicData.singles.findIndex(i => i === item);

            const card = document.createElement('div');
            card.className = `card ${item.rating >= 4.5 ? 'high-rated' : ''}`;
            
            let extraHtml = '';
            if (currentTab === 'albums' && item.chartName) {
                const posText = item.chartPos ? `#${item.chartPos} ` : '';
                extraHtml = `<div class="card-extra">${posText}${escapeHtml(item.chartName)}</div>`;
            }

            let infoHtml = `<div class="card-header">
                <div class="card-info">
                    <h3>${escapeHtml(item.title)} <span class="rating-badge">${item.rating}</span></h3>
                    <div class="card-meta">${escapeHtml(item.artist)} • ${new Date(item.date).toLocaleDateString('ru-RU')}</div>
                    ${extraHtml}
                </div>
                <div class="card-actions">
                    <button class="edit-btn small-btn" onclick="editItem(${originalIndex})">✎</button>
                    <button class="delete-btn small-btn" onclick="deleteItem(${originalIndex})">🗑</button>
                </div>
            </div>`;
            
            if (currentTab === 'albums' && item.tracks && item.tracks.length > 0) {
                infoHtml += `<div class="track-list">`;
                item.tracks.forEach(track => {
                    const playsText = track.plays ? ` • 👁 ${track.plays}` : '';
                    infoHtml += `<div class="track-item">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        <div class="track-stats">
                            <span class="track-rating">${track.rating}</span>${playsText}
                        </div>
                    </div>`;
                });
                infoHtml += `</div>`;
            }
            
            card.innerHTML = infoHtml;
            groupDiv.appendChild(card);
        });

        contentArea.appendChild(groupDiv);
    }
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
        }
    } else {
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = '';
        document.getElementById(isAlbum ? 'album-date' : 'single-date').value = today;
        titleEl.textContent = `Добавить ${isAlbum ? 'альбом' : 'сингл'}`;
        if(isAlbum) {
            document.getElementById('album-chart-name').value = '';
            document.getElementById('album-chart-pos').value = '';
            addTrackField(); // Один пустой трек по умолчанию
        }
    }
    
    modal.style.display = "block";
}

function addTrackField(name = '', rating = '', plays = '') {
    const div = document.createElement('div');
    div.className = 'track-input-group';
    div.innerHTML = `
        <input type="text" placeholder="Трек" class="track-name t-name" value="${escapeHtml(name)}" required>
        <input type="number" step="0.1" placeholder="Оц." class="track-rating t-rating" min="0" max="5" value="${rating}" required>
        <input type="number" placeholder="Прос." class="track-plays t-plays" min="0" value="${plays}">
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
        if(tName) tracks.push({ name: tName, rating: tRating, plays: tPlays ? parseInt(tPlays) : 0 });
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
    const rating = parseFloat(document.getElementById('single-rating').value);
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
    }
};

// Открытие модалки по кнопке из renderContent (динамически создаваемой)
// Перехватываем клики по кнопкам добавления через делегирование или перерисовку
// В данном случае проще добавить обработчик на кнопку в header при рендере, 
// но так как мы перезаписываем innerHTML, сделаем это внутри renderContent через создание кнопки.
// Чтобы не усложнять, добавим кнопку "Добавить" прямо в HTML структуру при рендере.

// Переопределим renderContent для добавления кнопки "Добавить"
const originalRenderContent = renderContent;
renderContent = function() {
    contentArea.innerHTML = '';
    
    // Кнопка добавления
    const headerControls = document.createElement('div');
    headerControls.style.display = 'flex';
    headerControls.style.justifyContent = 'space-between';
    headerControls.style.alignItems = 'center';
    headerControls.style.marginBottom = '15px';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn';
    addBtn.style.width = 'auto';
    addBtn.style.padding = '6px 12px';
    addBtn.textContent = `+ Добавить ${currentTab === 'albums' ? 'альбом' : 'сингл'}`;
    addBtn.onclick = () => openModal(currentTab);
    
    headerControls.appendChild(addBtn);
    contentArea.appendChild(headerControls);

    // Вызов основной логики отрисовки списка
    let list = currentTab === 'albums' ? musicData.albums : musicData.singles;
    const sortedList = getSortedData(list);
    const groupedData = groupByMonth(sortedList);

    if (Object.keys(groupedData).length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#777';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.marginTop = '40px';
        emptyMsg.textContent = `Пока нет записей. Нажмите кнопку выше, чтобы добавить.`;
        contentArea.appendChild(emptyMsg);
        return;
    }

    for (const [month, items] of Object.entries(groupedData)) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'month-group';
        
        const title = document.createElement('div');
        title.className = 'month-title';
        title.textContent = month;
        groupDiv.appendChild(title);

        items.forEach(item => {
            const originalIndex = currentTab === 'albums' 
                ? musicData.albums.findIndex(i => i === item) 
                : musicData.singles.findIndex(i => i === item);

            const card = document.createElement('div');
            card.className = `card ${item.rating >= 4.5 ? 'high-rated' : ''}`;
            
            let extraHtml = '';
            if (currentTab === 'albums' && item.chartName) {
                const posText = item.chartPos ? `#${item.chartPos} ` : '';
                extraHtml = `<div class="card-extra">${posText}${escapeHtml(item.chartName)}</div>`;
            }

            let infoHtml = `<div class="card-header">
                <div class="card-info">
                    <h3>${escapeHtml(item.title)} <span class="rating-badge">${item.rating}</span></h3>
                    <div class="card-meta">${escapeHtml(item.artist)} • ${new Date(item.date).toLocaleDateString('ru-RU')}</div>
                    ${extraHtml}
                </div>
                <div class="card-actions">
                    <button class="edit-btn small-btn" onclick="editItem(${originalIndex})">✎</button>
                    <button class="delete-btn small-btn" onclick="deleteItem(${originalIndex})">🗑</button>
                </div>
            </div>`;
            
            if (currentTab === 'albums' && item.tracks && item.tracks.length > 0) {
                infoHtml += `<div class="track-list">`;
                item.tracks.forEach(track => {
                    const playsText = track.plays ? ` • 👁 ${track.plays}` : '';
                    infoHtml += `<div class="track-item">
                        <span class="track-name">${escapeHtml(track.name)}</span>
                        <div class="track-stats">
                            <span class="track-rating">${track.rating}</span>${playsText}
                        </div>
                    </div>`;
                });
                infoHtml += `</div>`;
            }
            
            card.innerHTML = infoHtml;
            groupDiv.appendChild(card);
        });

        contentArea.appendChild(groupDiv);
    }
};
