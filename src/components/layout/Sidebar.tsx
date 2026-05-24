import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Clock,
  BookOpen,
  GraduationCap,
  Shuffle,
  Grid3x3,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/turmas", label: "Turmas", icon: Users },
  { href: "/horarios", label: "Configuração de Horários", icon: Clock },
  { href: "/disciplinas", label: "Disciplinas", icon: BookOpen },
  { href: "/professores", label: "Professores", icon: GraduationCap },
  { href: "/alocacao", label: "Alocação Automática", icon: Shuffle },
  { href: "/grade", label: "Grade de Horários", icon: Grid3x3 },
  { href: "/exportar", label: "Exportar / Imprimir", icon: Download },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const [location] = useLocation();

  return (
    <aside className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Grid3x3 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-sm font-bold text-sidebar-foreground leading-none">EduHorários</p>
            <p className="text-xs text-muted-foreground mt-0.5">Gestão Escolar</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="md:hidden">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <li key={item.href}>
                <Link href={item.href} onClick={onClose}>
                  <span
                    data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-6 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">Ano Letivo 2025</p>
        <p className="text-xs text-muted-foreground">Dados salvos localmente</p>
      </div>
    </aside>
  );
}
