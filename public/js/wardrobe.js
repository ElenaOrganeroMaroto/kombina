// --- GESTIÓN DEL ARMARIO Y PRENDAS (CONECTADO A MONGODB) ---

let wardrobeItems = [];
let currentCategory = 'Todo';

document.addEventListener('DOMContentLoaded', async () => {
    if (document.getElementById('wardrobeGrid')) {
        await loadWardrobeFromServer(); // Cargamos las prendas reales desde MongoDB Atlas
        ensureItemModalExists();
        migrateTrimExistingItems();  // recorta las prendas antiguas (solo una vez)
        preloadBackgroundRemoval();  // precarga la IA en segundo plano
    }
});

// Cargar prendas del servidor asociadas al usuario actual
async function loadWardrobeFromServer() {
    try {
        const userId = localStorage.getItem('kombina_user_id');
        if (!userId) {
            console.warn('No hay usuario identificado. Usando armario vacío.');
            wardrobeItems = [];
            renderWardrobe();
            return;
        }

        const response = await fetch(`/api/clothing?userId=${userId}`);
        if (!response.ok) throw new Error('Error al cargar las prendas');
        
        wardrobeItems = await response.json();
        renderWardrobe();
    } catch (err) {
        console.error('Error conectando con el servidor para la ropa:', err);
        wardrobeItems = [];
        renderWardrobe();
    }
}

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
        card.setAttribute('data-id', item._id || item.id);
        
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
            openItemDetail(item._id || item.id);
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
    const item = wardrobeItems.find(i => String(i._id || i.id) === String(id));
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
    deleteBtn.onclick = () => deleteWardrobeItem(item._id || item.id);

    document.getElementById('itemDetailModal').style.display = 'flex';
}

function renderModalTitle(item) {
    const titleContainer = document.getElementById('modal-title-container');
    if (!titleContainer) return;

    const itemId = item._id || item.id;
    titleContainer.innerHTML = `
        <h3 id="modalItemName" style="margin: 0; font-size: 1rem; color: #2c2c2c; font-weight: 600; word-break: break-word;">${item.name}</h3>
        <button class="aesthetic-edit-btn" onclick="enableItemNameEdit('${itemId}')" title="Editar nombre">
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

async function saveItemName(id) {
    const inputField = document.getElementById('edit-item-input');
    if (!inputField) return;
    const newName = inputField.value.trim();

    if (!newName) return;

    const item = wardrobeItems.find(i => String(i._id || i.id) === String(id));
    if (item) {
        try {
            const response = await fetch(`/api/clothing/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName })
            });
            if (!response.ok) throw new Error('No se pudo guardar el nombre');

            item.name = newName;
            renderWardrobe();
            renderModalTitle(item);
        } catch (err) {
            console.error('Error al renombrar la prenda:', err);
            alert('No se pudo guardar el nombre en el servidor.');
        }
    }
}

function closeItemDetail() {
    const modal = document.getElementById('itemDetailModal');
    if (modal) modal.style.display = 'none';
}

