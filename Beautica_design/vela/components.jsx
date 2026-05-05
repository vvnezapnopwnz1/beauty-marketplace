// VELA Shared Components
const { useState, useContext, createContext, useRef, useEffect } = React;

const ThemeCtx = createContext(null);
const useT = () => useContext(ThemeCtx);

// ── Logo ───────────────────────────────────────────────
function VelaLogo({ size = 22, onClick }) {
  const t = useT();
  return (
    <span onClick={onClick} style={{ fontFamily: VELA.fonts.display, fontSize: size, fontWeight: 600, letterSpacing: '-0.5px', cursor: onClick ? 'pointer' : 'default', userSelect: 'none' }}>
      <span style={{ color: t.text }}>vel</span><span style={{ color: t.accent }}>a</span>
    </span>
  );
}

// ── Button ─────────────────────────────────────────────
function Btn({ children, variant = 'primary', size = 'md', onClick, style: sx, icon, disabled }) {
  const t = useT();
  const [hov, setHov] = useState(false);
  const sizes = { sm: { padding: '6px 14px', fontSize: 12 }, md: { padding: '9px 20px', fontSize: 13 }, lg: { padding: '12px 28px', fontSize: 15 } };
  const variants = {
    primary: { background: t.text, color: t.bg, border: 'none' },
    accent:  { background: t.accent, color: '#fff', border: 'none', filter: hov ? 'brightness(1.1)' : 'none' },
    outlined: { background: hov ? t.accentSoft : 'transparent', color: t.text, border: `1px solid ${t.border}` },
    ghost:   { background: hov ? t.surfaceEl : 'transparent', color: t.textSub, border: 'none' },
    danger:  { background: hov ? t.errorSoft : 'transparent', color: t.error, border: `1px solid ${t.error}55` },
  };
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...sizes[size], ...variants[variant],
        borderRadius: VELA.radius.pill, fontFamily: VELA.fonts.ui, fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center',
        gap: 6, transition: 'all 0.15s', opacity: disabled ? 0.45 : 1, ...sx,
      }}
    >
      {icon && <span style={{ fontSize: size === 'sm' ? 12 : 14 }}>{icon}</span>}
      {children}
    </button>
  );
}

// ── Avatar ─────────────────────────────────────────────
function Avatar({ name = '?', size = 36, src, accent }) {
  const t = useT();
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const bg = accent || t.accentSoft;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: t.accent, fontFamily: VELA.fonts.ui, flexShrink: 0, overflow: 'hidden' }}>
      {src ? <img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────
function Badge({ children, color, bg }) {
  const t = useT();
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: VELA.radius.pill, background: bg || t.accentSoft, color: color || t.accent, fontSize: 11, fontWeight: 600, fontFamily: VELA.fonts.ui, letterSpacing: '0.3px' }}>
      {children}
    </span>
  );
}

// ── Status Badge ───────────────────────────────────────
function StatusBadge({ status }) {
  const t = useT();
  const map = {
    confirmed: { label: 'Подтверждено', color: t.success, bg: t.successSoft },
    pending:   { label: 'Ожидает',      color: t.warning, bg: t.warnSoft },
    cancelled: { label: 'Отменено',     color: t.error,   bg: t.errorSoft },
    completed: { label: 'Завершено',    color: t.textMuted, bg: t.surfaceEl },
  };
  const s = map[status] || map.pending;
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}

// ── Input ──────────────────────────────────────────────
function Input({ placeholder, value, onChange, icon, type = 'text', style: sx }) {
  const t = useT();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', ...sx }}>
      {icon && <span style={{ position: 'absolute', left: 12, color: t.textMuted, fontSize: 15, pointerEvents: 'none' }}>{icon}</span>}
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: icon ? '10px 14px 10px 38px' : '10px 14px',
          background: t.surfaceEl, border: `1px solid ${focused ? t.accent : t.border}`,
          borderRadius: VELA.radius.md, color: t.text, fontSize: 13, fontFamily: VELA.fonts.ui,
          outline: 'none', transition: 'border-color 0.15s',
        }}
      />
    </div>
  );
}

// ── Chip ───────────────────────────────────────────────
function Chip({ children, active, onClick }) {
  const t = useT();
  return (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: VELA.radius.pill, border: `1px solid ${active ? t.accent : t.border}`, background: active ? t.accentSoft : 'transparent', color: active ? t.accent : t.textSub, fontSize: 12, fontWeight: 500, fontFamily: VELA.fonts.ui, cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  );
}

