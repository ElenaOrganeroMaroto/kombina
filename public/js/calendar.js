// --- GESTIÓN DINÁMICA DEL CALENDARIO ---
//
// Las asignaciones se guardan como { 'AAAA-MM-DD': [idOutfit, idOutfit, ...] } en
// localStorage ('kombina_calendar_assignments'). Solo se guarda el id: el outfit en sí
// se lee siempre de 'kombina_outfits', así que si lo borras desaparece también del calendario.
//
// Flujos:
//  1) Calendario -> "+ Asignar outfit" -> profile.html?mode=assign&date=AAAA-MM-DD
//     (eliges uno o varios outfits / colecciones) -> vuelve aquí con ?date=AAAA-MM-DD
//  2) Perfil / Crear outfit -> "Asignar" -> calendar.html?assign=ID
//     (eliges el día y confirmas)

const ASSIGNMENTS_KEY = 'kombina_calendar_assignments';

// Ruta de este mismo script: sirve para encontrar create-outfit.js aunque tus .js estén en una carpeta
const CALENDAR_SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';

let calendarCurrentDate = new Date();
calendarCurrentDate.setDate(1); // evita saltos de mes al cambiar de mes desde un día 29/30/31
let selectedCalendarDate = new Date();
let dailyOutfitIndex = 0;          // outfit que se está viendo en el día seleccionado
let pendingAssignOutfitId = null;  // outfit que viene desde el perfil esperando que elijas día

// Se leen los parámetros de la URL UNA vez y se quitan de la barra de direcciones
(function readCalendarParams() {
    const params = new URLSearchParams(window.location.search);
    const assignId = params.get('assign');
    const dateParam = params.get('date');

    if (assignId) pendingAssignOutfitId = assignId;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        const [y, m, d] = dateParam.split('-').map(Number);
        selectedCalendarDate = new Date(y, m - 1, d);
        calendarCurrentDate = new Date(y, m - 1, 1);
    }
    if (assignId || dateParam) {
        try { history.replaceState(null, '', window.location.pathname); } catch (e) { /* sin problema */ }
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('calendarGrid')) return;
    ensureOutfitRenderer().then(renderCalendar);
});

// El dibujo del outfit (buildOutfitCanvasHTML) vive en create-outfit.js.
// Si esta página no lo ha cargado, se busca junto a este script (y en las carpetas habituales).
function ensureOutfitRenderer() {
    return new Promise(resolve => {
        if (typeof buildOutfitCanvasHTML === 'function') return resolve();

        const candidates = [];
        if (CALENDAR_SCRIPT_SRC) candidates.push(CALENDAR_SCRIPT_SRC.replace(/calendar\.js(\?.*)?$/, 'create-outfit.js'));
        candidates.push('create-outfit.js', 'js/create-outfit.js', '../js/create-outfit.js', 'scripts/create-outfit.js');
        const unique = candidates.filter((c, i) => c && candidates.indexOf(c) === i);

        const giveUp = setTimeout(() => resolve(), 2500); // por si el navegador no avisa de la carga
        const done = () => { clearTimeout(giveUp); resolve(); };

        const tryNext = (i) => {
            if (typeof buildOutfitCanvasHTML === 'function' || i >= unique.length) return done();
            const tag = document.createElement('script');
            tag.src = unique[i];
            tag.onload = () => done();
            tag.onerror = () => { tag.remove(); tryNext(i + 1); };
            document.head.appendChild(tag);
        };
        tryNext(0);
    });
}

// --- DATOS ---
function getDateKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function loadAssignments() {
    try { return JSON.parse(localStorage.getItem(ASSIGNMENTS_KEY)) || {}; } catch (e) { return {}; }
}

function saveAssignments(assignments) {
    localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
}

function loadSavedOutfits() {
    try { return JSON.parse(localStorage.getItem('kombina_outfits')) || []; } catch (e) { return []; }
}

function findSavedOutfit(id) {
    return loadSavedOutfits().find(o => String(o.id) === String(id)) || null;
}

