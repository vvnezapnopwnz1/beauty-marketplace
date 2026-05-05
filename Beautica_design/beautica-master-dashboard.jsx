import { useState } from "react";

/* ═══════════════════════════════════════
   PALETTE SYSTEM
   ═══════════════════════════════════════ */
const PALETTES = {
  "Ivory Date": {
    label: "Ivory Date 🥛",
    bg: "#F5F0E8",
    surface: "#EBE3D5",
    card: "#FFFFFF",
    border: "#D5CAB5",
    borderLight: "#E8E0D0",
    text: "#2A2218",
    textSoft: "#6B5C48",
    muted: "#A0917E",
    accent: "#B87A56",
    accentLight: "rgba(184,122,86,.12)",
    accentBorder: "rgba(184,122,86,.3)",
    green: "#5A9467",
    greenLight: "rgba(90,148,103,.12)",
    red: "#C05050",
    redLight: "rgba(192,80,80,.1)",
    yellow: "#B8913A",
    yellowLight: "rgba(184,145,58,.1)",
    navBg: "#FFFFFF",
    statusBar: "#2A2218",
  },
  "Sand Dune": {
    label: "Sand Dune 🏜️",
    bg: "#FAF7F2",
    surface: "#F1E9DE",
    card: "#FFFFFF",
    border: "#DDD0BF",
    borderLight: "#EBE2D5",
    text: "#2B2218",
    textSoft: "#6A5840",
    muted: "#8A7860",
    accent: "#B97830",
    accentLight: "rgba(185,120,48,.12)",
    accentBorder: "rgba(185,120,48,.3)",
    green: "#4E8E65",
    greenLight: "rgba(78,142,101,.12)",
    red: "#B84444",
    redLight: "rgba(184,68,68,.1)",
    yellow: "#B08030",
    yellowLight: "rgba(176,128,48,.1)",
    navBg: "#FFFFFF",
    statusBar: "#2B2218",
  },
  "Slate Stone": {
    label: "Slate Stone 🪨",
    bg: "#F2F1EE",
    surface: "#E8E5DF",
    card: "#FFFFFF",
    border: "#D0CCC4",
    borderLight: "#E2DED8",
    text: "#26221C",
    textSoft: "#6A6258",
    muted: "#96908A",
    accent: "#B96E44",
    accentLight: "rgba(185,110,68,.12)",
    accentBorder: "rgba(185,110,68,.3)",
    green: "#52906A",
    greenLight: "rgba(82,144,106,.12)",
    red: "#B84848",
    redLight: "rgba(184,72,72,.1)",
    yellow: "#A88840",
    yellowLight: "rgba(168,136,64,.1)",
    navBg: "#FFFFFF",
    statusBar: "#26221C",
  },
};

const SCREENS = [
  { id: "dashboard", label: "Дэшборд" },
  { id: "calendar", label: "Календарь" },
  { id: "appointments", label: "Записи" },
  { id: "clients", label: "Клиенты" },
  { id: "new_appointment", label: "Новая запись" },
  { id: "edit_service", label: "Услуга" },
];

/* ═══════════════════════════════════════
   PHONE FRAME
   ═══════════════════════════════════════ */
const Phone = ({ p, children }) => (
  <div style={{
    width: 375, height: 812,
    borderRadius: 44,
    background: p.bg,
    border: `2px solid ${p.border}`,
    overflow: "hidden",
    position: "relative",
    boxShadow: "0 32px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.04)",
    fontFamily: "'DM Sans', 'SF Pro Text', -apple-system, sans-serif",
    flexShrink: 0,
  }}>
    {/* Notch */}
    <div style={{ position:"absolute", top:0, left:"50%", transform:"translateX(-50%)", width:156, height:32, background: p.navBg, borderRadius:"0 0 18px 18px", zIndex:100 }} />
    {/* Status bar */}
    <div style={{ height:50, display:"flex", alignItems:"flex-end", justifyContent:"space-between", padding:"0 26px 6px", fontSize:12, fontWeight:700, color: p.text, position:"relative", zIndex:99 }}>
      <span>9:41</span>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        <svg width="15" height="11" viewBox="0 0 15 11" fill={p.text}><rect x="0" y="5" width="3" height="6" rx="1"/><rect x="4" y="3" width="3" height="8" rx="1"/><rect x="8" y="1" width="3" height="10" rx="1"/><rect x="12" y="0" width="3" height="11" rx="1" opacity=".25"/></svg>
        <svg width="22" height="11" viewBox="0 0 22 11" fill="none"><rect x=".5" y=".5" width="19" height="10" rx="2" stroke={p.text} strokeWidth="1"/><rect x="20" y="3" width="2" height="5" rx="1" fill={p.text} opacity=".35"/><rect x="2" y="2" width="13" height="7" rx="1" fill={p.accent}/></svg>
      </div>
    </div>
    {/* Content */}
    <div style={{ height:"calc(100% - 50px)", overflowY:"auto", overflowX:"hidden" }}>
      {children}
    </div>
    {/* Home bar */}
    <div style={{ position:"absolute", bottom:7, left:"50%", transform:"translateX(-50%)", width:130, height:4, borderRadius:100, background: p.border, zIndex:100 }} />
  </div>
);

