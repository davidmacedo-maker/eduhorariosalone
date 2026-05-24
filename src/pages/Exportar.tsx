import { useRef } from "react";
import { useTurmas, useProfessores, useDisciplinas, useAlocacoes, useConfiguracaoHorarios, useMatrizCurricular } from "@/store";
import { generateTimeSlots } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Download, Upload, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DIA_LABELS: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };

export default function Exportar() {
  const [turmas] = useTurmas();
  const [professores] = useProfessores();
  const [disciplinas] = useDisciplinas();
  const [alocacoes] = useAlocacoes();
  const [config] = useConfiguracaoHorarios();
  const [matriz] = useMatrizCurricular();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function handlePrintAll() {
    window.print();
  }

  function exportJSON() {
    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      data: { turmas, disciplinas, professores, alocacoes, config, matriz },
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eduhorarios-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Backup exportado com sucesso" });
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target?.result as string);
        if (!backup.data) throw new Error("Formato inválido");
        const { turmas: t, disciplinas: d, professores: p, alocacoes: a, config: c, matriz: m } = backup.data;
        if (t) localStorage.setItem("edu_turmas", JSON.stringify(t));
        if (d) localStorage.setItem("edu_disciplinas", JSON.stringify(d));
        if (p) localStorage.setItem("edu_professores", JSON.stringify(p));
        if (a) localStorage.setItem("edu_alocacoes", JSON.stringify(a));
        if (c) localStorage.setItem("edu_config", JSON.stringify(c));
        if (m) localStorage.setItem("edu_matriz", JSON.stringify(m));
        toast({ title: "Backup importado com sucesso! Recarregue a página." });
        setTimeout(() => window.location.reload(), 1500);
      } catch {
        toast({ title: "Erro ao importar backup", description: "Arquivo inválido ou corrompido.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const timeSlots = generateTimeSlots(config);
  const periods = Array.from({ length: config.quantidadeHorariosPorDia }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exportar / Imprimir</h1>
        <p className="text-muted-foreground mt-1">Exporte ou imprima as grades de horários</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Print section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Impressão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={handlePrintAll} data-testid="button-print-all">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir Todas as Grades
            </Button>
            <p className="text-xs text-muted-foreground">
              Abre o diálogo de impressão com todas as grades de turmas. Selecione PDF como destino para salvar em arquivo.
            </p>
          </CardContent>
        </Card>

        {/* Backup section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileJson className="w-4 h-4" />
              Backup de Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={exportJSON} data-testid="button-export-json">
              <Download className="w-4 h-4 mr-2" />
              Exportar JSON (Backup Completo)
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-import-json"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Backup JSON
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
            <p className="text-xs text-muted-foreground">
              Exporte todos os dados para um arquivo JSON. Use para fazer backup ou migrar para outro dispositivo.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* All schedule grids for printing */}
      <div className="print-only hidden">
        {turmas.map((turma) => {
          const turmaAlocacoes = alocacoes.filter((a) => a.turmaId === turma.id);
          return (
            <div key={turma.id} className="print-break-inside-avoid mb-8">
              <h2 className="text-lg font-bold mb-2">Grade de Horários — {turma.nome}</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left bg-gray-50">Horário</th>
                    {DIAS.map((d) => (
                      <th key={d} className="border border-gray-300 p-2 text-center bg-gray-50">
                        {DIA_LABELS[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((slot, idx) => {
                    if (slot.isBreak) {
                      return (
                        <tr key={`break-${idx}`}>
                          <td colSpan={6} className="border border-gray-300 p-1 text-center text-xs bg-gray-50 text-gray-500">
                            Intervalo — {slot.start} às {slot.end}
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={slot.period}>
                        <td className="border border-gray-300 p-2">
                          <p className="font-semibold">{slot.period}º</p>
                          <p className="text-xs text-gray-500">{slot.start}–{slot.end}</p>
                        </td>
                        {DIAS.map((dia) => {
                          const aloc = turmaAlocacoes.find((a) => a.diaSemana === dia && a.horario === slot.period);
                          const disc = aloc ? disciplinas.find((d) => d.id === aloc.disciplinaId) : null;
                          const prof = aloc ? professores.find((p) => p.id === aloc.professorId) : null;
                          return (
                            <td key={dia} className="border border-gray-300 p-2 text-center">
                              {disc ? (
                                <div>
                                  <p className="font-bold text-xs">{disc.abreviacao}</p>
                                  <p className="text-[10px] text-gray-600">{prof?.nomeCompleto.split(" ")[0]}</p>
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
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
          );
        })}

        {professores.map((prof) => {
          const profAlocacoes = alocacoes.filter((a) => a.professorId === prof.id);
          if (profAlocacoes.length === 0) return null;
          return (
            <div key={prof.id} className="print-break-inside-avoid mb-8">
              <h2 className="text-lg font-bold mb-2">Horário do Professor — {prof.nomeCompleto}</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-left bg-gray-50">Horário</th>
                    {DIAS.map((d) => (
                      <th key={d} className="border border-gray-300 p-2 text-center bg-gray-50">
                        {DIA_LABELS[d]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((h) => {
                    const slot = timeSlots.find((s) => !s.isBreak && s.period === h);
                    return (
                      <tr key={h}>
                        <td className="border border-gray-300 p-2">
                          <p className="font-semibold">{h}º</p>
                          {slot && <p className="text-xs text-gray-500">{slot.start}–{slot.end}</p>}
                        </td>
                        {DIAS.map((dia) => {
                          const aloc = profAlocacoes.find((a) => a.diaSemana === dia && a.horario === h);
                          const disc = aloc ? disciplinas.find((d) => d.id === aloc.disciplinaId) : null;
                          const turma = aloc ? turmas.find((t) => t.id === aloc.turmaId) : null;
                          return (
                            <td key={dia} className="border border-gray-300 p-2 text-center">
                              {disc && turma ? (
                                <div>
                                  <p className="font-bold text-xs">{disc.abreviacao}</p>
                                  <p className="text-[10px] text-gray-600">{turma.nome}</p>
                                </div>
                              ) : (
                                <span className="text-gray-300">—</span>
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
          );
        })}
      </div>
    </div>
  );
}
