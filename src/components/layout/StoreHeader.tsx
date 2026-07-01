import { Link } from "@tanstack/react-router";
import { ShoppingCart, Search, ChevronDown } from "lucide-react";
import { useCart } from "@/stores/cart";
import { useSettings, buildWaUrl } from "@/hooks/useSettings";
import { WhatsAppButton } from "@/components/store/WhatsAppButton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Category = { id: string; name: string; slug: string; image_url: string | null };
type Subcategory = { id: string; name: string; slug: string; category_id: string };

function useCategoryTree() {
  return useQuery({
    queryKey: ["nav-category-tree"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [cats, subs] = await Promise.all([
        supabase.from("categories").select("id,name,slug,image_url").order("sort_order").order("name"),
        supabase.from("subcategories").select("id,name,slug,category_id").order("sort_order").order("name"),
      ]);
      return {
        categories: (cats.data ?? []) as Category[],
        subcategories: (subs.data ?? []) as Subcategory[],
      };
    },
  });
}

function CategoriesMegaMenu() {
  const { data } = useCategoryTree();
  const categories = data?.categories ?? [];
  const subcategories = data?.subcategories ?? [];
  if (categories.length === 0) return null;
  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-sm hover:text-primary"
        aria-haspopup="true"
      >
        Categories <ChevronDown className="size-3.5 transition group-hover:rotate-180" />
      </button>
      <div className="invisible absolute left-1/2 top-full z-50 w-[min(90vw,760px)] -translate-x-1/2 pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-xl border bg-popover p-5 text-popover-foreground shadow-lg">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
            {categories.map((c) => {
              const mySubs = subcategories.filter((s) => s.category_id === c.id);
              return (
                <div key={c.id} className="min-w-0">
                  <Link
                    to="/category/$slug"
                    params={{ slug: c.slug }}
                    className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {c.image_url && <img src={c.image_url} alt="" className="size-6 rounded object-cover" />}
                    <span className="truncate">{c.name}</span>
                  </Link>
                  {mySubs.length > 0 && (
                    <ul className="space-y-1">
                      {mySubs.slice(0, 6).map((s) => (
                        <li key={s.id}>
                          <Link
                            to="/products"
                            search={{ subcategory: s.slug } as never}
                            className="block truncate text-xs text-muted-foreground hover:text-primary"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t pt-3 text-right">
            <Link to="/products" className="text-xs font-medium text-primary hover:underline">
              Browse all products →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StoreHeader() {
  const count = useCart((s) => s.count());
  const { data: settings } = useSettings();
  const waNumber = settings?.whatsapp_number ?? "254700000000";
  const greeting = settings?.whatsapp_greeting ?? "Hello!";
  const storeName = settings?.store_name ?? "Blessmarked Shop";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-6">
        <Link to="/" className="font-display text-xl tracking-tight text-primary md:text-2xl">
          {storeName}
        </Link>
        <nav className="ml-2 hidden gap-5 text-sm md:flex">
          <Link to="/" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>Home</Link>
          <Link to="/products" className="hover:text-primary" activeProps={{ className: "text-primary font-medium" }}>Shop</Link>
          <CategoriesMegaMenu />
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