// VELA Services & Staff DataGrids
const { useState: uSS, useMemo: uSM, useCallback: uSCb, useReducer: uSR } = React;

// ── SERVICES DATA ──────────────────────────────────────
const SERVICES_DATA = [
  { id: 's1',  name: 'Маникюр классический',   cat: 'nails',   duration: 60,  price: 2400,  masters: ['m1'],          active: true  },
  { id: 's2',  name: 'Маникюр гель-лак',        cat: 'nails',   duration: 90,  price: 3200,  masters: ['m1'],          active: true  },
  { id: 's3',  name: 'СПА-маникюр',             cat: 'nails',   duration: 90,  price: 3800,  masters: ['m1'],          active: true  },
  { id: 's4',  name: 'Педикюр',                 cat: 'nails',   duration: 75,  price: 3000,  masters: ['m1'],          active: true  },
  { id: 's5',  name: 'Стрижка',                 cat: 'hair',    duration: 60,  price: 3200,  masters: ['m2'],          active: true  },
  { id: 's6',  name: 'Стрижка + укладка',       cat: 'hair',    duration: 90,  price: 4500,  masters: ['m2'],          active: true  },
  { id: 's7',  name: 'Окрашивание',             cat: 'hair',    duration: 120, price: 8500,  masters: ['m2'],          active: true  },
  { id: 's8',  name: 'Мелирование',             cat: 'hair',    duration: 150, price: 7500,  masters: ['m2'],          active: true  },
  { id: 's9',  name: 'Кератин',                 cat: 'hair',    duration: 180, price: 9000,  masters: ['m2'],          active: false },
  { id: 's10', name: 'Коррекция бровей',        cat: 'brows',   duration: 30,  price: 1200,  masters: ['m3'],          active: true  },
  { id: 's11', name: 'Оформление бровей',       cat: 'brows',   duration: 45,  price: 1800,  masters: ['m3'],          active: true  },
  { id: 's12', name: 'Ламинирование бровей',    cat: 'brows',   duration: 60,  price: 2500,  masters: ['m3'],          active: true  },
  { id: 's13', name: 'Ламинирование ресниц',    cat: 'brows',   duration: 60,  price: 3500,  masters: ['m3'],          active: false },
  { id: 's14', name: 'Дневной макияж',          cat: 'makeup',  duration: 60,  price: 4800,  masters: ['m4'],          active: true  },
  { id: 's15', name: 'Свадебный макияж',        cat: 'makeup',  duration: 120, price: 9000,  masters: ['m4'],          active: true  },
  { id: 's16', name: 'Массаж лица',             cat: 'massage', duration: 60,  price: 4000,  masters: ['m5'],          active: true  },
  { id: 's17', name: 'Массаж тела',             cat: 'massage', duration: 90,  price: 5500,  masters: ['m5'],          active: true  },
  { id: 's18', name: 'Массаж',                  cat: 'massage', duration: 60,  price: 4200,  masters: ['m5'],          active: true  },
];

const CAT_LABELS = { nails: 'Ногти', hair: 'Волосы', brows: 'Брови', makeup: 'Макияж', massage: 'Массаж', other: 'Прочее' };

// ── STAFF DATA ─────────────────────────────────────────
const STAFF_DATA = [
  { id: 'm1', name: 'Виктория С.',   spec: 'Маникюр · Педикюр',    cat: 'nails',   phone: '+7 916 001-11-11', appointments: 84, revenue: 278400, rating: 4.9, status: 'active'   },
  { id: 'm2', name: 'Анна Морозова', spec: 'Стрижка · Окрашивание', cat: 'hair',    phone: '+7 903 002-22-22', appointments: 72, revenue: 392000, rating: 4.8, status: 'active'   },
  { id: 'm3', name: 'Карина Л.',     spec: 'Брови · Ресницы',       cat: 'brows',   phone: '+7 926 003-33-33', appointments: 96, revenue: 196800, rating: 4.9, status: 'vacation' },
  { id: 'm4', name: 'Маша К.',       spec: 'Макияж · Уход',         cat: 'makeup',  phone: '+7 999 004-44-44', appointments: 51, revenue: 264600, rating: 4.7, status: 'active'   },
  { id: 'm5', name: 'Лена П.',       spec: 'Массаж · СПА',          cat: 'massage', phone: '+7 985 005-55-55', appointments: 63, revenue: 283500, rating: 5.0, status: 'active'   },
];

