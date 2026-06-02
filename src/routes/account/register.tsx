import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { isValidKenyanPhone, normalizeKenyanPhone } from "@/lib/format";

export const Route = createFileRoute("/account/register")({ component: Register });

function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidKenyanPhone(phone)) { toast.error("Enter a valid Kenyan phone (07XXXXXXXX)"); return; }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: { name, phone: normalizeKenyanPhone(phone) },
      },
    });
    if (error) { setLoading(false); toast.error(error.message); return; }
    if (data.user) {
      await supabase.from("customer_accounts").insert({
        user_id: data.user.id, name, phone: normalizeKenyanPhone(phone)!,
      });
    }
    setLoading(false);
    toast.success("Account created", { description: "Check your email to confirm." });
    navigate({ to: "/account/login" });
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl">Create account</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Phone (Kenya)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" required /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating…" : "Create account"}</Button>
        </form>
        <p className="mt-4 text-sm">Already have an account? <Link to="/account/login" className="text-primary hover:underline">Sign in</Link></p>
      </div>
    </StoreLayout>
  );
}
