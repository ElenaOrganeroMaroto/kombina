// --- GESTIÓN DE PERFIL Y VISTAS ESTILIZADAS ---

let currentProfileView = 'main'; // 'main', 'collection-detail', 'settings'
let activeProfileTab = 'outfits'; // 'outfits' o 'collections' dentro del perfil
let activeColId = null;

// --- MODO ASIGNAR ---
let assignMode = false;
let assignDateKey = null;
let assignSelection = [];   
let assignInitialCount = 0; 

// Lee los parámetros de la URL para activar el modo de asignación de outfits al calendario
(function readAssignParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') !== 'assign') return;

    assignMode = true;
    assignDateKey = params.get('date') || localStorage.getItem('kombina_target_date') || getTodayDateKey();

    const saved = JSON.parse(localStorage.getItem('kombina_outfits') || '[]');
    const current = loadCalendarAssignments()[assignDateKey] || [];
    assignSelection = current.map(String).filter(id => saved.some(o => String(o.id) === id));
    assignInitialCount = assignSelection.length;

    try { history.replaceState(null, '', window.location.pathname); } catch (e) { /* sin problema */ }
})();

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

// Genera una etiqueta SVG basada en el nombre del icono solicitado
function profileIcon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PROFILE_ICONS[name]}</svg>`;
}

// Escapa caracteres especiales en strings HTML para evitar inyecciones o errores de renderizado
function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Inicializa la pantalla del perfil una vez cargado el DOM
document.addEventListener('DOMContentLoaded', () => {
    renderProfileScreen();
});

// Cambia entre las diferentes vistas principales del perfil (principal, ajustes, colección)
function navigateProfile(view, param = null) {
    currentProfileView = view;
    if (param !== null) activeColId = param;
    renderProfileScreen();
}

// Cambia la pestaña activa dentro del perfil (entre 'outfits' y 'colecciones')
function switchProfileTab(tab) {
    activeProfileTab = tab;
    renderProfileScreen();
}

// Renderiza dinámicamente el contenido del perfil según la vista actual seleccionada
function renderProfileScreen() {
    const container = document.getElementById('profileDynamicContent');
    if (!container) return;

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

// Ajusta dinámicamente la altura de la cuadrícula de elementos del perfil
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

// Genera la vista previa en miniatura de un outfit
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

// Genera el HTML para las secciones futuras (Comunidad y Sugerencias IA)
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

// Genera el HTML correspondiente a la pantalla principal del perfil de usuario
function getMainProfileHTML() {
    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];

    const looseOutfits = savedOutfits.filter(o => !o.collectionId);
    let outfitsGridHtml = '';
    if (looseOutfits.length === 0) {
        outfitsGridHtml = `
            <div class="grid-empty-message">
                Aún no tienes outfits guardados.
            </div>
        `;
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
    {
        collections.forEach(col => {
            const inCol = savedOutfits.filter(o => String(o.collectionId) === String(col.id));
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
    }

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

// Abre el modal para editar los datos personales del perfil (nombre, handle, bio, avatar)
function openEditProfileModal() {
    ensureOverlayStyles();
    const old = document.getElementById('kombinaConfirmOverlay');
    if (old) old.remove();

    const currentName = localStorage.getItem('kombina_user_name') || 'Elena Organero';
    const currentHandle = localStorage.getItem('kombina_user_handle') || 'elenaorganero';
    const currentBio = localStorage.getItem('kombina_user_bio') || 'Tu armario, tus reglas. Creando combinaciones únicas ✨';
    const hasAvatar = !!localStorage.getItem('kombina_user_avatar');

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
        overlay.querySelector('#removeAvatarBtn').onclick = () => {
            localStorage.removeItem('kombina_user_avatar');
            close();
            renderProfileScreen();
            profileNotify('Foto de perfil eliminada');
        };
    }

    overlay.querySelector('#cancelEditProfileBtn').onclick = close;
    overlay.querySelector('#saveEditProfileBtn').onclick = () => {
        const newName = overlay.querySelector('#editNameInput').value.trim();
        const newHandle = overlay.querySelector('#editHandleInput').value.trim().replace(/^@/, '');
        const newBio = overlay.querySelector('#editBioInput').value.trim();

        if (newName) localStorage.setItem('kombina_user_name', newName);
        if (newHandle) localStorage.setItem('kombina_user_handle', newHandle);
        localStorage.setItem('kombina_user_bio', newBio);

        close();
        renderProfileScreen();
        profileNotify('Perfil actualizado con éxito');
    };

    document.body.appendChild(overlay);
}

// Renderiza la vista detallada del contenido de una colección específica
function renderCollectionDetailView(container, colId) {
    const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
    const col = collections.find(c => String(c.id) === String(colId));
    if (!col) {
        navigateProfile('main');
        return;
    }

    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const inCol = savedOutfits.filter(o => String(o.collectionId) === String(col.id));

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

// Habilita el modo de edición en línea del nombre de una colección
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

// Guarda el nuevo nombre modificado de una colección en el almacenamiento local
function saveCollectionName(colId) {
    const inputField = document.getElementById(`edit-collection-input-${colId}`);
    if (!inputField) return;
    const newName = inputField.value.trim();
    if (!newName) return;

    let collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
    const col = collections.find(c => String(c.id) === String(colId));

    if (col) {
        col.name = newName;
        localStorage.setItem('kombina_collections', JSON.stringify(collections));
        renderProfileScreen();
        profileNotify('Colección renombrada con éxito');
    }
}

// Renderiza la vista de ajustes de la aplicación (cerrar sesión y eliminar cuenta)
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

// Gestiona el proceso de cierre de sesión (borra credenciales y redirige al index.html)
function handleLogout() {
    profileConfirm({
        title: 'Cerrar sesión',
        message: '¿Estás seguro de que deseas cerrar sesión?',
        confirmText: 'Cerrar sesión',
        onConfirm: () => {
            // 1. Borramos la sesión del almacenamiento local
            localStorage.removeItem('kombina_user');
            
            profileNotify('Sesión cerrada correctamente');
            
            // 2. Redirigimos al index.html (pantalla de login)
            setTimeout(() => { window.location.href = 'index.html'; }, 1000);
        }
    });
}

// Gestiona el borrado total de la cuenta tanto en el servidor como limpiando el navegador
function handleDeleteAccount() {
    profileConfirm({
        title: 'Eliminar cuenta',
        message: 'Se borrarán permanentemente tu armario, tus outfits y tus colecciones. Esta acción no se puede deshacer.',
        confirmText: 'Eliminar todo',
        onConfirm: async () => {
            try {
                const currentUser = localStorage.getItem('kombina_user');
                
                // Si existe apiService, enviamos la petición al servidor para borrarla de su base de datos/memoria
                if (typeof apiService !== 'undefined' && currentUser) {
                    await apiService.deleteAccount(currentUser);
                }

                // Limpiamos todo el almacenamiento local del cliente
                localStorage.clear();
                
                profileNotify('Cuenta eliminada');
                setTimeout(() => { 
                    window.location.href = 'index.html'; 
                }, 1000);

            } catch (error) {
                profileNotify(error.message || 'Error al eliminar la cuenta');
            }
        }
    });
}

// Carga los datos guardados del usuario (avatar, nombre, handle y biografía) en la cabecera del perfil
function loadProfileHeaderData() {
    const avatar = localStorage.getItem('kombina_user_avatar');
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

    const name = localStorage.getItem('kombina_user_name');
    if (name) {
        const nEl = document.getElementById('profileNameDisplay');
        if (nEl) nEl.textContent = name;
    }
    const handle = localStorage.getItem('kombina_user_handle') || 'elenaorganero';
    const hEl = document.getElementById('profileUserHandle');
    if (hEl) hEl.textContent = '@' + handle;

    const bio = localStorage.getItem('kombina_user_bio');
    if (bio) {
        const bEl = document.getElementById('profileBioDisplay');
        if (bEl) bEl.textContent = bio;
    }
}

// Actualiza y guarda la nueva foto de perfil subida por el usuario
function updateProfileAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        localStorage.setItem('kombina_user_avatar', evt.target.result);
        renderProfileScreen();
        profileNotify('Foto de perfil actualizada');
    };
    reader.readAsDataURL(file);
}

// Muestra un modal de entrada para que el usuario asigne un nombre y cree una nueva colección
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
    
    const handleCreate = () => {
        const name = inputField.value.trim();
        if (!name) return;
        
        let collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
        collections.push({ id: Date.now(), name: name });
        localStorage.setItem('kombina_collections', JSON.stringify(collections));
        
        close();
        renderProfileScreen();
        profileNotify('Colección creada con éxito');
    };

    overlay.querySelector('#saveCollectionBtn').onclick = handleCreate;
    inputField.onkeydown = (e) => {
        if (e.key === 'Enter') handleCreate();
    };

    document.body.appendChild(overlay);
    if (inputField) inputField.focus();
}

// Carga las asignaciones de outfits guardadas en el calendario
function loadCalendarAssignments() {
    try { return JSON.parse(localStorage.getItem('kombina_calendar_assignments')) || {}; } catch (e) { return {}; }
}

// Guarda las asignaciones de outfits actualizadas en el calendario
function saveCalendarAssignments(assignments) {
    localStorage.setItem('kombina_calendar_assignments', JSON.stringify(assignments));
}

// Elimina un outfit de todas las fechas del calendario donde estuviera asignado
function purgeOutfitFromCalendar(outfitId) {
    const assignments = loadCalendarAssignments();
    Object.keys(assignments).forEach(key => {
        assignments[key] = (assignments[key] || []).filter(id => String(id) !== String(outfitId));
        if (assignments[key].length === 0) delete assignments[key];
    });
    saveCalendarAssignments(assignments);
}

// Devuelve la clave de la fecha actual en formato 'YYYY-MM-DD'
function getTodayDateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Formatea una clave de fecha a un formato legible largo en castellano (ej: '3 de octubre de 2026')
function formatDateKeyLong(key) {
    const [y, m, d] = String(key).split('-');
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${parseInt(d)} de ${months[parseInt(m) - 1]} de ${y}`;
}

