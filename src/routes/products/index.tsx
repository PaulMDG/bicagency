import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { ProductCard, type ProductCardData } from "@/components/store/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

const PAGE_SIZE = 12;

export const Route = createFileRoute("/products/")({
  validateSearch: (s: Record<string, unknown>) => ({
    q: typeof s.q === "string" ? s.q : "",
    sort: typeof s.sort === "string" ? s.sort : "newest",
    cat: typeof s.cat === "string" ? s.cat : "",
    type: typeof s.type === "string" ? s.type : "all",
    stock: typeof s.stock === "string" ? s.stock : "all",
    min: typeof s.min === "string" ? s.min : "",
    max: typeof s.max === "string" ? s.max : "",
    page: typeof s.page === "number" ? s.page : Number(s.page) || 1,
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { q, sort, cat, type, stock, min, max, page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setSearch = (patch: Record<string, unknown>) =>
    navigate({ search: (s: any) => ({ ...s, ...patch, page: patch.page ?? 1 }), replace: true });

  const { data: categories } = useQuery({
    queryKey: ["all-categories"],
    queryFn: async () => (await supabase.from("categories").select("id,name,slug")).data ?? [],
  });

  const { data: result, isLoading } = useQuery<{ rows: ProductCardData[]; count: number }>({
    queryKey: ["products", q, sort, cat, type, stock, min, max, page],
    queryFn: async () => {
      let qb = supabase
        .from("products")
        .select(
          "id,name,slug,retail_price,wholesale_price,wholesale_available,preorder_available,retail_stock,category_id,product_images(image_url,is_primary,sort_order)",
          { count: "exact" },
        )
        .eq("is_active", true);
      if (q) qb = qb.ilike("name", `%${q}%`);
      if (cat) {
        const catId = (await supabase.from("categories").select("id").eq("slug", cat).maybeSingle()).data?.id;
        if (catId) qb = qb.eq("category_id", catId);
      }
      if (type === "wholesale") qb = qb.eq("wholesale_available", true);
      else if (type === "preorder") qb = qb.eq("preorder_available", true);
      if (stock === "in") qb = qb.gt("retail_stock", 0);
      else if (stock === "out") qb = qb.eq("retail_stock", 0);
      if (min) qb = qb.gte("retail_price", Number(min));
      if (max) qb = qb.lte("retail_price", Number(max));
      if (sort === "price-asc") qb = qb.order("retail_price", { ascending: true });
      else if (sort === "price-desc") qb = qb.order("retail_price", { ascending: false });
      else if (sort === "featured") qb = qb.order("is_featured", { ascending: false });
      else qb = qb.order("created_at", { ascending: false });
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await qb.range(from, to);
      if (error) throw error;
      const rows = (data ?? []).map((p: any) => ({
        id: p.id, name: p.name, slug: p.slug,
        retail_price: Number(p.retail_price),
        wholesale_price: p.wholesale_price ? Number(p.wholesale_price) : null,
        wholesale_available: p.wholesale_available,
        preorder_available: p.preorder_available,
        retail_stock: p.retail_stock,
        image_url: p.product_images?.[0]?.image_url ?? null,
      }));
      return { rows, count: count ?? 0 };
    },
  });

  const products = result?.rows;
  const total = result?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <StoreLayout>
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">All products</h1>
            <p className="text-sm text-muted-foreground">{total} products</p>
          </div>
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setSearch({ q: e.target.value })}
                placeholder="Search products"
                className="pl-9"
              />
            </div>
            <Select value={sort} onValueChange={(v) => setSearch({ sort: v })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="price-asc">Price: Low → High</SelectItem>
                <SelectItem value="price-desc">Price: High → Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-[220px_1fr]">
          <aside className="space-y-6 md:sticky md:top-20 md:self-start">
            <div>
              <div className="mb-2 text-sm font-medium">Category</div>
              <div className="space-y-1 text-sm">
                <button onClick={() => setSearch({ cat: "" })} className={`block w-full text-left hover:text-primary ${!cat ? "text-primary font-medium" : ""}`}>All categories</button>
                {(categories ?? []).map((c) => (
                  <button key={c.id} onClick={() => setSearch({ cat: c.slug })} className={`block w-full text-left hover:text-primary ${cat === c.slug ? "text-primary font-medium" : ""}`}>{c.name}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Purchase type</div>
              <Select value={type} onValueChange={(v) => setSearch({ type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="preorder">Preorder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Stock</div>
              <div className="space-y-2 text-sm">
                <label className="flex items-center gap-2"><Checkbox checked={stock === "in"} onCheckedChange={(v) => setSearch({ stock: v ? "in" : "all" })} /> In stock</label>
                <label className="flex items-center gap-2"><Checkbox checked={stock === "out"} onCheckedChange={(v) => setSearch({ stock: v ? "out" : "all" })} /> Out of stock / preorder</label>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium">Price (KES)</div>
              <div className="flex items-center gap-2 text-sm">
                <Input type="number" inputMode="numeric" placeholder="Min" value={min} onChange={(e) => setSearch({ min: e.target.value })} className="h-9" />
                <span className="text-muted-foreground">–</span>
                <Input type="number" inputMode="numeric" placeholder="Max" value={max} onChange={(e) => setSearch({ max: e.target.value })} className="h-9" />
              </div>
            </div>
            <div>
              <Button variant="ghost" size="sm" onClick={() => navigate({ search: { q: "", sort: "newest", cat: "", type: "all", stock: "all", min: "", max: "", page: 1 } as any, replace: true })}>
                Reset filters
              </Button>
            </div>
          </aside>
          <div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)
                : (products ?? []).map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
            {!isLoading && products?.length === 0 && (
              <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">No products match your filters.</div>
            )}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setSearch({ page: page - 1 })}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setSearch({ page: page + 1 })}>Next</Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}