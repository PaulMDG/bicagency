import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/login")({ component: AdminLogin });

function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("admin@store.co.ke");
  const [password, setPassword] = useState("Admin@1234");

  async function signin(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/admin" });
  }
  async function signup(e: React.FormEvent) {
    e.preventDefault(); setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + "/admin" } });
    if (error) { setLoading(false); toast.error(error.message); return; }
    try {
      await supabase.functions.invoke("bootstrap-admin", { body: { user_id: data.user?.id } });
      toast.success("Admin account created — signing in…");
      await supabase.auth.signInWithPassword({ email, password });
      navigate({ to: "/admin" });
    } catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="font-display text-2xl">Admin access</h1>
        <p className="text-sm text-muted-foreground">Sign in to manage your store.</p>
        <Tabs defaultValue="signin" className="mt-4">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Create first admin</TabsTrigger></TabsList>
          <TabsContent value="signin">
            <form onSubmit={signin} className="space-y-3">
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
              <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
              <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} Sign in</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signup} className="space-y-3">
              <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
              <Field label="Password"><Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
              <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="size-4 animate-spin" />} Create admin</Button>
              <p className="text-xs text-muted-foreground">Only allowed if no admin exists yet.</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label>{label}</Label><div className="mt-1">{children}</div></div>;
}