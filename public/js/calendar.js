// --- GESTIÓN DINÁMICA DEL CALENDARIO ---

let calendarCurrentDate = new Date();
let selectedCalendarDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('calendarGrid')) {
        renderCalendar();
    }
});

function changeMonth(direction) {
    calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + direction);
    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const titleEl = document.getElementById('calendarMonthTitle');
    if (!grid || !titleEl) return;

    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth();

    const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    titleEl.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';

    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = (firstDayIndex === 0) ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const calendarAssignments = JSON.parse(localStorage.getItem('kombina_calendar_assignments')) || {};

    for (let i = 0; i < firstDayIndex; i++) {
        const emptySpan = document.createElement('span');
        grid.appendChild(emptySpan);
    }

    for (let day = 1; day <= totalDays; day++) {
        const cellDate = new Date(year, month, day);
        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        const cell = document.createElement('div');
        cell.className = 'calendar-day-cell';

        const isToday = cellDate.toDateString() === today.toDateString();
        const isSelected = cellDate.toDateString() === selectedCalendarDate.toDateString();

        const assignedOutfits = calendarAssignments[dateKey] || [];
        const dotsCount = Math.min(assignedOutfits.length, 2);

        let dotsHtml = '';
        if (dotsCount > 0) {
            dotsHtml = `<div class="calendar-dots-container">`;
            for (let d = 0; d < dotsCount; d++) {
                dotsHtml += `<div class="calendar-dot"></div>`;
            }
            dotsHtml += `</div>`;
        }

        cell.innerHTML = `
            <span class="calendar-day-number ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}">${day}</span>
            ${dotsHtml}
        `;

        cell.onclick = () => {
            selectedCalendarDate = cellDate;
            renderCalendar();
            renderDailyOutfits(dateKey);
        };

        grid.appendChild(cell);
    }

    const selectedKey = `${selectedCalendarDate.getFullYear()}-${String(selectedCalendarDate.getMonth() + 1).padStart(2, '0')}-${String(selectedCalendarDate.getDate()).padStart(2, '0')}`;
    renderDailyOutfits(selectedKey);
}

function openOutfitAssigner(dateKey) {
    localStorage.setItem('kombina_target_date', dateKey);
    window.location.href = 'create-outfit.html?mode=assign';
}

function removeOutfitFromDate(dateKey, outfitIndex) {
    let calendarAssignments = JSON.parse(localStorage.getItem('kombina_calendar_assignments')) || {};
    if (calendarAssignments[dateKey]) {
        calendarAssignments[dateKey].splice(outfitIndex, 1);
        if (calendarAssignments[dateKey].length === 0) {
            delete calendarAssignments[dateKey];
        }
        localStorage.setItem('kombina_calendar_assignments', JSON.stringify(calendarAssignments));
        renderCalendar();
    }
}

function renderDailyOutfits(dateKey) {
    const container = document.getElementById('dailyOutfitsContainer');
    if (!container) return;

    const calendarAssignments = JSON.parse(localStorage.getItem('kombina_calendar_assignments')) || {};
    const outfitsForDay = calendarAssignments[dateKey] || [];

    const [year, month, day] = dateKey.split('-');
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const formattedDateStr = `${day} de ${monthNames[parseInt(month) - 1]} de ${year}`;

    let htmlContent = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 0.85rem; font-weight: 600; color: #555; text-transform: capitalize;">${formattedDateStr}</span>
            <button onclick="openOutfitAssigner('${dateKey}')" style="background: #2c2c2c; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 500; cursor: pointer;">+ Asignar outfit</button>
        </div>
    `;

    if (outfitsForDay.length === 0) {
        htmlContent += `<div class="no-outfits-msg">No hay outfits asignados para este día.</div>`;
    } else {
        outfitsForDay.forEach((outfit, index) => {
            let previewHtml = '';
            if (outfit.compositeImageHTML) {
                previewHtml = `
                    <div style="position: relative; width: 100%; height: 220px; background: #fbf9f5; border: 1px solid #eae5de; border-radius: 10px; overflow: hidden; margin-bottom: 8px;">
                        <div style="position: absolute; width: 480px; height: 480px; left: 50%; top: 50%; transform: translate(-50%, -50%) scale(0.55); transform-origin: center center;">
                            ${outfit.compositeImageHTML}
                        </div>
                    </div>
                `;
            }

            htmlContent += `
                <div style="background: white; border: 1px solid #eae5de; border-radius: 14px; padding: 12px; margin-bottom: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); position: relative;">
                    ${previewHtml}
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong style="font-size: 0.9rem; display: block; color: #2c2c2c; margin-bottom: 2px;">${outfit.name || 'Outfit sin nombre'}</strong>
                        </div>
                        <button onclick="removeOutfitFromDate('${dateKey}', ${index})" style="background: #fdf2f2; color: #d9534f; border: 1px solid #f9dede; padding: 5px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: 500;">Eliminar</button>
                    </div>
                </div>
            `;
        });
    }

    container.innerHTML = htmlContent;
}