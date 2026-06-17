import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { sanitizeHtml } from "@/lib/safe-html";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings/about")({ component: AboutSettings });

function AboutSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["settings-group", "about"],
    queryFn: async () => (await supabase.from("settings").select("key,value").eq("group", "about")).data ?? [],
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
    const updates = {
      about_hero_title: vals.about_hero_title ?? "",
      about_hero_subtitle: vals.about_hero_subtitle ?? "",
      about_body_html: sanitizeHtml(vals.about_body_html ?? ""),
    };
    for (const [k, v] of Object.entries(updates)) {
      const { error } = await supabase.from("settings").update({ value: v }).eq("key", k);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["settings"] });
    qc.invalidateQueries({ queryKey: ["settings-group", "about"] });
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-display text-2xl">About page</h1>
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div><Label>Hero title</Label><Input className="mt-1" value={vals.about_hero_title ?? ""} onChange={(e) => setVals({ ...vals, about_hero_title: e.target.value })} /></div>
        <div><Label>Hero subtitle</Label><Input className="mt-1" value={vals.about_hero_subtitle ?? ""} onChange={(e) => setVals({ ...vals, about_hero_subtitle: e.target.value })} /></div>
        <div>
          <Label>Page body</Label>
          <div className="mt-1">
            <RichTextEditor value={vals.about_body_html ?? ""} onChange={(html) => setVals({ ...vals, about_body_html: html })} />
          </div>
        </div>
      </div>
      <Button type="submit">Save</Button>
    </form>
  );
}