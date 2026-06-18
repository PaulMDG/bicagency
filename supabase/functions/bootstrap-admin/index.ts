// Bootstrap-admin is intentionally disabled.
// Admin accounts must be provisioned via the Supabase dashboard.
// Returning 410 Gone so any old client invocations fail loudly.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ error: "Endpoint disabled. Provision admins from the Supabase dashboard." }),
    { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
