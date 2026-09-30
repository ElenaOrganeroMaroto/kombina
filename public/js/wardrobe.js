// --- GESTIÓN DEL ARMARIO Y PRENDAS ---

let wardrobeItems = JSON.parse(localStorage.getItem('kombina_wardrobe')) || [];
let currentCategory = 'Todo';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('wardrobeGrid')) {
        renderWardrobe();
        ensureItemModalExists();
    }
});


function renderWardrobe(itemsToRender = wardrobeItems) {
    const grid = document.getElementById('wardrobeGrid');
    if (!grid) return;

    grid.className = 'profile-grid';
    grid.innerHTML = '';

    if (itemsToRender.length === 0) {
        grid.innerHTML = `<div class="grid-empty-message">No hay prendas en esta categoría</div>`;
        return;
    }

    const inSelectMode = typeof isSelectMode === 'function' && isSelectMode();

    itemsToRender.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'profile-grid-item';
        card.setAttribute('data-category', item.category || '');
        card.setAttribute('data-id', item.id);
        
        let visualContent = `<div class="outfit-preview-empty"><svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>`;
        
        if (item.image) {
            visualContent = `
                <div class="outfit-preview">
                    <img src="${item.image}" style="width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; padding: 6px; box-sizing: border-box;">
                </div>
            `;
        }

        card.innerHTML = visualContent;
        card.style.cssText += 'cursor:pointer;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;';
        const img = card.querySelector('img');
        if (img) { img.draggable = false; img.style.pointerEvents = 'none'; }

        attachCardInteractions(card, item);

        grid.appendChild(card);
    });

    if (inSelectMode && typeof highlightSelectedCards === 'function') {
        highlightSelectedCards();
    }
}


// --- INTERACCIONES: TAP = SELECCIONAR (modo select) / MANTENER PULSADO = ABRIR PRENDA ---
const LONG_PRESS_MS = 500;
const MOVE_TOLERANCE = 10;

function attachCardInteractions(card, item) {
    let timer = null;
    let startX = 0, startY = 0;
    let longPressed = false;

    const cancelTimer = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };

    card.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        longPressed = false; 
        startX = e.clientX;
        startY = e.clientY;
        cancelTimer();
        timer = setTimeout(() => {
            timer = null;
            longPressed = true;
            if (navigator.vibrate) navigator.vibrate(15);
            openItemDetail(item.id);
        }, LONG_PRESS_MS);
    });

    card.addEventListener('pointermove', (e) => {
        if (!timer) return;
        if (Math.abs(e.clientX - startX) > MOVE_TOLERANCE || Math.abs(e.clientY - startY) > MOVE_TOLERANCE) {
            cancelTimer(); 
        }
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => card.addEventListener(evt, cancelTimer));

    card.addEventListener('contextmenu', (e) => e.preventDefault());

    card.addEventListener('click', (e) => {
        e.preventDefault();
        if (longPressed) { longPressed = false; return; } 

        if (typeof isSelectMode === 'function' && isSelectMode()) {
            if (typeof toggleOutfitSelection === 'function') {
                toggleOutfitSelection(item);
            } else {
                console.warn('toggleOutfitSelection no existe: carga create-outfit.js en wardrobe.html');
            }
        }
    });
}


