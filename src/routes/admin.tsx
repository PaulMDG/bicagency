import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, FolderTree, ShoppingCart, CreditCard, Settings, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin")({ component: AdminShell });

function AdminShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLogin = location.pathname === "/admin/login";
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); setReady(true); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!mounted) return;
      setIsAdmin((roles ?? []).some((r) => ["admin", "super_admin"].includes(r.role)));
      setReady(true);
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => check());
    check();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (ready && !isAdmin && !isLogin) navigate({ to: "/admin/login" });
  }, [ready, isAdmin, isLogin, navigate]);

  if (isLogin) return <Outlet />;
  if (!ready) return <div className="p-12 text-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) return null;

  const nav = [
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/products", label: "Products", icon: Package },
    { to: "/admin/categories", label: "Categories", icon: FolderTree },
    { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { to: "/admin/payments", label: "Payments", icon: CreditCard },
    { to: "/admin/settings/store", label: "Store settings", icon: Settings },
    { to: "/admin/settings/mpesa", label: "M-Pesa settings", icon: Settings },
    { to: "/admin/settings/whatsapp", label: "WhatsApp settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-muted/30 font-sans">
      <aside className={`fixed inset-y-0 left-0 z-30 w-60 -translate-x-full border-r bg-card transition-transform md:static md:translate-x-0 ${open ? "translate-x-0" : ""}`}>
        <div className="flex items-center justify-between border-b px-4 py-4">
          <Link to="/admin" className="font-display text-lg text-primary">Admin</Link>
          <button className="md:hidden" onClick={() => setOpen(false)}><X className="size-5" /></button>
        </div>
        <nav className="space-y-0.5 p-2 text-sm">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} activeOptions={{ exact: n.exact }} className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted" activeProps={{ className: "bg-primary/10 text-primary font-medium" }}>
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(true)}><Menu className="size-5" /></button>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/admin/login" }); }}>
              <LogOut className="size-4" /> Logout
            </Button>
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}