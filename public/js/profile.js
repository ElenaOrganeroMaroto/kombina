// --- GESTIÓN DE PERFIL Y VISTAS ESTILIZADAS (CONECTADO A MONGODB) ---

let currentProfileView = 'main';
let activeProfileTab = 'outfits';
let activeColId = null;

let assignMode = false;
let assignDateKey = null;
let assignSelection = [];   
let assignInitialCount = 0; 

let profileSavedOutfits = [];

(function readAssignParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') !== 'assign') return;

    assignMode = true;
    assignDateKey = params.get('date') || localStorage.getItem('kombina_target_date') || getTodayDateKey();

    Promise.all([fetchOutfitsForProfile(), fetchCollectionsForProfile(), fetchCalendarForProfile(), fetchProfileData()]).then(() => {
        const current = loadCalendarAssignments()[assignDateKey] || [];
        assignSelection = current.map(String).filter(id => profileSavedOutfits.some(o => String(o._id || o.id) === id));
        assignInitialCount = assignSelection.length;
        renderProfileScreen();
    });

    try { history.replaceState(null, '', window.location.pathname); } catch (e) { }
})();

let profileCollections = [];
let profileAssignments = {};
let profileData = { name: '', handle: '', bio: '', avatar: '' };

async function fetchCalendarForProfile() {
    try {
        const userId = localStorage.getItem('kombina_user_id');
        if (!userId) { profileAssignments = {}; return; }
        const res = await fetch(`/api/calendar?userId=${userId}`);
        if (res.ok) profileAssignments = await res.json();
    } catch (err) {
        console.error('Error cargando el calendario en perfil:', err);
        profileAssignments = {};
    }
}

async function fetchProfileData() {
    try {
        const userId = localStorage.getItem('kombina_user_id');
        if (!userId) return;
        const res = await fetch(`/api/profile?userId=${userId}`);
        if (res.ok) {
            profileData = await res.json();
            // Limpiar restos antiguos que se guardaban solo en el navegador
            ['kombina_user_name', 'kombina_user_handle', 'kombina_user_bio', 'kombina_user_avatar']
                .forEach(k => localStorage.removeItem(k));
        }
    } catch (err) {
        console.error('Error cargando el perfil:', err);
    }
}

async function saveProfileData(fields) {
    const userId = localStorage.getItem('kombina_user_id');
    if (!userId) throw new Error('No hay sesión iniciada');
    const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ...fields })
    });
    if (!res.ok) throw new Error('Error al guardar el perfil');
    profileData = await res.json();
}

function downscaleAvatar(dataUrl, maxSize = 256) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

async function fetchCollectionsForProfile() {
    try {
        const userId = localStorage.getItem('kombina_user_id');
        if (!userId) { profileCollections = []; return; }
        const res = await fetch(`/api/collections?userId=${userId}`);
        if (res.ok) {
            const data = await res.json();
            // El resto del código usa col.id, así que lo normalizamos desde _id
            profileCollections = data.map(c => ({ ...c, id: c._id }));
        }
    } catch (err) {
        console.error('Error cargando colecciones:', err);
        profileCollections = [];
    }
}

async function fetchOutfitsForProfile() {
    try {
        const userId = localStorage.getItem('kombina_user_id');
        if (!userId) { profileSavedOutfits = []; return; }
        const res = await fetch(`/api/outfits?userId=${userId}`);
        if (res.ok) profileSavedOutfits = await res.json();
    } catch (err) {
        console.error('Error cargando outfits en perfil:', err);
        profileSavedOutfits = [];
    }
}

const PROFILE_ICONS = {
    settings: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16v4M17 18h4"/>',
    hanger: '<path d="M12 9V7.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M12 9l9 6.2a1 1 0 0 1-.6 1.8H3.6a1 1 0 0 1-.6-1.8L12 9z"/>',
    calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    chevron: '<path d="M6 9l6 6 6-6"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line>'
};