const STAFF_STATUS_LABELS = { active: 'Активен', vacation: 'В отпуске', inactive: 'Неактивен' };
const STAFF_STATUS_COLORS = (t) => ({
  active:   { color: t.success, bg: t.successSoft },
  vacation: { color: t.warning, bg: t.warnSoft },
  inactive: { color: t.textMuted, bg: t.surfaceEl },
});

const SPAGE_SIZES = [10, 25, 50];

// ── Shared: SColHeader ─────────────────────────────────
function SColHeader({ label, field, sortField, sortDir, onSort, t }) {
  const active = sortField === field;
  return (
    <div onClick={() => onSort(field)}
      style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none',
        padding: '0 12px', height: '100%', color: active ? t.accent : t.textMuted,
        fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px', transition: 'color 0.15s' }}>
      {label}
      <span style={{ fontSize: 9, opacity: active ? 1 : 0.3, color: active ? t.accent : t.textMuted, marginLeft: 2 }}>
        {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
      </span>
    </div>
  );
}

// ── Shared: SFilterSelect ──────────────────────────────
function SFilterSelect({ t, value, onChange, options, placeholder }) {
  const [open, setOpen] = uSS(false);
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

// ── Shared: SPagBtn ────────────────────────────────────
function SPagBtn({ icon, disabled, onClick, t }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ width: 30, height: 30, borderRadius: VELA.radius.sm, background: 'transparent', border: `1px solid ${t.border}`, color: disabled ? t.textMuted : t.textSub, fontSize: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.35 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: VELA.fonts.ui, transition: 'all 0.15s' }}>
      {icon}
    </button>
  );
}

// ── Shared: SActionBtn ─────────────────────────────────
function SActionBtn({ label, color, bg, disabled, onClick }) {
  const [hov, setHov] = uSS(false);
  return (
    <button disabled={disabled} onClick={onClick}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ padding: '4px 10px', borderRadius: VELA.radius.sm, background: hov ? bg : 'transparent', border: `1px solid ${hov ? color : disabled ? 'transparent' : `${color}55`}`, color: disabled ? color + '40' : color, fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: VELA.fonts.ui, whiteSpace: 'nowrap', transition: 'all 0.12s', opacity: disabled ? 0.35 : 1 }}>
      {label}
    </button>
  );
}

