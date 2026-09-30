// --- GESTIÓN DEL ARMARIO Y PRENDAS ---

let wardrobeItems = JSON.parse(localStorage.getItem('kombina_wardrobe')) || [];
let currentCategory = 'Todo';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('wardrobeGrid')) {
        renderWardrobe();
    }
});


function renderWardrobe(itemsToRender = wardrobeItems) {
    const grid = document.getElementById('wardrobeGrid');
    if (!grid) return;

    grid.style.cssText = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 0;";
    grid.innerHTML = '';

    if (itemsToRender.length === 0) {
        grid.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #888; margin-top: 40px;">No hay prendas en esta categoría</p>`;
        return;
    }

    itemsToRender.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        card.setAttribute('data-category', item.category || '');
        card.setAttribute('data-id', item.id);
        
        card.style.cssText = "background: #ffffff; border-radius: 12px; height: 135px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #eae5de; padding: 6px; text-align: center; overflow: hidden; position: relative; box-shadow: 0 2px 5px rgba(0,0,0,0.02); cursor: pointer;";
        
        let visualContent = `<span style="font-size: 2.2rem; margin: auto;">🧥</span>`;
        if (item.image) {
            visualContent = `<div style="flex: 1; display: flex; align-items: center; justify-content: center; width: 100%;"><img src="${item.image}" style="max-width: 100%; max-height: 95px; object-fit: contain; mix-blend-mode: multiply;"></div>`;
        }

        card.innerHTML = `
            ${visualContent}
            <div style="width: 100%; padding-top: 2px;">
                <strong style="font-size: 0.75rem; color: #333; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.name}</strong>
            </div>
        `;
        grid.appendChild(card);
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
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
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


// --- AÑADIR PRENDA ---
function addNewItem() {
    const nameInput = document.getElementById('itemName');
    const categorySelect = document.getElementById('itemCategory');
    const imageInput = document.getElementById('itemImageFile');

    const name = nameInput.value.trim();
    const category = categorySelect.value;

    if (!imageInput.files || imageInput.files.length === 0) {
        alert('Por favor, selecciona una imagen para la prenda antes de guardarla.');
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

