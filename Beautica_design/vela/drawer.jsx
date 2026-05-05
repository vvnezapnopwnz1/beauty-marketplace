// VELA — Detail Drawer (Services & Staff)
const { useState: uDS, useEffect: uDE, useRef: uDR } = React;

// ── helpers ────────────────────────────────────────────
const CAT_OPTIONS = [
  { value: 'nails',   label: 'Ногти' },
  { value: 'hair',    label: 'Волосы' },
  { value: 'brows',   label: 'Брови' },
  { value: 'makeup',  label: 'Макияж' },
  { value: 'massage', label: 'Массаж' },
  { value: 'other',   label: 'Прочее' },
];
const STAFF_STATUS_OPTIONS = [
  { value: 'active',   label: 'Активен' },
  { value: 'vacation', label: 'В отпуске' },
  { value: 'inactive', label: 'Неактивен' },
];

// ── Field components ───────────────────────────────────
function DField({ label, children }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function DInput({ value, onChange, placeholder, type = 'text', prefix, suffix }) {
  const t = useT();
  const [focus, setFocus] = uDS(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: t.surfaceEl, border: `1.5px solid ${focus ? t.accent : t.border}`, borderRadius: VELA.radius.md, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      {prefix && <span style={{ padding: '0 10px', fontSize: 13, color: t.textMuted, borderRight: `1px solid ${t.border}`, flexShrink: 0 }}>{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '9px 12px', fontSize: 13, color: t.text, fontFamily: VELA.fonts.ui }}
      />
      {suffix && <span style={{ padding: '0 10px', fontSize: 13, color: t.textMuted, flexShrink: 0 }}>{suffix}</span>}
    </div>
  );
}

function DSelect({ value, onChange, options }) {
  const t = useT();
  const [open, setOpen] = uDS(false);
  const ref = uDR(null);
  uDE(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const selected = options.find(o => o.value === value);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: t.surfaceEl, border: `1.5px solid ${open ? t.accent : t.border}`, borderRadius: VELA.radius.md, color: t.text, fontSize: 13, fontFamily: VELA.fonts.ui, cursor: 'pointer', transition: 'border-color 0.15s' }}>
        <span>{selected?.label || '—'}</span>
        <span style={{ fontSize: 10, color: t.textMuted, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', overflow: 'hidden' }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
              style={{ padding: '9px 14px', fontSize: 13, color: o.value === value ? t.accent : t.text, background: o.value === value ? t.accentSoft : 'transparent', cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: o.value === value ? 600 : 400, transition: 'background 0.1s' }}>
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DToggle({ value, onChange, label }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? t.accent : t.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 21 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
      </div>
      <span style={{ fontSize: 13, color: t.text }}>{label}</span>
    </div>
  );
}

function DTextarea({ value, onChange, placeholder, rows = 3 }) {
  const t = useT();
  const [focus, setFocus] = uDS(false);
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{ background: t.surfaceEl, border: `1.5px solid ${focus ? t.accent : t.border}`, borderRadius: VELA.radius.md, padding: '9px 12px', fontSize: 13, color: t.text, fontFamily: VELA.fonts.ui, resize: 'none', outline: 'none', width: '100%', transition: 'border-color 0.15s', boxSizing: 'border-box', lineHeight: 1.5 }}
    />
  );
}

// ── DStatPill ──────────────────────────────────────────
function DStatPill({ label, value, color }) {
  const t = useT();
  return (
    <div style={{ flex: 1, padding: '12px 14px', background: t.surfaceEl, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || t.text, letterSpacing: '-0.5px', fontFamily: VELA.fonts.display }}>{value}</div>
    </div>
  );
}

