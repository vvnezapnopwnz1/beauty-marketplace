import { useState, useEffect } from "react";

const SCREENS = {
  home: "Главная",
  search: "Поиск",
  salon: "Салон",
  booking: "Бронирование",
  profile: "Профиль",
  master: "Мастер",
};

const VARIANTS = {
  A: "Вариант A",
  B: "Вариант B",
};

/* ─── iPhone frame ─── */
const PhoneFrame = ({ children, label }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
    {label && (
      <div style={{ fontSize: 11, fontWeight: 700, color: "#D8956B", letterSpacing: 1.5, textTransform: "uppercase" }}>
        {label}
      </div>
    )}
    <div
      style={{
        width: 375,
        height: 812,
        borderRadius: 44,
        background: "#1A1512",
        border: "3px solid #3A3028",
        overflow: "hidden",
        position: "relative",
        boxShadow: "0 24px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(216,149,107,.08)",
        fontFamily: "'Outfit', 'SF Pro Display', -apple-system, sans-serif",
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 160,
          height: 34,
          background: "#1A1512",
          borderRadius: "0 0 20px 20px",
          zIndex: 100,
        }}
      />
      {/* Status bar */}
      <div
        style={{
          height: 54,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          padding: "0 28px 4px",
          fontSize: 13,
          fontWeight: 600,
          color: "#F0EAE3",
          zIndex: 99,
          position: "relative",
        }}
      >
        <span>9:41</span>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="#F0EAE3">
            <rect x="0" y="6" width="3" height="6" rx="1" />
            <rect x="4.5" y="4" width="3" height="8" rx="1" />
            <rect x="9" y="2" width="3" height="10" rx="1" />
            <rect x="13.5" y="0" width="3" height="12" rx="1" opacity=".3" />
          </svg>
          <svg width="24" height="12" viewBox="0 0 24 12" fill="none">
            <rect x="0.5" y="0.5" width="21" height="11" rx="2" stroke="#F0EAE3" strokeWidth="1" />
            <rect x="22" y="3.5" width="2" height="5" rx="1" fill="#F0EAE3" opacity=".4" />
            <rect x="2" y="2" width="15" height="8" rx="1" fill="#4ADE80" />
          </svg>
        </div>
      </div>
      {/* Content */}
      <div style={{ height: "calc(100% - 54px)", overflowY: "auto", overflowX: "hidden" }}>{children}</div>
      {/* Home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          width: 134,
          height: 5,
          borderRadius: 100,
          background: "rgba(240,234,227,.3)",
          zIndex: 100,
        }}
      />
    </div>
  </div>
);

/* ─── Shared components ─── */
const Chip = ({ children, active, style }) => (
  <div
    style={{
      padding: "8px 16px",
      borderRadius: 100,
      fontSize: 13,
      fontWeight: active ? 600 : 500,
      background: active ? "#D8956B" : "transparent",
      color: active ? "#1A0E09" : "#B8A896",
      border: active ? "1.5px solid #D8956B" : "1.5px solid #4A423A",
      whiteSpace: "nowrap",
      flexShrink: 0,
      ...style,
    }}
  >
    {children}
  </div>
);

const StarRow = ({ rating, size = 12, gap = 2 }) => (
  <div style={{ display: "flex", gap, alignItems: "center" }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={i <= Math.round(rating) ? "#D8956B" : "#4A423A"}>
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ))}
    <span style={{ fontSize: size - 1, color: "#8C8076", marginLeft: 2, fontWeight: 600 }}>{rating}</span>
  </div>
);

