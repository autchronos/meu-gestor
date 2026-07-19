export function ehIOS(userAgent: string): boolean {
  return /iphone|ipad|ipod/i.test(userAgent);
}

export function estaEmModoStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const porMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return porMedia || iosStandalone;
}
