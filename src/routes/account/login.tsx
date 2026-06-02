import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/login")({ component: Login });

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back"); navigate({ to: "/account" }); }
  }

  return (
    <StoreLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in to view your orders and speed up checkout.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign in"}</Button>
        </form>
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/account/forgot" className="text-primary hover:underline">Forgot password?</Link>
          <Link to="/account/register" className="text-primary hover:underline">Create account</Link>
        </div>
      </div>
    </StoreLayout>
  );
}
