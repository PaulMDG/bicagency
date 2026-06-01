import { useState } from "react";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/storage";
import { Upload, X, Star } from "lucide-react";
import { toast } from "sonner";

export interface ProductImage { image_url: string; is_primary: boolean; sort_order: number; }

export function MultiImageUploader({ value, onChange }: { value: ProductImage[]; onChange: (imgs: ProductImage[]) => void }) {
  const [busy, setBusy] = useState(false);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setBusy(true);
    try {
      const next = [...value];
      for (const f of files) {
        const url = await uploadImage({ bucket: "product-images", file: f, maxWidth: 1600 });
        next.push({ image_url: url, is_primary: next.length === 0, sort_order: next.length });
      }
      onChange(next);
      toast.success(`${files.length} image(s) uploaded`);
    } catch (err: any) { toast.error(err.message ?? "Upload failed"); }
    finally { setBusy(false); e.target.value = ""; }
  }

  function remove(i: number) {
    const next = value.filter((_, idx) => idx !== i).map((img, idx) => ({ ...img, sort_order: idx }));
    if (next.length && !next.some((x) => x.is_primary)) next[0].is_primary = true;
    onChange(next);
  }
  function setPrimary(i: number) {
    onChange(value.map((img, idx) => ({ ...img, is_primary: idx === i })));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((img, i) => (
          <div key={i} className="relative">
            <img src={img.image_url} alt="" className={`size-24 rounded-md border object-cover ${img.is_primary ? "ring-2 ring-primary" : ""}`} />
            <button type="button" onClick={() => remove(i)} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="size-3" /></button>
            {!img.is_primary && (
              <button type="button" onClick={() => setPrimary(i)} className="absolute -left-2 -top-2 rounded-full bg-card p-1 text-muted-foreground hover:text-primary" title="Make primary"><Star className="size-3" /></button>
            )}
            {img.is_primary && <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[9px] font-medium text-primary-foreground">Primary</span>}
          </div>
        ))}
      </div>
      <label>
        <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
          <span><Upload className="size-4" /> {busy ? "Uploading…" : "Add images"}</span>
        </Button>
        <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
      </label>
    </div>
  );
}