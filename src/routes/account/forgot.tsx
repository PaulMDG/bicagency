import { createFileRoute } from "@tanstack/react-router";
import { StoreLayout } from "@/components/layout/StoreLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/account/forgot")({ component: Forgot });

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/account/reset`,
    });
    if (error) toast.error(error.message); else setSent(true);
  }
  return (
    <StoreLayout>
      <div className="mx-auto max-w-md px-4 py-12">
        <h1 className="font-display text-3xl">Reset password</h1>
        {sent ? (
          <p className="mt-6 rounded-lg border bg-card p-4 text-sm">Check your email for a reset link.</p>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-3">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <Button type="submit" className="w-full">Send reset link</Button>
          </form>
        )}
      </div>
    </StoreLayout>
  );
}
