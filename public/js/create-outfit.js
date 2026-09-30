// --- GESTIÓN DE OUTFITS Y SELECCIÓN INDEPENDIENTE POR CATEGORÍA ---

// Modo selección: se lee de la URL UNA vez y se quita de la barra de direcciones,
// así que al recargar la página se vuelve al armario normal.
function isSelectMode() {
    if (window.__kombinaSelectMode === undefined) {
        window.__kombinaSelectMode = new URLSearchParams(window.location.search).get('mode') === 'select';
        if (window.__kombinaSelectMode) {
            history.replaceState(null, '', window.location.pathname);
        }
    }
    return window.__kombinaSelectMode;
}

document.addEventListener('DOMContentLoaded', () => {
    migrateSavedOutfits();
    const inSelectMode = isSelectMode();
    const onOutfitPage = !!document.getElementById('selectedOutfitItems');
    const onWardrobePage = !!document.getElementById('wardrobeGrid');

    // El borrador de outfit solo sobrevive mientras estás eligiendo prendas
    if (onWardrobePage) {
        if (inSelectMode) {
            sessionStorage.setItem('kombina_keep_temp', '1');
        } else {
            sessionStorage.removeItem('kombina_keep_temp');
            localStorage.removeItem('kombina_temp_outfit');
        }
    } else if (onOutfitPage) {
        if (sessionStorage.getItem('kombina_keep_temp')) {
            sessionStorage.removeItem('kombina_keep_temp'); // vienes del selector: conserva la selección
        } else {
            localStorage.removeItem('kombina_temp_outfit'); // entrada nueva: outfit vacío
        }
    }

    if (onOutfitPage) {
        renderSelectedOutfitPreview();
        renderSavedOutfitsList();
    }

    if (inSelectMode) {
        const title = document.getElementById('wardrobeTitle');
        if (title) title.textContent = 'Selecciona tus prendas';

        injectSelectionFloatingButton();
        highlightSelectedCards();
    }
});

function goToWardrobeSelector() {
    window.location.href = 'wardrobe.html?mode=select';
}

