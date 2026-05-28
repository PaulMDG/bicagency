import { Link } from "@tanstack/react-router";
import { Home, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import { useCart } from "@/stores/cart";

export function MobileNav() {
  const count = useCart((s) => s.count());
  return (
    <nav className="sticky bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 py-1 backdrop-blur md:hidden">
      <Tab to="/" icon={<Home className="size-5" />} label="Home" />
      <Tab to="/products" icon={<LayoutGrid className="size-5" />} label="Shop" />
      <Tab to="/products" icon={<Search className="size-5" />} label="Search" />
      <Tab to="/cart" icon={<ShoppingCart className="size-5" />} label="Cart" badge={count} />
      <Tab to="/admin/login" icon={<User className="size-5" />} label="Account" />
    </nav>
  );
}
function Tab({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center gap-1 py-1 text-[10px] text-muted-foreground"
      activeProps={{ className: "text-primary" }}
    >
      {icon}
      <span>{label}</span>
      {badge ? (
        <span className="absolute right-3 top-0 inline-flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}