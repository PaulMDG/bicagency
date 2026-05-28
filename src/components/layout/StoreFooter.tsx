import { useSettings } from "@/hooks/useSettings";
import { Link } from "@tanstack/react-router";

export function StoreFooter() {
  const { data: settings } = useSettings();
  const s = settings ?? {};
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-xl text-primary">{s.store_name ?? "Sokoni KE"}</div>
          <p className="mt-2 text-sm text-muted-foreground">{s.store_tagline}</p>
          <p className="mt-3 text-xs text-muted-foreground">{s.physical_address}</p>
        </div>
        <div>
          <div className="text-sm font-medium">Shop</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products" className="hover:text-primary">All products</Link></li>
            <li><Link to="/cart" className="hover:text-primary">Cart</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium">Contact</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>{s.contact_phone}</li>
            <li>{s.contact_email}</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium">We accept</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-mpesa/15 px-2 py-1 font-semibold text-mpesa">M-PESA</span>
            <span className="rounded-md bg-whatsapp/15 px-2 py-1 font-semibold text-whatsapp">WhatsApp Order</span>
          </div>
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {s.store_name ?? "Sokoni KE"}. All rights reserved.
      </div>
    </footer>
  );
}