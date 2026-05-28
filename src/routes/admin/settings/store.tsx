import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/store")({
  component: () => <SettingsEditor group="store" title="Store settings" fields={[
    { key: "store_name", label: "Store name" },
    { key: "store_tagline", label: "Tagline" },
    { key: "contact_phone", label: "Contact phone" },
    { key: "contact_email", label: "Contact email" },
    { key: "physical_address", label: "Address" },
    { key: "delivery_notes", label: "Delivery notes", textarea: true },
    { key: "currency", label: "Currency" },
    { key: "social_facebook", label: "Facebook URL" },
    { key: "social_instagram", label: "Instagram URL" },
    { key: "social_tiktok", label: "TikTok URL" },
  ]} />,
});
*** Add File: src/routes/admin/settings/mpesa.tsx
import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/mpesa")({
  component: () => <SettingsEditor group="mpesa" title="M-Pesa settings" fields={[
    { key: "mpesa_environment", label: "Environment (sandbox/live)" },
    { key: "mpesa_consumer_key", label: "Consumer Key", mask: true },
    { key: "mpesa_consumer_secret", label: "Consumer Secret", mask: true },
    { key: "mpesa_shortcode", label: "Business Shortcode" },
    { key: "mpesa_passkey", label: "Passkey", mask: true },
  ]} note={`Callback URL: ${typeof window !== "undefined" ? window.location.origin : ""}/functions/v1/mpesa-callback`} />,
});
*** Add File: src/routes/admin/settings/whatsapp.tsx
import { createFileRoute } from "@tanstack/react-router";
import { SettingsEditor } from "@/components/admin/SettingsEditor";
export const Route = createFileRoute("/admin/settings/whatsapp")({
  component: () => <SettingsEditor group="whatsapp" title="WhatsApp settings" fields={[
    { key: "whatsapp_number", label: "Admin WhatsApp number (2547XXXXXXXX)" },
    { key: "whatsapp_greeting", label: "Default greeting", textarea: true },
    { key: "whatsapp_inquiry_template", label: "Product inquiry template (vars: {product_name},{quantity},{purchase_type},{price})", textarea: true },
    { key: "whatsapp_order_template", label: "Checkout order template (vars: {order_number},{items_summary},{total},{customer_name})", textarea: true },
  ]} />,
});
*** Add File: src/components/admin/SettingsEditor.tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Field { key: string; label: string; textarea?: boolean; mask?: boolean }

export function SettingsEditor({ title, group, fields, note }: { title: string; group: string; fields: Field[]; note?: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings-group", group],
    queryFn: async () => (await supabase.from("settings").select("key,value").eq("group", group)).data ?? [],
  });
  const [vals, setVals] = useState<Record<string, string>>({});
  useEffect(() => {
    if (data) {
      const m: Record<string, string> = {};
      data.forEach((r: any) => { m[r.key] = r.value ?? ""; });
      setVals(m);
    }
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    for (const f of fields) {
      const { error } = await supabase.from("settings").update({ value: vals[f.key] ?? "" }).eq("key", f.key);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["settings-group", group] });
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-2xl">{title}</h1>
      {note && <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">{note}</div>}
      <div className="space-y-3 rounded-xl border bg-card p-5">
        {fields.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <div className="mt-1">
              {f.textarea
                ? <Textarea rows={3} value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                : <Input type={f.mask ? "password" : "text"} value={vals[f.key] ?? ""} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />}
            </div>
          </div>
        ))}
      </div>
      <Button type="submit">Save</Button>
    </form>
  );
}