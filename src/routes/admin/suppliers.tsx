import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/suppliers")({ component: Suppliers });

type Supplier = {
  id?: string; name: string; contact_name: string; phone: string;
  email: string; address: string; notes: string; is_active: boolean;
};
const empty: Supplier = { name: "", contact_name: "", phone: "", email: "", address: "", notes: "", is_active: true };

function Suppliers() {
  const qc = useQueryClient();
  const { data: suppliers } = useQuery({
    queryKey: ["adm-suppliers"],
    queryFn: async () => (await supabase.from("suppliers").select("*").order("name")).data ?? [],
  });
  const [editing, setEditing] = useState<Supplier | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { id, ...rest } = editing;
    const op = id
      ? supabase.from("suppliers").update(rest).eq("id", id)
      : supabase.from("suppliers").insert(rest);
    const { error } = await op;
    if (error) toast.error(error.message);
    else { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["adm-suppliers"] }); }
  }
  async function del(id: string) {
    if (!confirm("Delete supplier?")) return;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) toast.error(error.message); else qc.invalidateQueries({ queryKey: ["adm-suppliers"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">Suppliers</h1>
        <Button size="sm" onClick={() => setEditing({ ...empty })}><Plus className="size-4" /> New</Button>
      </div>

      {editing && (
        <form onSubmit={save} className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between"><h2 className="font-medium">{editing.id ? "Edit" : "New"} supplier</h2><button type="button" onClick={() => setEditing(null)}><X className="size-4" /></button></div>
          <div className="grid gap-3 md:grid-cols-2">
            <div><Label>Name</Label><Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required /></div>
            <div><Label>Contact person</Label><Input value={editing.contact_name} onChange={(e) => setEditing({ ...editing, contact_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Address</Label><Input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Notes</Label><Textarea rows={2} value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            <label className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} /> Active</label>
          </div>
          <Button type="submit">Save</Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {(suppliers ?? []).map((s: any) => (
              <tr key={s.id} className="border-t">
                <td className="p-3 font-medium">{s.name}</td>
                <td>{s.contact_name}</td>
                <td>{s.phone}</td>
                <td>{s.email}</td>
                <td>{s.is_active ? "Yes" : "No"}</td>
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(s)}><Pencil className="size-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => del(s.id)}><Trash2 className="size-3 text-destructive" /></Button>
                </td>
              </tr>
            ))}
            {!suppliers?.length && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No suppliers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
