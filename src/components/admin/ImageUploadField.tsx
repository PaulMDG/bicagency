import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage } from "@/lib/storage";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  bucket: "product-images" | "blog-images" | "category-images";
  value: string;
  onChange: (url: string) => void;
  maxWidth?: number;
  label?: string;
}

export function ImageUploadField({ bucket, value, onChange, maxWidth, label }: Props) {
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true);
    try { const url = await uploadImage({ bucket, file, maxWidth }); onChange(url); toast.success("Uploaded"); }
    catch (err: any) { toast.error(err.message ?? "Upload failed"); }
    finally { setBusy(false); e.target.value = ""; }
  }
  return (
    <div className="space-y-2">
      {value && (
        <div className="relative inline-block">
          <img src={value} alt="" className="size-32 rounded-md border object-cover" />
          <button type="button" onClick={() => onChange("")} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground">
            <X className="size-3" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <label className="inline-flex">
          <Button type="button" variant="outline" size="sm" disabled={busy} asChild>
            <span><Upload className="size-4" /> {busy ? "Uploading…" : label ?? "Upload image"}</span>
          </Button>
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        <Input placeholder="or paste image URL" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
      </div>
    </div>
  );
}