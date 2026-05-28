export const formatKES = (amount: number | string | null | undefined): string => {
  const n = typeof amount === "string" ? Number(amount) : (amount ?? 0);
  if (Number.isNaN(n)) return "KES 0";
  return `KES ${n.toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;
};

export const normalizeKenyanPhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^0[17]\d{8}$/.test(digits)) return "254" + digits.slice(1);
  if (/^[17]\d{8}$/.test(digits)) return "254" + digits;
  return null;
};

export const isValidKenyanPhone = (raw: string): boolean =>
  normalizeKenyanPhone(raw) !== null;

export const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");