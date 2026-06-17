import { useSettings } from "@/hooks/useSettings";
import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Youtube, Twitter, MessageCircle, Music2 } from "lucide-react";

export function StoreFooter() {
  const { data: settings } = useSettings();
  const s = settings ?? {};
  const socials = [
    { url: s.social_facebook, icon: Facebook, label: "Facebook" },
    { url: s.social_instagram, icon: Instagram, label: "Instagram" },
    { url: s.social_tiktok, icon: Music2, label: "TikTok" },
    { url: s.social_twitter, icon: Twitter, label: "X" },
    { url: s.social_youtube, icon: Youtube, label: "YouTube" },
    { url: s.whatsapp_group_link, icon: MessageCircle, label: "WhatsApp Group" },
  ].filter((x) => x.url);
  return (
    <footer className="mt-16 border-t bg-card">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <div className="font-display text-xl text-primary">{s.store_name ?? "Sokoni KE"}</div>
          <p className="mt-2 text-sm text-muted-foreground">{s.store_tagline}</p>
          <p className="mt-3 text-xs text-muted-foreground">{s.physical_address}</p>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((soc) => (
                <a key={soc.label} href={soc.url} target="_blank" rel="noreferrer" aria-label={soc.label}
                   className="inline-flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground transition hover:border-primary hover:text-primary">
                  <soc.icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-medium">Shop</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/products" className="hover:text-primary">All products</Link></li>
            <li><Link to="/cart" className="hover:text-primary">Cart</Link></li>
            <li><Link to="/track" className="hover:text-primary">Track order</Link></li>
            <li><Link to="/account/login" className="hover:text-primary">My account</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium">Contact</div>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary">About us</Link></li>
            <li><Link to="/blog" className="hover:text-primary">Blog & News</Link></li>
            <li>{s.contact_phone}</li>
            <li>{s.contact_email}</li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium">We accept</div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-mpesa/15 px-2 py-1 font-semibold text-mpesa">M-PESA</span>
            <span className="rounded-md bg-whatsapp/15 px-2 py-1 font-semibold text-whatsapp">WhatsApp Order</span>
          </div>
          {s.whatsapp_group_link && (
            <a href={s.whatsapp_group_link} target="_blank" rel="noreferrer"
               className="mt-4 inline-flex items-center gap-2 rounded-md bg-whatsapp px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
              <MessageCircle className="size-4" /> Join our WhatsApp Group
            </a>
          )}
        </div>
      </div>
      <div className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} {s.store_name ?? "Sokoni KE"}. All rights reserved.
      </div>
    </footer>
  );
}