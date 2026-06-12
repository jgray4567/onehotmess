/* =============================================
   DYNAMIC EVENTS FETCHER
   ============================================= */
// Event store for calendar button lookups
const _eventStore = new Map();

function addToCalendarById(isoDate) {
    const evt = _eventStore.get(isoDate);
    if (evt) addToCalendar(evt);
}

function loadEvents() {
    const eventsContainer = document.getElementById('events-fallback');
    if (!eventsContainer) return;

    const baseUrl = window.location.origin;
    fetch(baseUrl + '/events.json?v=' + Date.now())
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(events => {
            if (!events || events.length === 0) {
                eventsContainer.innerHTML = '<p class="no-events" style="color: var(--c-primary); font-family: var(--f-mono);">No upcoming shows currently scheduled. Check back soon!</p>';
                return;
            }

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            // Filter and sort events
            const validEvents = events.map(event => {
                let d = new Date(event.parsedDate || event.date);
                return { ...event, parsedDate: d };
            }).filter(e => {
                if (isNaN(e.parsedDate.getTime())) return true;
                return e.parsedDate >= now;
            }).sort((a, b) => {
                if (isNaN(a.parsedDate) || isNaN(b.parsedDate)) return 0;
                return a.parsedDate - b.parsedDate;
            });

            if (validEvents.length === 0) {
                eventsContainer.innerHTML = '<p class="no-events" style="color: var(--c-primary); font-family: var(--f-mono);">No upcoming shows currently scheduled. Check back soon!</p>';
                return;
            }

            renderFlatList(eventsContainer, validEvents);
        })
        .catch(error => {
            console.error('Error loading events:', error);
            eventsContainer.innerHTML = '<p class="no-events" style="color: var(--c-primary); font-family: var(--f-mono);">Error loading shows. Please check our Facebook page.</p>';
        });
}

/* =============================================
   ADD TO CALENDAR — .ics GENERATOR
   ============================================= */
