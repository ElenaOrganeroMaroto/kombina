// --- PANEL DE ESTADÍSTICAS DEL ARMARIO (CONECTADO A MONGODB) ---

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('statsContent')) loadStats();
});

function escapeStatsText(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Fecha local del navegador como 'AAAA-MM-DD' (para que "este mes" sea el del usuario)
function getStatsTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatStatsDate(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatStatsMonth(key) {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
}

function showStatsMessage(html) {
    document.getElementById('statsContent').innerHTML = `<div class="grid-empty-message stats-message">${html}</div>`;
}

async function loadStats() {
    try {
        // La sesión viaja en la cookie HttpOnly: el servidor sabe quién es el usuario
        const res = await fetch(`/api/stats?today=${getStatsTodayKey()}`);
        if (res.status === 401) {
            showStatsMessage('Tu sesión ha caducado. <a href="login.html">Inicia sesión</a> de nuevo para ver tus estadísticas.');
            return;
        }
        if (!res.ok) throw new Error('Error al cargar las estadísticas');
        renderStats(await res.json());
    } catch (err) {
        console.error('Error conectando con el servidor para las estadísticas:', err);
        showStatsMessage('No se han podido cargar las estadísticas. Inténtalo de nuevo más tarde.');
    }
}

function renderStats(stats) {
    const container = document.getElementById('statsContent');

    if (stats.totals.clothing === 0) {
        showStatsMessage('Aún no tienes prendas. <a href="wardrobe.html">Añade algunas a tu armario</a> para ver tus estadísticas.');
        return;
    }

    container.innerHTML = `
        ${getSummaryHTML(stats)}
        ${getCategoryHTML(stats.byCategory)}
        ${getUsageHTML(stats)}
        ${getTopClothingHTML(stats.topClothing)}
        ${getUnusedHTML(stats.unusedClothing)}
        ${getCalendarHTML(stats)}
    `;
}

function getSummaryHTML({ totals }) {
    const tile = (value, label) => `
        <div class="stats-tile">
            <span class="stats-tile-value">${value}</span>
            <span class="stats-tile-label">${label}</span>
        </div>`;
    return `
        <div class="stats-summary">
            ${tile(totals.clothing, totals.clothing === 1 ? 'prenda' : 'prendas')}
            ${tile(totals.outfits, totals.outfits === 1 ? 'outfit' : 'outfits')}
            ${tile(totals.plannedDays, totals.plannedDays === 1 ? 'día planificado' : 'días planificados')}
        </div>`;
}

function getBarRowHTML(label, value, percent, detail) {
    return `
        <div class="stats-bar-row">
            <div class="stats-bar-label">
                <span>${escapeStatsText(label)}</span>
                <span class="stats-bar-value">${detail}</span>
            </div>
            <div class="stats-bar-track" role="img" aria-label="${escapeStatsText(label)}: ${value}">
                <div class="stats-bar-fill" style="width: ${Math.max(0, Math.min(100, percent))}%;"></div>
            </div>
        </div>`;
}

function getCategoryHTML(byCategory) {
    const rows = byCategory
        .map(c => getBarRowHTML(c.category, c.count, c.percent, `${c.count} · ${c.percent}%`))
        .join('');
    return `
        <section class="stats-card">
            <h3 class="stats-card-title">Prendas por categoría</h3>
            ${rows}
        </section>`;
}

function getUsageHTML({ usage, totals }) {
    return `
        <section class="stats-card">
            <h3 class="stats-card-title">Aprovechamiento del armario</h3>
            ${getBarRowHTML('Prendas usadas en algún outfit', usage.usedClothing, usage.usageRate, `${usage.usedClothing} de ${totals.clothing} · ${usage.usageRate}%`)}
        </section>`;
}

function getClothingThumbHTML(item) {
    return item.image
        ? `<img src="${escapeStatsText(item.image)}" alt="" class="stats-thumb-img">`
        : `<span class="stats-thumb-empty">🧥</span>`;
}

function getTopClothingHTML(topClothing) {
    const body = topClothing.length === 0
        ? `<p class="stats-empty">Todavía no has usado ninguna prenda en un outfit.</p>`
        : `<ol class="stats-rank-list">
            ${topClothing.map((item, i) => `
                <li class="stats-rank-item">
                    <span class="stats-rank-pos">${i + 1}</span>
                    <span class="stats-thumb">${getClothingThumbHTML(item)}</span>
                    <span class="stats-rank-name">${escapeStatsText(item.name)}<small>${escapeStatsText(item.category)}</small></span>
                    <span class="stats-rank-count">${item.uses} ${item.uses === 1 ? 'outfit' : 'outfits'}</span>
                </li>`).join('')}
           </ol>`;
    return `
        <section class="stats-card">
            <h3 class="stats-card-title">Prendas más usadas</h3>
            ${body}
        </section>`;
}

function getUnusedHTML(unused) {
    if (unused.count === 0) {
        return `
            <section class="stats-card">
                <h3 class="stats-card-title">Prendas olvidadas</h3>
                <p class="stats-empty">¡Genial! Todas tus prendas forman parte de algún outfit.</p>
            </section>`;
    }
    const rest = unused.count - unused.items.length;
    return `
        <section class="stats-card">
            <h3 class="stats-card-title">Prendas olvidadas <span class="suggestion-pill">${unused.count}</span></h3>
            <p class="stats-card-desc">No aparecen en ningún outfit. ¿Les das una oportunidad?</p>
            <div class="stats-unused-grid">
                ${unused.items.map(item => `
                    <div class="stats-unused-item" title="${escapeStatsText(item.name)}">
                        <span class="stats-thumb">${getClothingThumbHTML(item)}</span>
                        <span class="stats-unused-name">${escapeStatsText(item.name)}</span>
                    </div>`).join('')}
            </div>
            ${rest > 0 ? `<p class="stats-card-desc">y ${rest} más…</p>` : ''}
            <a href="create-outfit.html" class="btn-secondary stats-cta">Crear un outfit</a>
        </section>`;
}

function getCalendarHTML({ month, topOutfits, nextPlannedDate }) {
    const next = nextPlannedDate
        ? `Próximo día planificado: <strong>${escapeStatsText(formatStatsDate(nextPlannedDate))}</strong>`
        : `No tienes días planificados próximamente. <a href="calendar.html">Planifica en el calendario</a>.`;

    const ranking = topOutfits.length === 0
        ? `<p class="stats-empty">Aún no has asignado outfits al calendario.</p>`
        : `<ol class="stats-rank-list">
            ${topOutfits.map((o, i) => `
                <li class="stats-rank-item">
                    <span class="stats-rank-pos">${i + 1}</span>
                    <span class="stats-rank-name">${escapeStatsText(o.name)}</span>
                    <span class="stats-rank-count">${o.days} ${o.days === 1 ? 'día' : 'días'}</span>
                </li>`).join('')}
           </ol>`;

    return `
        <section class="stats-card">
            <h3 class="stats-card-title">Calendario</h3>
            ${getBarRowHTML(`Días planificados en ${formatStatsMonth(month.month)}`, month.plannedDays, month.coverage, `${month.plannedDays} de ${month.totalDays} · ${month.coverage}%`)}
            <p class="stats-card-desc">${next}</p>
            <h4 class="stats-subtitle">Outfits más planificados</h4>
            ${ranking}
        </section>`;
}
