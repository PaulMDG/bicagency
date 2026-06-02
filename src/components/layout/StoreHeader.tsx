import { Link } from "@tanstack/react-router";
import { ShoppingCart, Search } from "lucide-react";
import { useCart } from "@/stores/cart";
import { useSettings, buildWaUrl } from "@/hooks/useSettings";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";

export function StoreHeader() {
  const count = useCart((s) => s.count());
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp_number ?? "254700000000";
  const greeting = settings?.whatsapp_greeting ?? "Hello!";
  const storeName = settings?.store_name ?? "Sokoni KE";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
        <Link to="/" className="font-display text-xl tracking-tight text-primary md:text-2xl">
          {storeName}
        </Link>
        <nav className="ml-2 hidden gap-5 text-sm md:flex">
          <Link to="/" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>Home</Link>
          <Link to="/products" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>Shop</Link>
          <Link to="/blog" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>Blog</Link>
          <Link to="/about" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>About</Link>
          <Link to="/track" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>Track order</Link>
        </nav>
        <div className="ml-auto hidden flex-1 max-w-sm md:block">
          <form action="/products" className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              placeholder="Search products"
              className="w-full rounded-full border bg-muted/50 py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-background"
            />
          </form>
        </div>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <WhatsAppButton
            href={buildWaUrl(waNumber, greeting)}
            size="sm"
            label="WhatsApp"
            className="hidden sm:inline-flex"
          />
          <Link
            to="/cart"
            className="relative inline-flex size-10 items-center justify-center rounded-full border hover:bg-muted"
            aria-label="Cart"
          >
            <ShoppingCart className="size-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}