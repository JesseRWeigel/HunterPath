export const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
export const uid = () => Math.random().toString(36).slice(2, 9);
export const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));
export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
