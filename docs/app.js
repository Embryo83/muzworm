
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

    addTrackBtn.addEventListener('click', addTrackField);
    
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

function renderContent() {
    contentArea.innerHTML = '';
    
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '20px';
    
    const title = document.createElement('h2');
    title.textContent = currentTab === 'albums' ? 'Мои Альбомы' : 'Мои Синглы';
    
    const addBtn = document.createElement('button');
    addBtn.className = 'primary-btn';
    addBtn.style.width = 'auto';
    addBtn.textContent = `+ Добавить ${currentTab === 'albums' ? 'альбом' : 'сингл'}`;
    addBtn.onclick = () => openModal(currentTab);
    
    header.appendChild(title);
    header.appendChild(addBtn);
    contentArea.appendChild(header);

    const list = currentTab === 'albums' ? musicData.albums : musicData.singles;

    if (list.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#777';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.textContent = `Пока нет ${currentTab === 'albums' ? 'альбомов' : 'синглов'}. Добавьте первый!`;
        contentArea.appendChild(emptyMsg);
        return;
    }

    list.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'card';
        
        let infoHtml = `<div class="card-info">
            <h3>${escapeHtml(item.title)} <span style="color:#1db954; font-size:0.8em">(${item.rating}/10)</span></h3>
            <p style="color:#aaa; margin:5px 0">${escapeHtml(item.artist)}</p>`;
        
        if (currentTab === 'albums' && item.tracks && item.tracks.length > 0) {
            infoHtml += `<div class="track-list">`;
            item.tracks.forEach(track => {
                infoHtml += `<div class="track-item">
                    <span>${escapeHtml(track.name)}</span>
                    <span class="rating">${track.rating}/10</span>
                </div>`;
            });
            infoHtml += `</div>`;
        }
        
        infoHtml += `</div>`;
        
        card.innerHTML = infoHtml + `
            <div class="card-actions">
                <button class="edit-btn" onclick="editItem(${index})">✎</button>
                <button class="delete-btn" onclick="deleteItem(${index})">🗑</button>
            </div>
        `;
        
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
    
    if (editIndex !== null) {
        const item = isAlbum ? musicData.albums[editIndex] : musicData.singles[editIndex];
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = editIndex;
        document.getElementById(isAlbum ? 'album-artist' : 'single-artist').value = item.artist;
        document.getElementById(isAlbum ? 'album-title' : 'single-title').value = item.title;
        document.getElementById(isAlbum ? 'album-rating' : 'single-rating').value = item.rating;
        
        titleEl.textContent = `Редактировать ${isAlbum ? 'альбом' : 'сингл'}`;
        
        if (isAlbum && item.tracks) {
            item.tracks.forEach(track => addTrackField(track.name, track.rating));
        }
    } else {
        document.getElementById(isAlbum ? 'album-id' : 'single-id').value = '';
        titleEl.textContent = `Добавить ${isAlbum ? 'альбом' : 'сингл'}`;
        if(isAlbum) addTrackField(); // Add one empty track by default for albums
    }
    
    modal.style.display = "block";
}

function addTrackField(name = '', rating = '') {
    const div = document.createElement('div');
    div.className = 'track-input-group';
    div.innerHTML = `
        <input type="text" placeholder="Название трека" class="track-name" value="${escapeHtml(name)}" required>
        <input type="number" placeholder="Оценка" class="track-rating" min="1" max="10" value="${rating}" style="width: 60px;" required>
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
    
    const tracks = [];
    document.querySelectorAll('.track-input-group').forEach(group => {
        const tName = group.querySelector('.track-name').value;
        const tRating = group.querySelector('.track-rating').value;
        if(tName) tracks.push({ name: tName, rating: tRating });
    });

    const album = { artist, title, rating, tracks };

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
    
    const single = { artist, title, rating };

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
