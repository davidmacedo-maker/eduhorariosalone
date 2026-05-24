import { useEffect, useState } from "react";
import { Menu, Sun, Moon, CloudCheck, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { NotificationBell } from "./NotificationBell";
import { supabase } from "@/lib/supabase";
import { useLocation } from "wouter";

interface NavbarProps {
  onMenuClick: () => void;
}

function useSaveIndicator() {
  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    const raw = localStorage.getItem("edu_last_saved");
    return raw ? new Date(raw) : null;
  });

  useEffect(() => {
    const id = setInterval(() => {
      const raw = localStorage.getItem("edu_last_saved");
      if (raw) setLastSaved(new Date(raw));
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function formatTime(d: Date) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return lastSaved ? `Salvo às ${formatTime(lastSaved)}` : "A salvar…";
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const saveLabel = useSaveIndicator();
  const [, setLocation] = useLocation();
  const sbConfigured = !!supabase;
  const sbUser = (() => {
    if (!sbConfigured) return null;
    try {
      const raw = Object.keys(localStorage).find(k => k.includes('-auth-token'));
      if (!raw) return null;
      const parsed = JSON.parse(localStorage.getItem(raw) ?? '{}');
      return parsed?.user ?? null;
    } catch { return null; }
  })();

  function handleLogout() {
    supabase?.auth.signOut();
    setLocation("/login");
  }

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      const raw = localStorage.getItem("edu_last_saved");
      if (!raw) return;
      const diff = Date.now() - new Date(raw).getTime();
      if (diff < 5000) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return (
    <header
      data-print-hide="true"
      className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 no-print"
    >
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
        data-testid="button-menu-toggle"
      >
        <Menu className="w-5 h-5" />
      </Button>

      <div className="flex items-center gap-3 ml-auto">
        <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground" title="Dados salvos automaticamente no navegador">
          <CloudCheck className="w-3.5 h-3.5 text-green-500" />
          {saveLabel}
        </span>
        {sbUser && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground border-l pl-3 border-border">
            <User className="w-3.5 h-3.5" />
            <span className="max-w-[140px] truncate">{sbUser.email as string}</span>
          </span>
        )}
        <NotificationBell />
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
          title={theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"}
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>
        {sbUser && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Terminar sessão"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