// Redimensiona un icono SVG ajustando sus atributos de ancho y alto en píxeles
function sizedProfileIcon(name, px) {
    return profileIcon(name).replace('<svg ', `<svg width="${px}" height="${px}" `);
}

// Muestra un mensaje flotante de notificación (toast) temporal al usuario
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

// Asegura que existan los estilos CSS globales necesarios para los modales y barras de desplazamiento
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

// Muestra un diálogo de confirmación personalizado antes de realizar acciones críticas (eliminar, salir, etc.)
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

// Genera el HTML de una tarjeta individual de outfit en la cuadrícula (según esté en modo selección o normal)
function getOutfitTileHTML(outfit, inCollection) {
    if (assignMode) {
        const selected = assignSelection.includes(String(outfit.id));
        const badge = selected
            ? 'background: #222; border: 2px solid #222; color: #fff;'
            : 'background: rgba(255,255,255,0.92); border: 1.5px solid #bdb7ad; color: transparent;';
        return `
            <div class="profile-grid-item" data-outfit-id="${outfit.id}" style="aspect-ratio: 3 / 4; position: relative; cursor: pointer; ${selected ? 'outline: 2px solid #222; outline-offset: -2px;' : ''}" onclick="toggleAssignSelection(${outfit.id})" title="Toca para marcar">
                ${getOutfitPreviewHTML(outfit)}
                <span style="position: absolute; top: 8px; right: 8px; z-index: 20; width: 22px; height: 22px; box-sizing: border-box; border-radius: 50%; display: flex; align-items: center; justify-content: center; ${badge}">${sizedProfileIcon('check', 12)}</span>
            </div>
        `;
    }
    return `
        <div class="profile-grid-item" data-outfit-id="${outfit.id}" style="aspect-ratio: 3 / 4;" onclick="openOutfitActions(${outfit.id}, ${inCollection ? 'true' : 'false'})" title="Haz clic para ver opciones">
            ${getOutfitPreviewHTML(outfit)}
        </div>
    `;
}

