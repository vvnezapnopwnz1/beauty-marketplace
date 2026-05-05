// VELA Calendar — improved week/month/day views
const { useState: uS, useRef: uR, useEffect: uE } = React;

// ── Mock Data ──────────────────────────────────────────
const MASTERS = [
  { id: 'm1', name: 'Виктория С.', role: 'Маникюр / Педикюр', cat: 'nails' },
  { id: 'm2', name: 'Анна М.',     role: 'Стрижка / Окрашивание', cat: 'hair' },
  { id: 'm3', name: 'Карина Л.',   role: 'Брови / Ресницы', cat: 'brows' },
  { id: 'm4', name: 'Маша К.',     role: 'Макияж / Уход', cat: 'makeup' },
  { id: 'm5', name: 'Лена П.',     role: 'Массаж / СПА', cat: 'massage' },
];

function mkA(dayOffset, sh, sm, eh, em, service, client, cat, price, masterId) {
  const base = new Date(2026, 3, 13);
  base.setDate(base.getDate() + dayOffset);
  const s = new Date(base); s.setHours(sh, sm, 0);
  const e = new Date(base); e.setHours(eh, em, 0);
  return { id: Math.random().toString(36).slice(2), start: s, end: e, service, client, cat, price, masterId: masterId || 'm1' };
}

const APPTS = [
  mkA(0, 10, 0, 11, 0,  'Маникюр гель',        'Анна К.',     'nails',   2800, 'm1'),
  mkA(0, 11, 30, 13, 0, 'Стрижка + укладка',   'Ольга М.',    'hair',    4500, 'm2'),
  mkA(0, 14, 0, 14, 30, 'Коррекция бровей',    'Лена Р.',     'brows',   1200, 'm3'),
  mkA(0, 10, 30, 12, 0, 'Макияж',              'Алиса Д.',    'makeup',  5000, 'm4'),
  mkA(0, 15, 0, 17, 0,  'Окрашивание',         'Марина П.',   'hair',    8500, 'm2'),
  mkA(0, 9, 0, 10, 30,  'Массаж лица',         'Юлия Н.',     'massage', 4000, 'm5'),
  mkA(0, 12, 0, 13, 30, 'СПА-маникюр',         'Вера Т.',     'nails',   3800, 'm1'),
  mkA(0, 14, 0, 15, 30, 'Ламинирование бровей','Катя С.',     'brows',   2500, 'm3'),
  mkA(0, 13, 0, 14, 30, 'Свадебный макияж',    'Катя Н.',     'makeup',  9000, 'm4'),
  mkA(0, 11, 0, 13, 0,  'Антицеллюлитный',     'Дарья К.',    'massage', 5500, 'm5'),
  mkA(1, 9, 0, 10, 30,  'Педикюр',             'Светлана В.', 'nails',   3200, 'm1'),
  mkA(1, 13, 30, 14, 30,'Ламинирование бровей','Катя С.',     'brows',   2500, 'm3'),
  mkA(1, 16, 0, 17, 30, 'Массаж лица',         'Юлия Н.',     'massage', 4000, 'm5'),
  mkA(2, 10, 0, 11, 30, 'СПА-маникюр',         'Вера Т.',     'nails',   3800, 'm1'),
  mkA(2, 14, 0, 16, 0,  'Кератин',             'Ирина Ф.',    'hair',    9000, 'm2'),
  mkA(3, 9, 30, 11, 0,  'Массаж тела',         'Дарья К.',    'massage', 5500, 'm5'),
  mkA(3, 11, 30, 12, 0, 'Оформление бровей',   'Наташа П.',   'brows',   1800, 'm3'),
  mkA(3, 13, 0, 14, 30, 'Стрижка',             'Соня М.',     'hair',    3200, 'm2'),
  mkA(3, 15, 30, 16, 30,'Гель-лак',            'Таня В.',     'nails',   2400, 'm1'),
  mkA(3, 17, 0, 18, 30, 'Ламинирование ресниц','Оля Г.',      'brows',   3500, 'm3'),
  mkA(4, 10, 0, 11, 0,  'Макияж',              'Женя Л.',     'makeup',  4800, 'm4'),
  mkA(4, 12, 0, 14, 0,  'Мелирование',         'Лера С.',     'hair',    7500, 'm2'),
  mkA(4, 15, 0, 16, 0,  'Педикюр',             'Маша К.',     'nails',   3000, 'm1'),
  mkA(5, 10, 30, 12, 30,'Свадебный макияж',    'Катя Н.',     'makeup',  9000, 'm4'),
  mkA(5, 13, 0, 14, 0,  'Маникюр',             'Аня В.',      'nails',   2600, 'm1'),
  mkA(5, 15, 0, 17, 0,  'Окрашивание',         'Лена М.',     'hair',    8000, 'm2'),
  mkA(5, 17, 30, 18, 30,'Массаж',              'Юля Д.',      'massage', 4200, 'm5'),
  mkA(6, 11, 0, 12, 30, 'Стрижка',             'Вика Р.',     'hair',    3500, 'm2'),
  mkA(6, 14, 0, 15, 0,  'Маникюр',             'Поля С.',     'nails',   2800, 'm1'),
];

const HOUR_H = 72; // px per hour — spacious!
const START_H = 8;
const END_H = 21;
const HOURS = Array.from({ length: END_H - START_H }, (_, i) => i + START_H);
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];

function toY(date) {
  return ((date.getHours() - START_H) * 60 + date.getMinutes()) * (HOUR_H / 60);
}
function toH(start, end) {
  return Math.max(28, (end - start) / 60000 * (HOUR_H / 60));
}
function fmtTime(d) {
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── Master Autocomplete (MUI-style, с чекбоксами) ─────
function MasterAutocomplete({ t, selected, onChange }) {
  const [open, setOpen] = uS(false);
  const [query, setQuery] = uS('');
  const ref = uR(null);

  uE(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = MASTERS.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.role.toLowerCase().includes(query.toLowerCase()));
  const allSelected = selected.length === MASTERS.length;

  const toggle = (id) => {
    if (id === '__all') { onChange(allSelected ? [] : MASTERS.map(m => m.id)); return; }
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  };

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 260 }}>
      {/* Input trigger */}
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, minHeight: 36, padding: '4px 10px', background: t.surfaceEl, border: `1px solid ${open ? t.accent : t.border}`, borderRadius: VELA.radius.md, cursor: 'pointer', transition: 'border-color 0.15s' }}>
        {selected.length === 0 && <span style={{ fontSize: 12, color: t.textMuted }}>Все мастера</span>}
        {selected.length > 0 && selected.length < MASTERS.length && selected.map(id => {
          const m = MASTERS.find(x => x.id === id);
          const color = serviceColor(t, m.cat);
          return (
            <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: VELA.radius.pill, background: `${color}20`, color, fontSize: 11, fontWeight: 600 }}>
              {m.name.split(' ')[0]}
              <span onClick={e => { e.stopPropagation(); toggle(id); }} style={{ cursor: 'pointer', opacity: 0.7, fontSize: 13, lineHeight: 1 }}>×</span>
            </span>
          );
        })}
        {selected.length === MASTERS.length && <span style={{ fontSize: 12, color: t.text, fontWeight: 500 }}>Все мастера</span>}
        <span style={{ marginLeft: 'auto', fontSize: 10, color: t.textMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', overflow: 'hidden', minWidth: 280 }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: `1px solid ${t.borderSub}` }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Поиск мастера..." autoFocus
              style={{ width: '100%', background: t.surfaceEl, border: `1px solid ${t.border}`, borderRadius: VELA.radius.sm, padding: '6px 10px', fontSize: 12, color: t.text, outline: 'none', fontFamily: VELA.fonts.ui }} />
          </div>

          {/* Выбрать всех */}
          <div onClick={() => toggle('__all')}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', borderBottom: `1px solid ${t.borderSub}`, background: allSelected ? t.accentSoft : 'transparent' }}>
            <Checkbox checked={allSelected} partial={selected.length > 0 && !allSelected} color={t.accent} />
            <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Выбрать всех</span>
          </div>

          {/* Master list */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.map(m => {
              const checked = selected.includes(m.id);
              const color = serviceColor(t, m.cat);
              return (
                <div key={m.id} onClick={() => toggle(m.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', cursor: 'pointer', background: checked ? `${color}0D` : 'transparent', transition: 'background 0.1s' }}>
                  <Checkbox checked={checked} color={color} />
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color, flexShrink: 0 }}>
                    {m.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.name}</div>
                    <div style={{ fontSize: 10, color: t.textMuted }}>{m.role}</div>
                  </div>
                  {checked && <span style={{ fontSize: 14, color }}>✓</span>}
                </div>
              );
            })}
            {filtered.length === 0 && <div style={{ padding: 12, fontSize: 12, color: t.textMuted, textAlign: 'center' }}>Ничего не найдено</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Checkbox({ checked, partial, color }) {
  return (
    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked || partial ? color : '#888'}`, background: checked ? color : partial ? `${color}40` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
      {checked && <span style={{ fontSize: 10, color: '#fff', lineHeight: 1, fontWeight: 700 }}>✓</span>}
      {partial && !checked && <span style={{ fontSize: 10, color, lineHeight: 1, fontWeight: 700 }}>–</span>}
    </div>
  );
}

// ── Week View ──────────────────────────────────────────
function WeekView({ t, weekStart, onSelect }) {
  const scrollRef = uR(null);
  const [selectedMasters, setSelectedMasters] = uS(MASTERS.map(m => m.id)); // все по умолчанию

  uE(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_H;
  }, []);

  const weekDates = DAYS_SHORT.map((_, i) => {
    const d = new Date(weekStart); d.setDate(d.getDate() + i); return d;
  });

  const today = new Date();
  const nowY = ((today.getHours() - START_H) * 60 + today.getMinutes()) * (HOUR_H / 60);

  // фильтруем записи по выбранным мастерам
  const filteredAppts = APPTS.filter(a =>
    selectedMasters.length === 0 || selectedMasters.includes(a.masterId)
  );

  const apptsByDay = weekDates.map(date =>
    filteredAppts.filter(a => a.start.toDateString() === date.toDateString())
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.surface, borderRadius: VELA.radius.lg, border: `1px solid ${t.border}` }}>
      {/* Master filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: `1px solid ${t.borderSub}`, flexShrink: 0, background: t.bgAlt }}>
        <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Мастера</span>
        <MasterAutocomplete t={t} selected={selectedMasters} onChange={setSelectedMasters} />
        {selectedMasters.length < MASTERS.length && (
          <span style={{ fontSize: 11, color: t.textMuted }}>{selectedMasters.length} из {MASTERS.length}</span>
        )}
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ background: t.surfaceEl }} />
        {weekDates.map((date, i) => {
          const isToday = date.toDateString() === today.toDateString();
          return (
            <div key={i} style={{ padding: '12px 8px', textAlign: 'center', borderLeft: `1px solid ${t.border}`, background: t.surfaceEl }}>
              <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>{DAYS_SHORT[i]}</div>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: isToday ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', transition: 'all 0.15s' }}>
                <span style={{ fontSize: 16, fontWeight: isToday ? 700 : 400, color: isToday ? '#fff' : t.text, fontFamily: VELA.fonts.display }}>{date.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', position: 'relative' }}>
          {/* Time labels */}
          <div style={{ background: t.bgAlt }}>
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_H, borderBottom: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'flex-start', paddingTop: 6, justifyContent: 'center' }}>
                <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>{h}:00</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDates.map((date, di) => {
            const dayAppts = apptsByDay[di];
            return (
              <div key={di} style={{ position: 'relative', borderLeft: `1px solid ${t.border}` }}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_H, borderBottom: `1px solid ${t.borderSub}`, position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: t.borderSub, opacity: 0.5 }} />
                  </div>
                ))}

                {/* Current time indicator */}
                {date.toDateString() === today.toDateString() && (
                  <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, zIndex: 5, pointerEvents: 'none' }}>
                    <div style={{ height: 2, background: t.accent, position: 'relative' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, position: 'absolute', left: -4, top: -3 }} />
                    </div>
                  </div>
                )}

                {/* Appointments */}
                {dayAppts.map((a, ai) => {
                  const top = toY(a.start);
                  const height = toH(a.start, a.end);
                  const color = serviceColor(t, a.cat);
                  const short = height < 44;
                  const medium = height >= 44 && height < 72;
                  return (
                    <div key={a.id} onClick={() => onSelect(a)}
                      style={{ position: 'absolute', top: top + 2, left: 3, right: 3, height: height - 4, borderRadius: VELA.radius.sm, background: `${color}18`, borderLeft: `3px solid ${color}`, padding: short ? '3px 6px' : '5px 8px', cursor: 'pointer', overflow: 'hidden', transition: 'all 0.15s', zIndex: 2 }}>
                      <div style={{ fontSize: short ? 10 : 11, fontWeight: 700, color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.service}</div>
                      {!short && <div style={{ fontSize: 10, color: t.textSub, marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.client}</div>}
                      {!medium && !short && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{fmtTime(a.start)} – {fmtTime(a.end)}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Month View ─────────────────────────────────────────
function MonthView({ t, year, month, onSelect }) {
  const firstDay = new Date(year, month, 1);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const today = new Date();

  return (
    <div style={{ flex: 1, background: t.surface, borderRadius: VELA.radius.lg, border: `1px solid ${t.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: `1px solid ${t.border}`, background: t.surfaceEl }}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gridAutoRows: '1fr' }}>
        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startDow + 1;
          const isValid = dayNum >= 1 && dayNum <= daysInMonth;
          const date = isValid ? new Date(year, month, dayNum) : null;
          const isToday = date && date.toDateString() === today.toDateString();
          const dayAppts = date ? APPTS.filter(a => a.start.toDateString() === date.toDateString()) : [];
          const revenue = dayAppts.reduce((s, a) => s + a.price, 0);

          return (
            <div key={i} style={{ borderRight: `1px solid ${t.borderSub}`, borderBottom: `1px solid ${t.borderSub}`, padding: '6px 6px 4px', minHeight: 96, background: isValid ? t.surface : t.bgAlt, position: 'relative', cursor: isValid ? 'pointer' : 'default' }}>
              {isValid && (
                <>
                  {/* Date number */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: isToday ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? '#fff' : t.text }}>{dayNum}</span>
                    </div>
                    {revenue > 0 && <span style={{ fontSize: 9, color: t.textMuted, fontWeight: 500 }}>{(revenue/1000).toFixed(1)}к ₽</span>}
                  </div>

                  {/* Appointment bars */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayAppts.slice(0, 3).map(a => {
                      const color = serviceColor(t, a.cat);
                      return (
                        <div key={a.id} onClick={() => onSelect(a)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 5px', borderRadius: 4, background: `${color}15`, cursor: 'pointer' }}>
                          <div style={{ width: 3, height: 3, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: 9, color: t.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {fmtTime(a.start)} {a.service}
                          </span>
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div style={{ fontSize: 9, color: t.textMuted, paddingLeft: 5 }}>+{dayAppts.length - 3} ещё</div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Day View — frozen headers, single scroll container ─
const COL_W = 190;
const TIME_W = 52;

function DayView({ t, date, onSelect }) {
  const wrapRef = uR(null);
  uE(() => {
    if (wrapRef.current) wrapRef.current.scrollTop = 7 * HOUR_H;
  }, []);

  const dayAppts = APPTS.filter(a => a.start.toDateString() === date.toDateString());
  const revenue  = dayAppts.reduce((s, a) => s + a.price, 0);
  const today    = new Date();
  const nowY     = ((today.getHours() - START_H) * 60 + today.getMinutes()) * (HOUR_H / 60);
  const isToday  = date.toDateString() === today.toDateString();
  const gridW    = TIME_W + MASTERS.length * COL_W;

  return (
    <div style={{ flex: 1, display: 'flex', gap: 16, overflow: 'hidden', minHeight: 0 }}>

      {/* ── Главная сетка (один скролл-контейнер) ── */}
      <div style={{ flex: 1, minWidth: 0, background: t.surface, borderRadius: VELA.radius.lg, border: `1px solid ${t.border}`, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        <div ref={wrapRef} style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
          {/* min-width задаёт горизонтальный скролл */}
          <div style={{ minWidth: gridW, position: 'relative' }}>

            {/* ── Строка заголовков мастеров (sticky top) ── */}
            <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', background: t.surfaceEl, borderBottom: `1px solid ${t.border}` }}>
              {/* Угол (sticky left + top) */}
              <div style={{ width: TIME_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 11, background: t.surfaceEl, borderRight: `1px solid ${t.border}` }} />
              {MASTERS.map((m, i) => {
                const color = serviceColor(t, m.cat);
                const count = dayAppts.filter(a => a.masterId === m.id).length;
                return (
                  <div key={m.id} style={{ width: COL_W, flexShrink: 0, padding: '10px 12px', borderLeft: i > 0 ? `1px solid ${t.border}` : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
                        {m.name.split(' ').map(w => w[0]).join('').slice(0, 2)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
                        <div style={{ fontSize: 10, color: t.textMuted }}>{count} {count === 1 ? 'запись' : count < 5 ? 'записи' : 'записей'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Тело сетки ── */}
            <div style={{ display: 'flex', position: 'relative' }}>
              {/* Часовые метки (sticky left) */}
              <div style={{ width: TIME_W, flexShrink: 0, position: 'sticky', left: 0, zIndex: 4, background: t.bgAlt, borderRight: `1px solid ${t.border}` }}>
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_H, borderBottom: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'flex-start', paddingTop: 6, justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: t.textMuted, fontWeight: 500 }}>{h}:00</span>
                  </div>
                ))}
              </div>

              {/* Колонки мастеров */}
              {MASTERS.map((m, mi) => {
                const mAppts = dayAppts.filter(a => a.masterId === m.id);
                return (
                  <div key={m.id} style={{ width: COL_W, flexShrink: 0, position: 'relative', borderLeft: mi > 0 ? `1px solid ${t.border}` : 'none' }}>
                    {HOURS.map(h => (
                      <div key={h} style={{ height: HOUR_H, borderBottom: `1px solid ${t.borderSub}`, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: t.borderSub, opacity: 0.35 }} />
                      </div>
                    ))}

                    {/* Текущее время */}
                    {isToday && (
                      <div style={{ position: 'absolute', top: nowY, left: 0, right: 0, zIndex: 5, pointerEvents: 'none' }}>
                        {mi === 0
                          ? <div style={{ height: 2, background: t.accent, position: 'relative' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, position: 'absolute', left: -4, top: -3 }} /></div>
                          : <div style={{ height: 2, background: `${t.accent}55` }} />}
                      </div>
                    )}

                    {/* Записи */}
                    {mAppts.map(a => {
                      const top    = toY(a.start);
                      const height = toH(a.start, a.end);
                      const color  = serviceColor(t, a.cat);
                      const short  = height < 46;
                      return (
                        <div key={a.id} onClick={() => onSelect(a)}
                          style={{ position: 'absolute', top: top + 2, left: 4, right: 4, height: height - 4, borderRadius: VELA.radius.sm, background: `${color}18`, borderLeft: `3px solid ${color}`, padding: short ? '4px 8px' : '6px 10px', cursor: 'pointer', overflow: 'hidden', zIndex: 2, transition: 'background 0.15s' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.service}</div>
                          {!short && <div style={{ fontSize: 10, color: t.textSub, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.client}</div>}
                          {!short && <div style={{ fontSize: 10, color: t.textMuted, marginTop: 1 }}>{fmtTime(a.start)}–{fmtTime(a.end)}</div>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Боковая панель ── */}
      <div style={{ width: 196, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, padding: 16 }}>
          <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Итого за день</div>
          <div style={{ fontFamily: VELA.fonts.display, fontSize: 26, fontWeight: 500, color: t.text, letterSpacing: '-0.5px', lineHeight: 1 }}>{revenue.toLocaleString('ru')} ₽</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>{dayAppts.length} {dayAppts.length === 1 ? 'запись' : dayAppts.length < 5 ? 'записи' : 'записей'}</div>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, padding: 16, flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>По мастерам</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {MASTERS.map(m => {
              const mAppts = dayAppts.filter(a => a.masterId === m.id);
              const mRev   = mAppts.reduce((s, a) => s + a.price, 0);
              const color  = serviceColor(t, m.cat);
              if (!mAppts.length) return null;
              return (
                <div key={m.id}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: t.textMuted }}>{mAppts.length} зап.</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.accent, paddingLeft: 13 }}>{mRev.toLocaleString('ru')} ₽</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Detail Modal ───────────────────────────
function ApptModal({ appt, t, onClose }) {
  if (!appt) return null;
  const color = serviceColor(t, appt.cat);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.xl, padding: 28, width: 360, boxShadow: '0 16px 64px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <h3 style={{ fontFamily: VELA.fonts.display, fontSize: 22, fontWeight: 500, color: t.text, letterSpacing: '-0.5px' }}>{appt.service}</h3>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13, color: t.textSub, marginBottom: 24 }}>
          {[['Клиент', appt.client], ['Начало', fmtTime(appt.start)], ['Конец', fmtTime(appt.end)], ['Стоимость', `${appt.price.toLocaleString('ru')} ₽`]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${t.borderSub}` }}>
              <span style={{ color: t.textMuted }}>{k}</span>
              <span style={{ fontWeight: 600, color: t.text }}>{v}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="outlined" style={{ flex: 1 }} onClick={onClose}>Закрыть</Btn>
          <Btn variant="accent" style={{ flex: 1 }}>Редактировать</Btn>
        </div>
      </div>
    </div>
  );
}

// ── Main Calendar Component ────────────────────────────
function VelaCalendar({ t }) {
  const [mode, setMode] = uS('week');
  const [weekStart] = uS(new Date(2026, 3, 13)); // Mon Apr 13
  const [viewDate] = uS(new Date(2026, 3, 13));
  const [selected, setSelected] = uS(null);

  const fmt = (d) => d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['‹','prev'],['Сегодня','today'],['›','next']].map(([label, id]) => (
            <button key={id} style={{ padding: '6px 12px', borderRadius: VELA.radius.sm, background: t.surfaceEl, color: t.textSub, border: `1px solid ${t.border}`, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: 500 }}>{label}</button>
          ))}
        </div>
        <span style={{ fontFamily: VELA.fonts.display, fontSize: 18, color: t.text, fontWeight: 500, letterSpacing: '-0.3px', marginLeft: 4 }}>
          {mode === 'week' ? `13 – 19 апреля 2026` : mode === 'day' ? fmt(viewDate) : 'Апрель 2026'}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, background: t.surfaceEl, padding: 3, borderRadius: VELA.radius.md, border: `1px solid ${t.border}` }}>
          {[['week','Неделя'],['day','День'],['month','Месяц']].map(([id,label]) => (
            <button key={id} onClick={() => setMode(id)}
              style={{ padding: '5px 14px', borderRadius: VELA.radius.sm, background: mode === id ? t.accent : 'transparent', color: mode === id ? '#fff' : t.textSub, border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: mode === id ? 600 : 400, transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      {mode === 'week'  && <WeekView  t={t} weekStart={weekStart} onSelect={setSelected} />}
      {mode === 'month' && <MonthView t={t} year={2026} month={3} onSelect={setSelected} />}
      {mode === 'day'   && <DayView   t={t} date={viewDate} onSelect={setSelected} />}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap', flexShrink: 0 }}>
        {[['Волосы', t.hair],['Ногти', t.nails],['Массаж', t.massage],['Брови/Ресн.', t.brows],['Макияж', t.makeup]].map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: t.textMuted }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'inline-block' }} />
            {label}
          </div>
        ))}
      </div>

      <ApptModal appt={selected} t={t} onClose={() => setSelected(null)} />
    </div>
  );
}

Object.assign(window, { VelaCalendar, APPTS, MASTERS, serviceColor: window.serviceColor });
