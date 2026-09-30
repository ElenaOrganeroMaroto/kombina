// Este script inyecta la barra de navegación móvil en cualquier vista que tenga un contenedor con id="bottom-nav-container"
document.addEventListener("DOMContentLoaded", () => {
    const navContainer = document.getElementById('bottom-nav-container');
    if (navContainer) {
        const currentPage = window.location.pathname.split('/').pop();

        navContainer.innerHTML = `
            <nav class="bottom-nav">
                <a href="wardrobe.html" class="${currentPage === 'wardrobe.html' ? 'active' : ''}">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                    </svg>
                    <span>Armario</span>
                </a>
                <a href="create-outfit.html" class="${currentPage === 'create-outfit.html' ? 'active' : ''}">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.143-5.714L5 12l6.857-2.143L14 3z"/>
                    </svg>
                    <span>Outfits</span>
                </a>
                <a href="calendar.html" class="${currentPage === 'calendar.html' ? 'active' : ''}">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Calendario</span>
                </a>
                <a href="profile.html" class="${currentPage === 'profile.html' ? 'active' : ''}">
                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    <span>Perfil</span>
                </a>
            </nav>
        `;
    }
});