// Abre un menú modal con las opciones de gestión disponibles para un outfit seleccionado
function openOutfitActions(id, inCollection) {
    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const outfit = savedOutfits.find(o => String(o.id) === String(id));
    if (!outfit) return;

    closeOutfitActions();
    ensureOverlayStyles();

    const items = Array.isArray(outfit.items) ? outfit.items : [];
    const canvas = (typeof buildOutfitCanvasHTML === 'function' && items.length) ? buildOutfitCanvasHTML(items) : '';

    const overlay = document.createElement('div');
    overlay.id = 'outfitActionOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1000; overflow: hidden; background: rgba(20,20,20,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
    overlay.onclick = (e) => { if (e.target === overlay) closeOutfitActions(); };

    const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
    const currentColId = outfit.collectionId ? String(outfit.collectionId) : '';
    const moveRow = (label, targetId, isCurrent) => `
        <button type="button" ${isCurrent ? 'disabled' : `onclick="moveOutfitToCollection(${outfit.id}, '${targetId}')"`} style="display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 11px 12px; box-sizing: border-box; background: ${isCurrent ? '#f5f1ea' : '#fff'}; border: none; border-bottom: 1px solid #f0ebe3; font-size: 0.85rem; color: #2c2c2c; text-align: left; cursor: ${isCurrent ? 'default' : 'pointer'};">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${label}</span>
            ${isCurrent ? '<span style="flex-shrink: 0; margin-left: 8px; font-size: 0.72rem; color: #8a8070;">Actual</span>' : ''}
        </button>`;
    let moveOptions = moveRow('Outfits (sin colección)', '', currentColId === '');
    collections.forEach(col => { moveOptions += moveRow(escapeHTML(col.name), col.id, String(col.id) === currentColId); });
    if (collections.length === 0) {
        moveOptions += '<div style="padding: 10px 12px; font-size: 0.78rem; color: #999;">Aún no tienes colecciones.</div>';
    }

    overlay.innerHTML = `
        <div role="dialog" aria-modal="true" style="background: #fff; width: 100%; max-width: 320px; max-height: calc(100vh - 40px); overflow-y: auto; border-radius: 20px; padding: 14px; box-sizing: border-box; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
            <div style="position: relative; width: 100%; height: 240px; background: #fbf9f5; border: 1px solid #eae5de; border-radius: 14px; overflow: hidden;">
                ${canvas}
                <button type="button" onclick="closeOutfitActions()" aria-label="Cerrar" style="position: absolute; top: 8px; right: 8px; z-index: 30; width: 28px; height: 28px; border-radius: 50%; border: 1px solid #e0dad0; background: #fff; color: #333; font-size: 0.8rem; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center;">✕</button>
            </div>

            <div id="modal-outfit-title-container-${outfit.id}" style="text-align: center; margin: 12px 0 14px; display: flex; flex-direction: column; align-items: center; gap: 4px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                    <strong id="modalOutfitNameDisplay-${outfit.id}" style="font-size: 1rem; color: #222;">${escapeHTML(outfit.name || 'Outfit sin nombre')}</strong>
                    <button class="aesthetic-edit-btn" onclick="enableModalOutfitNameEdit(${outfit.id}, ${inCollection})" title="Editar nombre" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                </div>
                <span style="font-size: 0.8rem; color: #777;">${items.length} ${items.length === 1 ? 'prenda' : 'prendas'}</span>
            </div>

            <div style="display: flex; gap: 10px;">
                <button type="button" onclick="assignOutfitToCalendar(${outfit.id})" style="flex: 1; height: 46px; background: #2c2c2c; color: #fff; border: none; border-radius: 14px; font-size: 0.9rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    ${sizedProfileIcon('calendar', 18)} Asignar outfit
                </button>
                <button type="button" onclick="deleteOutfitById(${outfit.id})" aria-label="Eliminar outfit" title="Eliminar outfit" style="width: 46px; height: 46px; flex-shrink: 0; background: #1f1f1f; color: #fff; border: none; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
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

// Habilita el input de edición de nombre dentro del modal de acciones de un outfit
function enableModalOutfitNameEdit(id, inCollection) {
    const nameDisplay = document.getElementById(`modalOutfitNameDisplay-${id}`);
    if (!nameDisplay) return;
    const currentName = nameDisplay.innerText;
    const container = document.getElementById(`modal-outfit-title-container-${id}`);

    container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%;">
            <input type="text" id="edit-modal-outfit-input-${id}" class="aesthetic-input" value="${currentName}" style="padding: 4px 8px; font-size: 0.9rem; border: 1px solid #ccc; border-radius: 4px; outline: none; width: 140px;">
            <button class="aesthetic-save-btn" onclick="saveModalOutfitName(${id}, ${inCollection})" style="background: #111; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">✔</button>
        </div>
    `;
    const inputField = document.getElementById(`edit-modal-outfit-input-${id}`);
    if (inputField) inputField.focus();
}

