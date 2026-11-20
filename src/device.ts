// Device profile, decided once at load.

/** A phone: touch screen with a small side under 600 px. */
export const PHONE = matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 600;