function injectSelectionFloatingButton() {
    if (document.getElementById('finishSelectionBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'finishSelectionBtn';
    btn.innerHTML = '✓ Terminar selección';
    btn.style.bottom = '90px'; // por encima de la barra de navegación
    
    btn.onclick = () => {
        window.location.href = 'create-outfit.html';
    };

    document.body.appendChild(btn);
}

function highlightSelectedCards() {
    let tempOutfit = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    const cards = document.querySelectorAll('#wardrobeGrid > div, .wardrobe-item, .prenda-card, .card');
    
    cards.forEach((card, index) => {
        let item = extractItemFromCard(card, index);
        const isSelected = tempOutfit.some(i => String(i.id) === String(item.id));
        
        if (isSelected) {
            card.style.border = '2px solid #222';
            card.style.transform = 'scale(0.97)';
            card.style.transition = 'all 0.2s';
        } else {
            card.style.border = '1px solid #eae5de';
            card.style.transform = '';
        }
    });
}

function extractItemFromCard(card, index = 0) {
    const cardId = card.getAttribute('data-id');
    if (cardId) {
        const found = wardrobeItems.find(i => String(i.id) === String(cardId));
        if (found) return found;
    }

    const imgEl = card.querySelector('img');
    const nameEl = card.querySelector('span, h3, p, strong');
    const itemName = nameEl ? nameEl.textContent.trim() : 'Prenda';
    
    return {
        id: cardId || (itemName + '-' + index),
        name: itemName,
        image: imgEl ? imgEl.src : '',
        category: card.getAttribute('data-category') || currentCategory
    };
}

function getCategoryGroup(cat) {
    if (!cat) return 'otro';
    // minúsculas y sin tildes (pañuelo -> panuelo) para comparar de forma tolerante
    cat = String(cat).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

    const rules = [
        ['vestido',   /vestido/],
        ['inferior',  /pantal|jean|vaquero|falda|short|bermuda|legging/],
        ['jersey',    /jersey|sueter|cardigan|punto/],
        ['sudadera',  /sudadera|hoodie/],
        ['abrigo',    /abrigo|chaqueta|cazadora|americana|blazer|gabardina|chaleco|parka/],
        ['superior',  /\btops?\b|camiseta|camisa|blusa|body|polo/],
        ['zapatos',   /zapat|calzad|zapatill|bota|sandalia|tenis|deportiv/],
        ['gorro',     /gorro|gorra|sombrero|panuelo|bufanda/],
        ['gafas',     /gafa/],
        ['bolso',     /bolso|mochila|cartera|bandolera/],
        ['accesorio', /reloj|pulsera|accesorio|joya|collar|cinturon|pendiente|anillo/]
    ];
    for (const [group, re] of rules) {
        if (re.test(cat)) return group;
    }
    return cat;
}

// Grupo de una prenda: por su categoría y, si no se reconoce, por su nombre ("jeans", "top bordado"...)
function getItemGroup(item) {
    const g = getCategoryGroup(item && item.category);
    if (OUTFIT_SLOTS[g]) return g;
    const byName = getCategoryGroup(item && item.name);
    return OUTFIT_SLOTS[byName] ? byName : g;
}

// Lógica de selección independiente por categoría (llamada desde wardrobe.js)
function toggleOutfitSelection(item) {
    let tempOutfit = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    const itemGroup = getItemGroup(item);

    const existingIndex = tempOutfit.findIndex(i => getItemGroup(i) === itemGroup);
    
    if (existingIndex !== -1) {
        if (String(tempOutfit[existingIndex].id) === String(item.id)) {
            tempOutfit.splice(existingIndex, 1);
        } else {
            tempOutfit[existingIndex] = item;
        }
    } else {
        tempOutfit.push(item);
    }

    localStorage.setItem('kombina_temp_outfit', JSON.stringify(tempOutfit));
    highlightSelectedCards();
}

function escapeOutfitText(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Dibuja el outfit en construcción: vista previa en vivo (con botón "+") y fila de prendas
function renderSelectedOutfitPreview() {
    const stage = document.getElementById('selectedOutfitItems');
    if (!stage) return;
    const chips = document.getElementById('selectedOutfitChips');
    const selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];

    stage.style.cssText = `
        position: relative;
        width: 100%;
        height: clamp(240px, 41vh, 360px);
        background: #fbf9f5;
        border: 1px solid #eae5de;
        border-radius: 16px;
        overflow: hidden;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.02);
    `;
    stage.innerHTML = buildOutfitCanvasHTML(selectedItems) + `
        <button type="button" onclick="goToWardrobeSelector()" aria-label="Añadir o quitar prendas" title="Añadir o quitar prendas"
            style="position: absolute; top: 10px; right: 10px; z-index: 20; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e0dad0; background: #fff; color: #333; font-size: 1.3rem; line-height: 1; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; padding: 0;">+</button>
    `;

    if (chips) {
        chips.innerHTML = selectedItems.map((item, index) => `
            <div style="position: relative; width: 64px; height: 76px; flex-shrink: 0; background: #fff; border: 1px solid #eae5de; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; box-sizing: border-box;">
                <button type="button" onclick="removeTempOutfitItem(${index})" aria-label="Quitar prenda" style="position: absolute; top: -6px; right: -6px; background: #ff4d4d; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">✕</button>
                ${item.image ? `<img src="${item.image}" alt="" style="max-height: 44px; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;">` : '🧥'}
                <span style="font-size: 0.6rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center; margin-top: 3px;">${escapeOutfitText(item.name)}</span>
            </div>
        `).join('');
    }

    updateCreateOutfitLayout();
}

function removeTempOutfitItem(index) {
    let selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    selectedItems.splice(index, 1);
    localStorage.setItem('kombina_temp_outfit', JSON.stringify(selectedItems));
    renderSelectedOutfitPreview();
}

// "Generar outfit": abre el panel para nombrar y guardar el outfit (la vista previa ya está en pantalla)
function generateAndSaveOutfit() {
    const selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    if (selectedItems.length === 0) {
        showInAppToast('Selecciona al menos una prenda para el outfit.');
        return;
    }
    const builder = document.getElementById('outfitBuilder');
    if (!builder || document.getElementById('inlineSavePanel')) return;

    const savePanel = document.createElement('div');
    savePanel.id = 'inlineSavePanel';
    savePanel.style.marginTop = '14px';
    builder.appendChild(savePanel);

    const defaultName = 'Mi Outfit ' + new Date().toLocaleDateString();
    const collections = JSON.parse(localStorage.getItem('kombina_collections')) || [];
    let collectionsOptions = `<option value="">Ninguna (Solo en Outfits)</option>`;
    collections.forEach(col => {
        collectionsOptions += `<option value="${escapeOutfitText(col.id)}">${escapeOutfitText(col.name)}</option>`;
    });

    savePanel.innerHTML = `
        <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #333; margin-bottom: 6px;">Nombre de tu outfit:</label>
        <input type="text" id="outfitNameInput" value="${escapeOutfitText(defaultName)}" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 12px; box-sizing: border-box;">

        <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #333; margin-bottom: 6px;">Guardar en colección:</label>
        <select id="outfitCollectionSelect" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 12px; box-sizing: border-box; background: white;">
            ${collectionsOptions}
        </select>

        <div style="display: flex; gap: 10px;">
            <button type="button" onclick="confirmSaveOutfit()" style="flex: 1; background: #222; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 500; cursor: pointer;">Guardar outfit</button>
            <button type="button" onclick="cancelOutfitCreation()" style="flex: 1; background: #f2f2f2; color: #333; border: none; padding: 10px; border-radius: 8px; font-weight: 500; cursor: pointer;">Cancelar</button>
        </div>
    `;
    updateCreateOutfitLayout();
}

function confirmSaveOutfit() {
    const nameInput = document.getElementById('outfitNameInput');
    const collectionSelect = document.getElementById('outfitCollectionSelect');
    
    const outfitName = nameInput ? nameInput.value.trim() : 'Mi Outfit';
    const collectionId = collectionSelect ? collectionSelect.value : '';
    let selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];

    if (selectedItems.length === 0) {
        showInAppToast('No hay prendas seleccionadas.');
        return;
    }

    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const newOutfit = {
        id: Date.now(),
        name: outfitName,
        items: selectedItems
    };

    if (collectionId) {
        newOutfit.collectionId = collectionId;
    }

    savedOutfits.push(newOutfit);
    try {
        localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
    } catch (err) {
        console.error('No se pudo guardar el outfit:', err);
        showInAppToast('No se pudo guardar: el almacenamiento está lleno. Elimina alguna prenda u outfit.');
        return;
    }
    localStorage.removeItem('kombina_temp_outfit');

    const savePanel = document.getElementById('inlineSavePanel');
    if (savePanel) savePanel.remove();

    renderSavedOutfitsList();
    renderSelectedOutfitPreview();
    
    showInAppToast('¡Outfit guardado con éxito!');
    const savedList = document.getElementById('savedOutfitsList');
    if (savedList) setTimeout(() => savedList.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
}

function showInAppToast(message) {
    const existingToast = document.getElementById('inAppToast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'inAppToast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

function cancelOutfitCreation() {
    const savePanel = document.getElementById('inlineSavePanel');
    if (savePanel) savePanel.remove();

    renderSelectedOutfitPreview();
}

function renderSavedOutfitsList() {
    const container = document.getElementById('savedOutfitsList');
    if (!container) return;

    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    container.innerHTML = '';

    if (savedOutfits.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: #888; text-align: center;">Aún no has guardado ningún outfit.</p>`;
        return;
    }

    const lastOutfit = savedOutfits[savedOutfits.length - 1];

    const card = document.createElement('div');
    card.style.cssText = "background: white; border: 1px solid #eae5de; border-radius: 16px; padding: 15px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-top: 10px; text-align: center;";
    
    const previewHtml = `
        <div style="position: relative; width: 100%; height: clamp(250px, 34vh, 330px); background: #fbf9f5; border: 1px solid #eae5de; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
            ${buildOutfitCanvasHTML(lastOutfit.items)}
        </div>
    `;

    card.innerHTML = `
        ${previewHtml}
        <div id="outfit-title-container-${lastOutfit.id}" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 2px; flex-wrap: wrap;">
            <strong id="outfitNameDisplay-${lastOutfit.id}" style="font-size: 1.1rem; color: #222;">${escapeOutfitText(lastOutfit.name)}</strong>
            <button class="aesthetic-edit-btn" onclick="enableOutfitNameEdit(${lastOutfit.id})" title="Editar nombre" style="background: none; border: none; cursor: pointer; padding: 2px; display: flex; align-items: center;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </button>
        </div>
        <span style="font-size: 0.85rem; color: #777;">${lastOutfit.items.length} prendas combinadas</span>

        <div style="display: flex; gap: 10px; width: 100%; margin-top: 14px;">
            <button type="button" onclick="createPageAssignOutfit(${lastOutfit.id})" style="flex: 1; height: 46px; background: #2c2c2c; color: #fff; border: none; border-radius: 14px; font-size: 0.9rem; font-weight: 500; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 10h18M8 2.5v4M16 2.5v4"/></svg>
                Asignar outfit
            </button>
            <button type="button" onclick="createPageDeleteOutfit(${lastOutfit.id})" aria-label="Eliminar outfit" title="Eliminar outfit" style="width: 46px; height: 46px; flex-shrink: 0; background: #1f1f1f; color: #fff; border: none; border-radius: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0;">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
            </button>
        </div>
    `;
    container.appendChild(card);
}

function enableOutfitNameEdit(id) {
    const nameDisplay = document.getElementById(`outfitNameDisplay-${id}`);
    if (!nameDisplay) return;
    const currentName = nameDisplay.innerText;
    const titleContainer = document.getElementById(`outfit-title-container-${id}`);

    titleContainer.innerHTML = `
        <input type="text" id="edit-outfit-input-${id}" class="aesthetic-input" value="${currentName}" style="padding: 4px 8px; font-size: 0.9rem; border: 1px solid #ccc; border-radius: 4px; outline: none; width: 140px;">
        <button class="aesthetic-save-btn" onclick="saveOutfitName('${id}')" style="background: #111; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">✔</button>
    `;
    const inputField = document.getElementById(`edit-outfit-input-${id}`);
    if (inputField) inputField.focus();
}

function saveOutfitName(id) {
    const inputField = document.getElementById(`edit-outfit-input-${id}`);
    if (!inputField) return;
    const newName = inputField.value.trim();
    if (!newName) return;

    let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const outfit = savedOutfits.find(o => String(o.id) === String(id));
    
    if (outfit) {
        outfit.name = newName;
        localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
        renderSavedOutfitsList();
        showInAppToast('Nombre actualizado con éxito');
    }
}

// Te lleva al calendario para que elijas el día de este outfit
function createPageAssignOutfit(id) {
    window.location.href = 'calendar.html?assign=' + encodeURIComponent(id);
}

// Ventana de confirmación dentro de la app (sustituye a confirm() del navegador)
function createPageConfirm({ title, message, confirmText, onConfirm }) {
    const old = document.getElementById('kombinaConfirmOverlay');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kombinaConfirmOverlay';
    overlay.style.cssText = 'position: fixed; inset: 0; z-index: 1100; background: rgba(20,20,20,0.5); display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;';
    const close = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    overlay.innerHTML = `
        <div role="alertdialog" aria-modal="true" style="background: #fff; width: 100%; max-width: 300px; border-radius: 20px; padding: 20px 18px 16px; box-sizing: border-box; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.25);">
            <strong style="display: block; font-size: 1rem; color: #222; margin-bottom: 6px;">${escapeOutfitText(title)}</strong>
            <p style="margin: 0 0 16px; font-size: 0.85rem; line-height: 1.4; color: #666;">${escapeOutfitText(message)}</p>
            <div style="display: flex; gap: 10px;">
                <button type="button" data-act="cancel" style="flex: 1; height: 42px; background: #f3eee6; color: #4a4235; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">Cancelar</button>
                <button type="button" data-act="ok" style="flex: 1; height: 42px; background: #1f1f1f; color: #fff; border: none; border-radius: 12px; font-size: 0.88rem; font-weight: 500; cursor: pointer;">${escapeOutfitText(confirmText || 'Eliminar')}</button>
            </div>
        </div>
    `;
    overlay.querySelector('[data-act="cancel"]').onclick = close;
    overlay.querySelector('[data-act="ok"]').onclick = () => { close(); if (onConfirm) onConfirm(); };
    document.body.appendChild(overlay);
}

// Elimina el outfit (y lo quita del calendario)
function createPageDeleteOutfit(id) {
    createPageConfirm({
        title: 'Eliminar outfit',
        message: 'Se eliminará este outfit y también se quitará de tu calendario.',
        confirmText: 'Eliminar',
        onConfirm: () => {
            let savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
            savedOutfits = savedOutfits.filter(o => String(o.id) !== String(id));
            localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));

            try {
                const assignments = JSON.parse(localStorage.getItem('kombina_calendar_assignments')) || {};
                Object.keys(assignments).forEach(key => {
                    assignments[key] = (assignments[key] || []).filter(x => String(x) !== String(id));
                    if (assignments[key].length === 0) delete assignments[key];
                });
                localStorage.setItem('kombina_calendar_assignments', JSON.stringify(assignments));
            } catch (err) {
                console.warn('No se pudo limpiar el calendario:', err);
            }

            renderSavedOutfitsList();
            showInAppToast('Outfit eliminado');
        }
    });
}

// --- LIENZO DE OUTFIT (compartido por create-outfit, perfil y colecciones) ---
const OUTFIT_CANVAS_W = 397;
const OUTFIT_CANVAS_H = 590;
const OUTFIT_SLOTS = {
    gorro:     { l: 39.8, t: 0.3,  w: 24.9, h: 13.4, z: 5 },
    gafas:     { l: 0.5,  t: 19.3, w: 18.4, h: 13.6, z: 5 },
    jersey:    { l: 21.7, t: 17.1, w: 26.9, h: 23.9, z: 3 },
    sudadera:  { l: 60.5, t: 17.3, w: 29.2, h: 23.1, z: 2 },
    superior:  { l: 35.5, t: 33.9, w: 33.5, h: 21.0, z: 6 },
    vestido:   { l: 35.5, t: 33.9, w: 33.5, h: 54.0, z: 5 },
    abrigo:    { l: 0.5,  t: 35.9, w: 30.5, h: 45.6, z: 4 },
    bolso:     { l: 74.1, t: 46.4, w: 25.2, h: 21.0, z: 3 },
    inferior:  { l: 35.5, t: 57.8, w: 33.2, h: 30.0, z: 3 },
    accesorio: { l: 75.3, t: 71.0, w: 24.2, h: 23.2, z: 3 },
    zapatos:   { l: 35.7, t: 90.2, w: 33.0, h: 9.3,  z: 3 }
};

function buildOutfitCanvasHTML(items) {
    const list = Array.isArray(items) ? items : [];
    const placed = list.map(item => ({
        item,
        slot: OUTFIT_SLOTS[getItemGroup(item)] || OUTFIT_SLOTS.accesorio
    }));
    if (placed.length === 0) return '';

    let minL = 100, minT = 100, maxR = 0, maxB = 0;
    placed.forEach(({ slot }) => {
        minL = Math.min(minL, slot.l);
        minT = Math.min(minT, slot.t);
        maxR = Math.max(maxR, slot.l + slot.w);
        maxB = Math.max(maxB, slot.t + slot.h);
    });
    const bw = maxR - minL;
    const bh = maxB - minT;
    const ratio = (bw * OUTFIT_CANVAS_W) / (bh * OUTFIT_CANVAS_H);

    const cells = placed.map(({ item, slot }) => {
        const content = item.image
            ? `<img src="${item.image}" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain;mix-blend-mode:multiply;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.12));pointer-events:none;">`
            : `<span style="font-size:1.4rem;">🧥</span>`;
        const l = ((slot.l - minL) / bw * 100).toFixed(2);
        const t = ((slot.t - minT) / bh * 100).toFixed(2);
        const w = (slot.w / bw * 100).toFixed(2);
        const h = (slot.h / bh * 100).toFixed(2);
        return `<div style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;z-index:${slot.z};display:flex;align-items:center;justify-content:center;">${content}</div>`;
    }).join('');

    return `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;container-type:size;padding:6px;box-sizing:border-box;">
        <div style="position:relative;flex:none;width:min(100cqw, calc(100cqh * ${ratio.toFixed(4)}));aspect-ratio:${ratio.toFixed(4)};">${cells}</div>
    </div>`;
}

function migrateSavedOutfits() {
    try {
        const outfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
        let changed = false;
        outfits.forEach(o => {
            if (o.compositeImageHTML && Array.isArray(o.items) && o.items.length) {
                delete o.compositeImageHTML;
                changed = true;
            }
        });
        if (changed) localStorage.setItem('kombina_outfits', JSON.stringify(outfits));
    } catch (err) {
        console.warn('Migración de outfits omitida:', err);
    }
}

function updateCreateOutfitLayout() {
    const builder = document.getElementById('outfitBuilder');
    if (!builder) return;

    const temp = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    const hasItems = temp.length > 0;
    const saving = !!document.getElementById('inlineSavePanel');

    const setVisible = (id, visible, display) => {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? display : 'none';
    };
    setVisible('addPrendasBox', !hasItems, 'flex');
    setVisible('outfitBuilder', hasItems, 'block');
    setVisible('selectedOutfitChips', hasItems && !saving, 'flex');
    setVisible('outfitHint', hasItems && !saving, 'block');
    setVisible('generateBtn', hasItems && !saving, 'block');
    setVisible('savedSection', !hasItems, 'block');
}