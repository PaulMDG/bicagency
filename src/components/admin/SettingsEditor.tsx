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
