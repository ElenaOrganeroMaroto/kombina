// --- GESTIÓN DE OUTFITS Y SELECCIÓN INDEPENDIENTE POR CATEGORÍA ---

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('selectedOutfitItems')) {
        renderSelectedOutfitPreview();
        renderSavedOutfitsList();
    }

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'select') {
        const title = document.querySelector('h1, h2');
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
    cat = cat.toLowerCase().trim();
    
    if (cat === 'pantalones' || cat === 'pantalon' || cat === 'falda') return 'inferior';
    if (cat === 'camiseta' || cat === 'tops' || cat === 'top' || cat === 'camisa') return 'superior';
    if (cat === 'jersey') return 'jersey';
    if (cat === 'sudadera') return 'sudadera';
    if (cat === 'abrigo' || cat.includes('chaqueta')) return 'abrigo';
    if (cat === 'zapatos' || cat === 'calzado' || cat === 'zapatillas') return 'zapatos';
    if (cat === 'gorro' || cat === 'sombrero') return 'gorro';
    if (cat === 'pañuelo' || cat === 'bufanda') return 'pañuelo';
    if (cat === 'gafas') return 'gafas';
    if (cat === 'bolso' || cat === 'mochila') return 'bolso';
    if (cat === 'reloj' || cat === 'pulsera' || cat === 'accesorio' || cat === 'joyas') return 'accesorio';
    
    return cat;
}

document.addEventListener('click', (event) => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') !== 'select') return;

    if (event.target.id === 'finishSelectionBtn') return;

    const card = event.target.closest('#wardrobeGrid > div, .wardrobe-item, .prenda-card, .card');
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();

    const allCards = Array.from(document.querySelectorAll('#wardrobeGrid > div, .wardrobe-item, .prenda-card, .card'));
    const cardIndex = allCards.indexOf(card);
    const item = extractItemFromCard(card, cardIndex);

    let tempOutfit = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    const itemGroup = getCategoryGroup(item.category);

    const existingIndex = tempOutfit.findIndex(i => getCategoryGroup(i.category) === itemGroup);
    
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
});

function renderSelectedOutfitPreview() {
    const container = document.getElementById('selectedOutfitItems');
    if (!container) return;

    let selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    container.innerHTML = '';

    if (selectedItems.length === 0) {
        container.style.cssText = "display: none;";
        return;
    }

    container.style.cssText = "display: flex; gap: 8px; overflow-x: auto; padding: 5px;";
    selectedItems.forEach((item, index) => {
        const box = document.createElement('div');
        box.style.cssText = "width: 75px; height: 85px; background: white; border-radius: 12px; flex-shrink: 0; border: 1px solid #eae5de; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; position: relative;";
        
        let imgContent = item.image ? `<img src="${item.image}" style="max-height: 55px; max-width: 100%; object-fit: contain; mix-blend-mode: multiply;">` : `🧥`;
        
        box.innerHTML = `
            <button type="button" onclick="removeTempOutfitItem(${index})" style="position: absolute; top: -6px; right: -6px; background: #ff4d4d; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">✕</button>
            ${imgContent}
            <span style="font-size: 0.65rem; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; text-align: center; margin-top: 2px;">${item.name}</span>
        `;
        container.appendChild(box);
    });
}

function removeTempOutfitItem(index) {
    let selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    selectedItems.splice(index, 1);
    localStorage.setItem('kombina_temp_outfit', JSON.stringify(selectedItems));
    renderSelectedOutfitPreview();
}

