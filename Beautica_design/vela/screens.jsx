// VELA Screens — all 7 screens
const { useState: ust, useEffect: uef } = React;

// ── LANDING ────────────────────────────────────────────
function ScreenLanding({ t, onNavigate }) {
  const [query, setQuery] = ust('');
  const categories = ['Маникюр','Стрижка','Брови','Массаж','Макияж','Окрашивание','Ресницы','СПА'];

  return (
    <div style={{ minHeight: '100%', background: t.bgGradient }}>
      {/* Hero */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <Badge color={t.accent} bg={t.accentSoft} style={{ marginBottom: 24 }}>✦ Более 1200 мастеров в Москве</Badge>
        <h1 style={{ fontFamily: VELA.fonts.display, fontSize: 'clamp(42px,8vw,80px)', fontWeight: 500, color: t.text, letterSpacing: '-2px', lineHeight: 1.0, marginBottom: 16, marginTop: 16 }}>
          Красота<br/><em style={{ fontStyle: 'italic', color: t.accent }}>рядом</em>
        </h1>
        <p style={{ fontSize: 16, color: t.textSub, lineHeight: 1.6, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
          Найдите лучших мастеров красоты и запишитесь онлайн — быстро, без звонков.
        </p>
        {/* Search bar */}
        <div style={{ display: 'flex', gap: 10, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.pill, padding: '6px 6px 6px 20px', boxShadow: t.dark ? '0 8px 40px rgba(0,0,0,0.5)' : '0 8px 40px rgba(180,80,120,0.12)', maxWidth: 560, margin: '0 auto 32px' }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Услуга, мастер или салон..."
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: t.text, fontFamily: VELA.fonts.ui }} />
          <Btn variant="accent" onClick={() => onNavigate('search')}>Найти</Btn>
        </div>
        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {categories.map(c => <Chip key={c} onClick={() => onNavigate('search')}>{c}</Chip>)}
        </div>
      </div>

      {/* Featured cards */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <SectionTitle action={<Btn variant="ghost" size="sm" onClick={() => onNavigate('search')}>Все мастера →</Btn>}>Рядом с вами</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {[
            { name: 'Виктория С.', spec: 'Маникюр · Педикюр', rating: 4.9, reviews: 218, price: 'от 2 400 ₽', color: t.nails },
            { name: 'Анна Морозова', spec: 'Стрижка · Окрашивание', rating: 4.8, reviews: 312, price: 'от 3 200 ₽', color: t.hair },
            { name: 'Студия "Роза"', spec: 'Массаж · СПА', rating: 5.0, reviews: 97, price: 'от 4 500 ₽', color: t.massage },
            { name: 'Карина Л.', spec: 'Брови · Ресницы', rating: 4.9, reviews: 445, price: 'от 1 800 ₽', color: t.brows },
          ].map((m, i) => (
            <Card key={i} onClick={() => onNavigate('saloncard')} style={{ cursor: 'pointer' }}>
              <div style={{ height: 140, background: `linear-gradient(135deg, ${m.color}22, ${m.color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Avatar name={m.name} size={64} accent={`${m.color}22`} />
              </div>
              <div style={{ padding: '16px' }}>
                <div style={{ fontWeight: 600, color: t.text, fontSize: 15, marginBottom: 2 }}>{m.name}</div>
                <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 10 }}>{m.spec}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: t.text }}>⭐ {m.rating} <span style={{ color: t.textMuted }}>({m.reviews})</span></span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: t.accent }}>{m.price}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: t.surface, borderTop: `1px solid ${t.border}`, padding: '60px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <SectionTitle>Как это работает</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[['01','Найдите','Выберите услугу и мастера рядом с вами'],['02','Запишитесь','Выберите удобное время и подтвердите запись'],['03','Наслаждайтесь','Получите напоминание и посетите мастера']].map(([n,title,desc]) => (
              <div key={n} style={{ padding: 24 }}>
                <div style={{ fontFamily: VELA.fonts.display, fontSize: 40, fontWeight: 300, color: t.accentSoft, letterSpacing: '-1px', marginBottom: 12 }}>{n}</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: t.text, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: t.textSub, lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SEARCH ─────────────────────────────────────────────
function ScreenSearch({ t, onNavigate }) {
  const [activeFilter, setActiveFilter] = ust('Все');
  const filters = ['Все','Маникюр','Стрижка','Брови','Массаж','Макияж','Ресницы'];
  const masters = [
    { name: 'Виктория С.', spec: 'Маникюр · Педикюр', rating: 4.9, reviews: 218, price: 2400, dist: '0.3 км', cat: 'nails' },
    { name: 'Анна Морозова', spec: 'Стрижка · Окрашивание', rating: 4.8, reviews: 312, price: 3200, dist: '0.7 км', cat: 'hair' },
    { name: 'Студия "Роза"', spec: 'Массаж · СПА', rating: 5.0, reviews: 97, price: 4500, dist: '1.1 км', cat: 'massage' },
    { name: 'Карина Л.', spec: 'Брови · Ресницы', rating: 4.9, reviews: 445, price: 1800, dist: '0.5 км', cat: 'brows' },
    { name: 'Маша К.', spec: 'Макияж · Уход', rating: 4.7, reviews: 166, price: 4800, dist: '1.4 км', cat: 'makeup' },
    { name: 'Лена П.', spec: 'Стрижка · Укладка', rating: 4.8, reviews: 289, price: 2800, dist: '0.9 км', cat: 'hair' },
  ];

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        <Input placeholder="Поиск мастеров, услуг..." icon="🔍" style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 16 }}>
          {filters.map(f => <Chip key={f} active={activeFilter === f} onClick={() => setActiveFilter(f)}>{f}</Chip>)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {masters.map((m, i) => {
            const color = serviceColor(t, m.cat);
            return (
              <Card key={i} onClick={() => onNavigate('saloncard')} style={{ padding: 0 }}>
                <div style={{ display: 'flex', overflow: 'hidden' }}>
                  <div style={{ width: 88, flexShrink: 0, background: `linear-gradient(135deg, ${color}22, ${color}44)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Avatar name={m.name} size={44} accent={`${color}22`} />
                  </div>
                  <div style={{ flex: 1, padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, color: t.text, fontSize: 14 }}>{m.name}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: t.accent }}>от {m.price.toLocaleString('ru')} ₽</span>
                    </div>
                    <div style={{ fontSize: 12, color: t.textMuted, marginBottom: 8 }}>{m.spec}</div>
                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: t.textSub }}>
                      <span>⭐ {m.rating} ({m.reviews})</span>
                      <span>📍 {m.dist}</span>
                      <Badge color={color} bg={`${color}15`}>Свободна сегодня</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
      {/* Map stub */}
      <div style={{ width: 360, flexShrink: 0, background: t.surfaceEl, borderLeft: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 32, opacity: 0.3 }}>🗺</div>
        <div style={{ fontSize: 12, color: t.textMuted }}>Карта мастеров</div>
      </div>
    </div>
  );
}

// ── SALON CARD ─────────────────────────────────────────
function ScreenSalonCard({ t, onNavigate }) {
  const [activeTab, setActiveTab] = ust('services');
  const services = [
    { name: 'Маникюр классический', duration: '60 мин', price: 2400, cat: 'nails' },
    { name: 'Маникюр гель-лак', duration: '90 мин', price: 3200, cat: 'nails' },
    { name: 'Педикюр', duration: '75 мин', price: 3000, cat: 'nails' },
    { name: 'СПА-маникюр', duration: '90 мин', price: 3800, cat: 'nails' },
  ];
  const reviews = [
    { author: 'Анна К.', rating: 5, text: 'Виктория — лучший мастер! Всегда точно в срок, результат отличный.', date: '10 апр' },
    { author: 'Оля М.', rating: 5, text: 'Очень аккуратная работа, буду возвращаться.', date: '5 апр' },
    { author: 'Лена С.', rating: 4, text: 'Хорошая работа, немного долго, но качество на высоте.', date: '2 апр' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
        <div style={{ width: 100, height: 100, borderRadius: VELA.radius.lg, background: `linear-gradient(135deg, ${t.nails}22, ${t.nails}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Avatar name="Виктория С" size={56} accent={`${t.nails}22`} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: VELA.fonts.display, fontSize: 28, fontWeight: 500, color: t.text, letterSpacing: '-0.5px', marginBottom: 4 }}>Виктория С.</h1>
          <div style={{ fontSize: 14, color: t.textSub, marginBottom: 10 }}>Маникюр · Педикюр · Ногтевой сервис</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: t.text }}>⭐ 4.9 <span style={{ color: t.textMuted }}>(218 отзывов)</span></span>
            <span style={{ fontSize: 13, color: t.textMuted }}>📍 м. Арбатская, 0.3 км</span>
            <Badge color={t.success} bg={t.successSoft}>Свободна сегодня</Badge>
          </div>
        </div>
        <Btn variant="accent" size="lg" onClick={() => onNavigate('booking')}>Записаться</Btn>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${t.border}`, marginBottom: 20 }}>
        {[['services','Услуги'],['portfolio','Портфолио'],['reviews','Отзывы'],['info','О мастере']].map(([id,label]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            style={{ padding: '10px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === id ? t.accent : 'transparent'}`, color: activeTab === id ? t.accent : t.textSub, fontSize: 13, fontFamily: VELA.fonts.ui, fontWeight: activeTab === id ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'services' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {services.map((s, i) => {
            const color = serviceColor(t, s.cat);
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md }}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: color, marginRight: 14, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: t.text, fontSize: 14 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{s.duration}</div>
                </div>
                <div style={{ fontWeight: 700, color: t.text, fontSize: 15, marginRight: 14 }}>{s.price.toLocaleString('ru')} ₽</div>
                <Btn variant="outlined" size="sm" onClick={() => onNavigate('booking')}>Выбрать</Btn>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {reviews.map((r, i) => (
            <Card key={i} hover={false} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Avatar name={r.author} size={32} />
                  <div style={{ fontWeight: 600, color: t.text, fontSize: 13 }}>{r.author}</div>
                </div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{r.date}</div>
              </div>
              <div style={{ fontSize: 12, color: t.textSub, lineHeight: 1.6 }}>{r.text}</div>
            </Card>
          ))}
        </div>
      )}

      {(activeTab === 'portfolio' || activeTab === 'info') && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: t.textMuted, fontSize: 13 }}>
          {activeTab === 'portfolio' ? 'Портфолио мастера' : 'Информация о мастере'}
        </div>
      )}
    </div>
  );
}

// ── BOOKING ────────────────────────────────────────────
function ScreenBooking({ t, onNavigate }) {
  const [step, setStep] = ust(0);
  const [selectedService, setSelectedService] = ust(null);
  const [selectedDate, setSelectedDate] = ust(null);
  const [selectedTime, setSelectedTime] = ust(null);

  const services = [
    { name: 'Маникюр гель-лак', duration: '90 мин', price: 3200, cat: 'nails' },
    { name: 'СПА-маникюр', duration: '90 мин', price: 3800, cat: 'nails' },
    { name: 'Педикюр', duration: '75 мин', price: 3000, cat: 'nails' },
  ];
  const dates = ['Сег, 19 апр','Пт, 20 апр','Сб, 21 апр','Вс, 22 апр','Пн, 23 апр'];
  const times = ['10:00','10:30','11:00','12:30','14:00','15:30','16:00','17:00'];

  const steps = ['Услуга', 'Время', 'Подтверждение'];

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 24, overflowY: 'auto' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {steps.map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: i <= step ? t.accent : t.surfaceEl, border: `2px solid ${i <= step ? t.accent : t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: i <= step ? '#fff' : t.textMuted, transition: 'all 0.3s' }}>{i + 1}</div>
              <span style={{ fontSize: 12, color: i === step ? t.text : t.textMuted, fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
            {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < step ? t.accent : t.border, margin: '0 12px', transition: 'all 0.3s' }} />}
          </React.Fragment>
        ))}
      </div>

      {step === 0 && (
        <div>
          <SectionTitle>Выберите услугу</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.map((s, i) => {
              const color = serviceColor(t, s.cat);
              const active = selectedService === i;
              return (
                <div key={i} onClick={() => setSelectedService(i)}
                  style={{ padding: '16px', background: active ? t.accentSoft : t.surface, border: `2px solid ${active ? t.accent : t.border}`, borderRadius: VELA.radius.md, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, color: t.text, fontSize: 14 }}>{s.name}</span>
                    <span style={{ fontWeight: 700, color: t.accent }}>{s.price.toLocaleString('ru')} ₽</span>
                  </div>
                  <span style={{ fontSize: 12, color: t.textMuted }}>{s.duration}</span>
                </div>
              );
            })}
          </div>
          <Btn variant="accent" size="lg" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }} disabled={selectedService === null} onClick={() => setStep(1)}>Далее →</Btn>
        </div>
      )}

      {step === 1 && (
        <div>
          <SectionTitle>Выберите время</SectionTitle>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
            {dates.map((d, i) => (
              <button key={i} onClick={() => setSelectedDate(i)}
                style={{ flexShrink: 0, padding: '8px 14px', borderRadius: VELA.radius.md, background: selectedDate === i ? t.accentSoft : t.surfaceEl, border: `1px solid ${selectedDate === i ? t.accent : t.border}`, color: selectedDate === i ? t.accent : t.textSub, fontSize: 12, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: selectedDate === i ? 600 : 400, whiteSpace: 'nowrap' }}>
                {d}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 24 }}>
            {times.map((time, i) => (
              <button key={i} onClick={() => setSelectedTime(i)}
                style={{ padding: '10px', borderRadius: VELA.radius.md, background: selectedTime === i ? t.accent : t.surfaceEl, border: `1px solid ${selectedTime === i ? t.accent : t.border}`, color: selectedTime === i ? '#fff' : t.textSub, fontSize: 13, cursor: 'pointer', fontFamily: VELA.fonts.ui, fontWeight: selectedTime === i ? 600 : 400, transition: 'all 0.15s' }}>
                {time}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outlined" onClick={() => setStep(0)}>← Назад</Btn>
            <Btn variant="accent" size="lg" style={{ flex: 1, justifyContent: 'center' }} disabled={selectedTime === null} onClick={() => setStep(2)}>Далее →</Btn>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <SectionTitle>Подтверждение</SectionTitle>
          <Card hover={false} style={{ padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[['Мастер','Виктория С.'],['Услуга', services[selectedService || 0].name],['Дата',dates[selectedDate || 0]],['Время', times[selectedTime || 0]],['Стоимость', `${services[selectedService || 0].price.toLocaleString('ru')} ₽`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: `1px solid ${t.borderSub}` }}>
                  <span style={{ fontSize: 13, color: t.textMuted }}>{k}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outlined" onClick={() => setStep(1)}>← Назад</Btn>
            <Btn variant="accent" size="lg" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onNavigate('profile')}>Подтвердить запись</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DASHBOARD OVERVIEW ─────────────────────────────────
function DashOverview({ t }) {
  return (
    <div style={{ overflowY: 'auto', padding: 28 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: VELA.fonts.display, fontSize: 28, fontWeight: 500, color: t.text, letterSpacing: '-0.5px' }}>Добрый день, Анна ✦</h1>
        <div style={{ fontSize: 14, color: t.textSub, marginTop: 4 }}>Воскресенье, 19 апреля 2026</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Выручка сегодня" value="18 400 ₽" sub="+12% к вчера" color={t.accent} />
        <StatCard label="Записей сегодня" value="6" sub="2 ожидают" />
        <StatCard label="Клиентов за месяц" value="84" sub="+8 новых" />
        <StatCard label="Средний чек" value="3 200 ₽" sub="за апрель" />
      </div>
      <SectionTitle>Ближайшие записи</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {APPTS.slice(0, 5).map((a, i) => {
          const color = serviceColor(t, a.cat);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md }}>
              <div style={{ width: 4, height: 36, borderRadius: 2, background: color, flexShrink: 0 }} />
              <Avatar name={a.client} size={36} accent={`${color}22`} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: t.text, fontSize: 13 }}>{a.client}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>{a.service}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{String(a.start.getHours()).padStart(2,'0')}:{String(a.start.getMinutes()).padStart(2,'0')}</div>
                <div style={{ fontSize: 11, color: t.textMuted }}>{a.price.toLocaleString('ru')} ₽</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PROFILE ────────────────────────────────────────────
function ScreenProfile({ t, onNavigate }) {
  const upcoming = APPTS.slice(0, 3);
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 24, overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, padding: '24px', background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.xl }}>
        <Avatar name="Мария Смирнова" size={64} />
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: VELA.fonts.display, fontSize: 24, fontWeight: 500, color: t.text, letterSpacing: '-0.5px', marginBottom: 4 }}>Мария Смирнова</h2>
          <div style={{ fontSize: 13, color: t.textMuted, marginBottom: 10 }}>maria.smirnova@gmail.com · +7 900 123 45 67</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge>14 записей</Badge>
            <Badge color={t.success} bg={t.successSoft}>Постоянный клиент</Badge>
          </div>
        </div>
        <Btn variant="outlined" size="sm">Редактировать</Btn>
      </div>
      <SectionTitle>Мои записи</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcoming.map((a, i) => {
          const color = serviceColor(t, a.cat);
          return (
            <Card key={i} style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 4, height: 40, borderRadius: 2, background: color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: t.text, fontSize: 14, marginBottom: 2 }}>{a.service}</div>
                <div style={{ fontSize: 12, color: t.textMuted }}>Виктория С. · {a.start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: t.text, marginBottom: 4 }}>{String(a.start.getHours()).padStart(2,'0')}:{String(a.start.getMinutes()).padStart(2,'0')}</div>
                <StatusBadge status="confirmed" />
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ marginTop: 24 }}>
        <Btn variant="accent" size="lg" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('search')}>Записаться снова</Btn>
      </div>
    </div>
  );
}

// ── ONBOARDING ─────────────────────────────────────────
function ScreenOnboarding({ t, onNavigate }) {
  const [step, setStep] = ust(0);
  const steps = [
    { title: 'Добро пожаловать в vela', sub: 'Лучшие мастера красоты — рядом с вами', content: null },
    { title: 'Введите номер телефона', sub: 'Мы отправим код для входа', content: 'phone' },
    { title: 'Введите код', sub: 'Код отправлен на +7 900 ••• •• ••', content: 'code' },
  ];
  const s = steps[step];

  return (
    <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bgGradient, padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 400, textAlign: 'center' }}>
        <VelaLogo size={32} />
        <div style={{ marginTop: 48, marginBottom: 40 }}>
          <h1 style={{ fontFamily: VELA.fonts.display, fontSize: 32, fontWeight: 500, color: t.text, letterSpacing: '-0.5px', marginBottom: 10 }}>{s.title}</h1>
          <p style={{ fontSize: 14, color: t.textSub }}>{s.sub}</p>
        </div>

        {s.content === null && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {[['Найти мастера','Быстро найдите специалиста рядом'],['Записаться онлайн','Без звонков и ожидания'],['Управлять записями','Все ваши визиты в одном месте']].map(([title, desc]) => (
              <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: t.surface, borderRadius: VELA.radius.md, border: `1px solid ${t.border}`, textAlign: 'left' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: t.text, fontSize: 13 }}>{title}</div>
                  <div style={{ fontSize: 12, color: t.textMuted }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {s.content === 'phone' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: VELA.radius.md, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ padding: '12px 14px', borderRight: `1px solid ${t.border}`, color: t.textSub, fontSize: 14, fontWeight: 500 }}>+7</div>
              <input placeholder="900 000 00 00" style={{ flex: 1, padding: '12px 14px', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: t.text, fontFamily: VELA.fonts.ui }} />
            </div>
          </div>
        )}

        {s.content === 'code' && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 12 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ width: 56, height: 64, background: t.surface, border: `2px solid ${i === 0 ? t.accent : t.border}`, borderRadius: VELA.radius.md, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontFamily: VELA.fonts.display, color: t.text }}>
                  {i === 0 ? '4' : ''}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: t.textMuted }}>Не получили код? <span style={{ color: t.accent, cursor: 'pointer' }}>Отправить снова</span></div>
          </div>
        )}

        <Btn variant="accent" size="lg" style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => step < steps.length - 1 ? setStep(step + 1) : onNavigate('landing')}>
          {step === 0 ? 'Начать' : step === steps.length - 1 ? 'Войти' : 'Продолжить'}
        </Btn>
        {step > 0 && <Btn variant="ghost" size="sm" style={{ marginTop: 10, width: '100%', justifyContent: 'center' }} onClick={() => setStep(step - 1)}>← Назад</Btn>}
        {step === 0 && <div style={{ fontSize: 12, color: t.textMuted, marginTop: 16 }}>Уже есть аккаунт? <span style={{ color: t.accent, cursor: 'pointer' }} onClick={() => setStep(1)}>Войти</span></div>}
      </div>
    </div>
  );
}

Object.assign(window, { ScreenLanding, ScreenSearch, ScreenSalonCard, ScreenBooking, DashOverview, ScreenProfile, ScreenOnboarding });
