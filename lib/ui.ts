/**
 * Shared UI class tokens. Single source of truth for buttons, inputs,
 * focus rings, and press feedback so identical controls never drift.
 */

/** Standard keyboard-focus ring used by every interactive element. */
export const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

/** Press feedback for tappable elements (normalize to one scale). */
export const pressFeedback = "transition duration-200 active:scale-[0.97]";

/** Disabled state for any interactive control. */
export const disabledState =
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40";

/** Base for large rectangular CTAs (hero, detail page actions). */
const ctaBase = `inline-flex items-center justify-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition duration-200 active:scale-[0.97] ${focusRing} ${disabledState}`;

/** Primary call-to-action: solid white on dark surfaces. */
export const ctaPrimary = `${ctaBase} bg-white text-zinc-950 hover:bg-white/80`;

/** Secondary call-to-action: bordered zinc chip next to a primary CTA. */
export const ctaSecondary = `${ctaBase} border border-white/15 bg-zinc-800/60 text-zinc-100 hover:border-white/30 hover:bg-zinc-700/60 hover:text-white`;

/** Small pill chip button (chapter "Read", filter actions). */
export const chipButton = `inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-zinc-800/60 px-3.5 py-1.5 text-xs font-semibold text-zinc-200 transition-colors duration-200 hover:border-red-400/40 hover:bg-zinc-700/60 hover:text-white ${focusRing}`;

/** Text input treatment shared by search/filter/jump fields. */
export const inputField =
  "rounded-lg border border-white/10 bg-zinc-900/60 text-sm text-zinc-100 outline-none transition-colors duration-200 placeholder:text-zinc-500 focus:border-red-400/50";

/** Select treatment matching inputField (pill variant). */
export const selectField =
  "appearance-none rounded-full border border-white/10 bg-zinc-900/60 text-sm font-medium text-zinc-200 outline-none backdrop-blur-xl transition-colors duration-200 hover:border-white/25 focus:border-red-400/50";

/** Hero fallback gradient shared by server + client hero renderers. */
export const HERO_FALLBACK_GRADIENT =
  "radial-gradient(circle at 30% 20%, #27272a 0%, #09090b 60%)";

/** Glass chrome pill recipe (header, reader rails, floating buttons). */
export const glassChromeShadow =
  "shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)]";

/** Raised popover/dropdown surface recipe. */
export const popoverSurface =
  "glass-in rounded-[2rem] border border-white/10 bg-zinc-950/95 shadow-[0_24px_60px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-inset ring-white/10 backdrop-blur-2xl";