function escapeICS(text) {
    if (!text) return '';
    return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

function generateICS(event) {
    const dt = event.parsedDate;
    if (isNaN(dt.getTime())) return null;

    // Assume 2-hour duration for live music
    const endDT = new Date(dt.getTime() + 2 * 60 * 60 * 1000);

    const pad = (n) => n.toString().padStart(2, '0');
    const fmtDate = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

    const startStr = fmtDate(dt);
    const endStr = fmtDate(endDT);
    const uid = `ohm-${startStr}@onehotmess.band`;
    const title = event.title || 'One Hot Mess Live';
    const venue = event.venue || '';
    const location = event.location || '';
    const fullLocation = [venue, location].filter(Boolean).join(', ');
    const url = event.url || '';
    const description = [venue, `Details: ${url}`].filter(Boolean).join('\\n');

    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//One Hot Mess//onehotmess.band//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${fmtDate(new Date())}`,
        `DTSTART:${startStr}`,
        `DTEND:${endStr}`,
        `SUMMARY:${escapeICS(title)}`,
        `LOCATION:${escapeICS(fullLocation)}`,
        `DESCRIPTION:${escapeICS(description)}`,
        `URL;VALUE=URI:${url}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ];

    return lines.join('\r\n');
}

function addToCalendar(event) {
    const icsContent = generateICS(event);
    if (!icsContent) return;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ohm-${(event.venue || 'show').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function renderEventCard(event) {
    const item = document.createElement('div');
    item.className = 'show-card reveal visible';
    
    let monthStr = "TBD";
    let dayStr = "";
    let timeStr = "";
    
    if (!isNaN(event.parsedDate.getTime())) {
        monthStr = event.parsedDate.toLocaleString('default', { month: 'short' }).toUpperCase();
        dayStr = event.parsedDate.getDate().toString();
        
        const timeMatch = (event.date || event.dateString || '').match(/at\s+(.+)$/i);
        if (timeMatch) {
            timeStr = timeMatch[1];
        }
    }

    let extraTitleInfo = "";
    if (event.title && !event.title.toLowerCase().includes("one hot mess")) {
        extraTitleInfo = ` — ${event.title}`;
    }
    
    const timeLine = timeStr ? `<p class="show-time">${timeStr}${extraTitleInfo}</p>` : `<p class="show-time">${extraTitleInfo.replace(' — ', '')}</p>`;

    const hasValidDate = !isNaN(event.parsedDate.getTime());
    if (hasValidDate) _eventStore.set(event.parsedDate.toISOString(), event);

    item.innerHTML = `
        <div class="show-date">
            <span class="show-month">${monthStr}</span>
            <span class="show-day">${dayStr}</span>
        </div>
        <div class="show-info">
            <h3 class="show-venue">${event.venue || event.title}</h3>
            <p class="show-location">${event.location || ''}</p>
            ${timeLine}
        </div>
        <div class="show-actions">
            ${hasValidDate ? '<button class="show-calendar" onclick="addToCalendarById(\'' + event.parsedDate.toISOString() + '\')" title="Add to Calendar" aria-label="Add to Calendar"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></button>' : ''}
            <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="show-tickets">DETAILS</a>
        </div>
    `;
    return item;
}

function renderFlatList(container, events) {
    container.innerHTML = '';
    events.forEach(event => {
        container.appendChild(renderEventCard(event));
    });
    if (typeof setupReveal === 'function') setupReveal();
}

function renderWithMonthTabs(container, events) {
    // Group by month
    const grouped = {};
    events.forEach(e => {
        let monthKey = "Upcoming";
        if (!isNaN(e.parsedDate.getTime())) {
            monthKey = e.parsedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
        }
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(e);
    });

    const months = Object.keys(grouped);

    container.innerHTML = '';
    container.style.display = 'block';
    
    const tabsDiv = document.createElement('div');
    tabsDiv.className = 'event-months-tabs';
    container.appendChild(tabsDiv);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'event-months-content';
    container.appendChild(contentDiv);

    function renderMonth(month) {
        Array.from(tabsDiv.children).forEach(btn => {
            btn.classList.toggle('active', btn.dataset.month === month);
        });
        
        contentDiv.innerHTML = '';
        grouped[month].forEach(event => {
            contentDiv.appendChild(renderEventCard(event));
        });
        if (typeof setupReveal === 'function') setupReveal();
    }

    months.forEach(month => {
        const btn = document.createElement('button');
        btn.className = 'month-tab-btn';
        btn.dataset.month = month;
        btn.innerText = month;
        btn.addEventListener('click', () => renderMonth(month));
        tabsDiv.appendChild(btn);
    });

    // Inject tab styles (idempotent)
    if (!document.getElementById('ohm-month-tab-styles')) {
        const style = document.createElement('style');
        style.id = 'ohm-month-tab-styles';
        style.textContent = `
            .event-months-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
            .month-tab-btn { 
                background: transparent; 
                border: 1px solid var(--c-primary, #00e5ff); 
                color: #fff; 
                padding: 6px 14px; 
                cursor: pointer; 
                font-family: inherit; 
                font-size: 0.85rem;
                letter-spacing: 0.04em;
                border-radius: 4px; 
                transition: 0.2s; 
                display: inline-flex;
                align-items: center;
                justify-content: center;
                height: auto;
                min-height: 0;
                flex: 0 0 auto;
                width: auto;
                line-height: 1.2;
                white-space: nowrap;
            }
            .month-tab-btn:hover { background: rgba(0,229,255,0.15); }
            .month-tab-btn.active { 
                background: var(--c-primary, #00e5ff); 
                color: #111; 
                font-weight: 600;
            }
            .event-months-content {
                display: grid;
                grid-template-columns: 1fr;
                gap: 0.7rem;
            }
        `;
        document.head.appendChild(style);
    }

    if (months.length > 0) renderMonth(months[0]);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEvents);
} else {
    loadEvents();
}