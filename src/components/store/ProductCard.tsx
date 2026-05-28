import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/format";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/stores/cart";
import { toast } from "sonner";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_available: boolean;
  preorder_available: boolean;
  retail_stock: number;
  image_url: string | null;
}

export function ProductCard({ p }: { p: ProductCardData }) {
  const add = useCart((s) => s.add);
  const stockLabel =
    p.retail_stock === 0
      ? p.preorder_available
        ? { txt: "Preorder", cls: "bg-accent/15 text-accent-foreground" }
        : { txt: "Out of stock", cls: "bg-destructive/15 text-destructive" }
      : p.retail_stock < 5
        ? { txt: `Low stock (${p.retail_stock})`, cls: "bg-warning/20 text-warning-foreground" }
        : { txt: "In stock", cls: "bg-primary/10 text-primary" };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md">
      <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
        <div className="aspect-square overflow-hidden bg-muted">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              loading="lazy"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-[10px]">Retail</Badge>
          {p.wholesale_available && <Badge variant="secondary" className="text-[10px]">Wholesale</Badge>}
          {p.preorder_available && <Badge variant="secondary" className="text-[10px]">Preorder</Badge>}
        </div>
        <Link to="/products/$slug" params={{ slug: p.slug }} className="line-clamp-2 text-sm font-medium hover:text-primary">
          {p.name}
        </Link>
        <div className="text-base font-semibold">{formatKES(p.retail_price)}</div>
        {p.wholesale_available && p.wholesale_price && (
          <div className="text-xs text-muted-foreground">Wholesale from {formatKES(p.wholesale_price)}</div>
        )}
        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${stockLabel.cls}`}>{stockLabel.txt}</span>
        <Button
          size="sm"
          className="mt-1 w-full"
          disabled={p.retail_stock === 0 && !p.preorder_available}
          onClick={() => {
            add({
              productId: p.id,
              slug: p.slug,
              name: p.name,
              imageUrl: p.image_url,
              purchaseType: p.retail_stock === 0 && p.preorder_available ? "preorder" : "retail",
              unitPrice: p.retail_price,
              quantity: 1,
            });
            toast.success("Added to cart", { description: p.name });
          }}
        >
          <ShoppingBag className="size-4" />
          Add to cart
        </Button>
      </div>
    </div>
  );
}