// Outfits de un día: [{ entryIndex, outfit }] (ignora los que ya no existen)
function getOutfitsForDay(dateKey, assignments, outfits) {
    const all = assignments || loadAssignments();
    const saved = outfits || loadSavedOutfits();
    const result = [];
    (all[dateKey] || []).forEach((id, entryIndex) => {
        const outfit = saved.find(o => String(o.id) === String(id));
        if (outfit) result.push({ entryIndex, outfit });
    });
    return result;
}

// Quita de las asignaciones los outfits que se hayan borrado
function pruneAssignments() {
    const assignments = loadAssignments();
    const saved = loadSavedOutfits();
    let changed = false;
    Object.keys(assignments).forEach(key => {
        const valid = (assignments[key] || []).filter(id => saved.some(o => String(o.id) === String(id)));
        if (valid.length !== assignments[key].length) {
            changed = true;
            if (valid.length) assignments[key] = valid; else delete assignments[key];
        }
    });
    if (changed) saveAssignments(assignments);
}

function escapeCalendarText(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function calendarNotify(message) {
    if (typeof showInAppToast === 'function') return showInAppToast(message);
    const old = document.getElementById('calendarToast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.id = 'calendarToast';
    toast.textContent = message;
    toast.style.cssText = 'position:fixed; left:50%; bottom:100px; transform:translateX(-50%); background:#222; color:#fff; padding:10px 18px; border-radius:999px; font-size:0.85rem; z-index:1000;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
}

// --- CALENDARIO ---
function changeMonth(direction) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const titleEl = document.getElementById('calendarMonthTitle');
    if (!grid || !titleEl) return;

    pruneAssignments();

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';
    grid.style.rowGap = '0px'; // Ultra compacto

    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const assignments = loadAssignments();
    const savedOutfits = loadSavedOutfits();

    for (let i = 0; i < firstDayIndex; i++) {
        grid.appendChild(document.createElement('span'));
    }

    for (let day = 1; day <= totalDays; day++) {
        const cellDate = new Date(year, month, day);
        const dateKey = getDateKey(cellDate);

        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';
        cell.style.cssText += 'position: relative; height: 26px; display: flex; align-items: center; justify-content: center;'; // Altura muy reducida (26px)

        const isToday = cellDate.toDateString() === today.toDateString();
        const isSelected = cellDate.toDateString() === selectedCalendarDate.toDateString();

        const dotsCount = Math.min(getOutfitsForDay(dateKey, assignments, savedOutfits).length, 2);

        let dotsHtml = '';
        if (dotsCount > 0) {
            dotsHtml = `<div class="calendar-dots-container" style="position: absolute; left: 0; right: 0; bottom: -1px; display: flex; justify-content: center; gap: 2px; pointer-events: none;">`;
            for (let d = 0; d < dotsCount; d++) {
                dotsHtml += `<div class="calendar-dot" style="width: 3px; height: 3px; border-radius: 50%; background: #2c2c2c;"></div>`;
            }
            dotsHtml += `</div>`;
        }

        cell.innerHTML = `
            <span class="calendar-day-number ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" style="font-size: 0.8rem;">${day}</span>
            ${dotsHtml}
        `;

        cell.onclick = () => {
            selectedCalendarDate = cellDate;
            dailyOutfitIndex = 0;
            renderCalendar();
        };

        grid.appendChild(cell);
    }

    renderDailyOutfits(getDateKey(selectedCalendarDate));
}

// --- ASIGNAR ---
function openOutfitAssigner(dateKey) {
    window.location.href = `profile.html?mode=assign&date=${encodeURIComponent(dateKey)}`;
}

function confirmPendingAssign(dateKey) {
    const outfit = pendingAssignOutfitId ? findSavedOutfit(pendingAssignOutfitId) : null;
    if (!outfit) {
        pendingAssignOutfitId = null;
        calendarNotify('Ese outfit ya no existe.');
        renderCalendar();
        return;
    }

    const assignments = loadAssignments();
    const list = assignments[dateKey] || [];
    const existing = list.findIndex(id => String(id) === String(outfit.id));

    if (existing !== -1) {
        calendarNotify('Ese outfit ya estaba asignado a este día.');
        dailyOutfitIndex = getOutfitsForDay(dateKey, assignments).findIndex(e => e.entryIndex === existing);
    } else {
        list.push(outfit.id);
        assignments[dateKey] = list;
        saveAssignments(assignments);
        calendarNotify('¡Outfit asignado!');
        dailyOutfitIndex = getOutfitsForDay(dateKey, assignments).length - 1;
    }
    if (dailyOutfitIndex < 0) dailyOutfitIndex = 0;

    pendingAssignOutfitId = null;
    renderCalendar();
}

function cancelPendingAssign() {
    pendingAssignOutfitId = null;
    renderDailyOutfits(getDateKey(selectedCalendarDate));
}

function removeOutfitFromDate(dateKey, entryIndex) {
    const assignments = loadAssignments();
    if (!assignments[dateKey]) return;
    assignments[dateKey].splice(entryIndex, 1);
    if (assignments[dateKey].length === 0) delete assignments[dateKey];
    saveAssignments(assignments);
    if (dailyOutfitIndex > 0) dailyOutfitIndex--;
    renderCalendar();
}

function nextDailyOutfit(dateKey) {
    const total = getOutfitsForDay(dateKey).length;
    if (total < 2) return;
    dailyOutfitIndex = (dailyOutfitIndex + 1) % total;
    renderDailyOutfits(dateKey);
}

// --- OUTFITS DEL DÍA ---
function calendarFallbackCanvas(items) {
    const cols = items.length > 3 ? 2 : 1;
    const imgs = items.map(it => it.image
        ? `<img src="${it.image}" alt="" style="max-width: 100%; max-height: 100%; object-fit: contain; mix-blend-mode: multiply;">`
        : `<span style="font-size: 1.4rem;">🧥</span>`).join('');
    return `<div style="position: absolute; inset: 0; padding: 6px; box-sizing: border-box; display: grid; grid-template-columns: repeat(${cols}, 1fr); grid-auto-rows: 1fr; gap: 4px; place-items: center;">${imgs}</div>`;
}

function renderDailyOutfits(dateKey) {
    const container = document.getElementById('dailyOutfitsContainer');
    if (!container) return;

    const entries = getOutfitsForDay(dateKey);
    if (dailyOutfitIndex >= entries.length) dailyOutfitIndex = 0;

    const [year, month, day] = dateKey.split('-');
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const formattedDateStr = `${parseInt(day)} de ${monthNames[parseInt(month) - 1]} de ${year}`;

    const pendingOutfit = pendingAssignOutfitId ? findSavedOutfit(pendingAssignOutfitId) : null;
    if (pendingAssignOutfitId && !pendingOutfit) pendingAssignOutfitId = null;

    let htmlContent = '';

    if (pendingOutfit) {
        htmlContent += `
            <div style="background: #ece5d8; border: 1px solid #ddd3c1; color: #2c2c2c; border-radius: 14px; padding: 8px 10px; margin-bottom: 6px;">
                <div style="font-size: 0.72rem; color: #7a705f; margin-bottom: 1px;">Elige un día en el calendario para asignar</div>
                <div style="font-size: 0.9rem; font-weight: 600; margin-bottom: 6px;">${escapeCalendarText(pendingOutfit.name || 'Outfit sin nombre')}</div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="confirmPendingAssign('${dateKey}')" style="flex: 1; background: #2c2c2c; color: white; border: none; padding: 6px 10px; border-radius: 8px; font-size: 0.78rem; font-weight: 600; cursor: pointer;">Asignar al ${parseInt(day)} de ${monthNames[parseInt(month) - 1]}</button>
                    <button onclick="cancelPendingAssign()" style="background: transparent; color: #4a4235; border: 1px solid #b9ad97; padding: 6px 10px; border-radius: 8px; font-size: 0.78rem; cursor: pointer;">Cancelar</button>
                </div>
            </div>
        `;
    }

    htmlContent += `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 0.85rem; font-weight: 600; color: #555;">${formattedDateStr}</span>
            ${pendingOutfit ? '' : `<button onclick="openOutfitAssigner('${dateKey}')" style="background: #2c2c2c; color: white; border: none; padding: 5px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: 500; cursor: pointer;">+ Asignar outfit</button>`}
        </div>
    `;

    if (entries.length === 0) {
        htmlContent += `<div class="no-outfits-msg">No hay outfits asignados para este día.</div>`;
    } else {
        const { outfit, entryIndex } = entries[dailyOutfitIndex];
        const items = Array.isArray(outfit.items) ? outfit.items : [];
        const multiple = entries.length > 1;

        let previewInner;
        if (items.length && typeof buildOutfitCanvasHTML === 'function') previewInner = buildOutfitCanvasHTML(items);
        else if (items.length) previewInner = calendarFallbackCanvas(items);
        else previewInner = `<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🧥</div>`;

        htmlContent += `
            <div style="width: 100%;">
                <div id="dailyOutfitCard" style="width: 100%; box-sizing: border-box; background: white; border: 1px solid #eae5de; border-radius: 14px; padding: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); position: relative;">
                    
                    <div id="dailyOutfitPreview" style="position: relative; width: 100%; height: 200px; background: #fbf9f5; border: 1px solid #eae5de; border-radius: 10px; overflow: hidden; margin-bottom: 8px;">
                        
                        <!-- Botón Quitar del día flotando en la esquina superior izquierda sin generar margen -->
                        <button onclick="removeOutfitFromDate('${dateKey}', ${entryIndex})" title="Quitar este outfit del día" style="position: absolute; top: 10px; left: 10px; z-index: 20; background: rgba(242, 242, 242, 0.92); color: #666; border: 1px solid #dcdcdc; padding: 4px 10px; border-radius: 6px; font-size: 0.72rem; cursor: pointer; font-weight: 500; backdrop-filter: blur(4px);">Quitar del día</button>

                        ${previewInner}
                        
                        ${multiple ? `
                            <button onclick="nextDailyOutfit('${dateKey}')" aria-label="Siguiente outfit" title="Siguiente outfit" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 10; width: 34px; height: 34px; border-radius: 50%; border: 1px solid #e0dad0; background: rgba(255,255,255,0.9); color: #2c2c2c; display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.12);">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>
                            </button>
                        ` : ''}
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 8px;">
                        <div style="min-width: 0; flex: 1;">
                            <strong style="font-size: 0.9rem; display: block; color: #2c2c2c; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeCalendarText(outfit.name || 'Outfit sin nombre')}</strong>
                        </div>
                        ${multiple ? `<span style="font-size: 0.72rem; color: #999; flex-shrink: 0; line-height: 1.2;">${dailyOutfitIndex + 1} de${entries.length}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = htmlContent;
    fitDailyOutfitCard();
    requestAnimationFrame(fitDailyOutfitCard);
}

// --- AJUSTE SIN SCROLL ---
function getScrollParent(el) {
    for (let p = el.parentElement; p; p = p.parentElement) {
        if (p === document.body || p === document.documentElement) break;
        const oy = getComputedStyle(p).overflowY;
        if (oy === 'auto' || oy === 'scroll') return p;
    }
    return document.scrollingElement || document.documentElement;
}

function fitDailyOutfitCard() {
    const card = document.getElementById('dailyOutfitCard');
    const preview = document.getElementById('dailyOutfitPreview');
    if (!card || !preview) return;

    const MIN_H = 110, MAX_H = 400; // Altura máxima ampliada para aprovechar todo el espacio disponible
    const scroller = getScrollParent(card);
    scroller.scrollTop = 0;

    preview.style.height = MAX_H + 'px';
    const overflow = scroller.scrollHeight - scroller.clientHeight;
    const target = Math.max(MIN_H, Math.min(MAX_H, MAX_H - Math.max(0, overflow)));
    preview.style.height = target + 'px';
}

window.addEventListener('resize', fitDailyOutfitCard);
window.addEventListener('load', fitDailyOutfitCard);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitDailyOutfitCard);