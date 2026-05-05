// VELA Appointments — DataGrid-style table with filters + pagination
const { useState: uSt, useMemo: uM, useCallback: uCb } = React;

// ── Extended mock data ──────────────────────────────────
const STATUS_LABELS = { confirmed: 'Подтверждено', pending: 'Ожидает', cancelled: 'Отменено', completed: 'Завершено', no_show: 'Не явился' };
const STATUS_COLORS = (t) => ({
  confirmed: { color: t.success,   bg: t.successSoft },
  pending:   { color: t.warning,   bg: t.warnSoft },
  cancelled: { color: t.error,     bg: t.errorSoft },
  completed: { color: t.textMuted, bg: t.surfaceEl },
  no_show:   { color: t.error,     bg: t.errorSoft },
});

function mkRow(dayOffset, sh, sm, eh, em, service, client, phone, masterId, status, price, cat) {
  const base = new Date(2026, 3, 13);
  base.setDate(base.getDate() + dayOffset);
  const s = new Date(base); s.setHours(sh, sm, 0);
  const e = new Date(base); e.setHours(eh, em, 0);
  return { id: Math.random().toString(36).slice(2), start: s, end: e, service, client, phone, masterId, status, price, cat };
}

const ALL_ROWS = [
  mkRow(0,  10,  0, 11,  0, 'Маникюр гель',          'Анна Корнева',      '+7 916 123-45-67', 'm1', 'confirmed', 2800, 'nails'),
  mkRow(0,  11, 30, 13,  0, 'Стрижка + укладка',     'Ольга Матвеева',    '+7 903 234-56-78', 'm2', 'confirmed', 4500, 'hair'),
  mkRow(0,  14,  0, 14, 30, 'Коррекция бровей',      'Лена Романова',     '+7 926 345-67-89', 'm3', 'pending',   1200, 'brows'),
  mkRow(0,  10, 30, 12,  0, 'Свадебный макияж',      'Алиса Дмитриева',   '+7 999 456-78-90', 'm4', 'confirmed', 9000, 'makeup'),
  mkRow(0,  15,  0, 17,  0, 'Окрашивание',           'Марина Петрова',    '+7 985 567-89-01', 'm2', 'pending',   8500, 'hair'),
  mkRow(0,   9,  0, 10, 30, 'Массаж лица',           'Юлия Николаева',    '+7 977 678-90-12', 'm5', 'confirmed', 4000, 'massage'),
  mkRow(0,  12,  0, 13, 30, 'СПА-маникюр',           'Вера Тихонова',     '+7 968 789-01-23', 'm1', 'completed', 3800, 'nails'),
  mkRow(0,  13,  0, 14, 30, 'Ламинирование бровей',  'Катя Смирнова',     '+7 906 890-12-34', 'm3', 'cancelled', 2500, 'brows'),
  mkRow(1,   9,  0, 10, 30, 'Педикюр',               'Светлана Волкова',  '+7 916 901-23-45', 'm1', 'confirmed', 3200, 'nails'),
  mkRow(1,  11,  0, 12,  0, 'Ламинирование бровей',  'Катя Смирнова',     '+7 906 890-12-34', 'm3', 'pending',   2500, 'brows'),
  mkRow(1,  16,  0, 17, 30, 'Массаж лица',           'Юлия Николаева',    '+7 977 678-90-12', 'm5', 'confirmed', 4000, 'massage'),
  mkRow(1,  10,  0, 11, 30, 'Окрашивание тон',       'Дарья Козлова',     '+7 926 012-34-56', 'm2', 'no_show',   5500, 'hair'),
  mkRow(2,  10,  0, 11, 30, 'СПА-маникюр',           'Вера Тихонова',     '+7 968 789-01-23', 'm1', 'confirmed', 3800, 'nails'),
  mkRow(2,  14,  0, 16,  0, 'Кератин',               'Ирина Фёдорова',    '+7 985 123-45-00', 'm2', 'pending',   9000, 'hair'),
  mkRow(2,  12,  0, 13,  0, 'Дневной макияж',        'Маша Кравцова',     '+7 903 234-56-99', 'm4', 'confirmed', 4800, 'makeup'),
  mkRow(3,   9, 30, 11,  0, 'Массаж тела',           'Дарья Козлова',     '+7 926 012-34-56', 'm5', 'confirmed', 5500, 'massage'),
  mkRow(3,  11, 30, 12,  0, 'Оформление бровей',     'Наташа Павлова',    '+7 999 345-67-00', 'm3', 'confirmed', 1800, 'brows'),
  mkRow(3,  13,  0, 14, 30, 'Стрижка',               'Соня Миронова',     '+7 985 456-78-00', 'm2', 'pending',   3200, 'hair'),
  mkRow(3,  15, 30, 16, 30, 'Гель-лак',              'Таня Виноградова',  '+7 977 567-89-00', 'm1', 'confirmed', 2400, 'nails'),
  mkRow(3,  17,  0, 18, 30, 'Ламинирование ресниц',  'Оля Герасимова',    '+7 968 678-90-00', 'm3', 'confirmed', 3500, 'brows'),
  mkRow(4,  10,  0, 11,  0, 'Макияж',                'Женя Лебедева',     '+7 906 789-01-00', 'm4', 'cancelled', 4800, 'makeup'),
  mkRow(4,  12,  0, 14,  0, 'Мелирование',           'Лера Сергеева',     '+7 916 890-12-00', 'm2', 'confirmed', 7500, 'hair'),
  mkRow(4,  15,  0, 16,  0, 'Педикюр',               'Маша Кравцова',     '+7 903 234-56-99', 'm1', 'pending',   3000, 'nails'),
  mkRow(5,  10, 30, 12, 30, 'Свадебный макияж',      'Катя Николаева',    '+7 926 901-23-00', 'm4', 'confirmed', 9000, 'makeup'),
  mkRow(5,  13,  0, 14,  0, 'Маникюр',               'Аня Васильева',     '+7 999 012-34-00', 'm1', 'confirmed', 2600, 'nails'),
  mkRow(5,  15,  0, 17,  0, 'Окрашивание',           'Лена Морозова',     '+7 985 123-45-11', 'm2', 'no_show',   8000, 'hair'),
  mkRow(5,  17, 30, 18, 30, 'Массаж',                'Юля Дмитриева',     '+7 977 234-56-11', 'm5', 'confirmed', 4200, 'massage'),
  mkRow(6,  11,  0, 12, 30, 'Стрижка',               'Вика Романова',     '+7 968 345-67-11', 'm2', 'confirmed', 3500, 'hair'),
  mkRow(6,  14,  0, 15,  0, 'Маникюр',               'Поля Смирнова',     '+7 906 456-78-11', 'm1', 'pending',   2800, 'nails'),
  mkRow(-1,  9,  0, 10,  0, 'Стрижка',               'Рита Орлова',       '+7 916 567-89-11', 'm2', 'completed', 3200, 'hair'),
  mkRow(-1, 11,  0, 12,  0, 'СПА-педикюр',           'Зина Фролова',      '+7 903 678-90-11', 'm1', 'completed', 4000, 'nails'),
  mkRow(-1, 14,  0, 15, 30, 'Массаж',                'Нина Кузнецова',    '+7 985 789-01-11', 'm5', 'completed', 5000, 'massage'),
  mkRow(-2, 10,  0, 11, 30, 'Окрашивание',           'Таня Белова',       '+7 977 890-12-11', 'm2', 'completed', 7800, 'hair'),
  mkRow(-2, 12,  0, 13,  0, 'Маникюр гель',          'Лена Иванова',      '+7 968 901-23-11', 'm1', 'completed', 2800, 'nails'),
  mkRow(-2, 15,  0, 16,  0, 'Брови',                 'Катя Антонова',     '+7 906 012-34-11', 'm3', 'cancelled', 1800, 'brows'),
];

const PAGE_SIZES = [10, 25, 50];

// ── Date filter helper ─────────────────────────────────
function applyDateFilter(rows, filter, customFrom, customTo) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const weekEnd = new Date(today); weekEnd.setDate(today.getDate() + 7);
  return rows.filter(r => {
    const d = new Date(r.start); d.setHours(0,0,0,0);
    if (filter === 'today')    return d.getTime() === today.getTime();
    if (filter === 'tomorrow') return d.getTime() === tomorrow.getTime();
    if (filter === 'week')     return d >= today && d <= weekEnd;
    if (filter === 'custom' && customFrom && customTo) return d >= new Date(customFrom) && d <= new Date(customTo);
    return true;
  });
}

// ── DataGrid Column Header ─────────────────────────────
function ColHeader({ label, field, sortField, sortDir, onSort, t }) {
  const active = sortField === field;
  return (
    <div onClick={() => onSort(field)}
      style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none', padding: '0 12px', height: '100%', color: active ? t.accent : t.textMuted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', transition: 'color 0.15s' }}>
      {label}
      <span style={{ fontSize: 9, opacity: active ? 1 : 0.3, color: active ? t.accent : t.textMuted, marginLeft: 2 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </div>
  );
}

// ── Date Period Picker (simple) ────────────────────────
function DateRangePicker({ t, from, to, onChange, onClose }) {
  const [f, setF] = uSt(from || '');
  const [tTo, setT] = uSt(to || '');
  const inputStyle = { background: t.surfaceEl, border: `1px solid ${t.border}`, borderRadius: VELA.radius.sm, padding: '7px 10px', color: t.text, fontSize: 13, fontFamily: VELA.fonts.ui, outline: 'none', colorScheme: 'dark' };
  return (
    <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, marginTop: 4, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 260 }}>
      <div style={{ fontSize: 12, color: t.textMuted, fontWeight: 600 }}>Задать период</div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="date" value={f} onChange={e => setF(e.target.value)} style={inputStyle} />
        <span style={{ color: t.textMuted, fontSize: 12 }}>—</span>
        <input type="date" value={tTo} onChange={e => setT(e.target.value)} style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" size="sm" onClick={onClose}>Отмена</Btn>
        <Btn variant="accent" size="sm" onClick={() => { onChange(f, tTo); onClose(); }}>Применить</Btn>
      </div>
    </div>
  );
}

// ── Filter Select Dropdown ─────────────────────────────
function FilterSelect({ t, value, onChange, options, placeholder }) {
  const [open, setOpen] = uSt(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const label = options.find(o => o.value === value)?.label || placeholder;
  const active = value !== '';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: active ? t.accentSoft : t.surfaceEl, border: `1px solid ${active ? t.accent : t.border}`, borderRadius: VELA.radius.md, color: active ? t.accent : t.textSub, fontSize: 12, fontFamily: VELA.fonts.ui, fontWeight: active ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
        {label}
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden', minWidth: 180 }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '9px 14px', fontSize: 13, color: o.value === value ? t.accent : t.text, background: o.value === value ? t.accentSoft : 'transparent', cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: o.value === value ? 600 : 400 }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main AppointmentsDataGrid ──────────────────────────
function AppointmentsDataGrid({ t }) {
  const [dateFilter, setDateFilter] = uSt('all');
  const [customFrom, setCustomFrom]  = uSt('');
  const [customTo, setCustomTo]      = uSt('');
  const [showPicker, setShowPicker]  = uSt(false);
  const [statusFilter, setStatus]    = uSt('');
  const [masterFilter, setMaster]    = uSt('');
  const [serviceFilter, setService]  = uSt('');
  const [sortField, setSortField]    = uSt('start');
  const [sortDir, setSortDir]        = uSt('asc');
  const [page, setPage]              = uSt(0);
  const [pageSize, setPageSize]      = uSt(25);
  const [selected, setSelected]      = uSt(new Set());
  const [hovRow, setHovRow]          = uSt(null);

  const handleSort = uCb((field) => {
    setSortField(f => { if (f === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return f; } setSortDir('asc'); return field; });
  }, []);

  // Unique services
  const allServices = [...new Set(ALL_ROWS.map(r => r.service))].sort();

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'confirmed', label: 'Подтверждено' },
    { value: 'pending',   label: 'Ожидает' },
    { value: 'completed', label: 'Завершено' },
    { value: 'cancelled', label: 'Отменено' },
    { value: 'no_show',   label: 'Не явился' },
  ];
  const masterOptions = [{ value: '', label: 'Все мастера' }, ...MASTERS.map(m => ({ value: m.id, label: m.name }))];
  const serviceOptions = [{ value: '', label: 'Все услуги' }, ...allServices.map(s => ({ value: s, label: s }))];

  const filtered = uM(() => {
    let rows = applyDateFilter(ALL_ROWS, dateFilter, customFrom, customTo);
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
    if (masterFilter) rows = rows.filter(r => r.masterId === masterFilter);
    if (serviceFilter) rows = rows.filter(r => r.service === serviceFilter);

    rows = [...rows].sort((a, b) => {
      let av, bv;
      if (sortField === 'start')   { av = a.start; bv = b.start; }
      else if (sortField === 'client')  { av = a.client; bv = b.client; }
      else if (sortField === 'service') { av = a.service; bv = b.service; }
      else if (sortField === 'master')  { av = (MASTERS.find(m=>m.id===a.masterId)||{}).name||''; bv = (MASTERS.find(m=>m.id===b.masterId)||{}).name||''; }
      else if (sortField === 'status')  { av = a.status; bv = b.status; }
      else if (sortField === 'price')   { av = a.price; bv = b.price; }
      else { av = a[sortField]; bv = b[sortField]; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [dateFilter, customFrom, customTo, statusFilter, masterFilter, serviceFilter, sortField, sortDir]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every(r => selected.has(r.id));
  const someSelected = pageRows.some(r => selected.has(r.id));

  const toggleSelectAll = () => {
    setSelected(s => {
      const n = new Set(s);
      if (allOnPageSelected) pageRows.forEach(r => n.delete(r.id)); else pageRows.forEach(r => n.add(r.id));
      return n;
    });
  };

  const SC = STATUS_COLORS(t);
  const dateChips = [
    { id: 'all',      label: 'Все' },
    { id: 'today',    label: 'Сегодня' },
    { id: 'tomorrow', label: 'Завтра' },
    { id: 'week',     label: 'Эта неделя' },
    { id: 'custom',   label: customFrom && customTo ? `${customFrom.slice(5).split('-').reverse().join('.')} – ${customTo.slice(5).split('-').reverse().join('.')}` : 'Задать период…' },
  ];

  const colHeaderProps = { sortField, sortDir, onSort: handleSort, t };
  const COL = { cb: 40, date: 160, client: 210, service: 200, master: 160, status: 145, price: 110, actions: 290 };

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {/* Date chips */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: t.surfaceEl, borderRadius: VELA.radius.md, border: `1px solid ${t.border}`, position: 'relative' }}>
          {dateChips.map(c => (
            <button key={c.id}
              onClick={() => { if (c.id === 'custom') setShowPicker(p => !p); else { setDateFilter(c.id); setShowPicker(false); } }}
              style={{ padding: '5px 12px', borderRadius: VELA.radius.sm, background: dateFilter === c.id ? t.accent : 'transparent', color: dateFilter === c.id ? '#fff' : t.textSub, border: 'none', fontSize: 12, fontFamily: VELA.fonts.ui, fontWeight: dateFilter === c.id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {c.label}
            </button>
          ))}
          {showPicker && (
            <DateRangePicker t={t} from={customFrom} to={customTo}
              onChange={(f, to) => { setCustomFrom(f); setCustomTo(to); setDateFilter('custom'); }}
              onClose={() => setShowPicker(false)} />
          )}
        </div>

        <FilterSelect t={t} value={statusFilter} onChange={v => { setStatus(v); setPage(0); }} options={statusOptions} placeholder="Все статусы" />
        <FilterSelect t={t} value={masterFilter} onChange={v => { setMaster(v); setPage(0); }} options={masterOptions} placeholder="Все мастера" />
        <FilterSelect t={t} value={serviceFilter} onChange={v => { setService(v); setPage(0); }} options={serviceOptions} placeholder="Все услуги" />

        {/* Active filter count */}
        {(statusFilter || masterFilter || serviceFilter) && (
          <button onClick={() => { setStatus(''); setMaster(''); setService(''); }}
            style={{ padding: '5px 10px', border: `1px solid ${t.error}55`, borderRadius: VELA.radius.md, background: t.errorSoft, color: t.error, fontSize: 11, fontFamily: VELA.fonts.ui, cursor: 'pointer' }}>
            Сбросить фильтры ×
          </button>
        )}

        <div style={{ flex: 1 }} />
        {selected.size > 0 && (
          <span style={{ fontSize: 12, color: t.textMuted }}>Выбрано: {selected.size}</span>
        )}
        <Btn variant="accent" size="sm" icon="＋">Создать запись</Btn>
      </div>

      {/* ── DataGrid ── */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Column headers */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: 42, borderBottom: `1px solid ${t.border}`, background: t.surfaceEl, flexShrink: 0, position: 'sticky', top: 0, zIndex: 3 }}>
          {/* Checkbox */}
          <div style={{ width: COL.cb, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${t.borderSub}` }}
            onClick={toggleSelectAll}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${allOnPageSelected ? t.accent : someSelected ? t.accent : t.border}`, background: allOnPageSelected ? t.accent : someSelected ? `${t.accent}40` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
              {allOnPageSelected && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
              {!allOnPageSelected && someSelected && <span style={{ fontSize: 10, color: t.accent, fontWeight: 700 }}>–</span>}
            </div>
          </div>
          <div style={{ width: COL.date,    flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><ColHeader label="Дата и время" field="start"   {...colHeaderProps} /></div>
          <div style={{ width: COL.client,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><ColHeader label="Клиент"       field="client"  {...colHeaderProps} /></div>
          <div style={{ width: COL.service, flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><ColHeader label="Услуга"        field="service" {...colHeaderProps} /></div>
          <div style={{ width: COL.master,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><ColHeader label="Мастер"        field="master"  {...colHeaderProps} /></div>
          <div style={{ width: COL.status,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><ColHeader label="Статус"        field="status"  {...colHeaderProps} /></div>
          <div style={{ width: COL.price,   flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><ColHeader label="Сумма"         field="price"   {...colHeaderProps} /></div>
          <div style={{ flex: 1, minWidth: COL.actions, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
            <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Действия</span>
          </div>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {pageRows.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.2 }}>📋</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>Записей не найдено</div>
            </div>
          )}
          {pageRows.map((row, ri) => {
            const isSel = selected.has(row.id);
            const isHov = hovRow === row.id;
            const master = MASTERS.find(m => m.id === row.masterId);
            const sc = SC[row.status] || SC.pending;
            const color = serviceColor(t, row.cat);
            const fmtDate = row.start.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const fmtTime = `${String(row.start.getHours()).padStart(2,'0')}:${String(row.start.getMinutes()).padStart(2,'0')}`;

            return (
              <div key={row.id}
                onMouseEnter={() => setHovRow(row.id)}
                onMouseLeave={() => setHovRow(null)}
                style={{ display: 'flex', alignItems: 'center', height: 52, borderBottom: `1px solid ${t.borderSub}`, background: isSel ? `${t.accent}09` : isHov ? t.surfaceEl : 'transparent', transition: 'background 0.12s', cursor: 'default' }}>

                {/* Checkbox */}
                <div style={{ width: COL.cb, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${t.borderSub}` }}
                  onClick={() => setSelected(s => { const n = new Set(s); isSel ? n.delete(row.id) : n.add(row.id); return n; })}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? t.accent : t.border}`, background: isSel ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {isSel && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                  </div>
                </div>

                {/* Дата и время */}
                <div style={{ width: COL.date, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{fmtDate}</div>
                  <div style={{ fontSize: 11, color: t.textMuted }}>{fmtTime} — {String(row.end.getHours()).padStart(2,'0')}:{String(row.end.getMinutes()).padStart(2,'0')}</div>
                </div>

                {/* Клиент */}
                <div style={{ width: COL.client, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={row.client} size={26} accent={`${color}22`} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.client}</div>
                      <div style={{ fontSize: 10, color: t.textMuted }}>{row.phone}</div>
                    </div>
                  </div>
                </div>

                {/* Услуга */}
                <div style={{ width: COL.service, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.service}</span>
                  </div>
                </div>

                {/* Мастер */}
                <div style={{ width: COL.master, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  {master && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Avatar name={master.name} size={22} accent={`${serviceColor(t, master.cat)}22`} />
                      <span style={{ fontSize: 12, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{master.name}</span>
                    </div>
                  )}
                </div>

                {/* Статус */}
                <div style={{ width: COL.status, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <Badge color={sc.color} bg={sc.bg}>{STATUS_LABELS[row.status]}</Badge>
                </div>

                {/* Сумма */}
                <div style={{ width: COL.price, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{row.price.toLocaleString('ru')} ₽</span>
                </div>

                {/* Действия */}
                <div style={{ flex: 1, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ActionBtn label="Редактировать" color={t.info}    bg={t.infoSoft}    />
                  <ActionBtn label="Подтвердить"   color={t.success} bg={t.successSoft} disabled={row.status === 'confirmed' || row.status === 'completed' || row.status === 'cancelled'} />
                  <ActionBtn label="Отменить"      color={t.error}   bg={t.errorSoft}   disabled={row.status === 'cancelled' || row.status === 'completed'} />
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Pagination footer ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${t.border}`, background: t.surfaceEl, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: t.textMuted }}>Строк на странице:</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {PAGE_SIZES.map(ps => (
                <button key={ps} onClick={() => { setPageSize(ps); setPage(0); }}
                  style={{ padding: '4px 10px', borderRadius: VELA.radius.sm, background: pageSize === ps ? t.accent : t.surfaceEl, border: `1px solid ${pageSize === ps ? t.accent : t.border}`, color: pageSize === ps ? '#fff' : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: pageSize === ps ? 600 : 400, transition: 'all 0.15s' }}>{ps}</button>
              ))}
            </div>
          </div>

          <span style={{ fontSize: 12, color: t.textMuted }}>
            {filtered.length === 0 ? '0' : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)}`} из {filtered.length}
          </span>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <PagBtn icon="«" disabled={page === 0}             onClick={() => setPage(0)}             t={t} />
            <PagBtn icon="‹" disabled={page === 0}             onClick={() => setPage(p => p - 1)}    t={t} />
            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i;
              if (totalPages > 5) {
                if (page < 3) p = i;
                else if (page > totalPages - 3) p = totalPages - 5 + i;
                else p = page - 2 + i;
              }
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, borderRadius: VELA.radius.sm, background: page === p ? t.accent : 'transparent', border: `1px solid ${page === p ? t.accent : t.border}`, color: page === p ? '#fff' : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: page === p ? 700 : 400, transition: 'all 0.15s' }}>{p + 1}</button>
              );
            })}
            <PagBtn icon="›" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}    t={t} />
            <PagBtn icon="»" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, color, bg, disabled }) {
  const [hov, setHov] = uSt(false);
  return (
    <button
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: '4px 10px', borderRadius: VELA.radius.sm,
        background: hov ? bg : 'transparent',
        border: `1px solid ${hov ? color : disabled ? 'transparent' : `${color}55`}`,
        color: disabled ? color + '40' : color,
        fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: VELA.fonts.ui, whiteSpace: 'nowrap',
        transition: 'all 0.12s', opacity: disabled ? 0.35 : 1,
      }}>
      {label}
    </button>
  );
}

function PagBtn({ icon, disabled, onClick, t }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: VELA.radius.sm, background: 'transparent', border: `1px solid ${t.border}`, color: disabled ? t.textMuted : t.textSub, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: VELA.fonts.ui, transition: 'all 0.15s' }}>
      {icon}
    </button>
  );
}

Object.assign(window, { AppointmentsDataGrid, ALL_ROWS });