const BottomNav = ({ active = "search" }) => (
  <div
    style={{
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 82,
      background: "linear-gradient(180deg, rgba(26,21,18,0) 0%, #1A1512 16%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",
      padding: "0 12px 20px",
      zIndex: 50,
    }}
  >
    {[
      { id: "home", icon: "⌂", label: "Главная" },
      { id: "search", icon: "⊕", label: "Поиск" },
      { id: "bookings", icon: "▦", label: "Записи" },
      { id: "profile", icon: "◉", label: "Профиль" },
    ].map((tab) => (
      <div
        key={tab.id}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          color: active === tab.id ? "#D8956B" : "#5C5048",
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
        <span>{tab.label}</span>
      </div>
    ))}
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: HOME — Variant A (Editorial Hero)
   ═══════════════════════════════════════════ */
const HomeA = () => (
  <div style={{ background: "#1A1512", minHeight: "100%", paddingBottom: 90 }}>
    {/* Hero */}
    <div
      style={{
        background: "linear-gradient(165deg, #3A2820 0%, #2B1E16 40%, #1A1512 100%)",
        padding: "20px 20px 28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative circles */}
      <div style={{ position: "absolute", top: -40, right: -30, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(216,149,107,.12) 0%, transparent 70%)" }} />
      <div style={{ position: "absolute", bottom: -20, left: -40, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(216,149,107,.06) 0%, transparent 70%)" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <div style={{ fontSize: 13, color: "#8C8076", marginBottom: 2 }}>📍 Москва, Хамовники</div>
          <div style={{ fontFamily: "'Fraunces', 'Georgia', serif", fontSize: 22, fontWeight: 700, color: "#F0EAE3" }}>
            beauti<span style={{ color: "#D8956B", fontStyle: "italic" }}>ca</span>
          </div>
        </div>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#3A3028", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
          🔔
        </div>
      </div>

      <div style={{ fontFamily: "'Fraunces', 'Georgia', serif", fontSize: 28, fontWeight: 600, color: "#F0EAE3", lineHeight: 1.2, marginBottom: 8 }}>
        Найди <span style={{ color: "#D8956B", fontStyle: "italic" }}>своего</span>
        <br />
        мастера
      </div>
      <div style={{ fontSize: 14, color: "#B8A896", marginBottom: 20 }}>2 340 салонов и мастеров рядом с тобой</div>

      {/* Search bar */}
      <div
        style={{
          background: "#2B241F",
          borderRadius: 16,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          border: "1px solid #4A423A",
        }}
      >
        <span style={{ fontSize: 16, opacity: 0.6 }}>🔍</span>
        <span style={{ fontSize: 14, color: "#8C8076" }}>Салон, мастер или услуга…</span>
      </div>
    </div>

    {/* Categories */}
    <div style={{ padding: "20px 0 0" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#F0EAE3", padding: "0 20px", marginBottom: 14 }}>Категории</div>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 20px 4px", scrollbarWidth: "none" }}>
        {[
          { emoji: "💇‍♀️", label: "Волосы" },
          { emoji: "💅", label: "Ногти" },
          { emoji: "🧖‍♀️", label: "Лицо" },
          { emoji: "💆‍♀️", label: "Массаж" },
          { emoji: "👁️", label: "Брови" },
          { emoji: "🦷", label: "Стоматология" },
        ].map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: i === 0 ? "rgba(216,149,107,.15)" : "#2B241F",
                border: i === 0 ? "1.5px solid rgba(216,149,107,.4)" : "1px solid #3A3028",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              {c.emoji}
            </div>
            <span style={{ fontSize: 11, color: i === 0 ? "#D8956B" : "#8C8076", fontWeight: 600 }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>

    {/* Nearby */}
    <div style={{ padding: "24px 20px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#F0EAE3" }}>Рядом с тобой</div>
        <div style={{ fontSize: 12, color: "#D8956B", fontWeight: 600 }}>Все →</div>
      </div>

      {[
        { name: "Эконом стиль", cat: "Парикмахерская", dist: "200 м", rating: 4.8, reviews: 127, tag: "Онлайн-запись", gradient: "linear-gradient(135deg, #4a3328, #3a2820)" },
        { name: "Nails & Beauty Lab", cat: "Ногтевая студия", dist: "350 м", rating: 4.9, reviews: 89, tag: "Свободно сегодня", gradient: "linear-gradient(135deg, #2a3a30, #1f2b25)" },
        { name: "Brow Bar Moscow", cat: "Брови и ресницы", dist: "500 м", rating: 4.7, reviews: 54, gradient: "linear-gradient(135deg, #352840, #27203a)" },
      ].map((s, i) => (
        <div
          key={i}
          style={{
            background: "#2B241F",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 12,
            border: "1px solid #3A3028",
          }}
        >
          <div style={{ height: 100, background: s.gradient, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <span style={{ fontSize: 40, opacity: 0.3 }}>✂️</span>
            {s.tag && (
              <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  background: "rgba(216,149,107,.2)",
                  color: "#D8956B",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 100,
                  backdropFilter: "blur(8px)",
                }}
              >
                {s.tag}
              </div>
            )}
          </div>
          <div style={{ padding: "12px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#F0EAE3" }}>{s.name}</div>
                <div style={{ fontSize: 12, color: "#8C8076", marginTop: 2 }}>
                  {s.cat} · {s.dist}
                </div>
              </div>
              <StarRow rating={s.rating} />
            </div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active="home" />
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: HOME — Variant B (Minimal card grid)
   ═══════════════════════════════════════════ */
const HomeB = () => (
  <div style={{ background: "#0F0C0A", minHeight: "100%", paddingBottom: 90 }}>
    <div style={{ padding: "14px 20px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ fontFamily: "'Fraunces', 'Georgia', serif", fontSize: 20, fontWeight: 700, color: "#F5F0EB" }}>
          beauti<span style={{ color: "#E8A87C" }}>ca</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#1E1916", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, border: "1px solid #2E2620" }}>📍</div>
          <div style={{ width: 36, height: 36, borderRadius: 12, background: "#1E1916", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, border: "1px solid #2E2620" }}>🔔</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ background: "#1E1916", borderRadius: 14, padding: "13px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #2E2620", marginBottom: 20 }}>
        <span style={{ fontSize: 14, opacity: 0.5 }}>🔍</span>
        <span style={{ fontSize: 13, color: "#6B5E52" }}>Поиск салонов и мастеров</span>
        <div style={{ marginLeft: "auto", background: "#E8A87C", borderRadius: 8, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: "#0F0C0A" }}>⚡ 24</div>
      </div>

      {/* Chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22, overflowX: "auto", scrollbarWidth: "none" }}>
        <Chip active>Всё</Chip>
        <Chip>Волосы</Chip>
        <Chip>Ногти</Chip>
        <Chip>Лицо</Chip>
        <Chip>Массаж</Chip>
      </div>

      {/* Featured card */}
      <div
        style={{
          background: "linear-gradient(150deg, #2E2218 0%, #1A1310 100%)",
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          border: "1px solid #3A2E24",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(232,168,124,.15), transparent)" }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: "#E8A87C", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>✦ Рекомендация дня</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#F5F0EB", marginBottom: 4 }}>Studio Metamorphose</div>
        <div style={{ fontSize: 12, color: "#8C8076", marginBottom: 12 }}>Салон красоты · 300 м · ★ 4.9</div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ background: "#E8A87C", color: "#0F0C0A", padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 700 }}>Записаться</div>
          <div style={{ background: "rgba(232,168,124,.12)", color: "#E8A87C", padding: "8px 18px", borderRadius: 100, fontSize: 13, fontWeight: 600, border: "1px solid rgba(232,168,124,.25)" }}>Подробнее</div>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { name: "Лаки", type: "Ногти", color: "#2D1E2E", accent: "#C88FD1" },
          { name: "BarberShop №1", type: "Барбер", color: "#1E2820", accent: "#7BC88F" },
          { name: "BrowArt", type: "Брови", color: "#2E2518", accent: "#E8C47C" },
          { name: "SPA Relax", type: "Массаж", color: "#18222E", accent: "#7CB5E8" },
        ].map((s, i) => (
          <div key={i} style={{ background: s.color, borderRadius: 16, overflow: "hidden", border: `1px solid ${s.accent}22` }}>
            <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, opacity: 0.3 }}>✨</div>
            <div style={{ padding: "0 12px 12px" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0EB" }}>{s.name}</div>
              <div style={{ fontSize: 11, color: s.accent, fontWeight: 600, marginTop: 2 }}>{s.type}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
    <BottomNav active="home" />
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: SEARCH
   ═══════════════════════════════════════════ */
const SearchA = () => (
  <div style={{ background: "#1A1512", minHeight: "100%", paddingBottom: 90 }}>
    <div style={{ padding: "10px 20px 16px" }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, background: "#2B241F", borderRadius: 14, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #4A423A" }}>
          <span style={{ fontSize: 14, opacity: 0.5 }}>🔍</span>
          <span style={{ fontSize: 13, color: "#F0EAE3", fontWeight: 500 }}>Парикмахерская</span>
        </div>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: "#2B241F", border: "1px solid #4A423A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚙</div>
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none", marginBottom: 14 }}>
        <Chip active>Все</Chip>
        <Chip>Рядом</Chip>
        <Chip>Онлайн-запись</Chip>
        <Chip>Открыто</Chip>
        <Chip>Рейтинг 4.5+</Chip>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: "#8C8076" }}>124 салона</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#D8956B", fontWeight: 600 }}>Список</span>
          <span style={{ fontSize: 12, color: "#5C5048" }}>|</span>
          <span style={{ fontSize: 12, color: "#5C5048" }}>Карта</span>
        </div>
      </div>
    </div>

    {/* Results */}
    <div style={{ padding: "0 20px" }}>
      {[
        { name: "Эконом стиль", meta: "Парикмахерская · 200 м", rating: 4.8, reviews: 127, online: true, freeToday: true },
        { name: "Nails & Beauty Lab", meta: "Ногтевая студия · 350 м", rating: 4.9, reviews: 89, online: true },
        { name: "Brow Bar Moscow", meta: "Брови и ресницы · 500 м", rating: 4.7, reviews: 54, online: false },
        { name: "Lux Hair Studio", meta: "Парикмахерская · 680 м", rating: 4.6, reviews: 201, online: true },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: "1px solid #2B241F" }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${["#4a3328", "#2a3a30", "#352840", "#3a2828"][i]}, ${["#3a2820", "#1f2b25", "#27203a", "#2a2020"][i]})`,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              opacity: 0.5,
            }}
          >
            ✂️
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#F0EAE3" }}>{s.name}</div>
              <StarRow rating={s.rating} size={10} />
            </div>
            <div style={{ fontSize: 12, color: "#8C8076", marginTop: 2 }}>{s.meta}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              {s.online && (
                <div style={{ background: "rgba(216,149,107,.12)", color: "#D8956B", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>Онлайн-запись</div>
              )}
              {s.freeToday && (
                <div style={{ background: "rgba(74,222,128,.12)", color: "#4ADE80", fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 100 }}>Свободно сегодня</div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active="search" />
  </div>
);

const SearchB = () => (
  <div style={{ background: "#0F0C0A", minHeight: "100%", paddingBottom: 90 }}>
    <div style={{ padding: "10px 20px 12px" }}>
      <div style={{ background: "#1E1916", borderRadius: 20, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #2E2620", marginBottom: 14 }}>
        <span style={{ fontSize: 14 }}>←</span>
        <span style={{ fontSize: 14, color: "#F5F0EB", fontWeight: 500 }}>Парикмахерская</span>
        <span style={{ marginLeft: "auto", fontSize: 13, color: "#6B5E52" }}>✕</span>
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", scrollbarWidth: "none" }}>
        {["⚡ Свободно", "💰 до 3000₽", "📍 1 км", "⭐ 4.5+"].map((f, i) => (
          <div key={i} style={{ padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 600, background: i === 0 ? "#E8A87C" : "#1E1916", color: i === 0 ? "#0F0C0A" : "#8C8076", border: i === 0 ? "none" : "1px solid #2E2620", whiteSpace: "nowrap", flexShrink: 0 }}>
            {f}
          </div>
        ))}
      </div>
    </div>

    {/* Map placeholder */}
    <div style={{ height: 180, background: "linear-gradient(180deg, #1A1714 0%, #12100D 100%)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderBottom: "1px solid #2E2620" }}>
      <div style={{ fontSize: 32, opacity: 0.2 }}>🗺️</div>
      {/* Map pins */}
      {[
        { top: 40, left: 80 },
        { top: 70, left: 180 },
        { top: 50, left: 270 },
        { top: 100, left: 140 },
      ].map((p, i) => (
        <div key={i} style={{ position: "absolute", top: p.top, left: p.left, width: 28, height: 28, borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)", background: i === 0 ? "#E8A87C" : "#3A3028", border: `2px solid ${i === 0 ? "#F5D0B5" : "#4A423A"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ transform: "rotate(45deg)", fontSize: 12 }}>{i === 0 ? "✂" : "·"}</span>
        </div>
      ))}
      <div style={{ position: "absolute", bottom: 10, right: 14, background: "#E8A87C", color: "#0F0C0A", padding: "6px 14px", borderRadius: 100, fontSize: 11, fontWeight: 700 }}>Список ↓</div>
    </div>

    <div style={{ padding: "12px 20px" }}>
      {[
        { name: "Эконом стиль", price: "от 800₽", dist: "200 м", rating: 4.8, avail: "14:00, 15:30, 17:00" },
        { name: "Nails Lab", price: "от 1500₽", dist: "350 м", rating: 4.9, avail: "11:00, 16:00" },
      ].map((s, i) => (
        <div key={i} style={{ background: "#1E1916", borderRadius: 18, padding: 16, marginBottom: 10, border: "1px solid #2E2620" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F0EB" }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#E8A87C", fontWeight: 600 }}>★ {s.rating}</div>
          </div>
          <div style={{ fontSize: 12, color: "#6B5E52", marginBottom: 10 }}>{s.dist} · {s.price}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {s.avail.split(", ").map((t, j) => (
              <div key={j} style={{ padding: "6px 14px", borderRadius: 10, background: j === 0 ? "rgba(232,168,124,.15)" : "#141210", border: `1px solid ${j === 0 ? "rgba(232,168,124,.3)" : "#2E2620"}`, fontSize: 12, fontWeight: 600, color: j === 0 ? "#E8A87C" : "#8C8076" }}>
                {t}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <BottomNav active="search" />
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: SALON
   ═══════════════════════════════════════════ */
const SalonA = () => (
  <div style={{ background: "#1A1512", minHeight: "100%", paddingBottom: 90 }}>
    {/* Hero */}
    <div style={{ height: 220, background: "linear-gradient(180deg, #3A2820 0%, #2B1E16 60%, #1A1512 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ fontSize: 60, opacity: 0.15 }}>✂️</span>
      <div style={{ position: "absolute", top: 10, left: 16, width: 36, height: 36, borderRadius: 12, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#F0EAE3" }}>←</div>
      <div style={{ position: "absolute", top: 10, right: 16, display: "flex", gap: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>♡</div>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "rgba(0,0,0,.4)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⋯</div>
      </div>
      <div style={{ position: "absolute", bottom: 16, left: 20, right: 20 }}>
        <div style={{ display: "inline-block", background: "rgba(74,222,128,.15)", color: "#4ADE80", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 100, marginBottom: 8 }}>● Открыто до 21:00</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#F0EAE3", fontFamily: "'Fraunces', serif" }}>Эконом стиль</div>
        <div style={{ fontSize: 13, color: "#B8A896", marginTop: 4 }}>Парикмахерская · 200 м от тебя</div>
      </div>
    </div>

    {/* Info row */}
    <div style={{ display: "flex", justifyContent: "space-around", padding: "16px 20px", borderBottom: "1px solid #2B241F" }}>
      {[
        { val: "4.8", label: "Рейтинг" },
        { val: "127", label: "Отзывов" },
        { val: "5", label: "Мастеров" },
        { val: "200м", label: "Расст." },
      ].map((s, i) => (
        <div key={i} style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#D8956B" }}>{s.val}</div>
          <div style={{ fontSize: 11, color: "#8C8076" }}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Tabs */}
    <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2B241F" }}>
      {["Обзор", "Услуги", "Мастера", "Фото"].map((t, i) => (
        <div key={i} style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 13, fontWeight: 600, color: i === 0 ? "#D8956B" : "#5C5048", borderBottom: i === 0 ? "2px solid #D8956B" : "2px solid transparent" }}>
          {t}
        </div>
      ))}
    </div>

    {/* Services */}
    <div style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: "#F0EAE3", marginBottom: 14 }}>Услуги</div>
      {[
        { name: "Стрижка женская", price: "1 500 ₽", time: "60 мин" },
        { name: "Окрашивание", price: "3 500 ₽", time: "120 мин" },
        { name: "Укладка", price: "800 ₽", time: "30 мин" },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #2B241F" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F0EAE3" }}>{s.name}</div>
            <div style={{ fontSize: 12, color: "#8C8076", marginTop: 2 }}>⏱ {s.time}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#D8956B" }}>{s.price}</div>
            <div style={{ fontSize: 11, color: "#4ADE80", marginTop: 2 }}>Записаться →</div>
          </div>
        </div>
      ))}
    </div>
    <BottomNav active="search" />
  </div>
);

const SalonB = () => (
  <div style={{ background: "#0F0C0A", minHeight: "100%", paddingBottom: 100 }}>
    <div style={{ padding: "10px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 18, color: "#8C8076" }}>←</span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#F5F0EB" }}>Студия</span>
        <span style={{ fontSize: 18 }}>♡</span>
      </div>

      {/* Card-style header */}
      <div style={{ background: "#1E1916", borderRadius: 22, overflow: "hidden", border: "1px solid #2E2620", marginBottom: 16 }}>
        <div style={{ height: 160, background: "linear-gradient(135deg, #3A2820, #1E1916)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 50, opacity: 0.15 }}>✂️</span>
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#F5F0EB" }}>Nails & Beauty Lab</span>
            <span style={{ background: "#4ADE80", width: 8, height: 8, borderRadius: "50%" }} />
          </div>
          <div style={{ fontSize: 13, color: "#6B5E52" }}>Ногтевая студия · Хамовники · ★ 4.9 (89)</div>

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <div style={{ flex: 1, background: "#E8A87C", color: "#0F0C0A", padding: "12px 0", borderRadius: 14, textAlign: "center", fontSize: 14, fontWeight: 700 }}>Записаться</div>
            <div style={{ width: 46, height: 46, borderRadius: 14, background: "#141210", border: "1px solid #2E2620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📞</div>
          </div>
        </div>
      </div>

      {/* Quick slots */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0EB", marginBottom: 10 }}>Ближайшие слоты</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {["Сегодня 14:00", "Сегодня 16:30", "Завтра 10:00", "Завтра 12:00"].map((t, i) => (
            <div key={i} style={{ padding: "8px 16px", borderRadius: 12, background: i === 0 ? "rgba(232,168,124,.15)" : "#1E1916", border: `1px solid ${i === 0 ? "rgba(232,168,124,.3)" : "#2E2620"}`, fontSize: 12, fontWeight: 600, color: i === 0 ? "#E8A87C" : "#6B5E52", whiteSpace: "nowrap", flexShrink: 0 }}>
              {t}
            </div>
          ))}
        </div>
      </div>

      {/* Masters */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0EB", marginBottom: 10 }}>Мастера</div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { name: "Анна", spec: "Маникюр", rating: 4.9, color: "#E8A87C" },
            { name: "Мария", spec: "Педикюр", rating: 4.8, color: "#C88FD1" },
            { name: "Ольга", spec: "Дизайн", rating: 4.7, color: "#7BC88F" },
          ].map((m, i) => (
            <div key={i} style={{ width: 100, flexShrink: 0, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: m.color, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#0F0C0A" }}>
                {m.name[0]}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#F5F0EB" }}>{m.name}</div>
              <div style={{ fontSize: 11, color: "#6B5E52" }}>{m.spec}</div>
              <div style={{ fontSize: 11, color: "#E8A87C", marginTop: 2 }}>★ {m.rating}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: BOOKING
   ═══════════════════════════════════════════ */
const BookingA = () => (
  <div style={{ background: "#1A1512", minHeight: "100%", paddingBottom: 100 }}>
    <div style={{ padding: "10px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 18, color: "#8C8076" }}>←</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#F0EAE3" }}>Запись</span>
      </div>

      {/* Steps */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24, justifyContent: "center" }}>
        {["Услуга", "Мастер", "Время", "Готово"].map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: i <= 2 ? "#D8956B" : "#2B241F", color: i <= 2 ? "#1A0E09" : "#5C5048", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
              {i < 2 ? "✓" : i + 1}
            </div>
            {i < 3 && <div style={{ width: 20, height: 2, background: i < 2 ? "#D8956B" : "#2B241F" }} />}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 18, fontWeight: 700, color: "#F0EAE3", marginBottom: 4, fontFamily: "'Fraunces', serif" }}>Выберите время</div>
      <div style={{ fontSize: 13, color: "#8C8076", marginBottom: 18 }}>Стрижка женская · Мастер Анна</div>

      {/* Calendar */}
      <div style={{ background: "#2B241F", borderRadius: 18, padding: 16, border: "1px solid #3A3028", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 14, color: "#8C8076" }}>◀</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#F0EAE3" }}>Май 2026</span>
          <span style={{ fontSize: 14, color: "#8C8076" }}>▶</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center" }}>
          {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
            <div key={d} style={{ fontSize: 11, color: "#5C5048", fontWeight: 600, padding: 4 }}>{d}</div>
          ))}
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
            <div
              key={d}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                background: d === 12 ? "#D8956B" : d >= 5 && d <= 20 ? "transparent" : "transparent",
                color: d === 12 ? "#1A0E09" : d >= 5 && d <= 20 ? "#F0EAE3" : "#3A3028",
                margin: "0 auto",
              }}
            >
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Time slots */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EAE3", marginBottom: 12 }}>Доступное время</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {["10:00", "11:00", "12:30", "14:00", "15:30", "17:00"].map((t, i) => (
          <div key={i} style={{ padding: "12px 0", borderRadius: 12, textAlign: "center", background: i === 3 ? "#D8956B" : "#2B241F", border: `1px solid ${i === 3 ? "#D8956B" : "#3A3028"}`, fontSize: 14, fontWeight: 600, color: i === 3 ? "#1A0E09" : "#B8A896" }}>
            {t}
          </div>
        ))}
      </div>
    </div>

    {/* Bottom CTA */}
    <div style={{ position: "absolute", bottom: 30, left: 20, right: 20 }}>
      <div style={{ background: "#D8956B", color: "#1A0E09", padding: "16px 0", borderRadius: 16, textAlign: "center", fontSize: 15, fontWeight: 700 }}>Подтвердить запись</div>
    </div>
  </div>
);

const BookingB = () => (
  <div style={{ background: "#0F0C0A", minHeight: "100%", paddingBottom: 100 }}>
    <div style={{ padding: "10px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <span style={{ fontSize: 16, color: "#6B5E52" }}>✕</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#F5F0EB" }}>Новая запись</span>
        <span style={{ fontSize: 12, color: "#E8A87C", fontWeight: 600 }}>3/4</span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#1E1916", borderRadius: 100, marginBottom: 24, overflow: "hidden" }}>
        <div style={{ width: "75%", height: "100%", background: "linear-gradient(90deg, #E8A87C, #F5D0B5)", borderRadius: 100 }} />
      </div>

      {/* Summary card */}
      <div style={{ background: "#1E1916", borderRadius: 18, padding: 16, border: "1px solid #2E2620", marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "#E8A87C", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800, color: "#0F0C0A" }}>А</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0EB" }}>Мастер Анна</div>
            <div style={{ fontSize: 12, color: "#6B5E52" }}>Стрижка + Укладка · 90 мин</div>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 16, fontWeight: 800, color: "#E8A87C" }}>2 300 ₽</div>
        </div>
      </div>

      {/* Date selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0EB", marginBottom: 12 }}>Дата</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", scrollbarWidth: "none" }}>
          {[
            { day: "Пн", date: "5" },
            { day: "Вт", date: "6" },
            { day: "Ср", date: "7" },
            { day: "Чт", date: "8" },
            { day: "Пт", date: "9" },
            { day: "Сб", date: "10" },
          ].map((d, i) => (
            <div key={i} style={{ width: 50, flexShrink: 0, textAlign: "center", padding: "10px 0", borderRadius: 14, background: i === 2 ? "#E8A87C" : "#1E1916", border: `1px solid ${i === 2 ? "#E8A87C" : "#2E2620"}` }}>
              <div style={{ fontSize: 11, color: i === 2 ? "#0F0C0A" : "#6B5E52", fontWeight: 600 }}>{d.day}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: i === 2 ? "#0F0C0A" : "#F5F0EB", marginTop: 2 }}>{d.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0EB", marginBottom: 12 }}>Время</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["09:00", "10:00", "11:30", "13:00", "14:00", "15:30", "16:00", "17:30"].map((t, i) => (
            <div key={i} style={{ padding: "10px 18px", borderRadius: 12, background: i === 4 ? "rgba(232,168,124,.15)" : "#1E1916", border: `1px solid ${i === 4 ? "rgba(232,168,124,.4)" : "#2E2620"}`, fontSize: 13, fontWeight: 600, color: i === 4 ? "#E8A87C" : "#8C8076" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>

    <div style={{ position: "absolute", bottom: 30, left: 20, right: 20 }}>
      <div style={{ background: "#E8A87C", color: "#0F0C0A", padding: "16px 0", borderRadius: 16, textAlign: "center", fontSize: 15, fontWeight: 800 }}>Далее →</div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: PROFILE
   ═══════════════════════════════════════════ */
const ProfileA = () => (
  <div style={{ background: "#1A1512", minHeight: "100%", paddingBottom: 90 }}>
    <div style={{ padding: "20px 20px 0", textAlign: "center" }}>
      <div style={{ width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, #D8956B, #E8C47C)", margin: "0 auto 12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, color: "#1A0E09" }}>М</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#F0EAE3" }}>Манас</div>
      <div style={{ fontSize: 13, color: "#8C8076", marginTop: 2 }}>+7 (999) ••• ••-••</div>
      <div style={{ display: "inline-block", background: "rgba(216,149,107,.12)", color: "#D8956B", fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 100, marginTop: 8 }}>Клиент</div>
    </div>

    <div style={{ padding: "24px 20px" }}>
      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
        {[
          { val: "12", label: "Визитов" },
          { val: "3", label: "Салона" },
          { val: "2", label: "Избранных" },
        ].map((s, i) => (
          <div key={i} style={{ background: "#2B241F", borderRadius: 14, padding: 14, textAlign: "center", border: "1px solid #3A3028" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#D8956B" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#8C8076", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Menu */}
      {[
        { icon: "📋", label: "Мои записи", badge: "2" },
        { icon: "♡", label: "Избранное" },
        { icon: "🔔", label: "Уведомления" },
        { icon: "⚙", label: "Настройки" },
        { icon: "💬", label: "Поддержка" },
        { icon: "🚪", label: "Выход", danger: true },
      ].map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: "1px solid #2B241F" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: m.danger ? "rgba(239,68,68,.1)" : "#2B241F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{m.icon}</div>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: m.danger ? "#EF4444" : "#F0EAE3" }}>{m.label}</span>
          {m.badge && <div style={{ background: "#D8956B", color: "#1A0E09", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 100 }}>{m.badge}</div>}
          {!m.danger && <span style={{ fontSize: 14, color: "#5C5048" }}>›</span>}
        </div>
      ))}
    </div>
    <BottomNav active="profile" />
  </div>
);

const ProfileB = () => (
  <div style={{ background: "#0F0C0A", minHeight: "100%", paddingBottom: 90 }}>
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg, #E8A87C, #C87C4E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 800, color: "#0F0C0A" }}>М</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#F5F0EB" }}>Манас</div>
          <div style={{ fontSize: 12, color: "#6B5E52" }}>С нами с мая 2026</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 12, background: "#1E1916", border: "1px solid #2E2620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚙</div>
      </div>

      {/* Upcoming */}
      <div style={{ background: "linear-gradient(135deg, #2E2218, #1E1610)", borderRadius: 20, padding: 18, border: "1px solid #3A2E24", marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#E8A87C", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Следующая запись</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#F5F0EB" }}>Стрижка</div>
            <div style={{ fontSize: 12, color: "#6B5E52", marginTop: 2 }}>Завтра, 14:00 · Эконом стиль</div>
          </div>
          <div style={{ background: "#E8A87C", color: "#0F0C0A", padding: "8px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>Детали</div>
        </div>
      </div>

      {/* History */}
      <div style={{ fontSize: 14, fontWeight: 700, color: "#F5F0EB", marginBottom: 12 }}>История</div>
      {[
        { name: "Маникюр + дизайн", salon: "Nails Lab", date: "28 апр", price: "2 500 ₽" },
        { name: "Стрижка мужская", salon: "BarberShop №1", date: "15 апр", price: "1 200 ₽" },
      ].map((h, i) => (
        <div key={i} style={{ background: "#1E1916", borderRadius: 16, padding: 14, marginBottom: 8, border: "1px solid #2E2620", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#F5F0EB" }}>{h.name}</div>
            <div style={{ fontSize: 12, color: "#6B5E52", marginTop: 2 }}>{h.salon} · {h.date}</div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#E8A87C" }}>{h.price}</div>
        </div>
      ))}
    </div>
    <BottomNav active="profile" />
  </div>
);

/* ═══════════════════════════════════════════
   SCREEN: MASTER
   ═══════════════════════════════════════════ */
const MasterA = () => (
  <div style={{ background: "#1A1512", minHeight: "100%", paddingBottom: 100 }}>
    <div style={{ height: 200, background: "linear-gradient(180deg, #3A2820 0%, #1A1512 100%)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg, #D8956B, #E8C47C)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 700, color: "#1A0E09", boxShadow: "0 8px 32px rgba(216,149,107,.3)" }}>А</div>
      <div style={{ position: "absolute", top: 10, left: 16, fontSize: 18, color: "#8C8076" }}>←</div>
    </div>

    <div style={{ padding: "0 20px", textAlign: "center", marginTop: -10 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#F0EAE3", fontFamily: "'Fraunces', serif" }}>Анна Волкова</div>
      <div style={{ fontSize: 13, color: "#8C8076", marginTop: 4 }}>Стилист · 8 лет опыта</div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 8 }}>
        <StarRow rating={4.9} size={14} />
        <span style={{ fontSize: 12, color: "#5C5048" }}>· 89 отзывов</span>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16 }}>
        <div style={{ background: "#D8956B", color: "#1A0E09", padding: "10px 28px", borderRadius: 14, fontSize: 14, fontWeight: 700 }}>Записаться</div>
        <div style={{ background: "#2B241F", color: "#B8A896", padding: "10px 20px", borderRadius: 14, fontSize: 14, fontWeight: 600, border: "1px solid #3A3028" }}>💬 Чат</div>
      </div>
    </div>

    <div style={{ padding: "24px 20px" }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EAE3", marginBottom: 12 }}>Портфолио</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        {[1, 2, 3, 4, 5, 6].map((p) => (
          <div key={p} style={{ height: 100, borderRadius: 12, background: `linear-gradient(${120 + p * 30}deg, #3A3028, #2B241F)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: 0.4 }}>📷</div>
        ))}
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, color: "#F0EAE3", marginTop: 20, marginBottom: 12 }}>Услуги</div>
      {[
        { name: "Стрижка женская", price: "1 500 ₽" },
        { name: "Окрашивание Airtouch", price: "5 000 ₽" },
        { name: "Укладка", price: "800 ₽" },
      ].map((s, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #2B241F" }}>
          <span style={{ fontSize: 14, color: "#F0EAE3" }}>{s.name}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#D8956B" }}>{s.price}</span>
        </div>
      ))}
    </div>
  </div>
);

const MasterB = () => (
  <div style={{ background: "#0F0C0A", minHeight: "100%", paddingBottom: 100 }}>
    <div style={{ padding: "10px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <span style={{ fontSize: 16, color: "#6B5E52" }}>←</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 16 }}>♡</span>
        <span style={{ fontSize: 16, marginLeft: 12 }}>⋯</span>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #E8A87C, #C87C4E)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#0F0C0A", flexShrink: 0 }}>А</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#F5F0EB" }}>Анна Волкова</div>
          <div style={{ fontSize: 12, color: "#6B5E52", marginTop: 2 }}>Стилист-колорист</div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: "#E8A87C", fontWeight: 600 }}>★ 4.9</span>
            <span style={{ fontSize: 12, color: "#6B5E52" }}>89 отзывов</span>
            <span style={{ fontSize: 12, color: "#6B5E52" }}>8 лет</span>
          </div>
        </div>
      </div>

      {/* Work places */}
      <div style={{ background: "#1E1916", borderRadius: 16, padding: 14, border: "1px solid #2E2620", marginBottom: 18 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#6B5E52", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Работает в</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#2E2620", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✂</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#F5F0EB" }}>Эконом стиль</div>
            <div style={{ fontSize: 11, color: "#6B5E52" }}>Хамовники · 200 м</div>
          </div>
        </div>
      </div>

      {/* Portfolio grid */}
      <div style={{ fontSize: 13, fontWeight: 700, color: "#F5F0EB", marginBottom: 10 }}>Работы</div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 6, marginBottom: 18 }}>
        <div style={{ height: 160, borderRadius: 16, background: "linear-gradient(135deg, #3A2820, #2B1E16)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, opacity: 0.3 }}>📷</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ flex: 1, borderRadius: 14, background: "linear-gradient(135deg, #2a3a30, #1f2b25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: 0.3 }}>📷</div>
          <div style={{ flex: 1, borderRadius: 14, background: "linear-gradient(135deg, #352840, #27203a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, opacity: 0.3, position: "relative" }}>
            <span>📷</span>
            <div style={{ position: "absolute", background: "rgba(0,0,0,.6)", inset: 0, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#F5F0EB" }}>+12</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#E8A87C", color: "#0F0C0A", padding: "14px 0", borderRadius: 16, textAlign: "center", fontSize: 15, fontWeight: 800 }}>Записаться к Анне</div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
const screenComponents = {
  home: { A: HomeA, B: HomeB },
  search: { A: SearchA, B: SearchB },
  salon: { A: SalonA, B: SalonB },
  booking: { A: BookingA, B: BookingB },
  profile: { A: ProfileA, B: ProfileB },
  master: { A: MasterA, B: MasterB },
};

export default function App() {
  const [activeScreen, setActiveScreen] = useState("home");
  const [activeVariant, setActiveVariant] = useState("A");
  const [compareMode, setCompareMode] = useState(false);

  const ScreenA = screenComponents[activeScreen]?.A;
  const ScreenB = screenComponents[activeScreen]?.B;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0A0807",
        fontFamily: "'Outfit', 'SF Pro Display', sans-serif",
        color: "#F0EAE3",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Fraunces:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid #1E1916" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#D8956B", letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>React Native Mockup</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 28, fontWeight: 700 }}>
              beauti<span style={{ color: "#D8956B", fontStyle: "italic" }}>ca</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: "#5C5048", marginLeft: 10 }}>Mobile App</span>
            </div>
          </div>
          <button
            onClick={() => setCompareMode(!compareMode)}
            style={{
              background: compareMode ? "#D8956B" : "#1E1916",
              color: compareMode ? "#0A0807" : "#8C8076",
              border: compareMode ? "none" : "1px solid #2E2620",
              padding: "8px 18px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {compareMode ? "✦ Сравнение ON" : "Сравнить A/B"}
          </button>
        </div>

        {/* Screen tabs */}
        <div style={{ display: "flex", gap: 6, marginTop: 20, overflowX: "auto", scrollbarWidth: "none" }}>
          {Object.entries(SCREENS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveScreen(key)}
              style={{
                padding: "8px 18px",
                borderRadius: 100,
                fontSize: 13,
                fontWeight: activeScreen === key ? 700 : 500,
                background: activeScreen === key ? "#D8956B" : "transparent",
                color: activeScreen === key ? "#0A0807" : "#8C8076",
                border: activeScreen === key ? "none" : "1px solid #2E2620",
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Variant toggle (only in single mode) */}
        {!compareMode && (
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {Object.entries(VARIANTS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveVariant(key)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 600,
                  background: activeVariant === key ? "rgba(216,149,107,.15)" : "transparent",
                  color: activeVariant === key ? "#D8956B" : "#5C5048",
                  border: activeVariant === key ? "1px solid rgba(216,149,107,.3)" : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Phone mockups */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 48,
          padding: "40px 32px 60px",
          flexWrap: "wrap",
        }}
      >
        {compareMode ? (
          <>
            <PhoneFrame label="Вариант A — Warm Mocha">
              <ScreenA />
            </PhoneFrame>
            <PhoneFrame label="Вариант B — Deep Noir">
              <ScreenB />
            </PhoneFrame>
          </>
        ) : (
          <PhoneFrame label={`${SCREENS[activeScreen]} — ${VARIANTS[activeVariant]}`}>
            {activeVariant === "A" ? <ScreenA /> : <ScreenB />}
          </PhoneFrame>
        )}
      </div>

      {/* Description block */}
      <div style={{ padding: "0 32px 60px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ background: "#141210", borderRadius: 20, padding: 24, border: "1px solid #1E1916" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#D8956B", marginBottom: 8 }}>Дизайн-система</div>
          <div style={{ fontSize: 13, color: "#8C8076", lineHeight: 1.8 }}>
            <strong style={{ color: "#F0EAE3" }}>Вариант A (Warm Mocha):</strong> Тёплая палитра с акцентом #D8956B, фоны #1A1512/#2B241F. Шрифт Fraunces для заголовков. Ощущение уюта и premium без холодности.
            <br /><br />
            <strong style={{ color: "#F5F0EB" }}>Вариант B (Deep Noir):</strong> Более тёмная база #0F0C0A, упрощённая навигация, акцент #E8A87C. Минимальные бордеры, округлённые карточки. Более техничный и современный стиль.
          </div>
        </div>
      </div>
    </div>
  );
}
