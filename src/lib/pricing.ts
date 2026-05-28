export type PurchaseType = "retail" | "wholesale" | "preorder";

export interface PricingProduct {
  retail_price: number | string;
  wholesale_price: number | string | null;
  preorder_price: number | string | null;
  wholesale_available: boolean;
  preorder_available: boolean;
  wholesale_moq: number;
  preorder_moq: number;
  preorder_fallback: string; // 'retail' | 'block'
  retail_stock: number;
}

export interface PricingResult {
  unitPrice: number;
  effectiveType: PurchaseType;
  warning: string | null;
  error: string | null;
  blocked: boolean;
  lineTotal: number;
}

const n = (v: number | string | null | undefined) =>
  v == null ? 0 : typeof v === "string" ? Number(v) : v;

export function computePricing(
  product: PricingProduct,
  quantity: number,
  purchaseType: PurchaseType,
): PricingResult {
  const qty = Math.max(1, Math.floor(quantity || 1));
  const retail = n(product.retail_price);

  if (purchaseType === "retail") {
    return {
      unitPrice: retail,
      effectiveType: "retail",
      warning: null,
      error: null,
      blocked: false,
      lineTotal: retail * qty,
    };
  }

  if (purchaseType === "wholesale") {
    if (product.wholesale_available && qty >= product.wholesale_moq && product.wholesale_price != null) {
      const p = n(product.wholesale_price);
      return { unitPrice: p, effectiveType: "wholesale", warning: null, error: null, blocked: false, lineTotal: p * qty };
    }
    return {
      unitPrice: retail,
      effectiveType: "retail",
      warning: `Minimum order for wholesale is ${product.wholesale_moq} units. Retail pricing applied.`,
      error: null,
      blocked: false,
      lineTotal: retail * qty,
    };
  }

  // preorder
  if (product.preorder_available && qty >= product.preorder_moq && product.preorder_price != null) {
    const p = n(product.preorder_price);
    return { unitPrice: p, effectiveType: "preorder", warning: null, error: null, blocked: false, lineTotal: p * qty };
  }
  if (product.preorder_fallback === "block") {
    return {
      unitPrice: n(product.preorder_price ?? retail),
      effectiveType: "preorder",
      warning: null,
      error: `Minimum preorder quantity is ${product.preorder_moq} units. Please increase your quantity.`,
      blocked: true,
      lineTotal: 0,
    };
  }
  return {
    unitPrice: retail,
    effectiveType: "retail",
    warning: `Minimum preorder quantity is ${product.preorder_moq} units. Retail pricing applied.`,
    error: null,
    blocked: false,
    lineTotal: retail * qty,
  };
}