function profileIcon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PROFILE_ICONS[name]}</svg>`;
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', async () => {
    await Promise.all([fetchOutfitsForProfile(), fetchCollectionsForProfile(), fetchCalendarForProfile(), fetchProfileData()]);
    renderProfileScreen();
});

function navigateProfile(view, param = null) {
    currentProfileView = view;
    if (param !== null) activeColId = param;
    renderProfileScreen();
}

function switchProfileTab(tab) {
    activeProfileTab = tab;
    renderProfileScreen();
}

async function renderProfileScreen() {
    const container = document.getElementById('profileDynamicContent');
    if (!container) return;

    await fetchOutfitsForProfile();

    if (currentProfileView === 'main') {
        container.innerHTML = getMainProfileHTML();
        loadProfileHeaderData();
    } else if (currentProfileView === 'collection-detail') {
        renderCollectionDetailView(container, activeColId);
    } else if (currentProfileView === 'settings') {
        renderSettingsView(container);
    }
    fitProfileGrid();
    updateAssignFloatingButton();
}

function fitProfileGrid() {
    const scroller = document.querySelector('.profile-grid-scroll');
    if (!scroller) return;
    scroller.style.height = 'auto';
    scroller.style.maxHeight = 'none';
    scroller.style.overflow = 'visible';
}

window.addEventListener('resize', fitProfileGrid);
window.addEventListener('load', fitProfileGrid);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitProfileGrid);

function getOutfitPreviewHTML(outfit) {
    if (!outfit.items || !outfit.items.length || typeof buildOutfitCanvasHTML !== 'function') {
        return `<div class="outfit-preview-empty">${profileIcon('hanger')}</div>`;
    }
    return `
        <div class="outfit-preview" style="position: relative;">
            ${buildOutfitCanvasHTML(outfit.items)}
        </div>
    `;
}

function getFutureFeaturesHTML() {
    return `
        <div class="profile-future-box">
            <div class="future-box-header">
                <div class="future-box-heading">
                    <h3 class="future-box-title">Comunidad</h3>
                    <span class="suggestion-pill">Próximamente</span>
                </div>
                <div class="future-icon-grid">
                    <div class="future-icon-cell">${profileIcon('camera')}</div>
                    <div class="future-icon-cell">${profileIcon('sparkle')}</div>
                    <div class="future-icon-cell">${profileIcon('hanger')}</div>
                </div>
            </div>
            <p class="future-box-desc">Comparte tu armario y descubre nuevos looks.</p>
        </div>

        <div class="profile-suggestion-box">
            <div class="suggestion-icon">${profileIcon('sparkle')}</div>
            <div>
                <div class="suggestion-title-row">
                    <span class="suggestion-title">Sugerencias con IA</span>
                    <span class="suggestion-pill">Pronto</span>
                </div>
                <span class="suggestion-desc">Combinaciones automáticas basadas en tu estilo</span>
            </div>
        </div>
    `;
}

function getMainProfileHTML() {
    const collections = profileCollections;
    const looseOutfits = profileSavedOutfits.filter(o => !o.collectionId);

    let outfitsGridHtml = '';
    if (looseOutfits.length === 0) {
        outfitsGridHtml = `<div class="grid-empty-message">Aún no tienes outfits guardados.</div>`;
    } else {
        [...looseOutfits].reverse().forEach(outfit => {
            outfitsGridHtml += getOutfitTileHTML(outfit, false);
        });
    }

    let collectionsGridHtml = `
        <div class="collection-card" onclick="createNewCollectionPrompt()" role="button" aria-label="Crear nueva colección">
            <div class="profile-grid-item new-collection-tile">${profileIcon('plus')}</div>
            <div class="collection-card-name">Nueva colección</div>
            <div class="collection-card-count">Toca para crear</div>
        </div>
    `;
    collections.forEach(col => {
        const inCol = profileSavedOutfits.filter(o => String(o.collectionId) === String(col.id));
        const lastFour = inCol.slice(-4).reverse();

        let cover = `<div class="collection-cover-grid">`;
        for (let i = 0; i < 4; i++) {
            if (lastFour[i] && lastFour[i].items && lastFour[i].items.length && typeof buildOutfitCanvasHTML === 'function') {
                cover += `
                    <div class="collection-cover-cell" style="position: relative; overflow: hidden;">
                        ${buildOutfitCanvasHTML(lastFour[i].items)}
                    </div>
                `;
            } else {
                cover += `<div class="collection-cover-cell"></div>`;
            }
        }
        cover += `</div>`;

        collectionsGridHtml += `
            <div class="collection-card" onclick="navigateProfile('collection-detail', '${col.id}')">
                <div class="profile-grid-item">${cover}</div>
                <div class="collection-card-name">${escapeHTML(col.name)}</div>
                <div class="collection-card-count">${inCol.length} ${inCol.length === 1 ? 'outfit' : 'outfits'}</div>
            </div>
        `;
    });

    return `
        ${assignMode ? getAssignBannerHTML() : `
        <div class="profile-top-row">
            <h1 id="profileUserHandle" class="profile-handle">@elenaorganero</h1>
            <button type="button" onclick="navigateProfile('settings')" style="background: transparent; border: none; color: #111; cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center;" aria-label="Ajustes">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${PROFILE_ICONS.settings}</svg>
            </button>
        </div>

        <div class="profile-info-block">
            <div class="profile-avatar-wrap" style="cursor: pointer;" title="Cambiar foto de perfil" onclick="document.getElementById('avatarFileInput').click()">
                <img id="profileAvatarImg" src="" alt="Foto de perfil" class="profile-avatar-img" style="display: none;">
                <span id="profileAvatarPlaceholder" class="profile-avatar-placeholder">${profileIcon('user')}</span>
                <span class="profile-avatar-badge">${profileIcon('plus')}</span>
                <input type="file" id="avatarFileInput" accept="image/*" onchange="updateProfileAvatar(event)" class="profile-avatar-input" style="display: none;" title="Cambiar foto" aria-label="Cambiar foto de perfil">
            </div>
            <div style="flex: 1; min-width: 0;">
                <h2 id="profileNameDisplay" class="profile-name-display">Elena Organero</h2>
                <p id="profileBioDisplay" class="profile-bio-display">Tu armario, tus reglas. Creando combinaciones únicas ✨</p>
            </div>
        </div>

        <div class="profile-edit-btn-wrap">
            <button type="button" onclick="openEditProfileModal()" class="btn-secondary">Editar perfil</button>
        </div>

        ${getFutureFeaturesHTML()}
        `}

        <div class="profile-tab-header">
            <button type="button" onclick="switchProfileTab('outfits')" class="profile-tab-item ${activeProfileTab === 'outfits' ? 'active' : ''}">
                Outfits<span class="profile-tab-count">${looseOutfits.length}</span>
            </button>
            <button type="button" onclick="switchProfileTab('collections')" class="profile-tab-item ${activeProfileTab === 'collections' ? 'active' : ''}">
                Colecciones<span class="profile-tab-count">${collections.length}</span>
            </button>
        </div>

        <div class="profile-grid-scroll">
            <div class="profile-grid">
                ${activeProfileTab === 'outfits' ? outfitsGridHtml : collectionsGridHtml}
            </div>
        </div>
    `;
}

function openEditProfileModal() {
    ensureOverlayStyles();
    const old = document.getElementById('kombinaConfirmOverlay');
    if (old) old.remove();

    const currentName = profileData.name || 'Elena Organero';
    const currentHandle = profileData.handle || 'elenaorganero';
    const currentBio = profileData.bio || 'Tu armario, tus reglas. Creando combinaciones únicas ✨';
    const hasAvatar = !!profileData.avatar;

    const overlay = document.createElement('div');
    overlay.id = 'kombinaConfirmOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1100; background: rgba(20,20,20,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
    const close = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="background: #fff; width: 100%; max-width: 320px; border-radius: 20px; padding: 22px 18px 18px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.25); text-align: left;">
            <strong style="display: block; font-size: 1.05rem; color: #222; margin-bottom: 14px; text-align: center;">Editar perfil</strong>
            
            ${hasAvatar ? `
            <div style="margin-bottom: 14px; text-align: center;">
                <button type="button" id="removeAvatarBtn" style="background: #fdf2f2; border: 1px dashed #e0b4b4; padding: 7px 12px; border-radius: 10px; font-size: 0.8rem; color: #c93b3b; cursor: pointer;">🗑️ Quitar foto de perfil</button>
            </div>` : ''}

            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #555; margin-bottom: 4px;">Nombre:</label>
            <input type="text" id="editNameInput" value="${escapeHTML(currentName)}" style="width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 10px; box-sizing: border-box; outline: none;">

            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #555; margin-bottom: 4px;">Nombre de usuario:</label>
            <input type="text" id="editHandleInput" value="${escapeHTML(currentHandle)}" style="width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 10px; box-sizing: border-box; outline: none;">

            <label style="display: block; font-size: 0.78rem; font-weight: 600; color: #555; margin-bottom: 4px;">Biografía:</label>
            <textarea id="editBioInput" style="width: 100%; padding: 8px 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 16px; box-sizing: border-box; outline: none; resize: none; height: 60px; font-family: inherit;">${escapeHTML(currentBio)}</textarea>

            <div style="display: flex; gap: 10px;">
                <button type="button" id="cancelEditProfileBtn" style="flex: 1; height: 40px; background: #f3eee6; color: #4a4235; border: none; border-radius: 10px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">Cancelar</button>
                <button type="button" id="saveEditProfileBtn" style="flex: 1; height: 40px; background: #1f1f1f; color: #fff; border: none; border-radius: 10px; font-size: 0.85rem; font-weight: 500; cursor: pointer;">Guardar</button>
            </div>
        </div>
    `;

    if (hasAvatar) {
        overlay.querySelector('#removeAvatarBtn').onclick = async () => {
            try {
                await saveProfileData({ avatar: '' });
                close();
                renderProfileScreen();
                profileNotify('Foto de perfil eliminada');
            } catch (err) {
                console.error(err);
                profileNotify('No se pudo eliminar la foto');
            }
        };
    }

    overlay.querySelector('#cancelEditProfileBtn').onclick = close;
    overlay.querySelector('#saveEditProfileBtn').onclick = async () => {
        const newName = overlay.querySelector('#editNameInput').value.trim();
        const newHandle = overlay.querySelector('#editHandleInput').value.trim().replace(/^@/, '');
        const newBio = overlay.querySelector('#editBioInput').value.trim();

        const fields = { bio: newBio };
        if (newName) fields.name = newName;
        if (newHandle) fields.handle = newHandle;

        try {
            await saveProfileData(fields);
            close();
            renderProfileScreen();
            profileNotify('Perfil actualizado con éxito');
        } catch (err) {
            console.error(err);
            profileNotify('No se pudo guardar el perfil');
        }
    };

    document.body.appendChild(overlay);
}