async function deleteWardrobeItem(id) {
    showAestheticConfirm('¿Estás seguro de que deseas eliminar esta prenda permanentemente?', async () => {
        try {
            const response = await fetch(`/api/clothing/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('No se pudo eliminar la prenda');

            wardrobeItems = wardrobeItems.filter(i => String(i._id || i.id) !== String(id));
            
            const temp = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
            localStorage.setItem('kombina_temp_outfit', JSON.stringify(temp.filter(i => String(i._id || i.id) !== String(id))));
            
            closeItemDetail();
            applyFilters();
            if (typeof profileNotify === 'function') {
                profileNotify('Prenda eliminada');
            }
        } catch (err) {
            console.error('Error al eliminar:', err);
            alert('No se pudo eliminar la prenda del servidor.');
        }
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


// --- CARGA DE LA LIBRERÍA DE QUITAR FONDO ---
const BG_REMOVAL_URLS = [
    'https://esm.sh/@imgly/background-removal@1.4.5',
    'https://esm.sh/@imgly/background-removal@1.5.5',
    'https://unpkg.com/@imgly/background-removal@1.4.5/dist/index.js?module'
];

async function getRemoveBackgroundFn() {
    if (typeof window.removeBackground === 'function') return window.removeBackground;

    let lastError = null;
    for (const url of BG_REMOVAL_URLS) {
        try {
            const mod = await import(url);
            const fn = mod.removeBackground || mod.default;
            if (typeof fn === 'function') {
                window.removeBackground = fn;
                if (typeof mod.preload === 'function') window.preloadBackgroundModel = mod.preload;
                return fn;
            }
        } catch (err) {
            console.warn('No se pudo cargar la librería desde', url, err);
            lastError = err;
        }
    }
    throw lastError || new Error('No se pudo cargar la librería de quitar fondo.');
}

const BG_CONFIG = {
    model: 'small',
    output: { format: 'image/webp', quality: 0.85 }
};

async function preloadBackgroundRemoval() {
    try {
        await getRemoveBackgroundFn();
        if (typeof window.preloadBackgroundModel === 'function') {
            await window.preloadBackgroundModel(BG_CONFIG);
        }
        console.log('[IA] Modelo precargado');
    } catch (err) {
        console.warn('[IA] No se pudo precargar:', err);
    }
}

function trimTransparentPadding(source, pad = 0.02) {
    return new Promise((resolve) => {
        const img = new Image();
        const isBlob = source instanceof Blob;
        const url = isBlob ? URL.createObjectURL(source) : source;
        const fallback = () => {
            if (isBlob) {
                const r = new FileReader();
                r.onload = (e) => resolve(e.target.result);
                r.readAsDataURL(source);
            } else {
                resolve(source);
            }
        };
        img.onload = () => {
            if (isBlob) URL.revokeObjectURL(url);
            try {
                const w = img.naturalWidth, h = img.naturalHeight;
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(img, 0, 0);
                const data = ctx.getImageData(0, 0, w, h).data;

                let minX = w, minY = h, maxX = -1, maxY = -1;
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        if (data[(y * w + x) * 4 + 3] > 20) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                }
                if (maxX < 0) return fallback();

                const padX = Math.round((maxX - minX) * pad);
                const padY = Math.round((maxY - minY) * pad);
                minX = Math.max(0, minX - padX);
                minY = Math.max(0, minY - padY);
                maxX = Math.min(w - 1, maxX + padX);
                maxY = Math.min(h - 1, maxY + padY);

                const cw = maxX - minX + 1, ch = maxY - minY + 1;
                const out = document.createElement('canvas');
                out.width = cw; out.height = ch;
                out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
                resolve(out.toDataURL('image/webp', 0.85));
            } catch (err) {
                console.warn('No se pudo recortar la imagen:', err);
                fallback();
            }
        };
        img.onerror = () => { if (isBlob) URL.revokeObjectURL(url); fallback(); };
        img.src = url;
    });
}

async function migrateTrimExistingItems() {
    if (localStorage.getItem('kombina_trimmed_v1')) return;
    localStorage.setItem('kombina_trimmed_v1', '1');
}

function downscaleImage(file, maxSize = 768) {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            if (scale === 1) return resolve(file);
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(img.width * scale);
            canvas.height = Math.round(img.height * scale);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.92);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
        img.src = url;
    });
}

// --- COLA DE PROCESADO EN SEGUNDO PLANO ---
let pendingItems = 0;
let processingQueue = Promise.resolve();

function updateProcessingBadge() {
    let badge = document.getElementById('processingBadge');
    if (pendingItems <= 0) {
        if (badge) badge.remove();
        return;
    }
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'processingBadge';
        const bottom = document.getElementById('finishSelectionBtn') ? 200 : 145;
        badge.style.cssText = 'position:fixed;bottom:' + bottom + 'px;left:50%;transform:translateX(-50%);z-index:1200;background:#111;color:#fff;padding:8px 16px;border-radius:999px;font-size:0.8rem;font-weight:500;box-shadow:0 6px 18px rgba(0,0,0,0.2);display:flex;align-items:center;gap:8px;';
        document.body.appendChild(badge);
    }
    badge.innerHTML = `<span style="width:10px;height:10px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;display:inline-block;animation:kombinaSpin 0.8s linear infinite;"></span>
        Procesando ${pendingItems} prenda${pendingItems > 1 ? 's' : ''}...`;

    if (!document.getElementById('kombinaSpinStyle')) {
        const st = document.createElement('style');
        st.id = 'kombinaSpinStyle';
        st.textContent = '@keyframes kombinaSpin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
    }
}

window.addEventListener('beforeunload', (e) => {
    if (pendingItems > 0) { e.preventDefault(); e.returnValue = ''; }
});

async function processAndSaveItem({ file, name, category }) {
    try {
        const removeBgFn = await getRemoveBackgroundFn();
        const smallFile = await downscaleImage(file, 640);

        let imageBlob;
        try {
            imageBlob = await removeBgFn(smallFile, { ...BG_CONFIG, device: 'gpu' });
        } catch (gpuErr) {
            imageBlob = await removeBgFn(smallFile, { ...BG_CONFIG, device: 'cpu' });
        }

        const processedBase64 = await trimTransparentPadding(imageBlob);
        const userId = localStorage.getItem('kombina_user_id');

        const newItemData = {
            name: name || 'Prenda sin nombre',
            category: category,
            image: processedBase64,
            userId: userId
        };

        // Guardar directamente en MongoDB Atlas a través del servidor
        const response = await fetch('/api/clothing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newItemData)
        });

        if (!response.ok) throw new Error('Error al guardar la prenda en el servidor');

        const data = await response.json();
        wardrobeItems.push(data.item);

        applyFilters();
        if (typeof profileNotify === 'function') {
            profileNotify('¡Prenda añadida con éxito!');
        }
    } catch (error) {
        console.error('Error al procesar o guardar la prenda:', error);
        alert('Hubo un error al guardar la prenda en la base de datos.');
    } finally {
        pendingItems--;
        updateProcessingBadge();
    }
}

function addNewItem() {
    const nameInput = document.getElementById('itemName');
    const categorySelect = document.getElementById('itemCategory');
    const imageInput = document.getElementById('itemImageFile');

    const name = nameInput ? nameInput.value.trim() : '';
    const category = categorySelect ? categorySelect.value : 'Todo';

    if (!imageInput || !imageInput.files || imageInput.files.length === 0) {
        alert('Selecciona primero una foto de la prenda.');
        return;
    }

    const file = imageInput.files[0];

    closeAddModal();

    pendingItems++;
    updateProcessingBadge();

    processingQueue = processingQueue.then(() => processAndSaveItem({ file, name, category }));
}


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