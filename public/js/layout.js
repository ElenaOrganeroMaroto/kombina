// Este script inyecta la barra de navegación móvil en cualquier vista que tenga un contenedor con id="bottom-nav-container"
document.addEventListener("DOMContentLoaded", () => {
    const navContainer = document.getElementById('bottom-nav-container');
    if (navContainer) {
        const currentPage = window.location.pathname.split('/').pop();

        navContainer.innerHTML = `
            <nav class="bottom-nav">
                <a href="wardrobe.html" class="${currentPage === 'wardrobe.html' ? 'active' : ''}">
                    <span>🧥</span><span>Armario</span>
                </a>
                <a href="create-outfit.html" class="${currentPage === 'create-outfit.html' ? 'active' : ''}">
                    <span>✨</span><span>Outfits</span>
                </a>
                <a href="calendar.html" class="${currentPage === 'calendar.html' ? 'active' : ''}">
                    <span>📅</span><span>Calendario</span>
                </a>
                <a href="profile.html" class="${currentPage === 'profile.html' ? 'active' : ''}">
                    <span>👤</span><span>Perfil</span>
                </a>
            </nav>
        `;
    }
});