function renderCollectionDetailView(container, colId) {
    const collections = profileCollections;
    const col = collections.find(c => String(c.id) === String(colId));
    if (!col) {
        navigateProfile('main');
        return;
    }

    const inCol = profileSavedOutfits.filter(o => String(o.collectionId) === String(colId));

    let gridHtml = '';
    if (inCol.length === 0) {
        gridHtml = `<div class="grid-empty-message">Esta colección está vacía.</div>`;
    } else {
        [...inCol].reverse().forEach(outfit => {
            gridHtml += getOutfitTileHTML(outfit, true);
        });
    }

    container.innerHTML = `
        ${assignMode ? getAssignBannerHTML() : ''}
        <div class="profile-subview-header">
            <button type="button" onclick="navigateProfile('main')" class="profile-icon-btn" aria-label="Volver">${profileIcon('back')}</button>
            
            <div id="collection-title-container-${col.id}" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <h2 id="collectionNameDisplay-${col.id}" class="profile-subview-title" style="margin: 0;">${escapeHTML(col.name)}</h2>
                <button class="aesthetic-edit-btn" onclick="enableCollectionNameEdit('${col.id}')" title="Editar nombre" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center; color: #2c2c2c;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
            </div>

            ${assignMode ? '<span></span>' : `<button type="button" onclick="deleteCollection('${col.id}')" class="profile-icon-btn" style="color: #1f1f1f;" aria-label="Eliminar colección">${profileIcon('trash')}</button>`}
        </div>

        <div class="profile-grid-scroll">
            <div class="profile-grid">
                ${gridHtml}
            </div>
        </div>
    `;
}

