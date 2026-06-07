import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link2 } from "lucide-react";

export function ProductLinkInserter({ onInsert }: { onInsert: (snippet: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data: products } = useQuery({
    queryKey: ["link-products", q],
    queryFn: async () => {
      let qb = supabase.from("products").select("id,name,slug").eq("is_active", true).order("name").limit(25);
      if (q) qb = qb.ilike("name", `%${q}%`);
      return (await qb).data ?? [];
    },
    enabled: open,
  });
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm"><Link2 className="size-3.5" /> Insert product link</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="h-8" />
        <div className="mt-2 max-h-64 space-y-1 overflow-auto">
          {(products ?? []).map((p: any) => (
            <button
              key={p.id}
              type="button"
              onClick={() => { onInsert(`<a href="/products/${p.slug}">${p.name}</a>`); setOpen(false); }}
              className="block w-full truncate rounded px-2 py-1 text-left text-sm hover:bg-muted"
            >{p.name}</button>
          ))}
          {!products?.length && <div className="p-2 text-xs text-muted-foreground">No products found.</div>}
        </div>
      </PopoverContent>
    </Popover>
  );
}