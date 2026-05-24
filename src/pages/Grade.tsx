import { useState, useRef, useMemo } from "react";
import { useTurmas, useProfessores, useDisciplinas, useAlocacoes, useConfiguracaoHorarios, useNomeEscola, generateId } from "@/store";
import { generateTimeSlotsForTurno } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Printer, Grid3x3, Pencil, Eye, Trash2, GripVertical, Plus, LayoutGrid, Sun, Sunset, Moon, AlertTriangle, Lock, Unlock } from "lucide-react";
import { Link } from "wouter";
import type { Alocacao } from "@/types";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DIA_LABELS: Record<string, string> = {
  segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta",
};

type ViewMode = "turma" | "professor";

interface CellDialogState {
  open: boolean;
  dia: string;
  horario: number;
  turno: "manha" | "tarde" | "noite";
  existing: Alocacao | null;
}

export default function Grade() {
  const [turmas]                  = useTurmas();
  const [professores]             = useProfessores();
  const [disciplinas]             = useDisciplinas();
  const [alocacoes, setAlocacoes] = useAlocacoes();
  const [config]                  = useConfiguracaoHorarios();
  const [nomeEscola]              = useNomeEscola();

  const [viewMode, setViewMode]   = useState<ViewMode>("turma");
  const [selectedId, setSelectedId] = useState<string>("");
  const [editMode, setEditMode]   = useState(false);

  const [dialog, setDialog] = useState<CellDialogState>({
    open: false, dia: "", horario: 0, turno: "manha", existing: null,
  });
  const [editDiscId, setEditDiscId] = useState("");
  const [editProfId, setEditProfId] = useState("");
  const [dialogConflictError, setDialogConflictError] = useState<string | null>(null);

  const dragSrcRef  = useRef<Alocacao | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const turmaMap = useMemo(() => new Map(turmas.map((t) => [t.id, t])), [turmas]);

  const currentTurma = viewMode === "turma" ? turmas.find((t) => t.id === selectedId) : null;
  const currentProf  = viewMode === "professor" ? professores.find((p) => p.id === selectedId) : null;

  // Which shifts does the selected entity participate in?
  const activeShifts = useMemo<Array<"manha" | "tarde" | "noite">>(() => {
    if (!selectedId) return [];
    if (viewMode === "turma" && currentTurma) {
      return [currentTurma.turno];
    }
    if (viewMode === "professor" && currentProf) {
      const profAlocs = alocacoes.filter((a) => a.professorId === currentProf.id);
      const s = new Set(profAlocs.map((a) => turmaMap.get(a.turmaId)?.turno ?? "manha").filter((t): t is "manha" | "tarde" | "noite" => true));
      const arr = Array.from(s) as Array<"manha" | "tarde" | "noite">;
      if (arr.length === 0) return ["manha"];
      return arr;
    }
    return [];
  }, [selectedId, viewMode, currentTurma, currentProf, alocacoes, turmaMap]);

  const manhaSlots = useMemo(() => generateTimeSlotsForTurno(config, "manha"), [config]);
  const tardeSlots = useMemo(() => config.habilitarTarde ? generateTimeSlotsForTurno(config, "tarde") : [], [config]);
  const noiteSlots = useMemo(() => config.habilitarNoite ? generateTimeSlotsForTurno(config, "noite") : [], [config]);

  const showManha = activeShifts.includes("manha");
  const showTarde = activeShifts.includes("tarde") && config.habilitarTarde;
  const showNoite = activeShifts.includes("noite") && config.habilitarNoite;

  function getCellForShift(dia: string, horario: number, turno: "manha" | "tarde" | "noite"): Alocacao | null {
    if (!selectedId) return null;
    if (viewMode === "turma") {
      return alocacoes.find((a) => a.turmaId === selectedId && a.diaSemana === dia && a.horario === horario) ?? null;
    }
    return alocacoes.find((a) =>
      a.professorId === selectedId &&
      a.diaSemana === dia &&
      a.horario === horario &&
      (turmaMap.get(a.turmaId)?.turno ?? "manha") === turno
    ) ?? null;
  }

  function openDialog(dia: string, horario: number, turno: "manha" | "tarde" | "noite", existing: Alocacao | null) {
    if (!editMode) return;
    setDialog({ open: true, dia, horario, turno, existing });
    setEditDiscId(existing?.disciplinaId ?? "");
    setEditProfId(existing?.professorId ?? "");
    setDialogConflictError(null);
  }

  function checkDialogConflicts(profId: string, discId: string): string | null {
    if (!profId || !discId) return null;
    const prof = professores.find((p) => p.id === profId);
    const profName = prof?.nomeCompleto ?? "Este professor";
    const diaLabel = DIA_LABELS[dialog.dia] ?? dialog.dia;
    const ordinal = `${dialog.horario}º horário`;

    // Professor conflict: same professor, same day, same slot, same shift
    const profConflict = alocacoes.find(
      (a) =>
        a.professorId === profId &&
        a.diaSemana === dialog.dia &&
        a.horario === dialog.horario &&
        a.id !== dialog.existing?.id &&
        (turmaMap.get(a.turmaId)?.turno ?? "manha") === dialog.turno
    );
    if (profConflict) {
      const conflictTurma = turmaMap.get(profConflict.turmaId);
      const turmaInfo = conflictTurma ? ` (turma ${conflictTurma.nome})` : "";
      return `O professor ${profName} já possui aula na ${diaLabel} no ${ordinal}${turmaInfo}.`;
    }

    // Turma conflict: same turma, same day, same slot (different discipline)
    if (viewMode === "turma") {
      const turmaConflict = alocacoes.find(
        (a) =>
          a.turmaId === selectedId &&
          a.diaSemana === dialog.dia &&
          a.horario === dialog.horario &&
          a.disciplinaId !== discId &&
          a.id !== dialog.existing?.id
      );
      if (turmaConflict) {
        const conflictDisc = disciplinas.find((d) => d.id === turmaConflict.disciplinaId);
        return `Esta turma já possui ${conflictDisc?.nome ?? "uma disciplina"} na ${diaLabel} no ${ordinal}.`;
      }
    }

    return null;
  }

  function saveDialog() {
    if (!editDiscId || !editProfId) return;

    const conflictMsg = checkDialogConflicts(editProfId, editDiscId);
    if (conflictMsg) {
      setDialogConflictError(conflictMsg);
      return;
    }
    setDialogConflictError(null);

    const turmaId = viewMode === "turma"
      ? selectedId
      : (alocacoes.find((a) => a.professorId === selectedId)?.turmaId ?? selectedId);

    setAlocacoes((prev) => {
      const filtered = dialog.existing
        ? prev.filter((a) => a.id !== dialog.existing!.id)
        : prev.filter((a) => !(
            (viewMode === "turma" ? a.turmaId === selectedId : a.professorId === selectedId) &&
            a.diaSemana === dialog.dia &&
            a.horario === dialog.horario
          ));
      return [...filtered, {
        id: dialog.existing?.id ?? generateId(),
        turmaId: viewMode === "turma" ? selectedId : turmaId,
        disciplinaId: editDiscId,
        professorId: editProfId,
        diaSemana: dialog.dia,
        horario: dialog.horario,
      }];
    });
    setDialog((d) => ({ ...d, open: false }));
  }

  function deleteAlocacao(aloc: Alocacao) {
    setAlocacoes((prev) => prev.filter((a) => a.id !== aloc.id));
    setDialog((d) => ({ ...d, open: false }));
  }

  function handleDragStart(aloc: Alocacao) { dragSrcRef.current = aloc; }

  function handleDrop(dia: string, horario: number, turno: "manha" | "tarde" | "noite") {
    const src = dragSrcRef.current;
    if (!src) return;
    setDragOverKey(null);
    const destAloc = getCellForShift(dia, horario, turno);
    setAlocacoes((prev) => {
      let updated = prev.filter((a) => a.id !== src.id);
      if (destAloc) {
        updated = updated.filter((a) => a.id !== destAloc.id);
        updated.push({ ...destAloc, diaSemana: src.diaSemana, horario: src.horario });
      }
      updated.push({ ...src, diaSemana: dia, horario });
      return updated;
    });
    dragSrcRef.current = null;
  }

  const selectorList = viewMode === "turma" ? turmas : professores;
  const selectorLabel = (item: typeof selectorList[0]) =>
    "nome" in item ? item.nome : (item as (typeof professores)[0]).nomeCompleto;

  const filteredProfs = editDiscId ? professores.filter((p) => p.disciplinas.includes(editDiscId)) : professores;

  // ── sub-table renderer ──────────────────────────────────────────────────────
  function renderShiftTable(turno: "manha" | "tarde" | "noite", slots: ReturnType<typeof generateTimeSlotsForTurno>) {
    const isManha = turno === "manha";
    const isNoite = turno === "noite";
    const periodColor = isNoite
      ? "text-purple-600 dark:text-purple-400"
      : isManha ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400";

    return (
      <div key={turno}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" data-testid={`grade-table-${turno}`}>
            <thead>
              <tr className="bg-muted">
                <th className="text-left p-3 font-semibold text-muted-foreground border-b border-border min-w-24">
                  Horário
                </th>
                {DIAS.map((d) => (
                  <th key={d} className="text-center p-3 font-semibold text-muted-foreground border-b border-border">
                    {DIA_LABELS[d]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot, idx) => {
                if (slot.isBreak) {
                  return (
                    <tr key={`break-${idx}`} className="bg-amber-50 dark:bg-amber-950/30">
                      <td colSpan={6} className="text-center p-2 text-xs text-amber-700 dark:text-amber-300 font-medium border-b border-border">
                        Intervalo — {slot.start} às {slot.end}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={`${turno}-${slot.period}`} className="border-b border-border/50">
                    <td className="p-3 border-r border-border/30">
                      <p className={`font-semibold text-xs ${periodColor}`}>
                        {slot.period}º Horário
                      </p>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {slot.start} – {slot.end}
                      </p>
                    </td>
                    {DIAS.map((dia) => {
                      const aloc  = getCellForShift(dia, slot.period, turno);
                      const disc  = aloc ? disciplinas.find((d) => d.id === aloc.disciplinaId) : null;
                      const prof  = aloc ? professores.find((p) => p.id === aloc.professorId) : null;
                      const turma = aloc ? turmaMap.get(aloc.turmaId) : null;
                      const cellKey = `${turno}-${dia}-${slot.period}`;
                      const isDragOver = dragOverKey === cellKey;

                      return (
                        <td
                          key={dia}
                          className={`p-1.5 text-center border-r border-border/20 last:border-r-0 transition-colors
                            ${editMode ? "cursor-pointer" : ""}
                            ${isDragOver ? "bg-primary/10 ring-2 ring-inset ring-primary/40" : ""}
                          `}
                          data-testid={`cell-${turno}-${dia}-${slot.period}`}
                          onClick={() => !aloc && openDialog(dia, slot.period, turno, null)}
                          onDragOver={(e) => { if (!editMode) return; e.preventDefault(); setDragOverKey(cellKey); }}
                          onDragLeave={() => setDragOverKey(null)}
                          onDrop={(e) => { e.preventDefault(); handleDrop(dia, slot.period, turno); }}
                        >
                          {aloc && disc ? (
                            <div
                              draggable={editMode && !aloc.isLocked}
                              onDragStart={() => { if (!aloc.isLocked) handleDragStart(aloc); }}
                              onClick={(e) => { e.stopPropagation(); openDialog(dia, slot.period, turno, aloc); }}
                              className={`rounded-md px-2 py-1.5 h-full group relative
                                ${editMode && !aloc.isLocked ? "cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow" : ""}
                                ${aloc.isLocked ? "ring-1 ring-amber-400/60 dark:ring-amber-600/60" : ""}
                              `}
                              style={{ backgroundColor: disc.cor + "20", borderLeft: `3px solid ${disc.cor}` }}
                            >
                              {aloc.isLocked && (
                                <Lock className="w-2.5 h-2.5 absolute top-1 left-1 text-amber-600 dark:text-amber-400 no-print" />
                              )}
                              {editMode && !aloc.isLocked && (
                                <GripVertical className="w-3 h-3 absolute top-1 right-1 opacity-0 group-hover:opacity-40 text-muted-foreground transition-opacity no-print" />
                              )}
                              <p className={`font-bold text-xs ${aloc.isLocked ? "pl-3" : ""}`} style={{ color: disc.cor }}>{disc.abreviacao}</p>
                              <p className="text-[11px] text-muted-foreground print:text-gray-600 truncate">{disc.nome}</p>
                              {viewMode === "turma" && prof && (
                                <p className="text-[10px] text-muted-foreground/70 print:text-gray-500 mt-0.5">
                                  {prof.nomeCompleto.split(" ")[0]}
                                </p>
                              )}
                              {viewMode === "professor" && turma && (
                                <p className="text-[10px] text-muted-foreground/70 print:text-gray-500 mt-0.5">{turma.nome}</p>
                              )}
                            </div>
                          ) : (
                            <div className={`h-10 rounded-md flex items-center justify-center transition-colors
                              ${editMode
                                ? "bg-muted/10 border border-dashed border-border/40 hover:bg-primary/5 hover:border-primary/30"
                                : "bg-muted/20"
                              }
                            `}>
                              {editMode && <Plus className="w-3.5 h-3.5 text-muted-foreground/40" />}
                            </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Grade de Horários</h1>
          <p className="text-muted-foreground mt-1">
            {editMode ? "Clique numa célula para editar · Arraste para mover" : "Visualize a grade semanal completa"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/grade-completa">
            <Button variant="outline" data-testid="button-grade-completa">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Horário Completo
            </Button>
          </Link>
          <Button
            variant={editMode ? "default" : "outline"}
            onClick={() => setEditMode((v) => !v)}
            data-testid="button-toggle-edit"
          >
            {editMode ? <><Eye className="w-4 h-4 mr-2" />Visualizar</> : <><Pencil className="w-4 h-4 mr-2" />Editar Grade</>}
          </Button>
          <Button variant="outline" onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {editMode && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-lg px-4 py-2.5 border border-border no-print">
          <Pencil className="w-3.5 h-3.5 shrink-0" />
          <span>
            <strong className="text-foreground">Modo edição ativo:</strong> clique em qualquer célula para editar ou adicionar uma aula. Arraste células preenchidas para movê-las.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center no-print">
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
            {selectorList.map((item) => {
              const isProf = "nomeCompleto" in item;
              const label = selectorLabel(item);
              const turno = !isProf && "turno" in item ? (item as { turno: string }).turno : null;
              return (
                <SelectItem key={item.id} value={item.id}>
                  <span className="flex items-center gap-2">
                    {turno === "manha" && <Sun className="w-3 h-3 text-blue-500" />}
                    {turno === "tarde" && <Sunset className="w-3 h-3 text-orange-500" />}
                    {turno === "noite" && <Moon className="w-3 h-3 text-purple-500" />}
                    {label}
                  </span>
                </SelectItem>
              );
            })}
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
        <>
          {showManha && (
            <Card className="print-container overflow-hidden">
              <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20">
                <div className="hidden print:block text-center mb-3 pb-3 border-b">
                  <p className="text-base font-bold uppercase tracking-wide">{nomeEscola}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Grade de Horários — Matutino</p>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sun className="w-4 h-4 text-blue-500" />
                    {viewMode === "turma" ? `Turma: ${currentTurma?.nome}` : `Professor: ${currentProf?.nomeCompleto}`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-0 text-xs">
                      <Sun className="w-3 h-3 mr-1" />Matutino
                    </Badge>
                    {editMode && (
                      <Badge variant="secondary" className="text-xs no-print">
                        <Pencil className="w-2.5 h-2.5 mr-1" />Editando
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderShiftTable("manha", manhaSlots)}
              </CardContent>
            </Card>
          )}

          {showTarde && (
            <Card className="print-container overflow-hidden">
              <CardHeader className="pb-3 border-b border-orange-100 dark:border-orange-900 bg-orange-50/50 dark:bg-orange-950/20">
                <div className="hidden print:block text-center mb-3 pb-3 border-b">
                  <p className="text-base font-bold uppercase tracking-wide">{nomeEscola}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Grade de Horários — Vespertino</p>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sunset className="w-4 h-4 text-orange-500" />
                    {viewMode === "turma" ? `Turma: ${currentTurma?.nome}` : `Professor: ${currentProf?.nomeCompleto}`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 border-0 text-xs">
                      <Sunset className="w-3 h-3 mr-1" />Vespertino
                    </Badge>
                    {editMode && (
                      <Badge variant="secondary" className="text-xs no-print">
                        <Pencil className="w-2.5 h-2.5 mr-1" />Editando
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderShiftTable("tarde", tardeSlots)}
              </CardContent>
            </Card>
          )}

          {showNoite && (
            <Card className="print-container overflow-hidden">
              <CardHeader className="pb-3 border-b border-purple-100 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20">
                <div className="hidden print:block text-center mb-3 pb-3 border-b">
                  <p className="text-base font-bold uppercase tracking-wide">{nomeEscola}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Grade de Horários — Noturno</p>
                </div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Moon className="w-4 h-4 text-purple-500" />
                    {viewMode === "turma" ? `Turma: ${currentTurma?.nome}` : `Professor: ${currentProf?.nomeCompleto}`}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-0 text-xs">
                      <Moon className="w-3 h-3 mr-1" />Noturno
                    </Badge>
                    {editMode && (
                      <Badge variant="secondary" className="text-xs no-print">
                        <Pencil className="w-2.5 h-2.5 mr-1" />Editando
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderShiftTable("noite", noiteSlots)}
              </CardContent>
            </Card>
          )}
        </>
      )}

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

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      {/* Edit Dialog */}
      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((d) => ({ ...d, open: v }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog.existing ? "Editar Aula" : "Adicionar Aula"}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {DIA_LABELS[dialog.dia]} — {dialog.horario}º horário
              {" · "}
              <span className={dialog.turno === "noite" ? "text-purple-600 dark:text-purple-400" : dialog.turno === "manha" ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}>
                {dialog.turno === "noite" ? "Noturno" : dialog.turno === "manha" ? "Matutino" : "Vespertino"}
              </span>
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Disciplina</Label>
              <Select value={editDiscId} onValueChange={(v) => { setEditDiscId(v); setEditProfId(""); setDialogConflictError(null); }}>
                <SelectTrigger data-testid="dialog-select-disciplina">
                  <SelectValue placeholder="Selecionar disciplina..." />
                </SelectTrigger>
                <SelectContent>
                  {disciplinas.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
                        {d.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Professor</Label>
              <Select value={editProfId} onValueChange={(v) => { setEditProfId(v); setDialogConflictError(null); }} disabled={!editDiscId}>
                <SelectTrigger data-testid="dialog-select-professor">
                  <SelectValue placeholder={editDiscId ? "Selecionar professor..." : "Escolha a disciplina primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProfs.length === 0 ? (
                    <SelectItem value="_none" disabled>Nenhum professor habilitado</SelectItem>
                  ) : (
                    filteredProfs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.nomeCompleto}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {editDiscId && filteredProfs.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Nenhum professor cadastrado para esta disciplina.
                </p>
              )}
            </div>
          </div>

          {dialogConflictError && (
            <div className="rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{dialogConflictError}</p>
            </div>
          )}

          {dialog.existing?.isLocked && (
            <div className="rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">Aula travada — definida como Horário Fixo no professor</p>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
            <div className="flex gap-2">
              {dialog.existing && !dialog.existing.isLocked && (
                <Button variant="destructive" size="sm" onClick={() => deleteAlocacao(dialog.existing!)} data-testid="dialog-button-delete">
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Remover Aula
                </Button>
              )}
              {dialog.existing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAlocacoes((prev) =>
                      prev.map((a) =>
                        a.id === dialog.existing!.id ? { ...a, isLocked: !a.isLocked } : a
                      )
                    );
                    setDialog((d) => ({ ...d, open: false }));
                  }}
                >
                  {dialog.existing.isLocked
                    ? <><Unlock className="w-3.5 h-3.5 mr-1.5" />Destravar</>
                    : <><Lock className="w-3.5 h-3.5 mr-1.5" />Travar</>
                  }
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialog((d) => ({ ...d, open: false }))}>Cancelar</Button>
              <Button onClick={saveDialog} disabled={!editDiscId || !editProfId || !!dialog.existing?.isLocked} data-testid="dialog-button-save">Salvar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