// ── Card ───────────────────────────────────────────────
function Card({ children, style: sx, onClick, hover = true }) {
  const t = useT();
  const [hov, setHov] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.lg, transition: 'all 0.2s', boxShadow: hov ? `0 4px 24px ${t.dark ? 'rgba(0,0,0,0.4)' : 'rgba(180,80,120,0.10)'}` : 'none', transform: hov ? 'translateY(-2px)' : 'none', cursor: onClick ? 'pointer' : 'default', overflow: 'hidden', ...sx }}>
      {children}
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────
function StatCard({ label, value, sub, icon, color }) {
  const t = useT();
  return (
    <Card hover style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: t.textMuted, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        {icon && <span style={{ fontSize: 18, opacity: 0.7 }}>{icon}</span>}
      </div>
      <div style={{ fontFamily: VELA.fonts.display, fontSize: 32, fontWeight: 500, color: color || t.text, letterSpacing: '-1px', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 6 }}>{sub}</div>}
    </Card>
  );
}

// ── Divider ────────────────────────────────────────────
function Divider({ my = 16 }) {
  const t = useT();
  return <div style={{ height: 1, background: t.border, margin: `${my}px 0` }} />;
}

// ── Section Title ──────────────────────────────────────
function SectionTitle({ children, action }) {
  const t = useT();
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
      <h2 style={{ fontFamily: VELA.fonts.display, fontSize: 22, fontWeight: 500, color: t.text, letterSpacing: '-0.5px' }}>{children}</h2>
      {action}
    </div>
  );
}

// ── Sidebar Nav (Dashboard) ────────────────────────────
function DashSidebar({ active, onNavigate, onGoHome }) {
  const t = useT();
  const items = [
    { id: 'overview',      icon: '◈',  label: 'Обзор' },
    { id: 'calendar',      icon: '📅', label: 'Календарь' },
    { id: 'appointments',  icon: '📋', label: 'Записи' },
    { id: 'services',      icon: '✦',  label: 'Услуги' },
    { id: 'staff',         icon: '👤', label: 'Персонал' },
    { id: 'analytics',     icon: '📈', label: 'Аналитика' },
    { id: 'settings',      icon: '⚙',  label: 'Настройки' },
  ];
  return (
    <div style={{ width: 220, flexShrink: 0, background: t.sidebarBg, borderRight: `1px solid ${t.sidebarBorder}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <VelaLogo size={20} onClick={onGoHome} />
        <div style={{ fontSize: 10, color: t.textMuted, marginTop: 4, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Панель управления</div>
      </div>
      <Divider my={0} />
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map(item => {
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: VELA.radius.md, background: isActive ? t.accentSoft : 'transparent', color: isActive ? t.accent : t.textSub, border: 'none', cursor: 'pointer', fontFamily: VELA.fonts.ui, fontSize: 13, fontWeight: isActive ? 600 : 400, transition: 'all 0.15s', textAlign: 'left' }}>
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </nav>
      <Divider my={0} />
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name="Анна М" size={32} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>Анна М.</div>
            <div style={{ fontSize: 10, color: t.textMuted }}>Владелец</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Top Nav (Client) ───────────────────────────────────
function TopNav({ onNavigate, screen }) {
  const t = useT();
  return (
    <div style={{ height: 58, background: t.surface, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20, flexShrink: 0, position: 'sticky', top: 0, zIndex: 10 }}>
      <VelaLogo size={20} onClick={() => onNavigate('landing')} />
      <div style={{ flex: 1 }} />
      {['search', 'saloncard', 'booking'].map(s => (
        <button key={s} onClick={() => onNavigate(s)}
          style={{ background: 'none', border: 'none', color: screen === s ? t.accent : t.textSub, fontSize: 13, fontFamily: VELA.fonts.ui, cursor: 'pointer', fontWeight: screen === s ? 600 : 400, padding: '4px 0' }}>
          {s === 'search' ? 'Поиск' : s === 'saloncard' ? 'Мастер' : 'Запись'}
        </button>
      ))}
      <Btn variant="ghost" size="sm" onClick={() => onNavigate('profile')}>Профиль</Btn>
      <Btn variant="accent" size="sm" onClick={() => onNavigate('dashboard')}>Кабинет</Btn>
    </div>
  );
}

// ── Service Color Helper ───────────────────────────────
function serviceColor(t, category) {
  const map = { hair: t.hair, nails: t.nails, massage: t.massage, brows: t.brows, makeup: t.makeup, other: t.other };
  return map[category] || t.other;
}

Object.assign(window, { ThemeCtx, useT, VelaLogo, Btn, Avatar, Badge, StatusBadge, Input, Chip, Card, StatCard, Divider, SectionTitle, DashSidebar, TopNav, serviceColor });
