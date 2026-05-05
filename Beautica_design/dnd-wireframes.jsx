// DnD Week Transfer — Wireframe Explorations
const W = {
  bg: '#faf8f5',
  paper: '#fff',
  border: '#d8d3cc',
  borderLight: '#ede9e3',
  text: '#1a1a1a',
  textMuted: '#888',
  accent: '#e05c8c',
  accentSoft: '#fce8f0',
  blue: '#4a7aef',
  blueSoft: '#e8effd',
  green: '#3aae6a',
  greenSoft: '#e4f6eb',
  orange: '#e89030',
  orangeSoft: '#fef3e4',
  hand: "'Caveat', cursive",
  ui: "'DM Sans', sans-serif",
};

// ── Shared wireframe pieces ────────────────────────────
function WfCalGrid({ children, highlight, dragActive, style: sx }) {
  const days = ['Пн 14','Вт 15','Ср 16','Чт 17','Пт 18','Сб 19','Вс 20'];
  const hours = ['09:00','10:00','11:00','12:00','13:00','14:00'];
  return (
    <div style={{ background: W.paper, border: `1.5px solid ${W.border}`, borderRadius: 8, overflow: 'hidden', position: 'relative', ...sx }}>
      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: `1.5px solid ${W.border}` }}>
        <div style={{ padding: 6, borderRight: `1px solid ${W.borderLight}` }} />
        {days.map((d, i) => (
          <div key={i} style={{ padding: '6px 4px', textAlign: 'center', fontSize: 10, fontWeight: 600, color: W.textMuted, borderRight: i < 6 ? `1px solid ${W.borderLight}` : 'none', background: highlight === i ? W.accentSoft : 'transparent' }}>
            {d}
          </div>
        ))}
      </div>
      {/* Time rows */}
      {hours.map((h, ri) => (
        <div key={ri} style={{ display: 'grid', gridTemplateColumns: '48px repeat(7, 1fr)', borderBottom: ri < hours.length - 1 ? `1px solid ${W.borderLight}` : 'none', height: 32 }}>
          <div style={{ padding: '2px 4px', fontSize: 9, color: W.textMuted, borderRight: `1px solid ${W.borderLight}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }}>{h}</div>
          {days.map((_, ci) => (
            <div key={ci} style={{ borderRight: ci < 6 ? `1px solid ${W.borderLight}` : 'none', background: highlight === ci ? `${W.accent}06` : 'transparent' }} />
          ))}
        </div>
      ))}
      {children}
    </div>
  );
}

function WfAppt({ top, left, width, height, label, dragging, ghost, color }) {
  const c = color || W.accent;
  return (
    <div style={{
      position: 'absolute', top, left, width: width || 'calc(14.28% - 8px)', height: height || 28,
      background: dragging ? `${c}30` : ghost ? `${c}15` : `${c}20`,
      border: `1.5px ${dragging ? 'dashed' : 'solid'} ${dragging ? c : `${c}60`}`,
      borderRadius: 5, padding: '2px 5px', fontSize: 9, fontWeight: 600, color: c,
      display: 'flex', alignItems: 'center', gap: 3,
      transform: dragging ? 'rotate(-1.5deg) scale(1.05)' : 'none',
      boxShadow: dragging ? `0 4px 12px ${c}30` : 'none',
      transition: ghost ? 'opacity 0.2s' : 'none',
      opacity: ghost ? 0.4 : 1,
      zIndex: dragging ? 10 : 1,
    }}>
      {dragging && <span style={{ fontSize: 10 }}>✋</span>}
      {label}
    </div>
  );
}

function WfAnnotation({ top, left, right, bottom, children, arrow, style: sx }) {
  return (
    <div style={{
      position: 'absolute', top, left, right, bottom, zIndex: 20,
      fontFamily: W.hand, fontSize: 14, fontWeight: 600, color: W.accent,
      lineHeight: 1.2, maxWidth: 160, pointerEvents: 'none', ...sx,
    }}>
      {arrow && <div style={{ fontSize: 18, marginBottom: -4 }}>{arrow}</div>}
      {children}
    </div>
  );
}

function WfLabel({ children, color, style: sx }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, background: (color || W.accent) + '18', color: color || W.accent, fontSize: 10, fontWeight: 700, fontFamily: W.hand, letterSpacing: '0.3px', ...sx }}>
      {children}
    </span>
  );
}

// ══════════════════════════════════════════════════════
// OPTION A: Edge Drop Zones
// ══════════════════════════════════════════════════════
function OptionA() {
  return (
    <div style={{ width: '100%', height: '100%', background: W.bg, padding: 20, position: 'relative', fontFamily: W.ui }}>
      <div style={{ fontFamily: W.hand, fontSize: 20, fontWeight: 700, color: W.text, marginBottom: 4 }}>A. Edge Drop Zones</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        При начале перетаскивания по краям календаря появляются зоны «← Пред. неделя» и «След. неделя →». Перетащить карточку на зону — переключает неделю.
      </div>

      <div style={{ position: 'relative' }}>
        {/* Left drop zone */}
        <div style={{
          position: 'absolute', left: -2, top: 0, bottom: 0, width: 54, zIndex: 15,
          background: `linear-gradient(90deg, ${W.blueSoft}, transparent)`,
          border: `2px dashed ${W.blue}`, borderRight: 'none',
          borderRadius: '8px 0 0 8px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 16 }}>◀</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: W.blue, textAlign: 'center', lineHeight: 1.1 }}>Пред.<br/>неделя</span>
        </div>

        {/* Right drop zone */}
        <div style={{
          position: 'absolute', right: -2, top: 0, bottom: 0, width: 54, zIndex: 15,
          background: `linear-gradient(270deg, ${W.blueSoft}, transparent)`,
          border: `2px dashed ${W.blue}`, borderLeft: 'none',
          borderRadius: '0 8px 8px 0',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <span style={{ fontSize: 16 }}>▶</span>
          <span style={{ fontSize: 8, fontWeight: 700, color: W.blue, textAlign: 'center', lineHeight: 1.1 }}>След.<br/>неделя</span>
        </div>

        <WfCalGrid>
          <WfAppt top={58} left="calc(48px + 14.28% * 2 + 4px)" height={24} label="Маникюр" ghost />
          <WfAppt top={120} left="calc(100% - 60px)" height={24} label="Маникюр" dragging />
        </WfCalGrid>

        <WfAnnotation top={85} right={64} style={{ textAlign: 'right' }}>
          Тащим к краю →<br/>неделя переключается
        </WfAnnotation>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <WfLabel color={W.green}>✓ Интуитивно</WfLabel>
        <WfLabel color={W.green}>✓ Один жест</WfLabel>
        <WfLabel color={W.orange}>⚠ Нужен auto-scroll delay</WfLabel>
        <WfLabel color={W.orange}>⚠ Далёкие недели — много шагов</WfLabel>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// OPTION B: Mini Calendar Popup
// ══════════════════════════════════════════════════════
function OptionB() {
  const miniDays = [];
  for (let w = 0; w < 5; w++) {
    for (let d = 0; d < 7; d++) {
      const day = w * 7 + d + 1;
      if (day > 30) break;
      miniDays.push({ day, isTarget: day >= 21 && day <= 27, isSelected: day === 23 });
    }
  }

  return (
    <div style={{ width: '100%', height: '100%', background: W.bg, padding: 20, position: 'relative', fontFamily: W.ui }}>
      <div style={{ fontFamily: W.hand, fontSize: 20, fontWeight: 700, color: W.text, marginBottom: 4 }}>B. Mini Calendar Drop Target</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        При начале DnD рядом с календарём появляется мини-календарь месяца. Бросить запись на конкретный день — перенос + выбор времени.
      </div>

      <div style={{ display: 'flex', gap: 14, position: 'relative' }}>
        <div style={{ flex: 1 }}>
          <WfCalGrid>
            <WfAppt top={78} left="calc(48px + 14.28% * 1 + 4px)" height={24} label="Стрижка" ghost />
          </WfCalGrid>
        </div>

        {/* Mini calendar */}
        <div style={{
          width: 160, flexShrink: 0, background: W.paper,
          border: `2px dashed ${W.accent}`, borderRadius: 10,
          padding: 10, boxShadow: `0 4px 20px ${W.accent}20`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: W.text, textAlign: 'center', marginBottom: 8 }}>
            Апрель 2026
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {['П','В','С','Ч','П','С','В'].map((d, i) => (
              <div key={i} style={{ fontSize: 8, fontWeight: 600, color: W.textMuted, textAlign: 'center', padding: 2 }}>{d}</div>
            ))}
            {miniDays.map((d, i) => (
              <div key={i} style={{
                fontSize: 9, fontWeight: d.isSelected ? 700 : 500, textAlign: 'center', padding: '3px 0',
                borderRadius: 4,
                background: d.isSelected ? W.accent : d.isTarget ? W.accentSoft : 'transparent',
                color: d.isSelected ? '#fff' : d.isTarget ? W.accent : W.text,
                border: d.isTarget && !d.isSelected ? `1px dashed ${W.accent}60` : '1px solid transparent',
              }}>
                {d.day}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, padding: '4px 6px', background: W.accentSoft, borderRadius: 4, fontSize: 9, color: W.accent, fontWeight: 600, textAlign: 'center' }}>
            ✋ Бросьте на нужный день
          </div>
        </div>

        {/* Arrow */}
        <WfAnnotation top={70} left="calc(100% - 185px)" style={{ fontSize: 22 }}>
          ← drag сюда
        </WfAnnotation>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <WfLabel color={W.green}>✓ Любая дата за один drag</WfLabel>
        <WfLabel color={W.green}>✓ Визуально понятно</WfLabel>
        <WfLabel color={W.orange}>⚠ Занимает место</WfLabel>
        <WfLabel color={W.orange}>⚠ Нужен второй шаг для времени</WfLabel>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// OPTION C: Drag → Reschedule Zone
// ══════════════════════════════════════════════════════
function OptionC() {
  return (
    <div style={{ width: '100%', height: '100%', background: W.bg, padding: 20, position: 'relative', fontFamily: W.ui }}>
      <div style={{ fontFamily: W.hand, fontSize: 20, fontWeight: 700, color: W.text, marginBottom: 4 }}>C. «Перенести» Drop Zone + Dialog</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        При DnD внизу появляется полоса «Перенести на другую дату». Drop на неё — открывает date+time picker диалог.
      </div>

      <div style={{ position: 'relative' }}>
        <WfCalGrid>
          <WfAppt top={58} left="calc(48px + 14.28% * 3 + 4px)" height={24} label="Массаж" ghost />
          <WfAppt top={135} left="calc(48px + 14.28% * 5 + 4px)" height={24} label="Массаж" dragging />
        </WfCalGrid>

        {/* Bottom drop strip */}
        <div style={{
          marginTop: -2, padding: '10px 16px',
          background: `linear-gradient(0deg, ${W.blueSoft}, ${W.blue}08)`,
          border: `2px dashed ${W.blue}`,
          borderRadius: '0 0 8px 8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: W.blue }}>Перенести на другую дату…</span>
        </div>

        {/* Dialog mockup */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: W.paper, border: `2px solid ${W.border}`, borderRadius: 12,
          padding: 16, width: 220, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          opacity: 0.9, zIndex: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: W.text, marginBottom: 10 }}>Перенести запись</div>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 9, color: W.textMuted, fontWeight: 600, marginBottom: 3 }}>ДАТА</div>
            <div style={{ padding: '6px 8px', border: `1.5px solid ${W.accent}`, borderRadius: 6, fontSize: 11, color: W.text, background: W.accentSoft }}>
              23 апреля, Ср
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, color: W.textMuted, fontWeight: 600, marginBottom: 3 }}>ВРЕМЯ</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
              {['10:00','11:30','14:00','15:00','16:30','17:00'].map((t, i) => (
                <div key={i} style={{ padding: '4px', textAlign: 'center', fontSize: 10, borderRadius: 4, background: i === 2 ? W.accent : W.bg, color: i === 2 ? '#fff' : W.text, border: `1px solid ${i === 2 ? W.accent : W.borderLight}`, fontWeight: i === 2 ? 700 : 400 }}>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, padding: '5px', textAlign: 'center', fontSize: 10, borderRadius: 6, border: `1px solid ${W.border}`, color: W.textMuted }}>Отмена</div>
            <div style={{ flex: 2, padding: '5px', textAlign: 'center', fontSize: 10, borderRadius: 6, background: W.accent, color: '#fff', fontWeight: 700 }}>Перенести</div>
          </div>
        </div>

        <WfAnnotation bottom={52} left={20} style={{ color: W.blue }}>
          ↓ Бросить сюда
        </WfAnnotation>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <WfLabel color={W.green}>✓ Любая дата + время</WfLabel>
        <WfLabel color={W.green}>✓ Не ломает layout</WfLabel>
        <WfLabel color={W.orange}>⚠ Два шага (drop + dialog)</WfLabel>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// OPTION D: Week Navigation Arrows During Drag
// ══════════════════════════════════════════════════════
function OptionD() {
  return (
    <div style={{ width: '100%', height: '100%', background: W.bg, padding: 20, position: 'relative', fontFamily: W.ui }}>
      <div style={{ fontFamily: W.hand, fontSize: 20, fontWeight: 700, color: W.text, marginBottom: 4 }}>D. Навигация стрелками при DnD</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        При захвате записи в хедере появляются крупные кнопки «◀ ▶» для переключения недели. Запись остаётся «в руке», неделя перелистывается, бросаешь на нужный слот.
      </div>

      <div style={{ position: 'relative' }}>
        {/* Week nav header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', marginBottom: 6,
          background: W.paper, border: `1.5px solid ${W.border}`, borderRadius: 8,
        }}>
          <div style={{
            width: 48, height: 32, borderRadius: 6,
            background: W.blueSoft, border: `2px solid ${W.blue}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: W.blue, fontWeight: 700,
            boxShadow: `0 0 0 3px ${W.blue}20`,
            animation: 'pulse 1.5s ease infinite',
          }}>◀</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: W.text }}>14 — 20 апреля</div>
            <div style={{ fontSize: 9, color: W.accent, fontWeight: 600 }}>✋ Перетаскивание активно</div>
          </div>

          <div style={{
            width: 48, height: 32, borderRadius: 6,
            background: W.blueSoft, border: `2px solid ${W.blue}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: W.blue, fontWeight: 700,
            boxShadow: `0 0 0 3px ${W.blue}20`,
          }}>▶</div>
        </div>

        <WfCalGrid>
          <WfAppt top={90} left="calc(48px + 14.28% * 4 + 4px)" height={24} label="Окрашивание" dragging />
        </WfCalGrid>

        <WfAnnotation top={8} left={70} style={{ color: W.blue }}>
          ← Кликай для<br/>переключения
        </WfAnnotation>
        <WfAnnotation top={8} right={70} style={{ color: W.blue, textAlign: 'right' }}>
          Кликай для →<br/>переключения
        </WfAnnotation>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <WfLabel color={W.green}>✓ Контроль навигации</WfLabel>
        <WfLabel color={W.green}>✓ Запись всегда на курсоре</WfLabel>
        <WfLabel color={W.orange}>⚠ Клик стрелок одной рукой</WfLabel>
        <WfLabel color={W.orange}>⚠ Может быть неочевидно</WfLabel>
      </div>

      <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 3px ${W.blue}20; } 50% { box-shadow: 0 0 0 6px ${W.blue}35; } }`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// OPTION E: Auto-scroll + Preview Strip
// ══════════════════════════════════════════════════════
function OptionE() {
  return (
    <div style={{ width: '100%', height: '100%', background: W.bg, padding: 20, position: 'relative', fontFamily: W.ui }}>
      <div style={{ fontFamily: W.hand, fontSize: 20, fontWeight: 700, color: W.text, marginBottom: 4 }}>E. Горизонтальный скролл недель</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 14, lineHeight: 1.4 }}>
        Недели расположены горизонтально. При DnD к правому/левому краю — автоматический скролл к следующей/предыдущей неделе. Видны «хвосты» соседних недель.
      </div>

      <div style={{ position: 'relative', display: 'flex', gap: 0, overflow: 'hidden', borderRadius: 8, border: `1.5px solid ${W.border}` }}>
        {/* Previous week (faded) */}
        <div style={{ width: '15%', flexShrink: 0, opacity: 0.3, background: W.paper, borderRight: `2px dashed ${W.border}`, padding: 4 }}>
          <div style={{ fontSize: 8, color: W.textMuted, textAlign: 'center', fontWeight: 600 }}>7–13 апр</div>
          <div style={{ height: 180, background: `repeating-linear-gradient(0deg, ${W.borderLight} 0px, ${W.borderLight} 1px, transparent 1px, transparent 30px)` }} />
        </div>

        {/* Current week */}
        <div style={{ flex: 1, background: W.paper, position: 'relative' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: W.text, textAlign: 'center', padding: '6px 0', borderBottom: `1px solid ${W.borderLight}` }}>14 — 20 апреля</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: `1px solid ${W.borderLight}` }}>
            {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) => (
              <div key={i} style={{ fontSize: 9, fontWeight: 600, color: W.textMuted, textAlign: 'center', padding: 3, borderRight: i < 6 ? `1px solid ${W.borderLight}` : 'none' }}>{d}</div>
            ))}
          </div>
          <div style={{ height: 155, position: 'relative', background: `repeating-linear-gradient(0deg, ${W.borderLight} 0px, ${W.borderLight} 1px, transparent 1px, transparent 30px)` }}>
            <WfAppt top={10} left="calc(14.28% * 2 + 4px)" height={22} label="Брови" ghost />
            <WfAppt top={80} left="calc(14.28% * 5 + 4px)" height={22} label="Брови" dragging />
          </div>
        </div>

        {/* Next week (faded) */}
        <div style={{ width: '15%', flexShrink: 0, opacity: 0.35, background: W.paper, borderLeft: `2px dashed ${W.blue}`, padding: 4, position: 'relative' }}>
          <div style={{ fontSize: 8, color: W.blue, textAlign: 'center', fontWeight: 700 }}>21–27 апр</div>
          <div style={{ height: 180, background: `repeating-linear-gradient(0deg, ${W.borderLight} 0px, ${W.borderLight} 1px, transparent 1px, transparent 30px)` }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${W.blue}10` }}>
            <span style={{ fontSize: 20, color: W.blue }}>▶</span>
          </div>
        </div>
      </div>

      <WfAnnotation bottom={55} right={20} style={{ color: W.blue, textAlign: 'right', fontSize: 13 }}>
        → тащим дальше,<br/>скроллится к новой неделе
      </WfAnnotation>

      <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
        <WfLabel color={W.green}>✓ Непрерывный жест</WfLabel>
        <WfLabel color={W.green}>✓ Визуальный контекст</WfLabel>
        <WfLabel color={W.orange}>⚠ Сложная реализация</WfLabel>
        <WfLabel color={W.orange}>⚠ Проблема с мобайлом</WfLabel>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// COMPARISON TABLE
// ══════════════════════════════════════════════════════
function ComparisonTable() {
  const rows = [
    { sol: 'A. Edge Zones', steps: '1', farWeek: '⚠ Много', mobile: '✓', effort: 'Low', rec: true },
    { sol: 'B. Mini Calendar', steps: '1+', farWeek: '✓', mobile: '⚠', effort: 'Med', rec: false },
    { sol: 'C. Drop + Dialog', steps: '2', farWeek: '✓', mobile: '✓', effort: 'Med', rec: true },
    { sol: 'D. Стрелки при DnD', steps: '1+', farWeek: '✓', mobile: '⚠', effort: 'Low', rec: false },
    { sol: 'E. Horiz. Scroll', steps: '1', farWeek: '⚠', mobile: '⚠', effort: 'High', rec: false },
  ];

  return (
    <div style={{ width: '100%', height: '100%', background: W.bg, padding: 20, fontFamily: W.ui }}>
      <div style={{ fontFamily: W.hand, fontSize: 22, fontWeight: 700, color: W.text, marginBottom: 4 }}>Сравнение вариантов</div>
      <div style={{ fontSize: 11, color: W.textMuted, marginBottom: 16 }}>
        Рекомендация: <strong>A + C</strong> — edge zones для ±1-2 недели, drop-zone с диалогом для дальних дат.
      </div>
      <div style={{ background: W.paper, border: `1.5px solid ${W.border}`, borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: `2px solid ${W.border}` }}>
          {['Решение','Шагов','Далёкие','Mobile','Effort','Рек.'].map((h, i) => (
            <div key={i} style={{ padding: '8px 10px', fontSize: 9, fontWeight: 700, color: W.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: i < 5 ? `1px solid ${W.borderLight}` : 'none' }}>{h}</div>
          ))}
        </div>
        {rows.map((r, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr', borderBottom: ri < rows.length - 1 ? `1px solid ${W.borderLight}` : 'none', background: r.rec ? W.accentSoft : 'transparent' }}>
            <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: r.rec ? 700 : 500, color: r.rec ? W.accent : W.text, borderRight: `1px solid ${W.borderLight}` }}>{r.sol}</div>
            <div style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', borderRight: `1px solid ${W.borderLight}` }}>{r.steps}</div>
            <div style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', borderRight: `1px solid ${W.borderLight}` }}>{r.farWeek}</div>
            <div style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', borderRight: `1px solid ${W.borderLight}` }}>{r.mobile}</div>
            <div style={{ padding: '8px 10px', fontSize: 11, textAlign: 'center', borderRight: `1px solid ${W.borderLight}` }}>{r.effort}</div>
            <div style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center', fontWeight: 700 }}>{r.rec ? '⭐' : ''}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, padding: 14, background: W.paper, border: `2px solid ${W.accent}`, borderRadius: 10 }}>
        <div style={{ fontFamily: W.hand, fontSize: 16, fontWeight: 700, color: W.accent, marginBottom: 6 }}>💡 Рекомендация: комбинация A + C</div>
        <div style={{ fontSize: 11, color: W.text, lineHeight: 1.6 }}>
          <strong>Основной сценарий:</strong> Edge Drop Zones (A) — при перетаскивании к краю автоматическая прокрутка на ±1 неделю. Покрывает 90% случаев.<br/>
          <strong>Дальние переносы:</strong> Drop Zone с диалогом (C) — внизу полоса «Перенести на другую дату». Открывает полноценный date+time picker для любой даты.<br/>
          <strong>Оба механизма работают одновременно</strong> — пользователь выбирает удобный способ в зависимости от расстояния переноса.
        </div>
      </div>
    </div>
  );
}

// ── Canvas Layout ──────────────────────────────────────
function App() {
  return (
    <DesignCanvas title="Перенос записи на другую неделю — 5 решений" background="#eae7e2">
      <DCSection id="solutions" title="Варианты решений">
        <DCArtboard id="a" label="A. Edge Drop Zones" width={520} height={400}>
          <OptionA />
        </DCArtboard>
        <DCArtboard id="b" label="B. Mini Calendar" width={520} height={400}>
          <OptionB />
        </DCArtboard>
        <DCArtboard id="c" label="C. Drop + Dialog" width={520} height={430}>
          <OptionC />
        </DCArtboard>
        <DCArtboard id="d" label="D. Стрелки при DnD" width={520} height={400}>
          <OptionD />
        </DCArtboard>
        <DCArtboard id="e" label="E. Horiz. Scroll" width={520} height={390}>
          <OptionE />
        </DCArtboard>
      </DCSection>
      <DCSection id="comparison" title="Сравнение">
        <DCArtboard id="table" label="Сравнение + Рекомендация" width={660} height={480}>
          <ComparisonTable />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
