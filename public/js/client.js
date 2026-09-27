async function registerUser() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;
    const msgElement = document.getElementById('mensaje');

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            msgElement.style.color = 'green';
            msgElement.innerText = '¡Registro exitoso! Revisa tu correo.';
        } else {
            msgElement.style.color = 'red';
            msgElement.innerText = data.error || 'Ocurrió un error';
        }
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = 'Error de conexión con el servidor.';
    }
}



async function loginUser() {
    const email = document.getElementById('logEmail').value;
    const password = document.getElementById('logPassword').value;
    const msgElement = document.getElementById('mensajeLogin');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (response.ok) {
            msgElement.style.color = 'green';
            msgElement.innerText = '¡Inicio de sesión exitoso! Redirigiendo...';
            
            // Guardamos un flag básico en localStorage y redirigimos al armario
            localStorage.setItem('kombina_user', email);
            
            setTimeout(() => {
                window.location.href = 'wardrobe.html';
            }, 1000); // Salta a la pantalla del armario en 1 segundo
        } else {
            msgElement.style.color = 'red';
            msgElement.innerText = data.error || 'Credenciales incorrectas';
        }
    } catch (error) {
        msgElement.style.color = 'red';
        msgElement.innerText = 'Error de conexión con el servidor.';
    }
}



// --- GESTIÓN DEL ARMARIO Y PRENDAS ---

let wardrobeItems = JSON.parse(localStorage.getItem('kombina_wardrobe')) || [
    { id: 1, name: 'Camiseta Lino', category: 'Tops', image: null },
    { id: 2, name: 'Jeans Straight', category: 'Pantalones', image: null },
    { id: 3, name: 'Falda Midi', category: 'Faldas', image: null },
    { id: 4, name: 'Vestido Midi', category: 'Vestidos', image: null }
];

let currentCategory = 'Todo';

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('wardrobeGrid')) {
        renderWardrobe();
    }
});


function renderWardrobe(itemsToRender = wardrobeItems) {
    const grid = document.getElementById('wardrobeGrid');
    if (!grid) return;

    // Forzar 3 columnas por fila mediante código por seguridad
    grid.style.cssText = "display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 0;";
    grid.innerHTML = '';

    if (itemsToRender.length === 0) {
        grid.innerHTML = `<p style="grid-column: span 3; text-align: center; color: #888; margin-top: 40px;">No hay prendas en esta categoría</p>`;
        return;
    }

    itemsToRender.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';
        // Tarjeta optimizada para que la imagen sea la protagonista absoluta
        card.style.cssText = "background: #ffffff; border-radius: 12px; height: 135px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #eae5de; padding: 6px; text-align: center; overflow: hidden; position: relative; box-shadow: 0 2px 5px rgba(0,0,0,0.02);";
        
        let visualContent = `<span style="font-size: 2.2rem; margin: auto;">🧥</span>`;
        if (item.image) {
            // Imagen grande ocupando todo el espacio central
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

function addNewItem() {
    const name = document.getElementById('itemName').value.trim();
    const category = document.getElementById('itemCategory').value;
    const fileInput = document.getElementById('itemImageFile');

    if (!name) {
        alert('Por favor, introduce un nombre para la prenda.');
        return;
    }

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const newItem = {
                id: Date.now(),
                name: name,
                category: category,
                image: e.target.result
            };
            saveAndRenderNewItem(newItem);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const newItem = {
            id: Date.now(),
            name: name,
            category: category,
            image: null
        };
        saveAndRenderNewItem(newItem);
    }
}

function saveAndRenderNewItem(newItem) {
    wardrobeItems.push(newItem);
    localStorage.setItem('kombina_wardrobe', JSON.stringify(wardrobeItems));
    closeAddModal();
    applyFilters();
}