/* ─── Reusable atoms ─── */
const Badge = ({ color, bg, children, style }) => (
  <span style={{ display:"inline-block", padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, color, background: bg, ...style }}>{children}</span>
);

const Btn = ({ p, children, variant="primary", style, onClick }) => (
  <div onClick={onClick} style={{
    padding: variant==="primary" ? "13px 0" : "11px 0",
    borderRadius: 14,
    textAlign:"center",
    fontSize: 14, fontWeight: 700,
    background: variant==="primary" ? p.accent : "transparent",
    color: variant==="primary" ? "#fff" : p.accent,
    border: variant==="primary" ? "none" : `1.5px solid ${p.accentBorder}`,
    cursor: "pointer",
    ...style,
  }}>{children}</div>
);

const Input = ({ p, label, value, placeholder, multiline }) => (
  <div style={{ marginBottom:14 }}>
    <div style={{ fontSize:11, fontWeight:700, color: p.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>{label}</div>
    <div style={{
      background: p.surface,
      border: `1.5px solid ${p.border}`,
      borderRadius:12, padding: multiline ? "11px 14px" : "12px 14px",
      fontSize:14, color: value ? p.text : p.muted,
      minHeight: multiline ? 72 : "auto",
      lineHeight:1.4,
    }}>{value || placeholder}</div>
  </div>
);

const Tag = ({ p, children, color }) => (
  <span style={{ padding:"4px 10px", borderRadius:100, fontSize:11, fontWeight:600, background:`${color}18`, color, border:`1px solid ${color}30`, marginRight:4 }}>{children}</span>
);

/* ─── Bottom nav ─── */
const BottomNav = ({ p, active }) => {
  const tabs = [
    { id:"dashboard", icon:"⊞", label:"Обзор" },
    { id:"calendar", icon:"▦", label:"Календарь" },
    { id:"appointments", icon:"☰", label:"Записи" },
    { id:"clients", icon:"◉", label:"Клиенты" },
  ];
  return (
    <div style={{ position:"sticky", bottom:0, background: p.navBg, borderTop:`1px solid ${p.borderLight}`, display:"flex", height:72, alignItems:"center", justifyContent:"space-around", padding:"0 10px 14px" }}>
      {tabs.map(t => (
        <div key={t.id} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3, color: active===t.id ? p.accent : p.muted, flex:1 }}>
          <div style={{ fontSize:20, lineHeight:1 }}>{t.icon}</div>
          <div style={{ fontSize:10, fontWeight: active===t.id ? 700 : 500 }}>{t.label}</div>
          {active===t.id && <div style={{ width:20, height:2, borderRadius:1, background: p.accent, position:"absolute", bottom:8 }} />}
        </div>
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════
   SCREEN: DASHBOARD (Overview)
   ═══════════════════════════════════════ */
const Dashboard = ({ p }) => (
  <div style={{ display:"flex", flexDirection:"column", minHeight:"100%" }}>
    <div style={{ flex:1, padding:"16px 18px 0" }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <div style={{ fontSize:12, color: p.muted, marginBottom:2 }}>Кабинет мастера</div>
          <div style={{ fontFamily:"'DM Serif Display','Georgia',serif", fontSize:22, fontWeight:400, color: p.text }}>Анна Волкова</div>
        </div>
        <div style={{ width:44, height:44, borderRadius:14, background: p.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff" }}>А</div>
      </div>

      {/* Date strip */}
      <div style={{ display:"flex", gap:6, marginBottom:20, overflowX:"auto", scrollbarWidth:"none" }}>
        {["Пн\n5","Вт\n6","Ср\n7","Чт\n8","Пт\n9","Сб\n10"].map((d,i) => {
          const [day, num] = d.split("\n");
          return (
            <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"8px 12px", borderRadius:14, background: i===2 ? p.accent : p.surface, border:`1px solid ${i===2 ? p.accent : p.border}`, flexShrink:0 }}>
              <span style={{ fontSize:10, fontWeight:600, color: i===2 ? "rgba(255,255,255,.7)" : p.muted }}>{day}</span>
              <span style={{ fontSize:16, fontWeight:800, color: i===2 ? "#fff" : p.text, marginTop:2 }}>{num}</span>
              {i===2 && <div style={{ width:4, height:4, borderRadius:"50%", background:"rgba(255,255,255,.8)", marginTop:3 }} />}
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
        {[
          { val:"6", sub:"Сегодня", color: p.accent },
          { val:"₽ 8 400", sub:"Доход", color: p.green },
          { val:"94%", sub:"Явка", color: p.yellow },
        ].map((s,i) => (
          <div key={i} style={{ background: p.card, borderRadius:16, padding:"14px 12px", border:`1px solid ${p.borderLight}`, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
            <div style={{ fontSize:18, fontWeight:800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize:11, color: p.muted, marginTop:1 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color: p.text }}>Расписание на сегодня</div>
          <div style={{ fontSize:12, fontWeight:600, color: p.accent }}>Среда, 7 мая</div>
        </div>
        {[
          { time:"10:00", name:"Мария С.", service:"Стрижка + укладка", dur:"75 мин", status:"confirmed", color: p.green },
          { time:"11:30", name:"Ольга К.", service:"Окрашивание Airtouch", dur:"120 мин", status:"confirmed", color: p.green },
          { time:"14:00", name:"Свободно", service:"", dur:"60 мин", status:"free", color: p.muted },
          { time:"15:30", name:"Анастасия В.", service:"Укладка", dur:"45 мин", status:"pending", color: p.yellow },
          { time:"17:00", name:"Екатерина М.", service:"Стрижка", dur:"60 мин", status:"confirmed", color: p.green },
        ].map((slot, i) => (
          <div key={i} style={{ display:"flex", gap:12, marginBottom:8, opacity: slot.status==="free" ? .55 : 1 }}>
            <div style={{ width:44, textAlign:"right", paddingTop:2, flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:700, color: p.textSoft }}>{slot.time}</span>
            </div>
            <div style={{ width:3, borderRadius:3, background: slot.color, flexShrink:0 }} />
            <div style={{ flex:1, background: slot.status==="free" ? "transparent" : p.card, borderRadius:12, padding: slot.status==="free" ? "8px 0" : "10px 12px", border: slot.status==="free" ? "none" : `1px solid ${p.borderLight}` }}>
              {slot.status==="free"
                ? <span style={{ fontSize:13, color: p.muted, fontStyle:"italic" }}>— Свободно</span>
                : <>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div style={{ fontSize:13, fontWeight:700, color: p.text }}>{slot.name}</div>
                      <Badge color={slot.color} bg={`${slot.color}14`} style={{ fontSize:10 }}>
                        {slot.status==="pending" ? "Ожидает" : "Подтв."}
                      </Badge>
                    </div>
                    <div style={{ fontSize:12, color: p.muted, marginTop:2 }}>{slot.service} · {slot.dur}</div>
                  </>
              }
            </div>
          </div>
        ))}
      </div>
    </div>
    <BottomNav p={p} active="dashboard" />
  </div>
);

/* ═══════════════════════════════════════
   SCREEN: CALENDAR (Week view)
   ═══════════════════════════════════════ */
const Calendar = ({ p }) => {
  const hours = ["9", "10", "11", "12", "13", "14", "15", "16", "17", "18"];
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт"];
  const HOUR_H = 54;

  const events = [
    { day:0, startH:10, durH:1.25, name:"Мария С.", label:"Стрижка", color:"#5A9467" },
    { day:0, startH:11.5, durH:2, name:"Ольга К.", label:"Окрашивание", color: p.accent },
    { day:1, startH:9, durH:1, name:"Дарья М.", label:"Укладка", color:"#5A9467" },
    { day:2, startH:10, durH:1.25, name:"Мария С.", label:"Стрижка", color:"#5A9467" },
    { day:2, startH:14, durH:2, name:"Анна К.", label:"Окрашивание", color: p.accent },
    { day:2, startH:15.5, durH:.75, name:"Ольга В.", label:"Укладка", color:"#8A78A8" },
    { day:3, startH:13, durH:1, name:"Свободно", label:"", color: p.border },
    { day:4, startH:10, durH:1, name:"Юлия П.", label:"Стрижка", color:"#5A9467" },
    { day:4, startH:15, durH:1.5, name:"Анастасия", label:"Airtouch", color: p.accent },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background: p.bg }}>
      {/* Header */}
      <div style={{ padding:"12px 16px 10px", background: p.navBg, borderBottom:`1px solid ${p.borderLight}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontSize:16, fontWeight:700, color: p.text }}>Май 2026</div>
          <div style={{ display:"flex", gap:8 }}>
            {["День","Неделя"].map((v,i) => (
              <div key={i} style={{ padding:"5px 14px", borderRadius:100, fontSize:12, fontWeight:700, background: i===1 ? p.accent : "transparent", color: i===1 ? "#fff" : p.muted, border: i===1 ? "none" : `1px solid ${p.border}` }}>{v}</div>
            ))}
          </div>
        </div>
        {/* Day headers */}
        <div style={{ display:"flex", paddingLeft:30 }}>
          {days.map((d,i) => (
            <div key={i} style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:11, color: p.muted, fontWeight:600 }}>{d}</div>
              <div style={{ width:28, height:28, borderRadius:"50%", margin:"2px auto 0", display:"flex", alignItems:"center", justifyContent:"center", background: i===2 ? p.accent : "transparent", fontSize:14, fontWeight: i===2 ? 800 : 500, color: i===2 ? "#fff" : p.text }}>{5+i}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto", padding:"0 0 20px" }}>
        <div style={{ position:"relative", paddingLeft:30 }}>
          {/* Hour rows */}
          {hours.map((h, hi) => (
            <div key={h} style={{ display:"flex", height: HOUR_H, position:"relative" }}>
              <div style={{ position:"absolute", left:0, width:28, fontSize:10, fontWeight:600, color: p.muted, paddingTop:4, textAlign:"right" }}>{h}</div>
              {days.map((_, di) => (
                <div key={di} style={{ flex:1, borderBottom:`1px solid ${p.borderLight}`, borderRight: di<4 ? `1px solid ${p.borderLight}` : "none", background: hi%2===0 ? "transparent" : `${p.surface}44` }} />
              ))}
            </div>
          ))}

          {/* NowLine (at ~11:15, hour index 2, offset 0.25) */}
          <div style={{ position:"absolute", left:30, right:0, top: HOUR_H * (2.25), height:2, background: p.red, zIndex:10, pointerEvents:"none" }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background: p.red, position:"absolute", left:-4, top:-3 }} />
          </div>

          {/* Events */}
          {events.map((ev, i) => {
            const topOffset = HOUR_H * (ev.startH - 9);
            const height = HOUR_H * ev.durH - 3;
            const colW = (375 - 30) / 5;
            const left = 30 + ev.day * colW + 1;
            return (
              <div key={i} style={{ position:"absolute", left, width: colW - 2, top: topOffset, height, borderRadius:8, background:`${ev.color}18`, borderLeft:`3px solid ${ev.color}`, padding:"3px 5px", overflow:"hidden", zIndex:5 }}>
                <div style={{ fontSize:10, fontWeight:700, color: ev.color, lineHeight:1.2 }}>{ev.name}</div>
                {ev.label && <div style={{ fontSize:9, color: p.textSoft, marginTop:1 }}>{ev.label}</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB */}
      <div style={{ position:"absolute", bottom:80, right:18, width:48, height:48, borderRadius:"50%", background: p.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, color:"#fff", boxShadow:`0 4px 16px ${p.accentLight}` }}>+</div>

      <BottomNav p={p} active="calendar" />
    </div>
  );
};

/* ═══════════════════════════════════════
   SCREEN: APPOINTMENTS (List — mobile-optimised)
   Решение вместо таблицы: группировка по дням + свайп-экшны
   ═══════════════════════════════════════ */
const Appointments = ({ p }) => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const statusColors = {
    confirmed: p.green,
    pending: p.yellow,
    completed: p.muted,
    cancelled: p.red,
  };
  const statusLabels = {
    confirmed:"Подтверждена",
    pending:"Ожидает",
    completed:"Завершена",
    cancelled:"Отмена",
  };
  const groups = [
    {
      date:"Сегодня, 7 мая",
      items:[
        { time:"10:00", name:"Мария С.", phone:"+7 916 ··· 12 34", service:"Стрижка + укладка", price:"1 800 ₽", dur:"75 мин", status:"confirmed" },
        { time:"11:30", name:"Ольга К.", phone:"+7 903 ··· 45 67", service:"Окрашивание Airtouch", price:"4 500 ₽", dur:"120 мин", status:"confirmed" },
        { time:"15:30", name:"Анастасия В.", phone:"+7 926 ··· 78 90", service:"Укладка", price:"900 ₽", dur:"45 мин", status:"pending" },
      ],
    },
    {
      date:"Завтра, 8 мая",
      items:[
        { time:"09:30", name:"Дарья М.", phone:"+7 915 ··· 22 33", service:"Стрижка детская", price:"700 ₽", dur:"45 мин", status:"confirmed" },
        { time:"13:00", name:"Екатерина Р.", phone:"+7 999 ··· 55 66", service:"Окрашивание корней", price:"2 200 ₽", dur:"90 мин", status:"pending" },
      ],
    },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100%" }}>
      <div style={{ padding:"12px 18px 0", background: p.navBg, borderBottom:`1px solid ${p.borderLight}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:"'DM Serif Display','Georgia',serif", fontSize:20, color: p.text }}>Записи</div>
          <div style={{ width:34, height:34, borderRadius:12, background: p.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff" }}>+</div>
        </div>
        {/* Tabs */}
        <div style={{ display:"flex", gap:0, marginBottom:"-1px" }}>
          {[{id:"upcoming",label:"Предстоящие"},{id:"past",label:"История"},{id:"cancelled",label:"Отмена"}].map(t => (
            <div key={t.id} onClick={() => setActiveTab(t.id)} style={{ flex:1, textAlign:"center", padding:"8px 0", fontSize:12, fontWeight:700, color: activeTab===t.id ? p.accent : p.muted, borderBottom: activeTab===t.id ? `2px solid ${p.accent}` : "2px solid transparent", cursor:"pointer" }}>{t.label}</div>
          ))}
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ padding:"12px 18px 8px", display:"flex", gap:6 }}>
        {[{label:"8 за неделю",c:p.textSoft},{label:"₽ 14 100",c:p.green},{label:"1 ожидает",c:p.yellow}].map((c,i)=>(
          <div key={i} style={{ padding:"5px 12px", borderRadius:100, fontSize:11, fontWeight:700, background:`${c.c}12`, color:c.c, border:`1px solid ${c.c}25` }}>{c.label}</div>
        ))}
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"0 18px 80px" }}>
        {groups.map((g, gi) => (
          <div key={gi} style={{ marginBottom:8 }}>
            <div style={{ fontSize:12, fontWeight:700, color: p.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8, marginTop: gi>0 ? 16 : 0 }}>{g.date}</div>
            {g.items.map((item, ii) => (
              <div key={ii} style={{ background: p.card, borderRadius:16, padding:"13px 14px", marginBottom:8, border:`1px solid ${p.borderLight}`, boxShadow:"0 1px 3px rgba(0,0,0,.04)", position:"relative", overflow:"hidden" }}>
                {/* Status stripe */}
                <div style={{ position:"absolute", left:0, top:0, bottom:0, width:4, background: statusColors[item.status], borderRadius:"0" }} />
                <div style={{ paddingLeft:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:5 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ fontSize:14, fontWeight:800, color: p.text }}>{item.time}</span>
                      <span style={{ fontSize:14, fontWeight:600, color: p.text }}>{item.name}</span>
                    </div>
                    <Badge color={statusColors[item.status]} bg={`${statusColors[item.status]}14`}>{statusLabels[item.status]}</Badge>
                  </div>
                  <div style={{ fontSize:12, color: p.textSoft, marginBottom:6 }}>{item.service} · {item.dur}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <span style={{ fontSize:12, color: p.muted }}>{item.phone}</span>
                    <span style={{ fontSize:14, fontWeight:800, color: p.accent }}>{item.price}</span>
                  </div>
                  {/* Quick actions */}
                  <div style={{ display:"flex", gap:6, marginTop:10 }}>
                    {item.status==="pending" && (
                      <>
                        <div style={{ flex:1, padding:"7px 0", borderRadius:10, background: p.greenLight, color: p.green, fontSize:12, fontWeight:700, textAlign:"center", border:`1px solid ${p.green}25` }}>✓ Подтвердить</div>
                        <div style={{ flex:1, padding:"7px 0", borderRadius:10, background: p.redLight, color: p.red, fontSize:12, fontWeight:700, textAlign:"center", border:`1px solid ${p.red}25` }}>✗ Отменить</div>
                      </>
                    )}
                    {item.status==="confirmed" && (
                      <>
                        <div style={{ flex:1, padding:"7px 0", borderRadius:10, background: p.accentLight, color: p.accent, fontSize:12, fontWeight:700, textAlign:"center", border:`1px solid ${p.accentBorder}` }}>Детали</div>
                        <div style={{ flex:1, padding:"7px 0", borderRadius:10, background: p.surface, color: p.textSoft, fontSize:12, fontWeight:600, textAlign:"center", border:`1px solid ${p.border}` }}>Позвонить</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <BottomNav p={p} active="appointments" />
    </div>
  );
};

/* ═══════════════════════════════════════
   SCREEN: CLIENTS
   ═══════════════════════════════════════ */
const Clients = ({ p }) => {
  const [search, setSearch] = useState(false);
  const clients = [
    { name:"Мария Соколова", phone:"+7 916 ··· 12 34", visits:12, lastVisit:"7 мая", spent:"18 400 ₽", tags:["Постоянная"], tagColors:["#5A9467"] },
    { name:"Ольга Кузнецова", phone:"+7 903 ··· 45 67", visits:5, lastVisit:"6 мая", spent:"9 200 ₽", tags:["VIP","Окрашивание"], tagColors:[p.accent,"#8A78A8"] },
    { name:"Анастасия Волова", phone:"+7 926 ··· 78 90", visits:2, lastVisit:"1 мая", spent:"2 700 ₽", tags:["Новая"], tagColors:[p.yellow] },
    { name:"Дарья Михайлова", phone:"+7 915 ··· 22 33", visits:8, lastVisit:"28 апр", spent:"11 600 ₽", tags:["Постоянная"], tagColors:["#5A9467"] },
    { name:"Екатерина Романова", phone:"+7 999 ··· 55 66", visits:1, lastVisit:"22 апр", spent:"2 200 ₽", tags:[], tagColors:[] },
  ];
  const initials = name => name.split(" ").map(w=>w[0]).join("").slice(0,2);
  const avatarColors = [p.accent,"#5A9467","#8A78A8",p.yellow,p.red];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100%" }}>
      <div style={{ padding:"12px 18px 10px", background: p.navBg, borderBottom:`1px solid ${p.borderLight}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
          <div style={{ fontFamily:"'DM Serif Display','Georgia',serif", fontSize:20, color: p.text }}>Клиенты</div>
          <div style={{ width:34, height:34, borderRadius:12, background: p.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"#fff" }}>+</div>
        </div>
        {/* Search */}
        <div style={{ display:"flex", gap:8, alignItems:"center", background: p.surface, borderRadius:12, padding:"10px 14px", border:`1px solid ${p.border}` }}>
          <span style={{ fontSize:14, opacity:.5 }}>🔍</span>
          <span style={{ fontSize:13, color: p.muted }}>Поиск по имени или телефону</span>
        </div>
        {/* Filter chips */}
        <div style={{ display:"flex", gap:6, marginTop:10, overflowX:"auto", scrollbarWidth:"none" }}>
          {["Все (24)","Постоянные","VIP","Новые"].map((f,i)=>(
            <div key={i} style={{ padding:"5px 14px", borderRadius:100, fontSize:12, fontWeight:700, background: i===0 ? p.accent : "transparent", color: i===0 ? "#fff" : p.muted, border: i===0 ? "none" : `1px solid ${p.border}`, whiteSpace:"nowrap", flexShrink:0 }}>{f}</div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:"12px 18px 80px", overflowY:"auto" }}>
        {clients.map((c, i) => (
          <div key={i} style={{ display:"flex", gap:12, padding:"13px 0", borderBottom:`1px solid ${p.borderLight}`, alignItems:"flex-start" }}>
            <div style={{ width:44, height:44, borderRadius:14, background: avatarColors[i%5], display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:800, color:"#fff", flexShrink:0 }}>
              {initials(c.name)}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ fontSize:14, fontWeight:700, color: p.text }}>{c.name}</div>
                <div style={{ fontSize:13, fontWeight:700, color: p.accent }}>{c.spent}</div>
              </div>
              <div style={{ fontSize:12, color: p.muted, marginTop:1 }}>{c.phone} · {c.visits} визитов · {c.lastVisit}</div>
              {c.tags.length > 0 && (
                <div style={{ marginTop:7 }}>
                  {c.tags.map((t,ti)=>(
                    <Tag key={ti} p={p} color={c.tagColors[ti]}>{t}</Tag>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <BottomNav p={p} active="clients" />
    </div>
  );
};

/* ═══════════════════════════════════════
   SCREEN: NEW APPOINTMENT (Form)
   ═══════════════════════════════════════ */
const NewAppointment = ({ p }) => {
  const [step, setStep] = useState(1);
  const steps = ["Клиент","Услуга","Время","Готово"];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100%", background: p.bg }}>
      {/* Header */}
      <div style={{ padding:"12px 18px 16px", background: p.navBg, borderBottom:`1px solid ${p.borderLight}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
          <span style={{ fontSize:18, color: p.muted }}>←</span>
          <span style={{ fontSize:16, fontWeight:700, color: p.text }}>Новая запись</span>
          <span style={{ marginLeft:"auto", fontSize:12, color: p.muted }}>Шаг {step} из 4</span>
        </div>
        {/* Step progress */}
        <div style={{ display:"flex", alignItems:"center" }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", flex: i<3 ? 1 : "auto" }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background: i+1<=step ? p.accent : p.surface, border:`1.5px solid ${i+1<=step ? p.accent : p.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color: i+1<=step ? "#fff" : p.muted }}>
                  {i+1 < step ? "✓" : i+1}
                </div>
                <span style={{ fontSize:9, fontWeight:600, color: i+1===step ? p.accent : p.muted, whiteSpace:"nowrap" }}>{s}</span>
              </div>
              {i<3 && <div style={{ flex:1, height:2, background: i+1<step ? p.accent : p.borderLight, margin:"0 4px", marginBottom:16 }} />}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:"20px 18px", overflowY:"auto" }}>
        {/* Step 1 — Client */}
        <div style={{ fontSize:16, fontWeight:700, color: p.text, marginBottom:16, fontFamily:"'DM Serif Display',serif" }}>Выберите клиента</div>

        {/* Search */}
        <div style={{ display:"flex", alignItems:"center", gap:10, background: p.card, borderRadius:14, padding:"12px 14px", border:`1.5px solid ${p.accent}`, marginBottom:14, boxShadow:`0 0 0 3px ${p.accentLight}` }}>
          <span style={{ fontSize:14, opacity:.5 }}>🔍</span>
          <span style={{ fontSize:13, color: p.text }}>Мария Соколова</span>
        </div>

        {/* Suggestions */}
        <div style={{ marginBottom:16 }}>
          {[
            { name:"Мария Соколова", meta:"12 визитов · +7 916 ··· 12 34", highlight:true },
            { name:"Мария Иванова", meta:"3 визита · +7 901 ··· 98 76", highlight:false },
          ].map((c,i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"12px 14px", borderRadius:14, background: i===0 ? `${p.accent}0E` : p.card, border:`1.5px solid ${i===0 ? p.accentBorder : p.borderLight}`, marginBottom:6, alignItems:"center" }}>
              <div style={{ width:38, height:38, borderRadius:12, background: i===0 ? p.accent : p.surface, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800, color: i===0 ? "#fff" : p.textSoft, flexShrink:0 }}>МС</div>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color: p.text }}>{c.name}</div>
                <div style={{ fontSize:11, color: p.muted, marginTop:1 }}>{c.meta}</div>
              </div>
              {i===0 && <div style={{ marginLeft:"auto", width:20, height:20, borderRadius:"50%", background: p.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#fff" }}>✓</div>}
            </div>
          ))}
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
          <div style={{ flex:1, height:1, background: p.borderLight }} />
          <span style={{ fontSize:11, color: p.muted, fontWeight:600 }}>или</span>
          <div style={{ flex:1, height:1, background: p.borderLight }} />
        </div>

        <div style={{ border:`1.5px dashed ${p.border}`, borderRadius:14, padding:"16px", textAlign:"center" }}>
          <div style={{ fontSize:13, fontWeight:700, color: p.accent }}>+ Новый клиент</div>
          <div style={{ fontSize:11, color: p.muted, marginTop:3 }}>Без регистрации — гостевая запись</div>
        </div>

        {/* Note */}
        <div style={{ marginTop:18 }}>
          <div style={{ fontSize:11, fontWeight:700, color: p.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Заметка (опционально)</div>
          <div style={{ background: p.card, border:`1.5px solid ${p.border}`, borderRadius:14, padding:"12px 14px", fontSize:13, color: p.muted, fontStyle:"italic", minHeight:60, lineHeight:1.5 }}>Аллергия на аммиак — уточнить при…</div>
        </div>
      </div>

      <div style={{ padding:"12px 18px 28px", background: p.navBg, borderTop:`1px solid ${p.borderLight}` }}>
        <Btn p={p} onClick={() => setStep(Math.min(4, step+1))}>Далее — Выбор услуги →</Btn>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   SCREEN: EDIT SERVICE
   ═══════════════════════════════════════ */
const EditService = ({ p }) => {
  const categories = ["Стрижки","Укладки","Окрашивание","Уход","Бритьё"];

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100%", background: p.bg }}>
      {/* Header */}
      <div style={{ padding:"12px 18px 14px", background: p.navBg, borderBottom:`1px solid ${p.borderLight}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:18, color: p.muted }}>←</span>
          <span style={{ fontSize:16, fontWeight:700, color: p.text }}>Редактировать услугу</span>
          <div style={{ marginLeft:"auto", padding:"6px 14px", borderRadius:100, background: p.accentLight, color: p.accent, fontSize:12, fontWeight:700, border:`1px solid ${p.accentBorder}` }}>Сохранить</div>
        </div>
      </div>

      <div style={{ flex:1, padding:"16px 18px 28px", overflowY:"auto" }}>
        {/* Service name */}
        <Input p={p} label="Название услуги" value="Стрижка женская с укладкой" />

        {/* Category */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color: p.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Категория</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {categories.map((c,i)=>(
              <div key={i} style={{ padding:"7px 14px", borderRadius:100, fontSize:12, fontWeight:700, background: i===0 ? p.accent : p.surface, color: i===0 ? "#fff" : p.muted, border: i===0 ? "none" : `1px solid ${p.border}` }}>{c}</div>
            ))}
          </div>
        </div>

        {/* Duration + Price row */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color: p.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>Длительность</div>
            <div style={{ background: p.card, border:`1.5px solid ${p.border}`, borderRadius:12, overflow:"hidden" }}>
              <div style={{ display:"flex", borderBottom:`1px solid ${p.borderLight}` }}>
                {["30","45","60","75","90"].map((m,i)=>(
                  <div key={i} style={{ flex:1, textAlign:"center", padding:"9px 0", fontSize:12, fontWeight:700, background: i===2 ? p.accent : "transparent", color: i===2 ? "#fff" : p.muted }}>{m}</div>
                ))}
              </div>
              <div style={{ textAlign:"center", padding:"8px", fontSize:12, fontWeight:600, color: p.text }}>60 минут</div>
            </div>
          </div>
          <div>
            <div style={{ fontSize:11, fontWeight:700, color: p.muted, textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 }}>Базовая цена</div>
            <div style={{ background: p.card, border:`1.5px solid ${p.border}`, borderRadius:12, padding:"12px 14px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ fontSize:14, color: p.muted }}>₽</span>
                <span style={{ fontSize:20, fontWeight:800, color: p.text }}>1 500</span>
              </div>
              <div style={{ display:"flex", gap:4, marginTop:8 }}>
                {["-100","+100","+500"].map((d,i)=>(
                  <div key={i} style={{ flex:1, padding:"5px 0", borderRadius:8, background: p.surface, border:`1px solid ${p.border}`, textAlign:"center", fontSize:11, fontWeight:700, color: p.textSoft }}>{d}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <Input p={p} label="Описание" value="" placeholder="Включает мытьё, стрижку и укладку феном" multiline />

        {/* Overrides (salon price / duration) */}
        <div style={{ background: p.card, borderRadius:16, border:`1px solid ${p.borderLight}`, overflow:"hidden", marginBottom:14 }}>
          <div style={{ padding:"12px 14px", borderBottom:`1px solid ${p.borderLight}` }}>
            <div style={{ fontSize:12, fontWeight:700, color: p.text }}>Переопределение для салона</div>
            <div style={{ fontSize:11, color: p.muted, marginTop:2 }}>Отличается от базовой услуги</div>
          </div>
          <div style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${p.borderLight}` }}>
            <div style={{ fontSize:13, color: p.textSoft }}>Цена в Эконом стиле</div>
            <div style={{ fontSize:14, fontWeight:700, color: p.accent }}>1 200 ₽</div>
          </div>
          <div style={{ padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, color: p.textSoft }}>Длительность</div>
            <div style={{ fontSize:14, fontWeight:700, color: p.text }}>50 мин</div>
          </div>
        </div>

        {/* Toggle: active */}
        <div style={{ background: p.card, borderRadius:16, border:`1px solid ${p.borderLight}`, padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color: p.text }}>Услуга активна</div>
            <div style={{ fontSize:11, color: p.muted, marginTop:2 }}>Видна клиентам при записи</div>
          </div>
          <div style={{ width:44, height:24, borderRadius:12, background: p.accent, position:"relative" }}>
            <div style={{ position:"absolute", right:2, top:2, width:20, height:20, borderRadius:"50%", background:"#fff" }} />
          </div>
        </div>

        {/* Delete */}
        <div style={{ padding:"12px 0", textAlign:"center", color: p.red, fontSize:13, fontWeight:600 }}>
          Удалить услугу
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════ */
export default function App() {
  const [activePalette, setActivePalette] = useState("Ivory Date");
  const [activeScreen, setActiveScreen] = useState("dashboard");
  const [compare, setCompare] = useState(false);
  const p = PALETTES[activePalette];

  const screenMap = { dashboard: Dashboard, calendar: Calendar, appointments: Appointments, clients: Clients, new_appointment: NewAppointment, edit_service: EditService };
  const Screen = screenMap[activeScreen];

  const paletteKeys = Object.keys(PALETTES);

  return (
    <div style={{ minHeight:"100vh", background:"#EDEAE5", fontFamily:"'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display:ital@0;1&display=swap" rel="stylesheet" />

      {/* Top nav */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E0DBD4", padding:"18px 28px 16px" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, color:"#B87A56", letterSpacing:2, textTransform:"uppercase", marginBottom:4 }}>Beautica · Кабинет Мастера</div>
            <div style={{ fontFamily:"'DM Serif Display',serif", fontSize:22, color:"#2A2218" }}>
              Master Dashboard <span style={{ fontStyle:"italic", color:"#B87A56" }}>RN Mockup</span>
            </div>
          </div>
          <div
            onClick={() => setCompare(!compare)}
            style={{ padding:"8px 18px", borderRadius:12, background: compare ? "#B87A56" : "#F5F0E8", color: compare ? "#fff" : "#8A7860", border: compare ? "none" : "1px solid #D5CAB5", fontSize:12, fontWeight:700, cursor:"pointer" }}
          >
            {compare ? "✦ Все палитры" : "Сравнить все"}
          </div>
        </div>

        {/* Screen tabs */}
        <div style={{ display:"flex", gap:6, overflowX:"auto", scrollbarWidth:"none", marginBottom:10 }}>
          {SCREENS.map(s => (
            <div key={s.id} onClick={() => setActiveScreen(s.id)} style={{ padding:"7px 16px", borderRadius:100, fontSize:12, fontWeight:700, background: activeScreen===s.id ? "#2A2218" : "transparent", color: activeScreen===s.id ? "#fff" : "#8A7860", border: activeScreen===s.id ? "none" : "1px solid #D5CAB5", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>{s.label}</div>
          ))}
        </div>

        {/* Palette selector (single mode) */}
        {!compare && (
          <div style={{ display:"flex", gap:6 }}>
            {paletteKeys.map(pk => {
              const pp = PALETTES[pk];
              return (
                <div key={pk} onClick={() => setActivePalette(pk)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px 6px 8px", borderRadius:100, border: activePalette===pk ? `1.5px solid ${pp.accent}` : "1.5px solid #D5CAB5", background: activePalette===pk ? `${pp.accent}12` : "transparent", cursor:"pointer" }}>
                  <div style={{ width:16, height:16, borderRadius:"50%", background: pp.accent, flexShrink:0 }} />
                  <span style={{ fontSize:11, fontWeight:700, color: activePalette===pk ? pp.accent : "#8A7860" }}>{pk}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Phones */}
      <div style={{ display:"flex", justifyContent:"center", gap:32, padding:"36px 24px 60px", flexWrap:"wrap" }}>
        {compare
          ? paletteKeys.map(pk => {
              const pp = PALETTES[pk];
              const S = screenMap[activeScreen];
              return (
                <div key={pk} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
                  <div style={{ fontSize:11, fontWeight:700, color: pp.accent, letterSpacing:1.5, textTransform:"uppercase" }}>{pk}</div>
                  <Phone p={pp}><S p={pp} /></Phone>
                </div>
              );
            })
          : (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color: p.accent, letterSpacing:1.5, textTransform:"uppercase" }}>{activePalette} — {SCREENS.find(s=>s.id===activeScreen)?.label}</div>
              <Phone p={p}><Screen p={p} /></Phone>
            </div>
          )
        }
      </div>

      {/* Design notes */}
      <div style={{ maxWidth:860, margin:"0 auto", padding:"0 28px 60px" }}>
        <div style={{ background:"#fff", borderRadius:20, padding:22, border:"1px solid #E0DBD4" }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#2A2218", marginBottom:10 }}>📋 Решения по экранам</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, fontSize:12, color:"#6B5C48", lineHeight:1.7 }}>
            <div><b style={{color:"#2A2218"}}>Записи вместо таблицы</b> — карточки с цветным статус-бордером слева, группировка по дням, быстрые action-кнопки. Вся информация таблицы (время, имя, услуга, цена, статус) умещается в 1 карточку.</div>
            <div><b style={{color:"#2A2218"}}>Календарь</b> — компактный week-view с NowLine (красная линия), события в колонках, масштаб по высоте пропорционален длительности. Свитч День/Неделя в шапке.</div>
            <div><b style={{color:"#2A2218"}}>Клиенты</b> — список с аватаркой-инициалом, тегами, статистикой. Поиск + фильтр-чипы вместо DataGrid колонок.</div>
            <div><b style={{color:"#2A2218"}}>Форма услуги</b> — сегментированный пикер для длительности (30/45/60/75/90), ±кнопки для цены, inline override для конкретного салона.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
