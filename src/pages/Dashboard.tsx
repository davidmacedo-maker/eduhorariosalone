import { useMemo } from "react";
import { useTurmas, useDisciplinas, useProfessores, useAlocacoes, useMatrizCurricular } from "@/store";
import { detectConflicts } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, BookOpen, GraduationCap, AlertTriangle, Grid3x3, Shuffle, Clock, Download, CalendarDays } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const [turmas] = useTurmas();
  const [disciplinas] = useDisciplinas();
  const [professores] = useProfessores();
  const [alocacoes] = useAlocacoes();
  const [matriz] = useMatrizCurricular();

  const conflitos = useMemo(
    () => detectConflicts(alocacoes, professores, disciplinas, turmas, matriz),
    [alocacoes, professores, disciplinas, turmas, matriz]
  );

  const stats = [
    {
      label: "Turmas",
      value: turmas.length,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950",
      href: "/turmas",
    },
    {
      label: "Disciplinas",
      value: disciplinas.length,
      icon: BookOpen,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-950",
      href: "/disciplinas",
    },
    {
      label: "Professores",
      value: professores.length,
      icon: GraduationCap,
      color: "text-purple-600 dark:text-purple-400",
      bg: "bg-purple-50 dark:bg-purple-950",
      href: "/professores",
    },
    {
      label: "Aulas",
      value: new Set(alocacoes.map(a => `${a.diaSemana}-${a.horario}`)).size,
      icon: CalendarDays,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950",
      href: "/grade",
    },
    {
      label: "Conflitos",
      value: conflitos.length,
      icon: AlertTriangle,
      color: conflitos.length > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground",
      bg: conflitos.length > 0 ? "bg-red-50 dark:bg-red-950" : "bg-muted",
      href: "/conflitos",
    },
  ];

  const quickActions = [
    { label: "Configurar Horários", icon: Clock, href: "/horarios" },
    { label: "Gerar Grade", icon: Shuffle, href: "/alocacao" },
    { label: "Visualizar Grade", icon: Grid3x3, href: "/grade" },
    { label: "Exportar / Imprimir", icon: Download, href: "/exportar" },
  ];

  const recentAlocacoes = alocacoes.slice(0, 6);
  const dayLabels: Record<string, string> = {
    segunda: "Segunda",
    terca: "Terça",
    quarta: "Quarta",
    quinta: "Quinta",
    sexta: "Sexta",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel</h1>
        <p className="text-muted-foreground mt-1">Visão geral do sistema de gestão de horários</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link href={stat.href} key={stat.label}>
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                data-testid={`stat-card-${stat.label.toLowerCase()}`}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground" data-testid={`stat-value-${stat.label.toLowerCase()}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Acesso Rápido</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link href={action.href} key={action.label}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 h-auto py-3"
                    data-testid={`quick-action-${action.label.toLowerCase().replace(/ /g, "-")}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="text-xs text-left">{action.label}</span>
                  </Button>
                </Link>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent allocations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Alocações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAlocacoes.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <Shuffle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Nenhuma alocação encontrada
              </div>
            ) : (
              <ul className="space-y-2">
                {recentAlocacoes.map((a) => {
                  const turma = turmas.find((t) => t.id === a.turmaId);
                  const disc = disciplinas.find((d) => d.id === a.disciplinaId);
                  const prof = professores.find((p) => p.id === a.professorId);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 text-sm"
                      data-testid={`alocacao-item-${a.id}`}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: disc?.cor || "#6b7280" }}
                      />
                      <span className="font-medium text-foreground">{disc?.nome}</span>
                      <span className="text-muted-foreground shrink-0">
                        {turma?.nome} — {dayLabels[a.diaSemana]} {a.horario}º
                      </span>
                      <Badge variant="secondary" className="ml-auto text-xs shrink-0">
                        {prof?.nomeCompleto.split(" ")[0]}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Conflicts */}
      {conflitos.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-4 h-4" />
              Conflitos Detectados ({conflitos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {conflitos.slice(0, 4).map((c, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 shrink-0">•</span>
                  {c.descricao}
                </li>
              ))}
              {conflitos.length > 4 && (
                <li className="text-sm text-muted-foreground">
                  <Link href="/alocacao">
                    <span className="text-primary hover:underline cursor-pointer">
                      Ver todos os {conflitos.length} conflitos
                    </span>
                  </Link>
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