// ── Masters multi-picker ───────────────────────────────
function DMastersPicker({ value, onChange }) {
  const t = useT();
  const masters = window.MASTERS || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {masters.map(m => {
        const sel = value.includes(m.id);
        const color = serviceColor(t, m.cat);
        return (
          <div key={m.id} onClick={() => { onChange(sel ? value.filter(x => x !== m.id) : [...value, m.id]); }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: VELA.radius.md, background: sel ? `${color}12` : t.surfaceEl, border: `1.5px solid ${sel ? color : t.border}`, cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sel ? color : t.border}`, background: sel ? color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
              {sel && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
            </div>
            <Avatar name={m.name} size={24} accent={`${color}22`} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{m.name}</div>
              <div style={{ fontSize: 11, color: t.textMuted }}>{m.role}</div>
            </div>
            {sel && <Badge color={color} bg={`${color}18`}>✓</Badge>}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════
// SERVICE DRAWER CONTENT
// ══════════════════════════════════════════════════════
function ServiceDrawerContent({ data, onSave, onClose }) {
  const t = useT();
  const [form, setForm] = uDS({ ...data });
  const color = serviceColor(t, form.cat);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <>
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 4, height: 40, borderRadius: 2, background: color, flexShrink: 0, marginTop: 4 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>Услуга</div>
            <div style={{ fontFamily: VELA.fonts.display, fontSize: 22, fontWeight: 500, color: t.text, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{form.name}</div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <Badge color={color} bg={`${color}18`}>{CAT_OPTIONS.find(c => c.value === form.cat)?.label}</Badge>
              <Badge color={form.active ? t.success : t.textMuted} bg={form.active ? t.successSoft : t.surfaceEl}>
                {form.active ? 'Активна' : 'Неактивна'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          <DStatPill label="Цена" value={`${form.price.toLocaleString('ru')} ₽`} color={t.accent} />
          <DStatPill label="Длительность" value={`${form.duration} мин`} />
        </div>

        <div style={{ height: 1, background: t.borderSub }} />

        {/* Edit fields */}
        <DField label="Название">
          <DInput value={form.name} onChange={v => set('name', v)} placeholder="Название услуги" />
        </DField>

        <DField label="Категория">
          <DSelect value={form.cat} onChange={v => set('cat', v)} options={CAT_OPTIONS} />
        </DField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <DField label="Цена, ₽">
            <DInput value={String(form.price)} onChange={v => set('price', Number(v) || 0)} type="number" suffix="₽" />
          </DField>
          <DField label="Длительность">
            <DInput value={String(form.duration)} onChange={v => set('duration', Number(v) || 0)} type="number" suffix="мин" />
          </DField>
        </div>

        <DField label="Описание">
          <DTextarea value={form.description || ''} onChange={v => set('description', v)} placeholder="Краткое описание услуги…" rows={3} />
        </DField>

        <DField label="Мастера">
          <DMastersPicker value={form.masters} onChange={v => set('masters', v)} />
        </DField>

        <DField label="Статус">
          <DToggle value={form.active} onChange={v => set('active', v)} label={form.active ? 'Услуга активна' : 'Услуга отключена'} />
        </DField>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', gap: 8, background: t.sidebarBg }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, color: t.textSub, fontSize: 13, fontFamily: VELA.fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
          Отмена
        </button>
        <button onClick={() => onSave(form)} style={{ flex: 2, padding: '10px', background: t.accent, border: 'none', borderRadius: VELA.radius.md, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: VELA.fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
          Сохранить
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
// STAFF DRAWER CONTENT
// ══════════════════════════════════════════════════════
function StaffDrawerContent({ data, onSave, onClose }) {
  const t = useT();
  const [form, setForm] = uDS({ ...data });
  const color = serviceColor(t, form.cat);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const statusColors = {
    active:   { color: t.success,    bg: t.successSoft },
    vacation: { color: t.warning,    bg: t.warnSoft },
    inactive: { color: t.textMuted,  bg: t.surfaceEl },
  };
  const sc = statusColors[form.status] || statusColors.inactive;

  return (
    <>
      {/* Header */}
      <div style={{ padding: '24px 24px 20px', borderBottom: `1px solid ${t.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={form.name} size={52} accent={`${color}28`} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: '50%', background: sc.color, border: `2px solid ${t.surface}` }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 3 }}>Мастер</div>
            <div style={{ fontFamily: VELA.fonts.display, fontSize: 22, fontWeight: 500, color: t.text, letterSpacing: '-0.5px' }}>{form.name}</div>
            <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
              <Badge color={color} bg={`${color}18`}>{CAT_OPTIONS.find(c => c.value === form.cat)?.label}</Badge>
              <Badge color={sc.color} bg={sc.bg}>
                {{ active: 'Активен', vacation: 'В отпуске', inactive: 'Неактивен' }[form.status]}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 8 }}>
          <DStatPill label="Записей" value={form.appointments} />
          <DStatPill label="Выручка" value={`${(form.revenue / 1000).toFixed(0)}к ₽`} color={t.accent} />
          <DStatPill label="Рейтинг" value={`★ ${form.rating.toFixed(1)}`} color={t.warning} />
        </div>

        <div style={{ height: 1, background: t.borderSub }} />

        {/* Edit fields */}
        <DField label="Имя">
          <DInput value={form.name} onChange={v => set('name', v)} placeholder="Полное имя" />
        </DField>

        <DField label="Телефон">
          <DInput value={form.phone} onChange={v => set('phone', v)} placeholder="+7 000 000-00-00" />
        </DField>

        <DField label="Специализация">
          <DInput value={form.spec} onChange={v => set('spec', v)} placeholder="Маникюр · Педикюр…" />
        </DField>

        <DField label="Категория">
          <DSelect value={form.cat} onChange={v => set('cat', v)} options={CAT_OPTIONS} />
        </DField>

        <DField label="Статус">
          <DSelect value={form.status} onChange={v => set('status', v)} options={STAFF_STATUS_OPTIONS} />
        </DField>

        <DField label="Заметки">
          <DTextarea value={form.notes || ''} onChange={v => set('notes', v)} placeholder="Внутренние заметки…" rows={3} />
        </DField>

        {/* Schedule placeholder */}
        <div style={{ padding: '14px 16px', background: t.surfaceEl, border: `1px dashed ${t.border}`, borderRadius: VELA.radius.md, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <span style={{ fontSize: 18, opacity: 0.5 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: t.textSub }}>Расписание</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>Управление рабочими часами</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: t.textMuted }}>→</span>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${t.border}`, flexShrink: 0, display: 'flex', gap: 8, background: t.sidebarBg }}>
        <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, color: t.textSub, fontSize: 13, fontFamily: VELA.fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
          Отмена
        </button>
        <button onClick={() => onSave(form)} style={{ flex: 2, padding: '10px', background: t.accent, border: 'none', borderRadius: VELA.radius.md, color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: VELA.fonts.ui, cursor: 'pointer', transition: 'all 0.15s' }}>
          Сохранить
        </button>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════
// DRAWER SHELL
// ══════════════════════════════════════════════════════
function VelaDrawer({ open, type, data, onClose, onSave }) {
  const t = useT();
  const [visible, setVisible] = uDS(false);
  const [mounted, setMounted] = uDS(false);

  uDE(() => {
    if (open) { setMounted(true); requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true))); }
    else { setVisible(false); const id = setTimeout(() => setMounted(false), 300); return () => clearTimeout(id); }
  }, [open]);

  // close on Escape
  uDE(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!mounted) return null;

  const WIDTH = 420;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', justifyContent: 'flex-end', pointerEvents: open ? 'all' : 'none' }}>
      {/* Backdrop */}
      <div onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: visible ? 1 : 0, transition: 'opacity 0.3s', backdropFilter: 'blur(2px)' }} />

      {/* Panel */}
      <div style={{
        position: 'relative', width: WIDTH, maxWidth: '92vw', height: '100%',
        background: t.surface, borderLeft: `1px solid ${t.border}`,
        boxShadow: '-12px 0 48px rgba(0,0,0,0.4)',
        transform: visible ? 'translateX(0)' : `translateX(${WIDTH}px)`,
        transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Close button */}
        <button onClick={onClose}
          style={{ position: 'absolute', top: 18, right: 18, zIndex: 10, width: 32, height: 32, borderRadius: '50%', background: t.surfaceEl, border: `1px solid ${t.border}`, color: t.textMuted, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', fontFamily: VELA.fonts.ui }}>
          ✕
        </button>

        {data && type === 'service' && (
          <ServiceDrawerContent data={data} onSave={onSave} onClose={onClose} />
        )}
        {data && type === 'staff' && (
          <StaffDrawerContent data={data} onSave={onSave} onClose={onClose} />
        )}
      </div>
    </div>
  );
}

Object.assign(window, { VelaDrawer });
