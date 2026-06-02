import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/reset")({ component: Reset });

function Reset() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); navigate({ to: "/account" }); }
  }
  return (
    <StoreLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl">Set new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div><Label>New password</Label><Input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Saving…" : "Update password"}</Button>
        </form>
      </div>
    </StoreLayout>
  );
}
