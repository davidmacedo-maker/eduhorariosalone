import { useState, useMemo } from "react";
import { useTurmas, useDisciplinas, useProfessores, useAlocacoes, useMatrizCurricular, useConfiguracaoHorarios } from "@/store";
import { runAllocation, detectConflicts } from "@/lib/schedule-utils";
import type { Conflito } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Shuffle, AlertTriangle, CheckCircle, Trash2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DIA_LABELS: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };

export default function Alocacao() {
  const [turmas] = useTurmas();
  const [disciplinas] = useDisciplinas();
  const [professores] = useProfessores();
  const [alocacoes, setAlocacoes] = useAlocacoes();
  const [matriz] = useMatrizCurricular();
  const [config] = useConfiguracaoHorarios();
  const [conflitos, setConflitos] = useState<Conflito[]>([]);
  const [hasRun, setHasRun] = useState(false);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const { toast } = useToast();

  function handleRunAllocation() {
    const { alocacoes: result, conflitos: newConflitos } = runAllocation(
      turmas,
      disciplinas,
      professores,
      matriz,
      config
    );
    setAlocacoes(result);
    setConflitos(newConflitos);
    setHasRun(true);

    if (newConflitos.length === 0) {
      toast({ title: `Grade gerada com sucesso! ${result.length} aulas alocadas.` });
    } else {
      toast({
        title: `Grade gerada com ${newConflitos.length} conflito(s)`,
        variant: "destructive",
      });
    }
  }

  function handleClear() {
    setAlocacoes([]);
    setConflitos([]);
    setHasRun(false);
    setClearDialogOpen(false);
    toast({ title: "Grade limpa com sucesso", variant: "destructive" });
  }

  function removeAlocacao(id: string) {
    setAlocacoes((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Alocação removida" });
  }

  const currentConflitos = useMemo(
    () => detectConflicts(alocacoes, professores, disciplinas, turmas, matriz),
    [alocacoes, professores, disciplinas, turmas, matriz]
  );

  const periods = Array.from({ length: config.quantidadeHorariosPorDia }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alocação Automática</h1>
          <p className="text-muted-foreground mt-1">Gere a grade de horários automaticamente</p>
        </div>
        <div className="flex gap-2">
          {alocacoes.length > 0 && (
            <Button variant="outline" onClick={() => setClearDialogOpen(true)} data-testid="button-limpar-grade">
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Grade
            </Button>
          )}
          <Button onClick={handleRunAllocation} data-testid="button-gerar-grade">
            <Shuffle className="w-4 h-4 mr-2" />
            Gerar Horários Automaticamente
          </Button>
        </div>
      </div>

      {/* Info banner */}
      {turmas.length === 0 || professores.length === 0 || disciplinas.length === 0 ? (
        <Alert>
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Para gerar a grade, você precisa ter ao menos uma turma, um professor e uma disciplina cadastrados, com a matriz curricular preenchida.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Results */}
      {hasRun && (
        <div className="flex items-center gap-3">
          {conflitos.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
              <CheckCircle className="w-4 h-4" />
              Grade gerada sem conflitos — {alocacoes.length} aulas alocadas
            </div>
          ) : (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {conflitos.length} conflito(s) detectado(s) — {alocacoes.length} aulas alocadas
            </div>
          )}
        </div>
      )}

      {/* Conflict list */}
      {currentConflitos.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Conflitos Encontrados ({currentConflitos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {currentConflitos.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge
                    variant="destructive"
                    className="shrink-0 text-xs"
                  >
                    {c.tipo === "professor_duplo" ? "Dupla" : c.tipo === "carga_excedida" ? "Carga" : "Disponib."}
                  </Badge>
                  <span className="text-muted-foreground">{c.descricao}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Grade preview per class */}
      {alocacoes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Visualização por Turma</h2>
          {turmas.map((turma) => {
            const turmaAlocacoes = alocacoes.filter((a) => a.turmaId === turma.id);
            if (turmaAlocacoes.length === 0) return null;

            return (
              <Card key={turma.id} data-testid={`grade-turma-${turma.id}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">{turma.nome}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="text-left p-2 font-medium text-muted-foreground border-b border-border">Horário</th>
                          {DIAS.map((d) => (
                            <th key={d} className="text-center p-2 font-medium text-muted-foreground border-b border-border">
                              {DIA_LABELS[d]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {periods.map((h) => (
                          <tr key={h} className="border-b border-border/50">
                            <td className="p-2 text-muted-foreground font-medium">{h}º</td>
                            {DIAS.map((dia) => {
                              const aloc = turmaAlocacoes.find((a) => a.diaSemana === dia && a.horario === h);
                              const disc = aloc ? disciplinas.find((d) => d.id === aloc.disciplinaId) : null;
                              const prof = aloc ? professores.find((p) => p.id === aloc.professorId) : null;
                              return (
                                <td key={dia} className="p-1 text-center">
                                  {aloc && disc ? (
                                    <div
                                      className="rounded p-1 relative group"
                                      style={{ backgroundColor: disc.cor + "22", borderLeft: `3px solid ${disc.cor}` }}
                                    >
                                      <p className="font-bold" style={{ color: disc.cor }}>
                                        {disc.abreviacao}
                                      </p>
                                      <p className="text-muted-foreground text-[10px] truncate">
                                        {prof?.nomeCompleto.split(" ")[0]}
                                      </p>
                                      <button
                                        onClick={() => removeAlocacao(aloc.id)}
                                        className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                        title="Remover"
                                        data-testid={`button-remove-aloc-${aloc.id}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="h-8 rounded bg-muted/30" />
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {alocacoes.length === 0 && !hasRun && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Shuffle className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Nenhuma grade gerada ainda</p>
            <p className="text-sm mt-1">Clique em "Gerar Horários Automaticamente" para iniciar</p>
          </CardContent>
        </Card>
      )}

      {/* Professor workload report */}
      {alocacoes.length > 0 && professores.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Carga Horária por Professor
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {professores.map((prof) => {
              const atual = alocacoes.filter((a) => a.professorId === prof.id).length;
              const max = prof.cargaHorariaMaximaSemanal;
              const pct = Math.min(100, Math.round((atual / max) * 100));
              const overloaded = atual > max;
              const color = overloaded
                ? "text-red-600 dark:text-red-400"
                : pct >= 85
                ? "text-amber-600 dark:text-amber-400"
                : "text-green-600 dark:text-green-400";
              const profDiscs = prof.disciplinas
                .map((dId) => disciplinas.find((d) => d.id === dId)?.abreviacao)
                .filter(Boolean)
                .join(", ");
              return (
                <Card key={prof.id} data-testid={`workload-${prof.id}`}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{prof.nomeCompleto}</p>
                        <p className="text-xs text-muted-foreground">{profDiscs}</p>
                      </div>
                      <Badge
                        variant={overloaded ? "destructive" : "secondary"}
                        className="shrink-0 text-xs"
                      >
                        {atual}/{max}h
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <Progress value={pct} className="h-2" />
                      <div className="flex justify-between text-xs">
                        <span className={color}>
                          {overloaded
                            ? `Excedido em ${atual - max} aula(s)`
                            : `${pct}% da carga`}
                        </span>
                        <span className="text-muted-foreground">{max} aulas/sem</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <AlertDialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Grade</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todas as alocações? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
