import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { computePricing, type PurchaseType } from "@/lib/pricing";
import { formatKES } from "@/lib/format";
import { Minus, Plus, ShoppingBag, AlertTriangle, Info, Package } from "lucide-react";
import { useCart } from "@/stores/cart";
import { toast } from "sonner";
import { useSettings, buildWaUrl, renderTemplate } from "@/hooks/useSettings";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SocialShareButtons } from "@/components/store/SocialShareButtons";

export const Route = createFileRoute("/products/$slug")({
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const add = useCart((s) => s.add);
  const { data: settings } = useSettings();

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name,slug), product_images(id,image_url,sort_order,is_primary)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [qty, setQty] = useState(1);
  const [type, setType] = useState<PurchaseType>("retail");
  const [activeImg, setActiveImg] = useState(0);

  const availableTypes = useMemo(() => {
    const list: PurchaseType[] = ["retail"];
    if (product?.wholesale_available) list.push("wholesale");
    if (product?.preorder_available) list.push("preorder");
    return list;
  }, [product]);

  const pricing = useMemo(() => {
    if (!product) return null;
    return computePricing(product as any, qty, type);
  }, [product, qty, type]);

  if (isLoading) return <StoreLayout><div className="p-12 text-center text-muted-foreground">Loading…</div></StoreLayout>;
  if (!product) return <StoreLayout><div className="p-12 text-center">Product not found.</div></StoreLayout>;

  const images = (product.product_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
  const primary = images[activeImg]?.image_url;
  const waNumber = settings?.whatsapp_number ?? "254700000000";
  const productUrl = typeof window !== "undefined" ? `${window.location.origin}/products/${product.slug}` : `/products/${product.slug}`;
  const inqTpl = settings?.whatsapp_inquiry_template ?? "Hi, I'm interested in *{product_name}* — Qty: {quantity} ({purchase_type}) at KES {price}.\n{product_url}";
  const waUrl = buildWaUrl(
    waNumber,
    renderTemplate(inqTpl, { product_name: product.name, quantity: qty, purchase_type: type, price: (pricing?.unitPrice ?? 0).toLocaleString(), product_url: productUrl }),
  );

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 pb-32 md:pb-8">
        <nav className="mb-4 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">Home</Link>
          {" / "}
          {product.categories && (
            <>
              <Link to="/category/$slug" params={{ slug: product.categories.slug }} className="hover:text-primary">
                {product.categories.name}
              </Link>
              {" / "}
            </>
          )}
          <span className="text-foreground">{product.name}</span>
        </nav>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <div className="aspect-square overflow-hidden rounded-2xl bg-muted">
              {primary && <img src={primary} alt={product.name} className="size-full object-cover" />}
            </div>
            {images.length > 1 && (
              <div className="mt-3 grid grid-cols-5 gap-2">
                {images.map((img: any, i: number) => (
                  <button key={img.id} onClick={() => setActiveImg(i)} className={`aspect-square overflow-hidden rounded-md border ${i === activeImg ? "ring-2 ring-primary" : ""}`}>
                    <img src={img.image_url} alt="" className="size-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <h1 className="font-display text-3xl md:text-4xl">{product.name}</h1>
            <div className="mt-1 font-mono text-xs text-muted-foreground">SKU: {product.sku}</div>

            {product.preorder_available && type === "preorder" && (
              <div className="mt-4 rounded-lg border border-accent/30 bg-accent/10 p-3 text-sm">
                📦 <span className="font-semibold">This is a PREORDER item.</span> Estimated delivery: {product.estimated_delivery_days ?? "—"} days.
              </div>
            )}

            <div className="mt-5">
              <div className="text-sm font-medium">Purchase type</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {availableTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-full border px-4 py-2 text-sm capitalize transition ${type === t ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50"}`}
                  >
                    {t}
                    {t === "wholesale" && <span className="ml-1 text-xs opacity-70">(MOQ {product.wholesale_moq})</span>}
                    {t === "preorder" && <span className="ml-1 text-xs opacity-70">(MOQ {product.preorder_moq})</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-end gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Unit price</div>
                <div className="font-display text-3xl text-primary">{formatKES(pricing?.unitPrice ?? 0)}</div>
              </div>
              <div className="ml-auto">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Line total</div>
                <div className="text-xl font-semibold">{formatKES(pricing?.lineTotal ?? 0)}</div>
              </div>
            </div>

            {pricing?.warning && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/15 p-3 text-sm">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
                <div>{pricing.warning}</div>
              </div>
            )}
            {pricing?.error && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div>{pricing.error}</div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-3">
              <div className="inline-flex items-center rounded-lg border">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2 hover:bg-muted"><Minus className="size-4" /></button>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value || 1)))} className="w-14 bg-transparent text-center outline-none" />
                <button onClick={() => setQty((q) => q + 1)} className="p-2 hover:bg-muted"><Plus className="size-4" /></button>
              </div>
              <Button
                size="lg"
                className="flex-1"
                disabled={!!pricing?.blocked}
                onClick={() => {
                  if (!pricing) return;
                  add({
                    productId: product.id, slug: product.slug, name: product.name,
                    imageUrl: primary ?? null, purchaseType: pricing.effectiveType,
                    unitPrice: pricing.unitPrice, quantity: qty,
                    estimatedDeliveryDays: product.estimated_delivery_days,
                  });
                  toast.success("Added to cart");
                }}
              >
                <ShoppingBag className="size-4" /> Add to cart
              </Button>
            </div>
            <WhatsAppButton href={waUrl} className="mt-3 w-full" label="Inquire on WhatsApp" />

            <div className="mt-6 border-t pt-4">
              <div className="mb-2 text-sm font-medium">Share this product</div>
              <SocialShareButtons url={productUrl} title={product.name} />
            </div>

            <div className="mt-8">
              <h3 className="font-medium">Description</h3>
              <p className="mt-2 text-sm text-muted-foreground">{product.description}</p>
            </div>

            <Accordion type="single" collapsible className="mt-6">
              <AccordionItem value="delivery">
                <AccordionTrigger>Delivery & returns</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {settings?.delivery_notes ?? "Fast delivery countrywide. Returns accepted within 7 days for defective items."}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* Sticky mobile add-to-cart bar */}
        <div className="fixed inset-x-0 bottom-14 z-30 border-t bg-background/95 p-3 backdrop-blur md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-semibold">{formatKES(pricing?.lineTotal ?? 0)}</div>
            </div>
            <Button
              size="lg"
              disabled={!!pricing?.blocked}
              onClick={() => {
                if (!pricing) return;
                add({
                  productId: product.id, slug: product.slug, name: product.name,
                  imageUrl: primary ?? null, purchaseType: pricing.effectiveType,
                  unitPrice: pricing.unitPrice, quantity: qty,
                });
                toast.success("Added to cart");
              }}
            >
              <ShoppingBag className="size-4" /> Add to cart
            </Button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}