// Guarda el nuevo nombre modificado de un outfit específico
function saveModalOutfitName(id, inCollection) {
    const inputField = document.getElementById(`edit-modal-outfit-input-${id}`);
    if (!inputField) return;
    const newName = inputField.value.trim();
    if (!newName) return;

    let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const outfit = savedOutfits.find(o => String(o.id) === String(id));

    if (outfit) {
        outfit.name = newName;
        localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
        closeOutfitActions();
        openOutfitActions(id, inCollection);
        renderProfileScreen();
        profileNotify('Nombre de outfit actualizado');
    }
}

// Cierra el modal de acciones de los outfits
function closeOutfitActions() {
    const overlay = document.getElementById('outfitActionOverlay');
    if (overlay) overlay.remove();
}

// Escucha la tecla Escape para cerrar modales abiertos de forma rápida
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const confirmBox = document.getElementById('kombinaConfirmOverlay');
    if (confirmBox) confirmBox.remove(); else closeOutfitActions();
});

// Redirige al calendario para asignar un outfit concreto
function assignOutfitToCalendar(id) {
    window.location.href = 'calendar.html?assign=' + encodeURIComponent(id);
}

// Elimina un outfit por su ID y lo limpia también de las asignaciones del calendario
function deleteOutfitById(id) {
    profileConfirm({
        title: 'Eliminar outfit',
        message: 'Se eliminará este outfit y también se quitará de tu calendario.',
        confirmText: 'Eliminar',
        onConfirm: () => {
            let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
            savedOutfits = savedOutfits.filter(o => String(o.id) !== String(id));
            localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
            purgeOutfitFromCalendar(id);
            closeOutfitActions();
            renderProfileScreen();
            profileNotify('Outfit eliminado');
        }
    });
}

