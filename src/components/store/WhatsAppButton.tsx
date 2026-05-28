import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  href: string;
  className?: string;
  size?: "sm" | "default" | "lg" | "icon";
  label?: string;
}

export function WhatsAppButton({ href, className, size = "default", label = "WhatsApp Us" }: Props) {
  return (
    <Button
      asChild
      size={size}
      className={cn("bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90", className)}
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-4" />
        {label}
      </a>
    </Button>
  );
}