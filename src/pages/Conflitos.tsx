import { useMemo, useState } from "react";
import { useTurmas, useProfessores, useDisciplinas, useAlocacoes, useMatrizCurricular } from "@/store";
import { detectConflicts, autoResolveConflicts } from "@/lib/schedule-utils";
import type { Conflito } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle2, Users, BookOpen, ShieldAlert, RefreshCw, ArrowRight, Filter, Wand2, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

const TIPO_META: Record<Conflito["tipo"], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  professor_duplo: {
    label: "Professor duplicado",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-900",
    icon: Users,
  },
  turma_dupla: {
    label: "Turma duplicada",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
    icon: BookOpen,
  },
  disponibilidade: {
    label: "Fora da disponibilidade",
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900",
    icon: ShieldAlert,
  },
  carga_excedida: {
    label: "Carga não alocada",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-100 dark:bg-purple-950 border-purple-200 dark:border-purple-900",
    icon: AlertTriangle,
  },
};

type FilterTipo = "todos" | Conflito["tipo"];

export default function Conflitos() {
  const [turmas] = useTurmas();
  const [disciplinas] = useDisciplinas();
  const [professores] = useProfessores();
  const [alocacoes, setAlocacoes] = useAlocacoes();
  const [matriz] = useMatrizCurricular();
  const { toast } = useToast();

  const [filtro, setFiltro] = useState<FilterTipo>("todos");
  const [tick, setTick] = useState(0);
  const [resolvePreview, setResolvePreview] = useState<{ descricoes: string[]; resolved: typeof alocacoes } | null>(null);

  const conflitos = useMemo(
    () => detectConflicts(alocacoes, professores, disciplinas, turmas, matriz),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alocacoes, professores, disciplinas, turmas, matriz, tick]
  );

  const contPorTipo = useMemo(() => {
    const m: Record<string, number> = {};
    conflitos.forEach((c) => { m[c.tipo] = (m[c.tipo] ?? 0) + 1; });
    return m;
  }, [conflitos]);

  const filtrados = filtro === "todos" ? conflitos : conflitos.filter((c) => c.tipo === filtro);

  const tiposPresentes = Array.from(new Set(conflitos.map((c) => c.tipo))) as Conflito["tipo"][];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Verificador de Conflitos
          </h1>
          <p className="text-muted-foreground mt-1">
            Detecta sobreposições de horário, indisponibilidades e erros na grade
          </p>
        </div>
        <div className="flex gap-2">
          {conflitos.length > 0 && (
            <Button
              variant="outline"
              className="gap-2 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
              onClick={() => {
                const result = autoResolveConflicts(alocacoes, professores, turmas);
                if (result.removedIds.length === 0) {
                  toast({ title: "Nenhuma correção automática possível", description: "Alguns conflitos precisam de revisão manual." });
                } else {
                  setResolvePreview({ descricoes: result.descricoes, resolved: result.resolved });
                }
              }}
            >
              <Wand2 className="w-4 h-4" />
              Resolver Automaticamente
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setTick((t) => t + 1)}
            className="gap-2"
            data-testid="btn-reverificar"
          >
            <RefreshCw className="w-4 h-4" />
            Re-verificar
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["professor_duplo", "turma_dupla", "disponibilidade", "carga_excedida"] as const).map((tipo) => {
          const meta = TIPO_META[tipo];
          const Icon = meta.icon;
          const count = contPorTipo[tipo] ?? 0;
          return (
            <button
              key={tipo}
              onClick={() => setFiltro((f) => f === tipo ? "todos" : tipo)}
              className={`rounded-lg border p-4 text-left transition-all hover:shadow-md ${
                count > 0 ? meta.bg : "bg-muted/30 border-border"
              } ${filtro === tipo ? "ring-2 ring-primary" : ""}`}
              data-testid={`filtro-${tipo}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${count > 0 ? meta.color : "text-muted-foreground"}`} />
                <span className={`text-2xl font-bold ${count > 0 ? meta.color : "text-muted-foreground"}`}>
                  {count}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-tight">{meta.label}</p>
            </button>
          );
        })}
      </div>

      {/* Estado sem conflitos */}
      {conflitos.length === 0 && (
        <Card className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950">
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="text-lg font-semibold text-green-700 dark:text-green-400">Nenhum conflito detectado</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              A grade está consistente — nenhum professor está em dois lugares ao mesmo tempo e todas as turmas têm horários únicos.
            </p>
            <Link href="/grade">
              <Button variant="outline" className="mt-2 gap-2">
                <ArrowRight className="w-4 h-4" />
                Ver Grade de Horários
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Lista de conflitos */}
      {conflitos.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                {filtro === "todos"
                  ? `Todos os conflitos (${conflitos.length})`
                  : `${TIPO_META[filtro as Conflito["tipo"]].label} (${filtrados.length})`}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant={filtro === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltro("todos")}
                >
                  Todos ({conflitos.length})
                </Button>
                {tiposPresentes.map((tipo) => {
                  const meta = TIPO_META[tipo];
                  return (
                    <Button
                      key={tipo}
                      variant={filtro === tipo ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFiltro((f) => f === tipo ? "todos" : tipo)}
                    >
                      {meta.label} ({contPorTipo[tipo]})
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {filtrados.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum conflito deste tipo.
              </p>
            )}
            {filtrados.map((c, i) => {
              const meta = TIPO_META[c.tipo];
              const Icon = meta.icon;
              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-md border px-4 py-3 ${meta.bg}`}
                  data-testid={`conflito-item-${i}`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${meta.color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground leading-snug">{c.descricao}</p>
                    {c.dia && c.horario && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {{"segunda":"Segunda","terca":"Terça","quarta":"Quarta","quinta":"Quinta","sexta":"Sexta"}[c.dia] ?? c.dia} · {c.horario}º horário
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-[10px] ${meta.color}`}
                  >
                    {meta.label}
                  </Badge>
                  <Link href="/grade">
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 gap-1 text-xs">
                      Corrigir
                      <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Dicas de resolução */}
      {conflitos.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Como resolver
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm pt-0">
            {contPorTipo["professor_duplo"] > 0 && (
              <div className="flex gap-2">
                <span className="text-red-500 shrink-0">•</span>
                <span><strong>Professor duplicado:</strong> abra a Grade, localize o horário indicado e remova uma das alocações do professor.</span>
              </div>
            )}
            {contPorTipo["turma_dupla"] > 0 && (
              <div className="flex gap-2">
                <span className="text-orange-500 shrink-0">•</span>
                <span><strong>Turma duplicada:</strong> a turma tem 2 disciplinas no mesmo slot. Remova uma ou mova para outro horário na Grade.</span>
              </div>
            )}
            {contPorTipo["disponibilidade"] > 0 && (
              <div className="flex gap-2">
                <span className="text-yellow-500 shrink-0">•</span>
                <span><strong>Fora da disponibilidade:</strong> ajuste a disponibilidade do professor em Professores, ou mova a aula para um horário em que ele esteja disponível.</span>
              </div>
            )}
            {contPorTipo["carga_excedida"] > 0 && (
              <div className="flex gap-2">
                <span className="text-purple-500 shrink-0">•</span>
                <span><strong>Carga não alocada:</strong> execute a Alocação Automática novamente ou adicione manualmente as aulas em falta na Grade.</span>
              </div>
            )}
            <div className="sm:col-span-2 pt-2 flex gap-3 flex-wrap">
              <Link href="/grade">
                <Button size="sm" className="gap-2">
                  <ArrowRight className="w-3.5 h-3.5" />
                  Abrir Grade para Editar
                </Button>
              </Link>
              <Link href="/alocacao">
                <Button variant="outline" size="sm" className="gap-2">
                  Alocação Automática
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resolve confirmation dialog */}
      <Dialog open={!!resolvePreview} onOpenChange={(v) => { if (!v) setResolvePreview(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-green-600" />
              Resolver Automaticamente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              As seguintes alocações conflituosas serão <strong>removidas automaticamente</strong>. Alocações travadas (🔒) não são alteradas.
            </p>
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 max-h-52 overflow-y-auto">
              {resolvePreview?.descricoes.map((d, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <Trash2 className="w-3.5 h-3.5 mt-0.5 text-red-500 shrink-0" />
                  <span>{d}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: <strong>{resolvePreview?.descricoes.length ?? 0}</strong> alocação(ões) serão removidas. Esta ação não pode ser desfeita.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvePreview(null)}>Cancelar</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (!resolvePreview) return;
                setAlocacoes(resolvePreview.resolved);
                setResolvePreview(null);
                setTick((t) => t + 1);
                toast({ title: `${resolvePreview.descricoes.length} conflito(s) resolvido(s) automaticamente` });
              }}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Confirmar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