// ══════════════════════════════════════════════════════
// ── SERVICES DATAGRID ──────────────────────────────────
// ══════════════════════════════════════════════════════
function ServicesDataGrid({ t }) {
  const [catFilter, setCat]       = uSS('');
  const [activeFilter, setActive] = uSS('');
  const [sortField, setSortField] = uSS('name');
  const [sortDir, setSortDir]     = uSS('asc');
  const [page, setPage]           = uSS(0);
  const [pageSize, setPageSize]   = uSS(25);
  const [selected, setSelected]   = uSS(new Set());
  const [hovRow, setHovRow]       = uSS(null);
  const [drawer, setDrawer]       = uSS({ open: false, data: null });
  const openDrawer  = (row, e) => { e && e.stopPropagation(); setDrawer({ open: true, data: row }); };
  const closeDrawer = ()        => setDrawer(d => ({ ...d, open: false }));
  const saveDrawer  = (form)    => { closeDrawer(); };

  const handleSort = uSCb((field) => {
    setSortField(f => { if (f === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return f; } setSortDir('asc'); return field; });
  }, []);

  const catOptions = [
    { value: '', label: 'Все категории' },
    ...Object.entries(CAT_LABELS).map(([v, label]) => ({ value: v, label })),
  ];
  const activeOptions = [
    { value: '',     label: 'Любой статус' },
    { value: 'true', label: 'Активна' },
    { value: 'false',label: 'Неактивна' },
  ];

  const filtered = uSM(() => {
    let rows = [...SERVICES_DATA];
    if (catFilter)    rows = rows.filter(r => r.cat === catFilter);
    if (activeFilter !== '') rows = rows.filter(r => String(r.active) === activeFilter);
    rows.sort((a, b) => {
      let av, bv;
      if (sortField === 'name')     { av = a.name; bv = b.name; }
      else if (sortField === 'cat') { av = CAT_LABELS[a.cat]; bv = CAT_LABELS[b.cat]; }
      else if (sortField === 'duration') { av = a.duration; bv = b.duration; }
      else if (sortField === 'price')    { av = a.price;    bv = b.price; }
      else if (sortField === 'masters')  { av = a.masters.length; bv = b.masters.length; }
      else { av = a[sortField]; bv = b[sortField]; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [catFilter, activeFilter, sortField, sortDir]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const allOnPageSel = pageRows.length > 0 && pageRows.every(r => selected.has(r.id));
  const someSel = pageRows.some(r => selected.has(r.id));
  const toggleAll = () => setSelected(s => { const n = new Set(s); if (allOnPageSel) pageRows.forEach(r => n.delete(r.id)); else pageRows.forEach(r => n.add(r.id)); return n; });

  const hProps = { sortField, sortDir, onSort: handleSort, t };
  const COL = { cb: 40, name: 240, cat: 140, duration: 130, price: 120, masters: 130, status: 130, actions: 200 };

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SFilterSelect t={t} value={catFilter} onChange={v => { setCat(v); setPage(0); }} options={catOptions} placeholder="Все категории" />
        <SFilterSelect t={t} value={activeFilter} onChange={v => { setActive(v); setPage(0); }} options={activeOptions} placeholder="Любой статус" />
        {(catFilter || activeFilter) && (
          <button onClick={() => { setCat(''); setActive(''); }}
            style={{ padding: '5px 10px', border: `1px solid ${t.error}55`, borderRadius: VELA.radius.md, background: t.errorSoft, color: t.error, fontSize: 11, fontFamily: VELA.fonts.ui, cursor: 'pointer' }}>
            Сбросить ×
          </button>
        )}
        <div style={{ flex: 1 }} />
        {selected.size > 0 && <span style={{ fontSize: 12, color: t.textMuted }}>Выбрано: {selected.size}</span>}
        <Btn variant="accent" size="sm" icon="＋">Добавить услугу</Btn>
      </div>

      {/* Grid */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: 42, borderBottom: `1px solid ${t.border}`, background: t.surfaceEl, flexShrink: 0, position: 'sticky', top: 0, zIndex: 3 }}>
          <div style={{ width: COL.cb, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${t.borderSub}` }} onClick={toggleAll}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${allOnPageSel ? t.accent : someSel ? t.accent : t.border}`, background: allOnPageSel ? t.accent : someSel ? `${t.accent}40` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
              {allOnPageSel && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
              {!allOnPageSel && someSel && <span style={{ fontSize: 10, color: t.accent, fontWeight: 700 }}>–</span>}
            </div>
          </div>
          <div style={{ width: COL.name,     flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Название"      field="name"     {...hProps} /></div>
          <div style={{ width: COL.cat,      flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Категория"    field="cat"      {...hProps} /></div>
          <div style={{ width: COL.duration, flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Длительность" field="duration" {...hProps} /></div>
          <div style={{ width: COL.price,    flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Цена"          field="price"    {...hProps} /></div>
          <div style={{ width: COL.masters,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Мастера"       field="masters"  {...hProps} /></div>
          <div style={{ width: COL.status,   flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Статус"        field="active"   {...hProps} /></div>
          <div style={{ flex: 1, minWidth: COL.actions, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
            <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Действия</span>
          </div>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {pageRows.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.2 }}>✦</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>Услуг не найдено</div>
            </div>
          )}
          {pageRows.map((row) => {
            const isSel = selected.has(row.id);
            const isHov = hovRow === row.id;
            const color = serviceColor(t, row.cat);
            const masterList = MASTERS ? MASTERS.filter(m => row.masters.includes(m.id)) : [];

            return (
              <div key={row.id}
                onMouseEnter={() => setHovRow(row.id)}
                onMouseLeave={() => setHovRow(null)}
                onClick={() => openDrawer(row)}
                style={{ display: 'flex', alignItems: 'center', height: 52, borderBottom: `1px solid ${t.borderSub}`, background: isSel ? `${t.accent}09` : isHov ? t.surfaceEl : 'transparent', transition: 'background 0.12s', cursor: 'pointer' }}>

                {/* Checkbox */}
                <div style={{ width: COL.cb, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${t.borderSub}` }}
                  onClick={() => setSelected(s => { const n = new Set(s); isSel ? n.delete(row.id) : n.add(row.id); return n; })}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? t.accent : t.border}`, background: isSel ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {isSel && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                  </div>
                </div>

                {/* Название */}
                <div style={{ width: COL.name, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</span>
                  </div>
                </div>

                {/* Категория */}
                <div style={{ width: COL.cat, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <Badge color={color} bg={`${color}18`}>{CAT_LABELS[row.cat]}</Badge>
                </div>

                {/* Длительность */}
                <div style={{ width: COL.duration, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 13, color: t.text }}>{row.duration} мин</span>
                </div>

                {/* Цена */}
                <div style={{ width: COL.price, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{row.price.toLocaleString('ru')} ₽</span>
                </div>

                {/* Мастера */}
                <div style={{ width: COL.masters, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: -4 }}>
                    {masterList.map((m, i) => (
                      <div key={m.id} style={{ marginLeft: i > 0 ? -6 : 0, zIndex: masterList.length - i }}>
                        <Avatar name={m.name} size={24} accent={`${serviceColor(t, m.cat)}22`} />
                      </div>
                    ))}
                    <span style={{ fontSize: 12, color: t.textMuted, marginLeft: masterList.length > 0 ? 8 : 0 }}>
                      {masterList.length === 1 ? masterList[0].name.split(' ')[0] : `${masterList.length} мастера`}
                    </span>
                  </div>
                </div>

                {/* Статус */}
                <div style={{ width: COL.status, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <Badge color={row.active ? t.success : t.textMuted} bg={row.active ? t.successSoft : t.surfaceEl}>
                    {row.active ? 'Активна' : 'Неактивна'}
                  </Badge>
                </div>

                {/* Действия */}
                <div style={{ flex: 1, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <SActionBtn label="Редактировать" color={t.info} bg={t.infoSoft} onClick={e => openDrawer(row, e)} />
                  <SActionBtn label={row.active ? 'Отключить' : 'Включить'} color={row.active ? t.error : t.success} bg={row.active ? t.errorSoft : t.successSoft} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${t.border}`, background: t.surfaceEl, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: t.textMuted }}>Строк на странице:</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {SPAGE_SIZES.map(ps => (
                <button key={ps} onClick={() => { setPageSize(ps); setPage(0); }}
                  style={{ padding: '4px 10px', borderRadius: VELA.radius.sm, background: pageSize === ps ? t.accent : t.surfaceEl, border: `1px solid ${pageSize === ps ? t.accent : t.border}`, color: pageSize === ps ? '#fff' : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: pageSize === ps ? 600 : 400, transition: 'all 0.15s' }}>{ps}</button>
              ))}
            </div>
          </div>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            {filtered.length === 0 ? '0' : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)}`} из {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <SPagBtn icon="«" disabled={page === 0}             onClick={() => setPage(0)}             t={t} />
            <SPagBtn icon="‹" disabled={page === 0}             onClick={() => setPage(p => p - 1)}    t={t} />
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i;
              if (totalPages > 5) { if (page < 3) p = i; else if (page > totalPages - 3) p = totalPages - 5 + i; else p = page - 2 + i; }
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, borderRadius: VELA.radius.sm, background: page === p ? t.accent : 'transparent', border: `1px solid ${page === p ? t.accent : t.border}`, color: page === p ? '#fff' : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: page === p ? 700 : 400, transition: 'all 0.15s' }}>{p + 1}</button>
              );
            })}
            <SPagBtn icon="›" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}    t={t} />
            <SPagBtn icon="»" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} t={t} />
          </div>
        </div>
      </div>
      <VelaDrawer open={drawer.open} type="service" data={drawer.data} onClose={closeDrawer} onSave={saveDrawer} />
    </div>
  );
}

// ══════════════════════════════════════════════════════
// ── STAFF DATAGRID ─────────────────────────────────────
// ══════════════════════════════════════════════════════
function StaffDataGrid({ t }) {
  const [statusFilter, setStatusF]  = uSS('');
  const [catFilter, setCatF]        = uSS('');
  const [sortField, setSortField]   = uSS('name');
  const [sortDir, setSortDir]       = uSS('asc');
  const [page, setPage]             = uSS(0);
  const [pageSize, setPageSize]     = uSS(25);
  const [selected, setSelected]     = uSS(new Set());
  const [hovRow, setHovRow]         = uSS(null);
  const [drawer, setDrawer]         = uSS({ open: false, data: null });
  const openDrawer  = (row, e) => { e && e.stopPropagation(); setDrawer({ open: true, data: row }); };
  const closeDrawer = ()        => setDrawer(d => ({ ...d, open: false }));
  const saveDrawer  = (form)    => { closeDrawer(); };

  const handleSort = uSCb((field) => {
    setSortField(f => { if (f === field) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); return f; } setSortDir('asc'); return field; });
  }, []);

  const statusOptions = [
    { value: '', label: 'Все статусы' },
    { value: 'active',   label: 'Активен' },
    { value: 'vacation', label: 'В отпуске' },
    { value: 'inactive', label: 'Неактивен' },
  ];
  const catOptions = [
    { value: '', label: 'Все специализации' },
    ...Object.entries(CAT_LABELS).map(([v, label]) => ({ value: v, label })),
  ];

  const SC = STAFF_STATUS_COLORS(t);

  const filtered = uSM(() => {
    let rows = [...STAFF_DATA];
    if (statusFilter) rows = rows.filter(r => r.status === statusFilter);
    if (catFilter)    rows = rows.filter(r => r.cat === catFilter);
    rows.sort((a, b) => {
      let av, bv;
      if (sortField === 'name')         { av = a.name;         bv = b.name; }
      else if (sortField === 'spec')    { av = a.spec;         bv = b.spec; }
      else if (sortField === 'appointments') { av = a.appointments; bv = b.appointments; }
      else if (sortField === 'revenue') { av = a.revenue;      bv = b.revenue; }
      else if (sortField === 'rating')  { av = a.rating;       bv = b.rating; }
      else if (sortField === 'status')  { av = a.status;       bv = b.status; }
      else { av = a[sortField]; bv = b[sortField]; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return rows;
  }, [statusFilter, catFilter, sortField, sortDir]);

  const pageRows = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const allOnPageSel = pageRows.length > 0 && pageRows.every(r => selected.has(r.id));
  const someSel = pageRows.some(r => selected.has(r.id));
  const toggleAll = () => setSelected(s => { const n = new Set(s); if (allOnPageSel) pageRows.forEach(r => n.delete(r.id)); else pageRows.forEach(r => n.add(r.id)); return n; });

  const hProps = { sortField, sortDir, onSort: handleSort, t };
  const COL = { cb: 40, master: 230, spec: 200, phone: 175, appts: 120, revenue: 150, rating: 110, status: 140, actions: 200 };

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <SFilterSelect t={t} value={statusFilter} onChange={v => { setStatusF(v); setPage(0); }} options={statusOptions} placeholder="Все статусы" />
        <SFilterSelect t={t} value={catFilter}    onChange={v => { setCatF(v);    setPage(0); }} options={catOptions}    placeholder="Все специализации" />
        {(statusFilter || catFilter) && (
          <button onClick={() => { setStatusF(''); setCatF(''); }}
            style={{ padding: '5px 10px', border: `1px solid ${t.error}55`, borderRadius: VELA.radius.md, background: t.errorSoft, color: t.error, fontSize: 11, fontFamily: VELA.fonts.ui, cursor: 'pointer' }}>
            Сбросить ×
          </button>
        )}
        <div style={{ flex: 1 }} />
        {selected.size > 0 && <span style={{ fontSize: 12, color: t.textMuted }}>Выбрано: {selected.size}</span>}
        <Btn variant="accent" size="sm" icon="＋">Добавить мастера</Btn>
      </div>

      {/* Grid */}
      <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: 42, borderBottom: `1px solid ${t.border}`, background: t.surfaceEl, flexShrink: 0, position: 'sticky', top: 0, zIndex: 3 }}>
          <div style={{ width: COL.cb, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${t.borderSub}` }} onClick={toggleAll}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${allOnPageSel ? t.accent : someSel ? t.accent : t.border}`, background: allOnPageSel ? t.accent : someSel ? `${t.accent}40` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
              {allOnPageSel && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
              {!allOnPageSel && someSel && <span style={{ fontSize: 10, color: t.accent, fontWeight: 700 }}>–</span>}
            </div>
          </div>
          <div style={{ width: COL.master,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Мастер"       field="name"         {...hProps} /></div>
          <div style={{ width: COL.spec,    flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Специализация" field="spec"         {...hProps} /></div>
          <div style={{ width: COL.phone,   flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Телефон"       field="phone"        {...hProps} /></div>
          <div style={{ width: COL.appts,   flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Записей"       field="appointments" {...hProps} /></div>
          <div style={{ width: COL.revenue, flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Выручка"       field="revenue"      {...hProps} /></div>
          <div style={{ width: COL.rating,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Рейтинг"       field="rating"       {...hProps} /></div>
          <div style={{ width: COL.status,  flexShrink: 0, borderRight: `1px solid ${t.borderSub}`, display: 'flex', alignItems: 'center' }}><SColHeader label="Статус"        field="status"       {...hProps} /></div>
          <div style={{ flex: 1, minWidth: COL.actions, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
            <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Действия</span>
          </div>
        </div>

        {/* Rows */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {pageRows.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 160, flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 28, opacity: 0.2 }}>👤</div>
              <div style={{ fontSize: 13, color: t.textMuted }}>Мастеров не найдено</div>
            </div>
          )}
          {pageRows.map((row) => {
            const isSel = selected.has(row.id);
            const isHov = hovRow === row.id;
            const color = serviceColor(t, row.cat);
            const sc = SC[row.status] || SC.inactive;

            return (
              <div key={row.id}
                onMouseEnter={() => setHovRow(row.id)}
                onMouseLeave={() => setHovRow(null)}
                onClick={() => openDrawer(row)}
                style={{ display: 'flex', alignItems: 'center', height: 56, borderBottom: `1px solid ${t.borderSub}`, background: isSel ? `${t.accent}09` : isHov ? t.surfaceEl : 'transparent', transition: 'background 0.12s', cursor: 'pointer' }}>

                {/* Checkbox */}
                <div style={{ width: COL.cb, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: `1px solid ${t.borderSub}` }}
                  onClick={() => setSelected(s => { const n = new Set(s); isSel ? n.delete(row.id) : n.add(row.id); return n; })}>
                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isSel ? t.accent : t.border}`, background: isSel ? t.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {isSel && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
                  </div>
                </div>

                {/* Мастер */}
                <div style={{ width: COL.master, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar name={row.name} size={32} accent={`${color}22`} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</div>
                    </div>
                  </div>
                </div>

                {/* Специализация */}
                <div style={{ width: COL.spec, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 3, height: 24, borderRadius: 2, background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: t.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.spec}</span>
                  </div>
                </div>

                {/* Телефон */}
                <div style={{ width: COL.phone, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 12, color: t.textSub, fontVariantNumeric: 'tabular-nums' }}>{row.phone}</span>
                </div>

                {/* Записей */}
                <div style={{ width: COL.appts, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{row.appointments}</span>
                </div>

                {/* Выручка */}
                <div style={{ width: COL.revenue, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{row.revenue.toLocaleString('ru')} ₽</span>
                </div>

                {/* Рейтинг */}
                <div style={{ width: COL.rating, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12, color: t.warning }}>★</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{row.rating.toFixed(1)}</span>
                  </div>
                </div>

                {/* Статус */}
                <div style={{ width: COL.status, flexShrink: 0, padding: '0 12px', borderRight: `1px solid ${t.borderSub}` }}>
                  <Badge color={sc.color} bg={sc.bg}>{STAFF_STATUS_LABELS[row.status]}</Badge>
                </div>

                {/* Действия */}
                <div style={{ flex: 1, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }} onClick={e => e.stopPropagation()}>
                  <SActionBtn label="Редактировать" color={t.info}   bg={t.infoSoft}   onClick={e => openDrawer(row, e)} />
                  <SActionBtn label="Расписание"    color={t.accent} bg={t.accentSoft} />
                  <SActionBtn label="Удалить"       color={t.error}  bg={t.errorSoft} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderTop: `1px solid ${t.border}`, background: t.surfaceEl, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: t.textMuted }}>Строк на странице:</span>
            <div style={{ display: 'flex', gap: 3 }}>
              {SPAGE_SIZES.map(ps => (
                <button key={ps} onClick={() => { setPageSize(ps); setPage(0); }}
                  style={{ padding: '4px 10px', borderRadius: VELA.radius.sm, background: pageSize === ps ? t.accent : t.surfaceEl, border: `1px solid ${pageSize === ps ? t.accent : t.border}`, color: pageSize === ps ? '#fff' : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: pageSize === ps ? 600 : 400, transition: 'all 0.15s' }}>{ps}</button>
              ))}
            </div>
          </div>
          <span style={{ fontSize: 12, color: t.textMuted }}>
            {filtered.length === 0 ? '0' : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)}`} из {filtered.length}
          </span>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <SPagBtn icon="«" disabled={page === 0}             onClick={() => setPage(0)}             t={t} />
            <SPagBtn icon="‹" disabled={page === 0}             onClick={() => setPage(p => p - 1)}    t={t} />
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p = i;
              if (totalPages > 5) { if (page < 3) p = i; else if (page > totalPages - 3) p = totalPages - 5 + i; else p = page - 2 + i; }
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{ width: 30, height: 30, borderRadius: VELA.radius.sm, background: page === p ? t.accent : 'transparent', border: `1px solid ${page === p ? t.accent : t.border}`, color: page === p ? '#fff' : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: page === p ? 700 : 400, transition: 'all 0.15s' }}>{p + 1}</button>
              );
            })}
            <SPagBtn icon="›" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}    t={t} />
            <SPagBtn icon="»" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)} t={t} />
          </div>
        </div>
      </div>
      <VelaDrawer open={drawer.open} type="staff" data={drawer.data} onClose={closeDrawer} onSave={saveDrawer} />
    </div>
  );
}

Object.assign(window, { ServicesDataGrid, StaffDataGrid, STAFF_DATA });