function generateAndSaveOutfit() {
    let selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];
    if (selectedItems.length === 0) {
        alert('Por favor, selecciona al menos una prenda para el outfit.');
        return;
    }

    const container = document.getElementById('selectedOutfitItems');
    if (!container) return;

    container.style.display = 'flex';
    container.style.cssText = `
        position: relative;
        width: 100%;
        height: 480px;
        background: #fbf9f5;
        border: 1px solid #eae5de;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 15px;
        box-shadow: inset 0 2px 8px rgba(0,0,0,0.02);
    `;
    container.innerHTML = '';

    const slotMap = {
        'gorro': { top: '15px', left: '135px', width: '80px', height: '60px', z: 5 },
        'pañuelo': { top: '15px', left: '135px', width: '80px', height: '60px', z: 5 },
        'gafas': { top: '85px', left: '40px', width: '65px', height: '60px', z: 5 },
        'abrigo': { top: '150px', left: '25px', width: '105px', height: '220px', z: 4 },
        'chaqueta': { top: '150px', left: '25px', width: '105px', height: '220px', z: 4 },
        'jersey': { top: '85px', left: '110px', width: '90px', height: '90px', z: 3 },
        'sudadera': { top: '85px', left: '215px', width: '90px', height: '90px', z: 2 },
        'superior': { top: '185px', left: '130px', width: '90px', height: '90px', z: 6 },
        'inferior': { top: '285px', left: '125px', width: '100px', height: '135px', z: 3 },
        'zapatos': { top: '430px', left: '125px', width: '100px', height: '38px', z: 3 },
        'calzado': { top: '430px', left: '125px', width: '100px', height: '38px', z: 3 },
        'bolso': { top: '200px', left: '235px', width: '80px', height: '95px', z: 3 },
        'accesorio': { top: '310px', left: '235px', width: '80px', height: '110px', z: 3 }
    };

    const fallbackSlots = ['superior', 'inferior', 'abrigo', 'jersey', 'sudadera', 'zapatos', 'bolso', 'gafas', 'gorro', 'accesorio'];

    selectedItems.forEach((item, index) => {
        const group = getCategoryGroup(item.category);
        let matchedKey = Object.keys(slotMap).find(k => group.includes(k));
        
        if (!matchedKey) {
            matchedKey = fallbackSlots[index % fallbackSlots.length];
        }

        const pos = slotMap[matchedKey];

        const el = document.createElement('div');
        el.style.cssText = `
            position: absolute;
            top: ${pos.top};
            left: ${pos.left};
            width: ${pos.width};
            height: ${pos.height};
            z-index: ${pos.z};
            background: transparent;
            border: none;
            box-shadow: none;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        let imgContent = item.image ? `<img src="${item.image}" style="width: 100%; height: 100%; object-fit: contain; mix-blend-mode: multiply; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.12));">` : `🧥`;
        el.innerHTML = imgContent;
        container.appendChild(el);
    });

    const generateBtn = document.querySelector('button[onclick*="generateAndSaveOutfit"]') || document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.style.display = 'none';
    }

    let savePanel = document.getElementById('inlineSavePanel');
    if (!savePanel) {
        savePanel = document.createElement('div');
        savePanel.id = 'inlineSavePanel';
        container.parentNode.insertBefore(savePanel, container.nextSibling);
    }

    const defaultName = 'Mi Outfit ' + new Date().toLocaleDateString();
    savePanel.innerHTML = `
        <label style="display: block; font-size: 0.85rem; font-weight: 500; color: #333; margin-bottom: 6px;">Nombre de tu outfit:</label>
        <input type="text" id="outfitNameInput" value="${defaultName}" style="width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 8px; font-size: 0.9rem; margin-bottom: 12px; box-sizing: border-box;">
        <div style="display: flex; gap: 10px;">
            <button type="button" onclick="confirmSaveOutfit()" style="flex: 1; background: #222; color: white; border: none; padding: 10px; border-radius: 8px; font-weight: 500; cursor: pointer;">Guardar outfit</button>
            <button type="button" onclick="cancelOutfitCreation()" style="flex: 1; background: #f2f2f2; color: #333; border: none; padding: 10px; border-radius: 8px; font-weight: 500; cursor: pointer;">Cancelar</button>
        </div>
    `;
}

function confirmSaveOutfit() {
    const nameInput = document.getElementById('outfitNameInput');
    const outfitName = nameInput ? nameInput.value.trim() : 'Mi Outfit';
    let selectedItems = JSON.parse(localStorage.getItem('kombina_temp_outfit')) || [];

    if (selectedItems.length === 0) {
        alert('No hay prendas seleccionadas.');
        return;
    }

    const container = document.getElementById('selectedOutfitItems');
    const compositeHTML = container ? container.innerHTML : '';

    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    const newOutfit = {
        id: Date.now(),
        name: outfitName,
        compositeImageHTML: compositeHTML,
        items: selectedItems
    };

    savedOutfits.push(newOutfit);
    localStorage.setItem('kombina_outfits', JSON.stringify(savedOutfits));
    localStorage.removeItem('kombina_temp_outfit');

    const savePanel = document.getElementById('inlineSavePanel');
    if (savePanel) savePanel.remove();

    const generateBtn = document.querySelector('button[onclick*="generateAndSaveOutfit"]') || document.getElementById('generateBtn');
    if (generateBtn) generateBtn.style.display = 'block';

    renderSavedOutfitsList();
    renderSelectedOutfitPreview();
    
    showInAppToast('¡Outfit guardado con éxito!');
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

    const generateBtn = document.querySelector('button[onclick*="generateAndSaveOutfit"]') || document.getElementById('generateBtn');
    if (generateBtn) generateBtn.style.display = 'block';

    renderSelectedOutfitPreview();
}

function renderSavedOutfitsList() {
    const container = document.getElementById('savedOutfitsList');
    if (!container) return;

    const savedOutfits = JSON.parse(localStorage.getItem('kombina_outfits')) || [];
    container.innerHTML = '';

    if (savedOutfits.length === 0) {
        container.innerHTML = `<p style="font-size: 0.8rem; color: #888; text-align: center;">No hay conjuntos guardados todavía.</p>`;
        return;
    }

    const lastOutfit = savedOutfits[savedOutfits.length - 1];

    const card = document.createElement('div');
    card.style.cssText = "background: white; border: 1px solid #eae5de; border-radius: 16px; padding: 15px; display: flex; flex-direction: column; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.03); margin-top: 10px; text-align: center;";
    
    let previewHtml = '';
    if (lastOutfit.compositeImageHTML) {
        previewHtml = `
            <div style="position: relative; width: 100%; height: 320px; background: #fbf9f5; border: 1px solid #eae5de; border-radius: 12px; overflow: hidden; margin-bottom: 12px;">
                <div style="position: absolute; width: 480px; height: 480px; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.65); transform-origin: center center;">
                    ${lastOutfit.compositeImageHTML}
                </div>
            </div>
        `;
    } else {
        previewHtml = `<div style="display: flex; gap: 8px; align-items: center; justify-content: center; margin-bottom: 12px;">`;
        lastOutfit.items.forEach(it => {
            previewHtml += it.image ? `<img src="${it.image}" style="width: 50px; height: 50px; object-fit: contain; mix-blend-mode: multiply;">` : `🧥`;
        });
        previewHtml += `</div>`;
    }

    card.innerHTML = `
        ${previewHtml}
        <strong style="font-size: 1.1rem; display: block; color: #222; margin-bottom: 2px;">${lastOutfit.name}</strong>
        <span style="font-size: 0.85rem; color: #777;">${lastOutfit.items.length} prendas combinadas</span>
    `;
    container.appendChild(card);
}