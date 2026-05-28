import { createFileRoute, Link } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { useCart } from "@/stores/cart";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { useSettings, buildWaUrl, renderTemplate } from "@/hooks/useSettings";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.subtotal());
  const { data: settings } = useSettings();
  const hasPreorder = items.some((i) => i.purchaseType === "preorder");

  const orderTpl = settings?.whatsapp_order_template ?? "Order request\n{items_summary}\nTotal: KES {total}";
  const summary = items.map((i) => `• ${i.name} x${i.quantity} (${i.purchaseType}) @ ${i.unitPrice.toLocaleString()}`).join("\n");
  const waUrl = buildWaUrl(
    settings?.whatsapp_number ?? "254700000000",
    renderTemplate(orderTpl, { items_summary: summary, total: subtotal.toLocaleString(), order_number: "(pending)", customer_name: "" }),
  );

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl">Your cart is empty</h1>
          <p className="mt-1 text-muted-foreground">Discover great products and add them to your cart.</p>
          <Button asChild className="mt-6"><Link to="/products">Continue shopping</Link></Button>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <h1 className="font-display text-3xl">Your cart</h1>
          {items.map((i) => (
            <div key={`${i.productId}-${i.purchaseType}`} className="flex gap-3 rounded-xl border bg-card p-3">
              {i.imageUrl && <img src={i.imageUrl} alt="" className="size-20 rounded-lg object-cover" />}
              <div className="flex-1">
                <Link to="/products/$slug" params={{ slug: i.slug }} className="font-medium hover:text-primary">{i.name}</Link>
                <div className="text-xs capitalize text-muted-foreground">{i.purchaseType} · {formatKES(i.unitPrice)}/unit</div>
                <div className="mt-2 inline-flex items-center rounded-md border">
                  <button onClick={() => setQty(i.productId, i.purchaseType, i.quantity - 1)} className="p-1.5 hover:bg-muted"><Minus className="size-3.5" /></button>
                  <input type="number" value={i.quantity} onChange={(e) => setQty(i.productId, i.purchaseType, Number(e.target.value || 1))} className="w-12 bg-transparent text-center outline-none" />
                  <button onClick={() => setQty(i.productId, i.purchaseType, i.quantity + 1)} className="p-1.5 hover:bg-muted"><Plus className="size-3.5" /></button>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatKES(i.unitPrice * i.quantity)}</div>
                <button onClick={() => remove(i.productId, i.purchaseType)} className="mt-2 text-xs text-destructive hover:underline inline-flex items-center gap-1"><Trash2 className="size-3" /> Remove</button>
              </div>
            </div>
          ))}
          <Link to="/products" className="inline-block text-sm text-primary hover:underline">← Continue shopping</Link>
        </div>
        <aside className="md:sticky md:top-20 md:self-start">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="font-medium">Order summary</h2>
            <div className="mt-3 flex justify-between text-sm"><span>Subtotal</span><span className="font-semibold">{formatKES(subtotal)}</span></div>
            <div className="mt-1 text-xs text-muted-foreground">Delivery calculated at checkout.</div>
            {hasPreorder && <div className="mt-3 rounded-md bg-accent/10 p-2 text-xs">Includes preorder items — delivery times vary.</div>}
            <Button asChild size="lg" className="mt-4 w-full"><Link to="/checkout">Checkout</Link></Button>
            <div className="my-3 text-center text-xs text-muted-foreground">or</div>
            <WhatsAppButton href={waUrl} className="w-full" label="Order via WhatsApp" />
          </div>
        </aside>
      </div>
    </StoreLayout>
  );
}