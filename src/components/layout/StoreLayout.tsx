import { ReactNode } from "react";
import { StoreHeader } from "./StoreHeader";
import { StoreFooter } from "./StoreFooter";
import { MobileNav } from "./MobileNav";

export function StoreLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-foreground">
      <StoreHeader />
      <main className="flex-1">{children}</main>
      <StoreFooter />
      <MobileNav />
    </div>
  );
}