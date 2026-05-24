import { useState } from "react";
import { useTurmas, useProfessores, useDisciplinas, useAlocacoes, useConfiguracaoHorarios } from "@/store";
import { generateTimeSlots } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Grid3x3 } from "lucide-react";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DIA_LABELS: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
};

type ViewMode = "turma" | "professor";

export default function Grade() {
  const [turmas] = useTurmas();
  const [professores] = useProfessores();
  const [disciplinas] = useDisciplinas();
  const [alocacoes] = useAlocacoes();
  const [config] = useConfiguracaoHorarios();

  const [viewMode, setViewMode] = useState<ViewMode>("turma");
  const [selectedId, setSelectedId] = useState<string>("");

  const timeSlots = generateTimeSlots(config);
  const periods = Array.from({ length: config.quantidadeHorariosPorDia }, (_, i) => i + 1);

  const currentTurma = viewMode === "turma" ? turmas.find((t) => t.id === selectedId) : null;
  const currentProf = viewMode === "professor" ? professores.find((p) => p.id === selectedId) : null;

  function getCell(dia: string, horario: number) {
    let aloc = null;
    if (viewMode === "turma" && selectedId) {
      aloc = alocacoes.find((a) => a.turmaId === selectedId && a.diaSemana === dia && a.horario === horario);
    } else if (viewMode === "professor" && selectedId) {
      aloc = alocacoes.find((a) => a.professorId === selectedId && a.diaSemana === dia && a.horario === horario);
    }
    return aloc;
  }

  const selectorList = viewMode === "turma" ? turmas : professores;
  const selectorLabel = (item: typeof selectorList[0]) =>
    "nome" in item ? item.nome : (item as (typeof professores)[0]).nomeCompleto;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grade de Horários</h1>
          <p className="text-muted-foreground mt-1">Visualize a grade semanal completa</p>
        </div>
        <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={viewMode} onValueChange={(v) => { setViewMode(v as ViewMode); setSelectedId(""); }}>
          <TabsList>
            <TabsTrigger value="turma" data-testid="tab-por-turma">Por Turma</TabsTrigger>
            <TabsTrigger value="professor" data-testid="tab-por-professor">Por Professor</TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger className="w-56" data-testid="select-grade-entity">
            <SelectValue placeholder={viewMode === "turma" ? "Selecionar turma..." : "Selecionar professor..."} />
          </SelectTrigger>
          <SelectContent>
            {selectorList.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {selectorLabel(item)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedId ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Grid3x3 className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">Selecione uma {viewMode === "turma" ? "turma" : "professor"} para visualizar a grade</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="print-container">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {viewMode === "turma"
                ? `Turma: ${currentTurma?.nome}`
                : `Professor: ${currentProf?.nomeCompleto}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm" data-testid="grade-table">
                <thead>
                  <tr className="bg-muted">
                    <th className="text-left p-3 font-semibold text-muted-foreground border-b border-border min-w-24">
                      Horário
                    </th>
                    {DIAS.map((d) => (
                      <th
                        key={d}
                        className="text-center p-3 font-semibold text-muted-foreground border-b border-border"
                      >
                        {DIA_LABELS[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, idx) => {
                    if (slot.isBreak) {
                      return (
                        <tr key={`break-${idx}`} className="bg-amber-50 dark:bg-amber-950/30">
                          <td
                            colSpan={6}
                            className="text-center p-2 text-xs text-amber-700 dark:text-amber-300 font-medium border-b border-border"
                          >
                            Intervalo — {slot.start} às {slot.end}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={slot.period} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="p-3 border-r border-border/30">
                          <p className="font-semibold text-foreground">{slot.period}º Horário</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {slot.start} – {slot.end}
                          </p>
                        </td>
                        {DIAS.map((dia) => {
                          const aloc = getCell(dia, slot.period);
                          const disc = aloc ? disciplinas.find((d) => d.id === aloc.disciplinaId) : null;
                          const prof = aloc ? professores.find((p) => p.id === aloc.professorId) : null;
                          const turma = aloc ? turmas.find((t) => t.id === aloc.turmaId) : null;

                          return (
                            <td
                              key={dia}
                              className="p-1.5 text-center border-r border-border/20 last:border-r-0"
                              data-testid={`cell-${dia}-${slot.period}`}
                            >
                              {aloc && disc ? (
                                <div
                                  className="rounded-md px-2 py-1.5 h-full"
                                  style={{
                                    backgroundColor: disc.cor + "20",
                                    borderLeft: `3px solid ${disc.cor}`,
                                  }}
                                >
                                  <p className="font-bold text-xs" style={{ color: disc.cor }}>
                                    {disc.abreviacao}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {disc.nome}
                                  </p>
                                  {viewMode === "turma" && prof && (
                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                      {prof.nomeCompleto.split(" ")[0]}
                                    </p>
                                  )}
                                  {viewMode === "professor" && turma && (
                                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                                      {turma.nome}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="h-10 rounded-md bg-muted/20" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      {disciplinas.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {disciplinas.map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
              {d.nome}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
