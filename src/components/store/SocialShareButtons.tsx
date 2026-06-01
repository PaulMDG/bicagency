import { Facebook, Twitter, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SocialShareButtons({ url, title }: { url: string; title: string }) {
  const encUrl = encodeURIComponent(url);
  const encMsg = encodeURIComponent(`${title}\n${url}`);
  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Could not copy"); }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" asChild>
        <a href={`https://wa.me/?text=${encMsg}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
          <Facebook className="size-4" /> Facebook
        </a>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={`https://twitter.com/intent/tweet?text=${encMsg}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X">
          <Twitter className="size-4" /> X
        </a>
      </Button>
      <Button size="sm" variant="outline" onClick={copy} aria-label="Copy link">
        <Link2 className="size-4" /> Copy
      </Button>
    </div>
  );
}