import type { Palette } from "./palette.types";

export type ServiceCategory = "hair" | "nails" | "brows" | "makeup" | "massage";

const FALLBACK: Record<ServiceCategory, keyof Palette> = {
  hair: "hair",
  nails: "nails",
  brows: "brows",
  makeup: "makeup",
  massage: "massage",
};

export function categoryColor(palette: Palette, cat: string | null | undefined): string {
  if (cat && cat in FALLBACK) {
    return palette[FALLBACK[cat as ServiceCategory]];
  }
  return palette.accent;
}