function enableCollectionNameEdit(colId) {
    const nameDisplay = document.getElementById(`collectionNameDisplay-${colId}`);
    if (!nameDisplay) return;
    const currentName = nameDisplay.innerText;
    const titleContainer = document.getElementById(`collection-title-container-${colId}`);

    titleContainer.innerHTML = `
        <input type="text" id="edit-collection-input-${colId}" class="aesthetic-input" value="${currentName}" style="padding: 4px 8px; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; outline: none; width: 140px; font-family: inherit;">
        <button class="aesthetic-save-btn" onclick="saveCollectionName('${colId}')" style="background: #111; color: #fff; border: none; border-radius: 4px; padding: 6px 10px; font-size: 0.8rem; cursor: pointer;">✔</button>
    `;
    const inputField = document.getElementById(`edit-collection-input-${colId}`);
    if (inputField) inputField.focus();
}

async function saveCollectionName(colId) {
    const inputField = document.getElementById(`edit-collection-input-${colId}`);
    if (!inputField) return;
    const newName = inputField.value.trim();
    if (!newName) return;

    try {
        const res = await fetch(`/api/collections/${colId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!res.ok) throw new Error('Error al renombrar');
        await fetchCollectionsForProfile();
        renderProfileScreen();
        profileNotify('Colección renombrada con éxito');
    } catch (err) {
        console.error(err);
        profileNotify('No se pudo renombrar la colección');
    }
}

function renderSettingsView(container) {
    container.innerHTML = `
        <div class="profile-subview-header">
            <button type="button" onclick="navigateProfile('main')" class="profile-icon-btn" aria-label="Volver">${profileIcon('back')}</button>
            <h2 class="profile-subview-title">Ajustes</h2>
            <span></span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
            <div class="settings-row" style="background: #fff; padding: 14px; border-radius: 14px; border: 1px solid #eae5de; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="handleLogout()">
                <div>
                    <strong class="settings-row-title" style="display: block; font-size: 0.9rem; color: #222;">Cerrar sesión</strong>
                    <span class="settings-row-desc" style="font-size: 0.78rem; color: #777;">Salir temporalmente de tu cuenta</span>
                </div>
                <span style="color: #666;">${sizedProfileIcon('logout', 18)}</span>
            </div>

            <div class="settings-row" style="background: #fff; padding: 14px; border-radius: 14px; border: 1px solid #eae5de; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onclick="handleDeleteAccount()">
                <div>
                    <strong class="settings-row-title" style="display: block; font-size: 0.9rem; color: #c93b3b;">Eliminar cuenta</strong>
                    <span class="settings-row-desc" style="font-size: 0.78rem; color: #777;">Borrar todos tus datos y armario</span>
                </div>
                <span style="color: #c93b3b;">${sizedProfileIcon('trash', 18)}</span>
            </div>
        </div>
    `;
}

function handleLogout() {
    profileConfirm({
        title: 'Cerrar sesión',
        message: '¿Estás seguro de que deseas cerrar sesión?',
        confirmText: 'Cerrar sesión',
        onConfirm: async () => {
            try {
                const response = await fetch('/api/logout', { method: 'POST' });
                if (!response.ok) throw new Error('No se pudo cerrar la sesión en el servidor.');
            } catch (error) {
                profileNotify(error.message);
                return;
            }

            localStorage.removeItem('kombina_user');
            localStorage.removeItem('kombina_user_id');
            localStorage.removeItem('kombina_session_token');
            ['kombina_calendar_assignments','kombina_temp_outfit','kombina_collections','kombina_outfits','kombina_wardrobe',
             'kombina_user_name','kombina_user_handle','kombina_user_bio','kombina_user_avatar']
                .forEach(k => localStorage.removeItem(k));
            profileNotify('Sesión cerrada correctamente');
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    });
}

function handleDeleteAccount() {
    profileConfirm({
        title: 'Eliminar cuenta',
        message: 'Se borrarán permanentemente tu armario, tus outfits y tus colecciones. Esta acción no se puede deshacer.',
        confirmText: 'Eliminar todo',
        onConfirm: async () => {
            try {
                const currentUser = localStorage.getItem('kombina_user');
                if (!currentUser) throw new Error('No hay sesión iniciada');

                // Llamada directa (no depende de que apiService.js esté cargado en esta página)
                const response = await fetch('/api/account', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentUser })
                });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la cuenta');

                localStorage.clear();
                profileNotify('Cuenta eliminada');
                setTimeout(() => { window.location.href = 'index.html'; }, 1000);
            } catch (error) {
                profileNotify(error.message || 'Error al eliminar la cuenta');
            }
        }
    });
}

function loadProfileHeaderData() {
    const avatar = profileData.avatar;
    const img = document.getElementById('profileAvatarImg');
    const ph = document.getElementById('profileAvatarPlaceholder');

    if (avatar) {
        if (img && ph) {
            img.src = avatar;
            img.style.display = 'block';
            ph.style.display = 'none';
        }
    } else {
        if (img && ph) {
            img.src = '';
            img.style.display = 'none';
            ph.style.display = 'flex';
        }
    }

    const name = profileData.name;
    if (name) {
        const nEl = document.getElementById('profileNameDisplay');
        if (nEl) nEl.textContent = name;
    }
    const handle = profileData.handle || 'elenaorganero';
    const hEl = document.getElementById('profileUserHandle');
    if (hEl) hEl.textContent = '@' + handle;

    const bio = profileData.bio;
    if (bio) {
        const bEl = document.getElementById('profileBioDisplay');
        if (bEl) bEl.textContent = bio;
    }
}

function updateProfileAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const small = await downscaleAvatar(evt.target.result);
            await saveProfileData({ avatar: small });
            renderProfileScreen();
            profileNotify('Foto de perfil actualizada');
        } catch (err) {
            console.error(err);
            profileNotify('No se pudo guardar la foto de perfil');
        }
    };
    reader.readAsDataURL(file);
}

function createNewCollectionPrompt() {
    ensureOverlayStyles();
    const old = document.getElementById('kombinaConfirmOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kombinaConfirmOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1100; background: rgba(20,20,20,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
    const close = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="background: #fff; width: 100%; max-width: 300px; border-radius: 20px; padding: 20px 18px 16px; box-sizing: border-box; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
            <strong style="display: block; font-size: 1rem; color: #222; margin-bottom: 6px;">Nueva colección</strong>
            <p style="margin: 0 0 12px; font-size: 0.85rem; line-height: 1.4; color: #666;">Introduce el nombre para tu nueva colección:</p>
            
            <input type="text" id="newCollectionNameInput" class="aesthetic-input" placeholder="Ej: Invierno 2026" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 16px; box-sizing: border-box; outline: none;">

            <div style="display: flex; gap: 10px;">
                <button type="button" id="cancelCollectionBtn" style="flex: 1; height: 42px; background: #f3eee6; color: #4a4235; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">Cancelar</button>
                <button type="button" id="saveCollectionBtn" style="flex: 1; height: 42px; background: #1f1f1f; color: #fff; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">Crear</button>
            </div>
        </div>
    `;

    overlay.querySelector('#cancelCollectionBtn').onclick = close;
    const inputField = overlay.querySelector('#newCollectionNameInput');
    
    const handleCreate = async () => {
        const name = inputField.value.trim();
        if (!name) return;
        
        try {
            const res = await fetch('/api/collections', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, userId: localStorage.getItem('kombina_user_id') })
            });
            if (!res.ok) throw new Error('Error al crear');
            await fetchCollectionsForProfile();
            close();
            renderProfileScreen();
            profileNotify('Colección creada con éxito');
        } catch (err) {
            console.error(err);
            profileNotify('No se pudo crear la colección');
        }
    };

    overlay.querySelector('#saveCollectionBtn').onclick = handleCreate;
    inputField.onkeydown = (e) => { if (e.key === 'Enter') handleCreate(); };

    document.body.appendChild(overlay);
    if (inputField) inputField.focus();
}

