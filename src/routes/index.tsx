import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { ProductCard, type ProductCardData } from "@/components/store/ProductCard";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings, buildWaUrl } from "@/hooks/useSettings";
import { ShieldCheck, Truck, Sparkles, Smartphone, Package, ShoppingBag, CreditCard } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Blessmarked Shop — Retail, Wholesale & Preorder | Pay with M-Pesa" },
      { name: "description", content: "Shop electronics, fashion and home essentials. Retail, wholesale and preorder pricing. Pay via M-Pesa or order on WhatsApp." },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: settings } = useSettings();
  const wa = buildWaUrl(settings?.whatsapp_number ?? "254700000000", settings?.whatsapp_greeting ?? "Hello!");

  const { data: categories } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name,slug,image_url");
      if (error) throw error;
      return data;
    },
  });

  const { data: featured, isLoading } = useQuery<ProductCardData[]>({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,retail_price,wholesale_price,wholesale_available,preorder_available,retail_stock,product_images(image_url,is_primary,sort_order)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .limit(8);
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        retail_price: Number(p.retail_price),
        wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
        wholesale_available: p.wholesale_available,
        preorder_available: p.preorder_available,
        retail_stock: p.retail_stock,
        image_url: p.product_images?.[0]?.image_url ?? null,
      }));
    },
  });

  return (
    <StoreLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/85 text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" /> Modern Kenyan commerce
            </span>
            <h1 className="mt-4 font-display text-4xl leading-tight md:text-6xl">
              Shop smart. Buy retail, wholesale or preorder.
            </h1>
            <p className="mt-4 max-w-lg text-primary-foreground/85">
              Genuine products from trusted Kenyan sellers. Pay securely with M-Pesa or order via WhatsApp — fast delivery countrywide.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Link to="/products">
                  <ShoppingBag className="size-4" /> Shop now
                </Link>
              </Button>
              <WhatsAppButton href={wa} size="lg" label="Contact on WhatsApp" />
            </div>
          </div>
          <div className="hidden md:block">
            <img
              src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=900"
              alt="Featured shopping"
              className="aspect-[4/3] w-full rounded-2xl object-cover shadow-2xl ring-1 ring-white/10"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-2xl md:text-3xl">Shop by category</h2>
          <Link to="/products" className="text-sm text-primary hover:underline">All products →</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(categories ?? []).map((c) => (
            <Link
              key={c.id}
              to="/category/$slug"
              params={{ slug: c.slug }}
              className="group min-w-[180px] overflow-hidden rounded-xl border bg-card transition hover:-translate-y-0.5 hover:shadow"
            >
              <div className="aspect-[4/3] overflow-hidden bg-muted">
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="size-full object-cover transition-transform group-hover:scale-105" />
                )}
              </div>
              <div className="p-3 text-sm font-medium">{c.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="mx-auto max-w-7xl px-4 py-8">
        <h2 className="mb-4 font-display text-2xl md:text-3xl">Featured products</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
            : (featured ?? []).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-12">
        <h2 className="text-center font-display text-2xl md:text-3xl">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { icon: <ShoppingBag />, t: "1. Browse", d: "Pick from thousands of products across categories." },
            { icon: <Package />, t: "2. Add to cart", d: "Choose retail, wholesale or preorder pricing." },
            { icon: <CreditCard />, t: "3. Pay", d: "Securely via M-Pesa STK push or order on WhatsApp." },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border bg-card p-6">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{s.icon}</div>
              <div className="mt-3 font-semibold">{s.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Purchase types */}
      <section className="bg-card py-12">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center font-display text-2xl md:text-3xl">Retail · Wholesale · Preorder</h2>
          <p className="mt-2 text-center text-muted-foreground">Flexible buying for every customer.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { t: "Retail", d: "Buy single units at our everyday low prices, in-stock and ready to ship.", c: "bg-primary/5 border-primary/20" },
              { t: "Wholesale", d: "Order at minimum quantities to unlock wholesale pricing for businesses.", c: "bg-accent/5 border-accent/20" },
              { t: "Preorder", d: "Lock in upcoming stock at preorder pricing — delivered within estimated days.", c: "bg-mpesa/5 border-mpesa/20" },
            ].map((x) => (
              <div key={x.t} className={`rounded-xl border p-6 ${x.c}`}>
                <div className="font-display text-xl">{x.t}</div>
                <p className="mt-2 text-sm text-muted-foreground">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { i: <ShieldCheck />, t: "Secure payments" },
            { i: <Smartphone />, t: "M-Pesa accepted" },
            { i: <Truck />, t: "Fast delivery" },
            { i: <Sparkles />, t: "Genuine products" },
          ].map((b) => (
            <div key={b.t} className="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm font-medium">
              <div className="text-primary">{b.i}</div>
              {b.t}
            </div>
          ))}
        </div>
      </section>

      {/* WhatsApp CTA banner */}
      <section className="mx-auto my-10 max-w-7xl px-4">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-whatsapp/10 p-8 md:flex-row">
          <div>
            <div className="font-display text-2xl">Need help choosing?</div>
            <p className="text-sm text-muted-foreground">Chat with us on WhatsApp for fast, friendly support.</p>
          </div>
          <WhatsAppButton href={wa} size="lg" label="Chat on WhatsApp" />
        </div>
      </section>
    </StoreLayout>
  );
}
