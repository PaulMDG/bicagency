import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SettingsMap = Record<string, string>;

export function useSettings() {
  return useQuery<SettingsMap>({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("key,value");
      if (error) throw error;
      const map: SettingsMap = {};
      (data ?? []).forEach((r: { key: string; value: string | null }) => {
        map[r.key] = r.value ?? "";
      });
      return map;
    },
    staleTime: 60_000,
  });
}

export function buildWaUrl(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}

export function renderTemplate(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}