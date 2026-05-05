export type Palette = {
  label: string;
  bg: string;
  surface: string;
  card: string;
  border: string;
  borderLight: string;
  text: string;
  textSoft: string;
  muted: string;
  accent: string;
  accentLight: string;
  accentBorder: string;
  green: string;
  greenLight: string;
  red: string;
  redLight: string;
  yellow: string;
  yellowLight: string;
  navBg: string;
  statusBar: string;
};

export const PALETTES: Record<string, Palette> = {
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
