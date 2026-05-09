// Theme color options + helper to apply dynamic primary color
export const THEME_COLORS = [
  { id: "blue", name: "Azul", hex: "#3B82F6", oklch: "0.62 0.20 250" },
  { id: "cyan", name: "Ciano", hex: "#06B6D4", oklch: "0.70 0.14 210" },
  { id: "purple", name: "Roxo", hex: "#8B5CF6", oklch: "0.62 0.20 290" },
  { id: "green", name: "Verde", hex: "#22C55E", oklch: "0.70 0.18 145" },
  { id: "red", name: "Vermelho", hex: "#EF4444", oklch: "0.62 0.22 25" },
  { id: "orange", name: "Laranja", hex: "#F97316", oklch: "0.70 0.18 50" },
  { id: "pink", name: "Rosa", hex: "#EC4899", oklch: "0.66 0.22 0" },
] as const;

export type ThemeColorId = (typeof THEME_COLORS)[number]["id"];

export function applyThemeColor(hex: string) {
  if (typeof document === "undefined") return;
  const found = THEME_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
  const oklch = found?.oklch ?? "0.62 0.20 290";
  document.documentElement.style.setProperty("--primary", `oklch(${oklch})`);
  document.documentElement.style.setProperty("--ring", `oklch(${oklch})`);
}
