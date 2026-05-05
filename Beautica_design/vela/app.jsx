// VELA App — Router + Dashboard + Tweaks
const { useState: us, useEffect: ue, useCallback: uc } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "variant": "roseNight",
  "dashSection": "calendar"
}/*EDITMODE-END*/;

function DashboardScreen({ t, tweaks, setTweaks }) {
  const [section, setSection] = us(tweaks.dashSection || 'calendar');
  const nav = (s) => { setSection(s); setTweaks(p => ({ ...p, dashSection: s })); };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <DashSidebar active={section} onNavigate={nav} onGoHome={() => window.__velaNavi('landing')} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: t.bg }}>
        {/* Dash topbar */}
        <div style={{ height: 54, borderBottom: `1px solid ${t.sidebarBorder}`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0, background: t.sidebarBg }}>
          <span style={{ fontFamily: VELA.fonts.display, fontSize: 18, fontWeight: 500, color: t.text, letterSpacing: '-0.3px' }}>
            {{ overview: 'Обзор', calendar: 'Календарь', appointments: 'Записи', services: 'Услуги', staff: 'Персонал', analytics: 'Аналитика', settings: 'Настройки' }[section] || section}
          </span>
          <div style={{ flex: 1 }} />
          {section === 'calendar' && (
            <span style={{ fontSize: 11, color: t.textMuted, fontWeight: 500, background: t.accentSoft, color: t.accent, padding: '3px 10px', borderRadius: VELA.radius.pill }}>✦ Новый дизайн</span>
          )}
          <Avatar name="Анна М" size={30} />
        </div>
        {/* Dash content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: section === 'overview' ? 0 : 24, minHeight: 0 }}>
          {section === 'overview'      && <DashOverview t={t} />}
          {section === 'calendar'      && <VelaCalendar t={t} />}
          {section === 'appointments'  && <AppointmentsDataGrid t={t} />}
          {section === 'services'      && <ServicesDataGrid t={t} />}
          {section === 'staff'         && <StaffDataGrid t={t} />}
          {(section !== 'overview' && section !== 'calendar' && section !== 'appointments' && section !== 'services' && section !== 'staff') && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: t.textMuted, fontSize: 14 }}>Раздел в разработке</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Appointments Tab ────────────────────────────────────
function AppointmentsTab({ t }) {
  const [filter, setFilter] = us('all');
  const all = APPTS.slice(0, 10);
  return (
    <div style={{ flex: 1, overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all','Все'],['confirmed','Подтверждённые'],['pending','Ожидающие']].map(([id,label]) => (
          <Chip key={id} active={filter === id} onClick={() => setFilter(id)}>{label}</Chip>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {all.map((a, i) => {
          const color = serviceColor(t, a.cat);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md }}>
              <div style={{ width: 4, height: 40, borderRadius: 2, background: color, flexShrink: 0 }} />
              <Avatar name={a.client} size={38} accent={`${color}20`} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: t.text, fontSize: 14 }}>{a.client}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{a.service} · {a.start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} {String(a.start.getHours()).padStart(2,'0')}:{String(a.start.getMinutes()).padStart(2,'0')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, color: t.text, fontSize: 14, marginBottom: 4 }}>{a.price.toLocaleString('ru')} ₽</div>
                <StatusBadge status="confirmed" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tweaks Panel ────────────────────────────────────────
function TweaksPanel({ tweaks, setTweaks, visible }) {
  const t = VELA.variants[tweaks.variant] || Object.values(VELA.variants)[0];
  if (!visible) return null;

  const allVariants = Object.values(VELA.variants);
  const light = allVariants.filter(v => !v.dark);
  const dark  = allVariants.filter(v => v.dark);

  const VariantBtn = ({ v }) => {
    const active = tweaks.variant === v.id;
    return (
      <button onClick={() => { setTweaks(p => ({...p, variant: v.id})); window.parent.postMessage({type:'__edit_mode_set_keys', edits:{variant: v.id}}, '*'); }}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: VELA.radius.md, background: active ? t.accentSoft : t.surfaceEl, border: `1px solid ${active ? t.accent : t.border}`, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontSize: 12, color: active ? t.accent : t.textSub, fontWeight: active ? 600 : 400, transition: 'all 0.15s', textAlign: 'left', width: '100%' }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.accent, flexShrink: 0, border: `1px solid rgba(255,255,255,0.2)` }} />
        {v.name}
      </button>
    );
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.xl, padding: 20, width: 220, boxShadow: '0 8px 40px rgba(0,0,0,0.45)', maxHeight: '80vh', overflowY: 'auto' }}>
      <div style={{ fontFamily: VELA.fonts.display, fontSize: 16, fontWeight: 500, color: t.text, marginBottom: 16, letterSpacing: '-0.3px' }}>Tweaks</div>

      <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>☀ Светлые</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 14 }}>
        {light.map(v => <VariantBtn key={v.id} v={v} />)}
      </div>

      <div style={{ fontSize: 10, color: t.textMuted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>☾ Тёмные</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {dark.map(v => <VariantBtn key={v.id} v={v} />)}
      </div>
    </div>
  );
}

// ── App Root ────────────────────────────────────────────
function App() {
  const [screen, setScreen] = us(() => localStorage.getItem('vela_screen') || 'landing');
  const [tweaks, setTweaks] = us(TWEAK_DEFAULTS);
  const [tweaksVisible, setTweaksVisible] = us(false);

  const t = VELA.variants[tweaks.variant] || VELA.variants.roseNight;

  window.__velaNavi = (s) => { setScreen(s); localStorage.setItem('vela_screen', s); };

  ue(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const navigate = (s) => { setScreen(s); localStorage.setItem('vela_screen', s); };

  const isDashboard = screen === 'dashboard';

  return (
    <ThemeCtx.Provider value={t}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: t.bg, fontFamily: VELA.fonts.ui, color: t.text, transition: 'background 0.3s, color 0.3s' }}>
        {!isDashboard && <TopNav onNavigate={navigate} screen={screen} />}

        <div style={{ flex: 1, overflow: isDashboard ? 'hidden' : 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {screen === 'landing'    && <ScreenLanding    t={t} onNavigate={navigate} />}
          {screen === 'search'     && <ScreenSearch     t={t} onNavigate={navigate} />}
          {screen === 'saloncard'  && <ScreenSalonCard  t={t} onNavigate={navigate} />}
          {screen === 'booking'    && <ScreenBooking    t={t} onNavigate={navigate} />}
          {screen === 'dashboard'  && <DashboardScreen  t={t} tweaks={tweaks} setTweaks={setTweaks} />}
          {screen === 'profile'    && <ScreenProfile    t={t} onNavigate={navigate} />}
          {screen === 'onboarding' && <ScreenOnboarding t={t} onNavigate={navigate} />}
        </div>

        {/* Screen nav pills */}
        {!isDashboard && (
          <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.pill, padding: '6px 8px', display: 'flex', gap: 4, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)' }}>
            {[['landing','Главная'],['onboarding','Вход'],['search','Поиск'],['saloncard','Мастер'],['booking','Запись'],['profile','Профиль'],['dashboard','Кабинет']].map(([id,label]) => (
              <button key={id} onClick={() => navigate(id)}
                style={{ padding: '6px 12px', borderRadius: VELA.radius.pill, background: screen === id ? t.accent : 'transparent', color: screen === id ? '#fff' : t.textSub, border: 'none', fontSize: 11, fontFamily: VELA.fonts.ui, fontWeight: screen === id ? 600 : 400, cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} visible={tweaksVisible} />
      </div>
    </ThemeCtx.Provider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
