import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Idempotent provisioning for the project owner's admin account.
// Locked to a single allow-listed email; safe to call multiple times.
const ALLOWED_EMAIL = "tony@bicagency.co.ke";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { email, password } = await req.json();
    if (String(email).toLowerCase() !== ALLOWED_EMAIL) return json({ error: "Email not allowed" }, 403);
    if (!password || String(password).length < 8) return json({ error: "Password too short" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find existing user
    let userId: string | null = null;
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => u.email?.toLowerCase() === ALLOWED_EMAIL);
    if (existing) {
      userId = existing.id;
      // Ensure password is set/known and email is confirmed
      await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    } else {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email: ALLOWED_EMAIL, password, email_confirm: true,
      });
      if (cErr) return json({ error: cErr.message }, 500);
      userId = created.user?.id ?? null;
    }
    if (!userId) return json({ error: "Failed to resolve user id" }, 500);

    // Grant super_admin (idempotent via unique constraint)
    const { error: rErr } = await admin
      .from("user_roles")
      .upsert({ user_id: userId, role: "super_admin" }, { onConflict: "user_id,role" });
    if (rErr) return json({ error: rErr.message }, 500);

    return json({ ok: true, user_id: userId, email: ALLOWED_EMAIL });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});