function loadCalendarAssignments() {
    return profileAssignments;
}

// Guarda en MongoDB los outfits de un día (lista vacía = quitar el día)
async function saveCalendarDay(dateKey, outfitIds) {
    const userId = localStorage.getItem('kombina_user_id');
    const res = await fetch(`/api/calendar/${dateKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, outfitIds })
    });
    if (!res.ok) throw new Error('Error al guardar el calendario');
    if (outfitIds.length > 0) profileAssignments[dateKey] = outfitIds.map(String);
    else delete profileAssignments[dateKey];
}
// (Al borrar un outfit, el servidor ya lo quita del calendario)

function getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateKeyLong(key) {
    const [y, m, d] = String(key).split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(d)} de ${months[parseInt(m) - 1]} de ${y}`;
}

function sizedProfileIcon(name, px) {
    return profileIcon(name).replace('<svg ', `<svg width="${px}" height="${px}" `);
}

function profileNotify(message) {
    if (typeof showInAppToast === 'function') return showInAppToast(message);
    const old = document.getElementById('profileToast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'profileToast';
    toast.textContent = message;
    toast.style.cssText = 'position: fixed; left: 50%; bottom: 100px; transform: translateX(-50%); background: #222; color: #fff; padding: 10px 18px; border-radius: 999px; font-size: 0.85rem; z-index: 1200; box-shadow: 0 6px 18px rgba(0,0,0,0.25);';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

function ensureOverlayStyles() {
    if (document.getElementById('kombinaOverlayStyles')) return;
    const style = document.createElement('style');
    style.id = 'kombinaOverlayStyles';
    style.textContent = `
        #outfitActionOverlay, #outfitActionOverlay *, #kombinaConfirmOverlay, #kombinaConfirmOverlay * { scrollbar-width: none; -ms-overflow-style: none; }
        #outfitActionOverlay::-webkit-scrollbar, #outfitActionOverlay *::-webkit-scrollbar { display: none; width: 0; height: 0; }
    `;
    document.head.appendChild(style);
}

function profileConfirm({ title, message, confirmText = 'Eliminar', onConfirm }) {
    ensureOverlayStyles();
    const old = document.getElementById('kombinaConfirmOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kombinaConfirmOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1100; background: rgba(20,20,20,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
    const close = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div role="alertdialog" aria-modal="true" style="background: #fff; width: 100%; max-width: 300px; border-radius: 20px; padding: 20px 18px 16px; box-sizing: border-box; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
            <strong style="display: block; font-size: 1rem; color: #222; margin-bottom: 6px;">${escapeHTML(title)}</strong>
            <p style="margin: 0 0 16px; font-size: 0.85rem; line-height: 1.4; color: #666;">${escapeHTML(message)}</p>
            <div style="display: flex; gap: 10px;">
                <button type="button" data-act="cancel" style="flex: 1; height: 42px; background: #f3eee6; color: #4a4235; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">Cancelar</button>
                <button type="button" data-act="ok" style="flex: 1; height: 42px; background: #1f1f1f; color: #fff; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">${escapeHTML(confirmText)}</button>
            </div>
        </div>
    `;
    overlay.querySelector('[data-act="cancel"]').onclick = close;
    overlay.querySelector('[data-act="ok"]').onclick = () => { close(); if (onConfirm) onConfirm(); };
    document.body.appendChild(overlay);
}

function getOutfitTileHTML(outfit, inCollection) {
    const outfitId = outfit._id || outfit.id;
    if (assignMode) {
        const selected = assignSelection.includes(String(outfitId));
        const badge = selected
            ? 'background: #222; border: 2px solid #222; color: #fff;'
            : 'background: rgba(255,255,255,0.92); border: 1.5px solid #bdb7ad; color: transparent;';
        return `
            <div class="profile-grid-item" data-outfit-id="${outfitId}" style="aspect-ratio: 3 / 4; position: relative; cursor: pointer; ${selected ? 'outline: 2px solid #222; outline-offset: -2px;' : ''}" onclick="toggleAssignSelection('${outfitId}')" title="Toca para marcar">
                ${getOutfitPreviewHTML(outfit)}
                <span style="position: absolute; top: 8px; right: 8px; z-index: 20; width: 22px; height: 22px; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; ${badge}">${sizedProfileIcon('check', 12)}</span>
            </div>
        `;
    }
    return `
        <div class="profile-grid-item" data-outfit-id="${outfitId}" style="aspect-ratio: 3 / 4;" onclick="openOutfitActions('${outfitId}', ${inCollection ? 'true' : 'false'})" title="Haz clic para ver opciones">
            ${getOutfitPreviewHTML(outfit)}
        </div>
    `;
}

function openOutfitActions(id, inCollection) {
    const outfit = profileSavedOutfits.find(o => String(o._id || o.id) === String(id));
    if (!outfit) return;

    closeOutfitActions();
    ensureOverlayStyles();

    const items = Array.isArray(outfit.items) ? outfit.items : [];
    const canvas = (typeof buildOutfitCanvasHTML === 'function' && items.length) ? buildOutfitCanvasHTML(items) : '';
    const outfitId = outfit._id || outfit.id;

    const overlay = document.createElement('div');
    overlay.id = 'outfitActionOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1000; overflow: hidden; background: rgba(20,20,20,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
    overlay.onclick = (e) => { if (e.target === overlay) closeOutfitActions(); };

    const collections = profileCollections;
    const currentColId = outfit.collectionId ? String(outfit.collectionId) : '';
    const moveRow = (label, targetId, isCurrent) => `
        <button type="button" ${isCurrent ? 'disabled' : `onclick="moveOutfitToCollection('${outfitId}', '${targetId}')"`} style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 11px 12px; box-sizing: border-box; background: ${isCurrent ? '#f5f1ea' : '#fff'}; border: none; border-bottom: 1px solid #f0ebe3; font-size: 0.85rem; color: #2c2c2c; text-align: left; cursor: ${isCurrent ? 'default' : 'pointer'};">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label}</span>
            ${isCurrent ? '<span style="flex-shrink: 0; margin-left: 8px; font-size: 0.72rem; color: #8a8070;">Actual</span>' : ''}
        </button>`;
    let moveOptions = moveRow('Outfits (sin colección)', '', currentColId === '');
    collections.forEach(col => { moveOptions += moveRow(escapeHTML(col.name), col.id, String(col.id) === currentColId); });

    overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="background: #fff; width: 100%; max-width: 320px; max-height: calc(100vh - 40px); overflow-y: auto; border-radius: 20px; padding: 14px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
            <div style="position: relative; width: 100%; height: 240px; background: #fbf9f5; border: 1px solid #eae5de; border-radius: 14px; overflow: hidden;">
                ${canvas}
                <button type="button" onclick="closeOutfitActions()" aria-label="Cerrar" style="position: absolute; top: 8px; right: 8px; z-index: 30; width: 28px; height: 28px; border-radius: 50%; border: 1px solid #e0dad0; background: #fff; color: #333; font-size: 0.8rem; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;">✕</button>
            </div>

            <div id="modal-outfit-title-container-${outfitId}" style="text-align: center; margin: 12px 0 14px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <strong id="modalOutfitNameDisplay-${outfitId}" style="font-size: 1rem; color: #222;">${escapeHTML(outfit.name || 'Outfit sin nombre')}</strong>
                    <button class="aesthetic-edit-btn" onclick="enableModalOutfitNameEdit('${outfitId}', ${inCollection})" title="Editar nombre" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                </div>
                <span style="font-size: 0.8rem; color: #777;">${items.length} ${items.length === 1 ? 'prenda' : 'prendas'}</span>
            </div>

            <div style="display: flex; gap: 10px;">
                <button type="button" onclick="assignOutfitToCalendar('${outfitId}')" style="flex: 1; height: 46px; background: #2c2c2c; color: #fff; border: none; border-radius: 14px; font-size: 0.9rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${sizedProfileIcon('calendar', 18)} Asignar outfit
                </button>
                <button type="button" onclick="deleteOutfitById('${outfitId}')" aria-label="Eliminar outfit" title="Eliminar outfit" style="width: 46px; height: 46px; flex-shrink: 0; background: #1f1f1f; color: #fff; border: none; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
                    ${sizedProfileIcon('trash', 20)}
                </button>
            </div>

            <button type="button" onclick="toggleMoveList()" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; height: 44px; margin-top: 10px; background: #fff; color: #2c2c2c; border: 1px solid #e0dad0; border-radius: 14px; font-size: 0.88rem; cursor: pointer;">
                ${sizedProfileIcon('folder', 18)} Mover a una colección
                <span id="moveChevron" style="display: flex; transition: transform 0.2s;">${sizedProfileIcon('chevron', 16)}</span>
            </button>
            <div id="moveCollectionList" style="display: none; margin-top: 8px; border: 1px solid #eae5de; border-radius: 12px; max-height: 170px; overflow-y: auto;">
                ${moveOptions}
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function enableModalOutfitNameEdit(id, inCollection) {
    const nameDisplay = document.getElementById(`modalOutfitNameDisplay-${id}`);
    if (!nameDisplay) return;
    const currentName = nameDisplay.innerText;
    const container = document.getElementById(`modal-outfit-title-container-${id}`);

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;">
            <input type="text" id="edit-modal-outfit-input-${id}" class="aesthetic-input" value="${currentName}" style="padding: 4px 8px; font-size: 0.9rem; border: 1px solid #ccc; border-radius: 4px; outline: none; width: 140px;">
            <button class="aesthetic-save-btn" onclick="saveModalOutfitName('${id}', ${inCollection})" style="background: #111; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">✔</button>
        </div>
    `;
    const inputField = document.getElementById(`edit-modal-outfit-input-${id}`);
    if (inputField) inputField.focus();
}

async function saveModalOutfitName(id, inCollection) {
    const inputField = document.getElementById(`edit-modal-outfit-input-${id}`);
    if (!inputField) return;
    const newName = inputField.value.trim();
    if (!newName) return;

    try {
        const response = await fetch(`/api/outfits/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        if (!response.ok) throw new Error('Error al actualizar nombre');

        const data = await response.json();
        const outfit = profileSavedOutfits.find(o => String(o._id || o.id) === String(id));
        if (outfit) outfit.name = data.outfit.name;

        closeOutfitActions();
        openOutfitActions(id, inCollection);
        renderProfileScreen();
        profileNotify('Nombre de outfit actualizado');
    } catch (err) {
        console.error('Error:', err);
        profileNotify('No se pudo actualizar el nombre');
    }
}

function closeOutfitActions() {
    const overlay = document.getElementById('outfitActionOverlay');
    if (overlay) overlay.remove();
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const confirmBox = document.getElementById('kombinaConfirmOverlay');
    if (confirmBox) confirmBox.remove(); else closeOutfitActions();
});

function assignOutfitToCalendar(id) {
    window.location.href = 'calendar.html?assign=' + encodeURIComponent(id);
}

function deleteOutfitById(id) {
    profileConfirm({
        title: 'Eliminar outfit',
        message: 'Se eliminará este outfit y también se quitará de tu calendario.',
        confirmText: 'Eliminar',
        onConfirm: async () => {
            try {
                const response = await fetch(`/api/outfits/${id}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Error al eliminar');

                profileSavedOutfits = profileSavedOutfits.filter(o => String(o._id || o.id) !== String(id));
                closeOutfitActions();
                renderProfileScreen();
                profileNotify('Outfit eliminado');
            } catch (err) {
                console.error('Error:', err);
                profileNotify('No se pudo eliminar el outfit');
            }
        }
    });
}

function toggleMoveList() {
    const list = document.getElementById('moveCollectionList');
    const chevron = document.getElementById('moveChevron');
    if (!list) return;
    const open = list.style.display === 'none';
    list.style.display = open ? 'block' : 'none';
    if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
    if (open) list.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

async function moveOutfitToCollection(outfitId, targetColId) {
    try {
        const updateData = targetColId ? { collectionId: targetColId } : { collectionId: null };
        const response = await fetch(`/api/outfits/${outfitId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        if (!response.ok) throw new Error('Error al mover');

        const data = await response.json();
        const idx = profileSavedOutfits.findIndex(o => String(o._id || o.id) === String(outfitId));
        if (idx !== -1) profileSavedOutfits[idx] = data.outfit;

        let destino = 'Outfits';
        if (targetColId) {
            const collections = profileCollections;
            const col = collections.find(c => String(c.id) === String(targetColId));
            if (col) destino = col.name;
        }

        closeOutfitActions();
        renderProfileScreen();
        profileNotify(targetColId ? `Movido a «${destino}»` : 'Movido a Outfits');
    } catch (err) {
        console.error('Error:', err);
        profileNotify('No se pudo mover el outfit');
    }
}

function getAssignBannerHTML() {
    return `
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; background: #ece5d8; border: 1px solid #ddd3c1; color: #2c2c2c; border-radius: 14px; padding: 12px 14px; margin-bottom: 14px;">
            <div style="min-width: 0;">
                <div style="font-size: 0.9rem; font-weight: 600;">Asignar outfits</div>
                <div style="font-size: 0.75rem; color: #7a705f; margin-top: 2px;">${escapeHTML(formatDateKeyLong(assignDateKey))}</div>
            </div>
            <button type="button" onclick="cancelAssignMode()" style="flex-shrink: 0; background: transparent; color: #4a4235; border: 1px solid #b9ad97; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; cursor: pointer;">Cancelar</button>
        </div>
    `;
}

function toggleAssignSelection(id) {
    const sid = String(id);
    const pos = assignSelection.indexOf(sid);
    if (pos === -1) assignSelection.push(sid); else assignSelection.splice(pos, 1);

    const outfit = profileSavedOutfits.find(o => String(o._id || o.id) === sid);
    const tile = document.querySelector(`[data-outfit-id="${sid}"]`);
    if (tile && outfit) tile.outerHTML = getOutfitTileHTML(outfit, false);

    updateAssignFloatingButton();
}

function updateAssignFloatingButton() {
    let btn = document.getElementById('finishSelectionBtn');

    if (!assignMode || currentProfileView === 'settings' || (assignSelection.length === 0 && assignInitialCount === 0)) {
        if (btn) btn.remove();
        return;
    }

    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'finishSelectionBtn';
        btn.type = 'button';
        btn.style.bottom = '90px';
        btn.onclick = confirmAssignOutfits;
        document.body.appendChild(btn);
    }

    const n = assignSelection.length;
    if (n > 0) btn.textContent = `✓ Asignar ${n} ${n === 1 ? 'outfit' : 'outfits'}`;
    else btn.textContent = '✓ Quitar outfits del día';

    if (getComputedStyle(btn).position === 'static') {
        Object.assign(btn.style, {
            position: 'fixed', left: '50%', transform: 'translateX(-50%)', zIndex: '50',
            background: '#222', color: '#fff', border: 'none', borderRadius: '999px',
            padding: '12px 22px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(0,0,0,0.25)'
        });
    }
}

async function confirmAssignOutfits() {
    const ids = assignSelection
        .map(sid => profileSavedOutfits.find(o => String(o._id || o.id) === sid))
        .filter(Boolean)
        .map(o => o._id || o.id);

    if (ids.length === 0 && assignInitialCount === 0) {
        profileNotify('Selecciona al menos un outfit.');
        return;
    }

    try {
        await saveCalendarDay(assignDateKey, ids); // hay que esperar antes de cambiar de página
    } catch (err) {
        console.error(err);
        profileNotify('No se pudo guardar en el calendario');
        return;
    }

    const key = assignDateKey;
    assignMode = false;
    window.location.href = 'calendar.html?date=' + encodeURIComponent(key);
}

function cancelAssignMode() {
    const key = assignDateKey;
    assignMode = false;
    window.location.href = 'calendar.html?date=' + encodeURIComponent(key);
}

function deleteCollection(colId) {
    const collections = profileCollections;
    const col = collections.find(c => String(c.id) === String(colId));
    const inCol = profileSavedOutfits.filter(o => String(o.collectionId) === String(colId));

    const countTxt = inCol.length === 0
        ? 'La colección está vacía.'
        : `Se eliminarán también sus ${inCol.length} ${inCol.length === 1 ? 'outfit' : 'outfits'}, y se quitarán del calendario.`;

    profileConfirm({
        title: col ? `Eliminar «${col.name}»` : 'Eliminar colección',
        message: countTxt + ' Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        onConfirm: async () => {
            try {
                for (const o of inCol) {
                    const oid = o._id || o.id;
                    await fetch(`/api/outfits/${oid}`, { method: 'DELETE' });
                }

                const delRes = await fetch(`/api/collections/${colId}`, { method: 'DELETE' });
                if (!delRes.ok) throw new Error('Error al eliminar la colección');

                await Promise.all([fetchOutfitsForProfile(), fetchCollectionsForProfile()]);

                navigateProfile('main');
                profileNotify('Colección eliminada');
            } catch (err) {
                console.error('Error:', err);
                profileNotify('Error al eliminar la colección');
            }
        }
    });
}