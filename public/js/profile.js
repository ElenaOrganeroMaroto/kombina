// --- GESTIÓN DE PERFIL Y VISTAS ESTILIZADAS ---

let currentProfileView = 'main'; // 'main', 'collection-detail', 'settings'
let activeProfileTab = 'outfits'; // 'outfits' o 'collections' dentro del perfil
let activeColId = null;

// Iconos de línea (mismo trazo en todo el perfil, sustituyen a los emojis)
const PROFILE_ICONS = {
    settings: '<path d="M4 6h3M11 6h9"/><circle cx="9" cy="6" r="2"/><path d="M4 12h9M17 12h3"/><circle cx="15" cy="12" r="2"/><path d="M4 18h5M13 18h7"/><circle cx="11" cy="18" r="2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/>',
    camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16v4M17 18h4"/>',
    hanger: '<path d="M12 9V7.5a2.5 2.5 0 1 0-2.5-2.5"/><path d="M12 9l9 6.2a1 1 0 0 1-.6 1.8H3.6a1 1 0 0 1-.6-1.8L12 9z"/>'
};

function profileIcon(name) {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PROFILE_ICONS[name]}</svg>`;
}

function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

document.addEventListener('DOMContentLoaded', () => {
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
}

// Ajusta la altura del área de scroll de la cuadrícula a un número ENTERO de filas,
// para que nunca se vea una tarjeta cortada. El resto de filas se ven al hacer scroll.
function fitProfileGrid() {
    const scroller = document.querySelector('.profile-grid-scroll');
    const content = document.querySelector('.content-scroll');
    if (!scroller || !content) return;

    const grid = scroller.firstElementChild;
    const items = grid.querySelectorAll(':scope > .profile-grid-item, :scope > .collection-card');
    if (items.length === 0) {           // estado vacío: altura natural
        scroller.style.height = '';
        return;
    }

    scroller.style.height = '';         // medir con altura natural
    const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
    const rowH = items[0].getBoundingClientRect().height;
    if (!rowH) return;

    const cs = getComputedStyle(content);
    const scrollerTop = scroller.getBoundingClientRect().top - content.getBoundingClientRect().top + content.scrollTop;
    const available = content.clientHeight - parseFloat(cs.paddingBottom) - scrollerTop;

    const totalRows = Math.ceil(items.length / 3);
    const fitRows = Math.max(1, Math.floor((available + gap) / (rowH + gap)));
    const rows = Math.min(totalRows, fitRows);
    scroller.style.height = (rows * rowH + (rows - 1) * gap) + 'px';
}

window.addEventListener('resize', fitProfileGrid);
window.addEventListener('load', fitProfileGrid);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitProfileGrid);

// Miniatura de un outfit (reutilizada en el perfil y en el detalle de colección)
function getOutfitPreviewHTML(outfit) {
    if (!outfit.compositeImageHTML) {
        return `<div class="outfit-preview-empty">${profileIcon('hanger')}</div>`;
    }
    return `
        <div class="outfit-preview">
            <div class="outfit-preview-canvas">${outfit.compositeImageHTML}</div>
        </div>
    `;
}

// --- BLOQUE COMÚN DE NOVEDADES (FUTURO) ---
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

// --- 1. VISTA PRINCIPAL ---
function getMainProfileHTML() {
    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];

    // Pestaña de Outfits
    let outfitsGridHtml = '';
    if (savedOutfits.length === 0) {
        outfitsGridHtml = `
            <div class="grid-empty-message">
                Aún no tienes outfits guardados.
            </div>
        `;
    } else {
        savedOutfits.forEach(outfit => {
            outfitsGridHtml += `
                <div class="profile-grid-item" onclick="deleteOutfitPrompt(${outfit.id})" title="Haz clic para gestionar">
                    ${getOutfitPreviewHTML(outfit)}
                </div>
            `;
        });
    }

    // Pestaña de Colecciones
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
                if (lastFour[i] && lastFour[i].compositeImageHTML) {
                    cover += `
                        <div class="collection-cover-cell">
                            <div class="collection-cover-canvas">${lastFour[i].compositeImageHTML}</div>
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
        <!-- Cabecera de perfil -->
        <div class="profile-top-row">
            <h1 id="profileUserHandle" class="profile-handle">@elenaorganero</h1>
            <button type="button" onclick="navigateProfile('settings')" class="profile-icon-btn" aria-label="Ajustes">${profileIcon('settings')}</button>
        </div>

        <div class="profile-info-block">
            <div class="profile-avatar-wrap">
                <img id="profileAvatarImg" src="" alt="Foto de perfil" class="profile-avatar-img">
                <span id="profileAvatarPlaceholder" class="profile-avatar-placeholder">${profileIcon('user')}</span>
                <span class="profile-avatar-badge">${profileIcon('plus')}</span>
                <input type="file" id="avatarFileInput" accept="image/*" onchange="updateProfileAvatar(event)" class="profile-avatar-input" title="Cambiar foto" aria-label="Cambiar foto de perfil">
            </div>
            <div style="flex: 1; min-width: 0;">
                <h2 id="profileNameDisplay" contenteditable="true" onblur="saveProfileName(this.innerText)" class="profile-name-display" title="Haz clic para editar tu nombre">Elena Organero</h2>
                <p id="profileBioDisplay" contenteditable="true" onblur="saveProfileBio(this.innerText)" class="profile-bio-display" title="Haz clic para editar tu biografía">Tu armario, tus reglas. Creando combinaciones únicas ✨</p>
            </div>
        </div>

        <div class="profile-edit-btn-wrap">
            <button type="button" onclick="triggerEditProfileFocus()" class="btn-secondary">Editar perfil</button>
        </div>

        <!-- Novedades: justo debajo de "Editar perfil" -->
        ${getFutureFeaturesHTML()}

        <!-- Pestañas -->
        <div class="profile-tab-header">
            <button type="button" onclick="switchProfileTab('outfits')" class="profile-tab-item ${activeProfileTab === 'outfits' ? 'active' : ''}">
                Outfits<span class="profile-tab-count">${savedOutfits.length}</span>
            </button>
            <button type="button" onclick="switchProfileTab('collections')" class="profile-tab-item ${activeProfileTab === 'collections' ? 'active' : ''}">
                Colecciones<span class="profile-tab-count">${collections.length}</span>
            </button>
        </div>

        <!-- Contenido de la pestaña activa (scroll por filas completas) -->
        <div class="profile-grid-scroll">
            <div class="profile-grid">
                ${activeProfileTab === 'outfits' ? outfitsGridHtml : collectionsGridHtml}
            </div>
        </div>
    `;
}

// --- 2. VISTA DETALLE DE UNA COLECCIÓN ---
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
        inCol.forEach(outfit => {
            gridHtml += `
                <div class="profile-grid-item" onclick="removeOutfitFromCollectionPrompt(${outfit.id})" title="Sacar de colección">
                    ${getOutfitPreviewHTML(outfit)}
                </div>
            `;
        });
    }

    container.innerHTML = `
        <div class="profile-subview-header">
            <button type="button" onclick="navigateProfile('main')" class="profile-icon-btn" aria-label="Volver">${profileIcon('back')}</button>
            <h2 class="profile-subview-title">${escapeHTML(col.name)}</h2>
            <button type="button" onclick="deleteCollection('${col.id}')" class="profile-icon-btn danger" aria-label="Eliminar colección">${profileIcon('trash')}</button>
        </div>

        <div class="profile-grid-scroll">
            <div class="profile-grid">
                ${gridHtml}
            </div>
        </div>
    `;
}

// --- 3. VISTA AJUSTES ---
function renderSettingsView(container) {
    const savedLang = localStorage.getItem('kombina_lang') || 'es';

    container.innerHTML = `
        <div class="profile-subview-header">
            <button type="button" onclick="navigateProfile('main')" class="profile-icon-btn" aria-label="Volver">${profileIcon('back')}</button>
            <h2 class="profile-subview-title">Ajustes</h2>
            <span></span>
        </div>

        <div class="settings-row">
            <div>
                <strong class="settings-row-title">Idioma de la aplicación</strong>
                <span class="settings-row-desc">Selecciona tu idioma preferido</span>
            </div>
            <select id="languageSelect" onchange="changeLanguage(this.value)" class="settings-select" aria-label="Idioma de la aplicación">
                <option value="es" ${savedLang === 'es' ? 'selected' : ''}>Español</option>
                <option value="en" ${savedLang === 'en' ? 'selected' : ''}>English</option>
                <option value="fr" ${savedLang === 'fr' ? 'selected' : ''}>Français</option>
            </select>
        </div>
    `;
}

// --- FUNCIONES DE SOPORTE Y DATOS ---
function loadProfileHeaderData() {
    const avatar = localStorage.getItem('kombina_user_avatar');
    if (avatar) {
        const img = document.getElementById('profileAvatarImg');
        const ph = document.getElementById('profileAvatarPlaceholder');
        if (img && ph) {
            img.src = avatar;
            img.style.display = 'block';
            ph.style.display = 'none';
        }
    }
    const name = localStorage.getItem('kombina_user_name');
    if (name) {
        const nEl = document.getElementById('profileNameDisplay');
        const hEl = document.getElementById('profileUserHandle');
        if (nEl) nEl.textContent = name;
        if (hEl) hEl.textContent = '@' + name.toLowerCase().replace(/\s+/g, '');
    }
    const bio = localStorage.getItem('kombina_user_bio');
    if (bio) {
        const bEl = document.getElementById('profileBioDisplay');
        if (bEl) bEl.textContent = bio;
    }
}

function updateProfileAvatar(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
        localStorage.setItem('kombina_user_avatar', evt.target.result);
        renderProfileScreen();
    };
    reader.readAsDataURL(file);
}

function saveProfileName(newName) {
    if (!newName.trim()) return;
    localStorage.setItem('kombina_user_name', newName.trim());
    fitProfileGrid();
    const hEl = document.getElementById('profileUserHandle');
    if (hEl) hEl.textContent = '@' + newName.trim().toLowerCase().replace(/\s+/g, '');
}

function saveProfileBio(newBio) {
    localStorage.setItem('kombina_user_bio', newBio.trim());
    fitProfileGrid();
}

function triggerEditProfileFocus() {
    const nameEl = document.getElementById('profileNameDisplay');
    if (nameEl) {
        nameEl.focus();
        const range = document.createRange();
        range.selectNodeContents(nameEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

function changeLanguage(lang) {
    localStorage.setItem('kombina_lang', lang);
}

function createNewCollectionPrompt() {
    const name = prompt('Nombre de la nueva colección:');
    if (!name || !name.trim()) return;
    let collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
    collections.push({ id: Date.now(), name: name.trim() });
    localStorage.setItem('kombina_collections', JSON.stringify(collections));
    renderProfileScreen();
}

function deleteOutfitPrompt(id) {
    if (confirm('¿Qué deseas hacer con este outfit?\n\n- Aceptar: Eliminar permanentemente\n- Cancelar: Mantenerlo')) {
        let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
        savedOutfits = savedOutfits.filter(o => String(o.id) !== String(id));
        localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
        renderProfileScreen();
    }
}

function removeOutfitFromCollectionPrompt(id) {
    if (confirm('¿Sacar este outfit de la colección?')) {
        let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
        const idx = savedOutfits.findIndex(o => String(o.id) === String(id));
        if (idx !== -1) {
            delete savedOutfits[idx].collectionId;
            localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
            renderProfileScreen();
        }
    }
}

function deleteCollection(colId) {
    if (confirm('¿Eliminar esta colección? Los outfits volverán a estar disponibles de forma general.')) {
        let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
        savedOutfits = savedOutfits.map(o => {
            if (String(o.collectionId) === String(colId)) delete o.collectionId;
            return o;
        });
        localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));

        let collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
        collections = collections.filter(c => String(c.id) !== String(colId));
        localStorage.setItem('kombina_collections', JSON.stringify(collections));
        navigateProfile('main');
    }
}