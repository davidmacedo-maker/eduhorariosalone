import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Clock,
  BookOpen,
  GraduationCap,
  Shuffle,
  Grid3x3,
  LayoutGrid,
  ArrowLeftRight,
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  Archive,
  X,
  LogIn,
  LogOut,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTurmas, useProfessores, useDisciplinas, useAlocacoes, useMatrizCurricular } from "@/store";
import { detectConflicts } from "@/lib/schedule-utils";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  onClose?: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

interface NavGroup {
  title: string;
  icon?: React.ElementType;
  items: NavItem[];
}

export function Sidebar({ onClose }: SidebarProps) {
  const [location, setLocation] = useLocation();
  const sbConfigured = !!supabase;
  // Read cached session synchronously from localStorage (set by Supabase SDK)
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
    onClose?.();
    setLocation("/login");
  }

  const [turmas]       = useTurmas();
  const [disciplinas]  = useDisciplinas();
  const [professores]  = useProfessores();
  const [alocacoes]    = useAlocacoes();
  const [matriz]       = useMatrizCurricular();

  const conflitosCount = useMemo(
    () => detectConflicts(alocacoes, professores, disciplinas, turmas, matriz).length,
    [alocacoes, professores, disciplinas, turmas, matriz]
  );

  const navGroups: NavGroup[] = [
    {
      title: "Geral",
      items: [
        { href: "/",          label: "Painel",   icon: LayoutDashboard },
      ],
    },
    {
      title: "Cadastros",
      items: [
        { href: "/turmas",      label: "Turmas",       icon: Users },
        { href: "/disciplinas", label: "Disciplinas",  icon: BookOpen },
        { href: "/professores", label: "Professores",  icon: GraduationCap },
        { href: "/horarios",    label: "Config. Horários", icon: Clock },
      ],
    },
    {
      title: "Grade",
      items: [
        { href: "/alocacao",       label: "Alocação Automática", icon: Shuffle },
        { href: "/grade",          label: "Grade de Horários",   icon: Grid3x3 },
        { href: "/grade-completa", label: "Horário Completo",    icon: LayoutGrid },
        { href: "/conflitos",      label: "Verificar Conflitos", icon: AlertTriangle, badge: conflitosCount },
      ],
    },
    {
      title: "Registros",
      items: [
        { href: "/horario",       label: "Horários",       icon: CalendarDays },
        { href: "/livro-ponto",   label: "Livro de Ponto", icon: ClipboardList },
        { href: "/arquivo-anual", label: "Arquivo Anual",  icon: Archive },
      ],
    },
    {
      title: "Sistema",
      items: [
        { href: "/exportar", label: "Exportar / Importar", icon: ArrowLeftRight },
      ],
    },
  ];

  return (
    <aside className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
        <Link href="/login" onClick={onClose}>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Grid3x3 className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-sidebar-foreground leading-none">EduHorários</p>
              <p className="text-xs text-muted-foreground mt-0.5">Gestão Escolar</p>
            </div>
          </div>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        <ul className="space-y-4">
          {navGroups.map((group) => {
            const GroupIcon = group.icon;
            return (
              <li key={group.title}>
                <div className="flex items-center gap-1.5 px-3 mb-1">
                  {GroupIcon && <GroupIcon className="w-3 h-3 text-muted-foreground/70" />}
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 select-none">
                    {group.title}
                  </span>
                </div>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = location === item.href;
                    const hasBadge = typeof item.badge === "number" && item.badge > 0;
                    return (
                      <li key={item.href}>
                        <Link href={item.href} onClick={onClose}>
                          <span
                            data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
                            className={cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                              isActive
                                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                                : "text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            )}
                          >
                            <Icon className={cn("w-4 h-4 shrink-0", isActive ? "opacity-100" : "opacity-60")} />
                            <span className="flex-1">{item.label}</span>
                            {hasBadge && (
                              <span className={cn(
                                "inline-flex items-center justify-center rounded-full text-[10px] font-bold min-w-[18px] h-[18px] px-1",
                                isActive ? "bg-white/25 text-white" : "bg-red-500 text-white"
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-sidebar-border space-y-1">
        {sbUser && (
          <div className="flex items-center gap-2 px-2 py-1 mb-1">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary uppercase">
                {(sbUser.email as string)?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate leading-none">
                {sbUser.email as string}
              </p>
            </div>
          </div>
        )}

        {!sbUser && (
          <>
            <Link href="/login" onClick={onClose}>
              <span className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer">
                <LogIn className="w-4 h-4 opacity-60 shrink-0" />
                Entrar
              </span>
            </Link>
            <Link href="/cadastro" onClick={onClose}>
              <span className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all cursor-pointer">
                <UserPlus className="w-4 h-4 opacity-60 shrink-0" />
                Cadastrar
              </span>
            </Link>
          </>
        )}

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-foreground/65 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4 opacity-60 shrink-0" />
          Sair
        </button>

        <p className="text-xs text-muted-foreground px-2 pt-1">Ano Letivo {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