// --- MODAL DE DETALLE Y ELIMINACIÓN DE PRENDA ---
function ensureItemModalExists() {
    if (document.getElementById('itemDetailModal')) return;

    const modalHtml = `
        <div id="itemDetailModal" style="display: none; position: fixed; inset: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 1000; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
            <div style="background: #ffffff; border-radius: 20px; width: 100%; max-width: 320px; padding: 24px 20px 20px 20px; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.15); text-align: center; border: 1px solid #e0dad0;">
                
                <button id="deleteItemBtn" style="position: absolute; top: 14px; right: 14px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: transparent; border: none; color: #111; cursor: pointer; padding: 0;" title="Eliminar prenda">
                    <svg width="22" height="22" fill="none" stroke="#111" stroke-width="1.8" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
                
                <div id="modalItemImageContainer" style="height: 200px; display: flex; align-items: center; justify-content: center; margin-bottom: 12px; margin-top: 10px;">
                </div>

                <div id="modal-title-container" style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;">
                    <h3 id="modalItemName" style="margin: 0; font-size: 1rem; color: #2c2c2c; font-weight: 600; word-break: break-word;"></h3>
                </div>

                <button onclick="closeItemDetail()" class="btn-secondary">Cerrar</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('itemDetailModal');
    modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeItemDetail(); });
}

function openItemDetail(id) {
    const item = wardrobeItems.find(i => String(i.id) === String(id));
    if (!item) return;

    ensureItemModalExists();

    const imgContainer = document.getElementById('modalItemImageContainer');
    const deleteBtn = document.getElementById('deleteItemBtn');

    if (item.image) {
        imgContainer.innerHTML = `<img src="${item.image}" style="max-width: 100%; max-height: 100%; object-fit: contain; mix-blend-mode: multiply;">`;
    } else {
        imgContainer.innerHTML = `<span style="font-size: 3rem;">🧥</span>`;
    }

    renderModalTitle(item);
    deleteBtn.onclick = () => deleteWardrobeItem(item.id);

    document.getElementById('itemDetailModal').style.display = 'flex';
}

function renderModalTitle(item) {
    const titleContainer = document.getElementById('modal-title-container');
    if (!titleContainer) return;

    titleContainer.innerHTML = `
        <h3 id="modalItemName" style="margin: 0; font-size: 1rem; color: #2c2c2c; font-weight: 600; word-break: break-word;">${item.name}</h3>
        <button class="aesthetic-edit-btn" onclick="enableItemNameEdit('${item.id}')" title="Editar nombre">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
    `;
}

function enableItemNameEdit(id) {
    const nameDisplay = document.getElementById('modalItemName');
    if (!nameDisplay) return;
    const currentName = nameDisplay.innerText;
    const titleContainer = document.getElementById('modal-title-container');

    titleContainer.innerHTML = `
        <input type="text" id="edit-item-input" class="aesthetic-input" value="${currentName}" style="padding: 4px 8px; font-size: 0.9rem; border: 1px solid #ccc; border-radius: 4px; outline: none; width: 140px;">
        <button class="aesthetic-save-btn" onclick="saveItemName('${id}')" style="background: #111; color: #fff; border: none; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer;">✔</button>
    `;
    const inputField = document.getElementById('edit-item-input');
    if (inputField) inputField.focus();
}

function saveItemName(id) {
    const inputField = document.getElementById('edit-item-input');
    if (!inputField) return;
    const newName = inputField.value.trim();

    if (!newName) return;

    const item = wardrobeItems.find(i => String(i.id) === String(id));
    if (item) {
        item.name = newName;
        localStorage.setItem('kombina_wardrobe', JSON.stringify(wardrobeItems));

        renderWardrobe();
        renderModalTitle(item);
    }
}

function closeItemDetail() {
    const modal = document.getElementById('itemDetailModal');
    if (modal) modal.style.display = 'none';
}

function deleteWardrobeItem(id) {
    showAestheticConfirm('¿Estás seguro de que deseas eliminar esta prenda permanentemente?', () => {
        wardrobeItems = wardrobeItems.filter(i => String(i.id) !== String(id));
        localStorage.setItem('kombina_wardrobe', JSON.stringify(wardrobeItems));
        const temp = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
        localStorage.setItem('kombina_temp_outfit', JSON.stringify(temp.filter(i => String(i.id) !== String(id))));
        closeItemDetail();
        applyFilters();
    });
}


function filterByCategory(category, btnElement) {
    currentCategory = category;
    document.querySelectorAll('.chip').forEach(chip => chip.classList.remove('active'));
    btnElement.classList.add('active');
    applyFilters();
}

function filterWardrobe() {
    applyFilters();
}

function applyFilters() {
    const searchEl = document.getElementById('searchInput');
    const searchQuery = searchEl ? searchEl.value.toLowerCase() : '';
    let filtered = wardrobeItems.filter(item => {
        const matchesCategory = currentCategory === 'Todo' || item.category === currentCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });
    renderWardrobe(filtered);
}

function toggleSearch() {
    const container = document.getElementById('searchContainer');
    if (container.style.display === 'none') {
        container.style.display = 'block';
        document.getElementById('searchInput').focus();
    } else {
        container.style.display = 'none';
        document.getElementById('searchInput').value = '';
        renderWardrobe();
    }
}

function openAddModal() {
    document.getElementById('addModal').style.display = 'flex';
}

function closeAddModal() {
    document.getElementById('addModal').style.display = 'none';
    document.getElementById('itemName').value = '';
    document.getElementById('itemImageFile').value = '';
}

function addNewItem() {
    const nameInput = document.getElementById('itemName');
    const categorySelect = document.getElementById('itemCategory');
    const imageInput = document.getElementById('itemImageFile');

    const name = nameInput.value.trim();
    const category = categorySelect.value;

    if (!imageInput.files || imageInput.files.length === 0) {
        return;
    }

    const file = imageInput.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const base64Image = e.target.result;

        const newItem = {
            id: Date.now(),
            name: name || 'Prenda sin nombre',
            category: category,
            image: base64Image
        };

        wardrobeItems.push(newItem);
        localStorage.setItem('kombina_wardrobe', JSON.stringify(wardrobeItems));

        nameInput.value = '';
        imageInput.value = '';
        closeAddModal();

        applyFilters();
    };

    reader.readAsDataURL(file);
}

// --- MODAL DE CONFIRMACIÓN PARA ELIMINAR ---
function showAestheticConfirm(message, onConfirm) {
    const existing = document.getElementById('aestheticConfirmModal');
    if (existing) existing.remove();

    const confirmHtml = `
        <div id="aestheticConfirmModal" style="display: flex; position: fixed; inset: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.4); z-index: 1100; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;">
            <div style="background: #ffffff; border-radius: 16px; width: 100%; max-width: 280px; padding: 20px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border: 1px solid #e0dad0;">
                <p style="margin: 0 0 20px 0; font-size: 0.95rem; color: #111; line-height: 1.4;">${message}</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="aestheticCancelBtn" style="flex: 1; padding: 8px; background: #f1f1f1; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">Cancelar</button>
                    <button id="aestheticOkBtn" style="flex: 1; padding: 8px; background: #111; color: #fff; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">Eliminar</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', confirmHtml);

    document.getElementById('aestheticCancelBtn').onclick = () => {
        document.getElementById('aestheticConfirmModal').remove();
    };

    document.getElementById('aestheticOkBtn').onclick = () => {
        document.getElementById('aestheticConfirmModal').remove();
        onConfirm();
    };
}