// Alterna la visibilidad de la lista desplegable para mover outfits entre colecciones
function toggleMoveList() {
    const list = document.getElementById('moveCollectionList');
    const chevron = document.getElementById('moveChevron');
    if (!list) return;
    const open = list.style.display === 'none';
    list.style.display = open ? 'block' : 'none';
    if (chevron) chevron.style.transform = open ? 'rotate(180deg)' : '';
    if (open) list.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// Mueve un outfit de una colección a otra (o lo deja sin colección)
function moveOutfitToCollection(outfitId, targetColId) {
    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const idx = savedOutfits.findIndex(o => String(o.id) === String(outfitId));
    if (idx === -1) return;

    let destino = 'Outfits';
    if (targetColId) {
        const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
        const col = collections.find(c => String(c.id) === String(targetColId));
        if (!col) return;
        savedOutfits[idx].collectionId = String(col.id);
        destino = col.name;
    } else {
        delete savedOutfits[idx].collectionId;
    }

    localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
    closeOutfitActions();
    renderProfileScreen();
    profileNotify(targetColId ? `Movido a «${destino}»` : 'Movido a Outfits');
}

// Genera el banner informativo superior cuando se activa el modo de asignación de outfits
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

// Alterna la selección de un outfit en el modo de asignación masiva al calendario
function toggleAssignSelection(id) {
    const sid = String(id);
    const pos = assignSelection.indexOf(sid);
    if (pos === -1) assignSelection.push(sid); else assignSelection.splice(pos, 1);

    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const outfit = savedOutfits.find(o => String(o.id) === sid);
    const tile = document.querySelector(`[data-outfit-id="${sid}"]`);
    if (tile && outfit) tile.outerHTML = getOutfitTileHTML(outfit, false);

    updateAssignFloatingButton();
}

// Muestra u oculta el botón flotante para confirmar la selección de outfits en el calendario
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

// Confirma y guarda en el almacenamiento local los outfits seleccionados para una fecha del calendario
function confirmAssignOutfits() {
    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const ids = assignSelection
        .map(sid => savedOutfits.find(o => String(o.id) === sid))
        .filter(Boolean)
        .map(o => o.id);

    if (ids.length === 0 && assignInitialCount === 0) {
        profileNotify('Selecciona al menos un outfit.');
        return;
    }

    const assignments = loadCalendarAssignments();
    if (ids.length > 0) assignments[assignDateKey] = ids;
    else delete assignments[assignDateKey];
    saveCalendarAssignments(assignments);

    const key = assignDateKey;
    assignMode = false;
    window.location.href = 'calendar.html?date=' + encodeURIComponent(key);
}

// Cancela el modo de asignación y regresa al calendario
function cancelAssignMode() {
    const key = assignDateKey;
    assignMode = false;
    window.location.href = 'calendar.html?date=' + encodeURIComponent(key);
}

// Elimina una colección completa, retirando sus outfits del calendario o de la lista general
function deleteCollection(colId) {
    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
    const col = collections.find(c => String(c.id) === String(colId));
    const inCol = savedOutfits.filter(o => String(o.collectionId) === String(colId));

    const countTxt = inCol.length === 0
        ? 'La colección está vacía.'
        : `Se eliminarán también sus ${inCol.length} ${inCol.length === 1 ? 'outfit' : 'outfits'}, y se quitarán del calendario.`;

    profileConfirm({
        title: col ? `Eliminar «${col.name}»` : 'Eliminar colección',
        message: countTxt + ' Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        onConfirm: () => {
            inCol.forEach(o => purgeOutfitFromCalendar(o.id));

            const remaining = savedOutfits.filter(o => String(o.collectionId) !== String(colId));
            localStorage.setItem('kombina_outfits', JSON.stringify(remaining));

            const remainingCols = collections.filter(c => String(c.id) !== String(colId));
            localStorage.setItem('kombina_collections', JSON.stringify(remainingCols));

            navigateProfile('main');
            profileNotify('Colección eliminada');
        }
    });
}