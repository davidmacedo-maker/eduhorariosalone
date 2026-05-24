import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProfessores, useDisciplinas, useTurmas, useAlocacoes, generateId } from "@/store";
import type { Professor } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, GraduationCap, CalendarDays, Lock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DIA_LABELS: Record<string, string> = { segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex" };

const professorSchema = z.object({
  nomeCompleto: z.string()
    .min(1, "Nome é obrigatório")
    .refine(
      v => v.trim().split(/\s+/).filter(Boolean).length >= 2,
      "Digite o nome completo (nome e sobrenome)"
    ),
  masp: z.string().optional(),
  dataAdmissao: z.string().optional(),
  tipoVinculo: z.enum(["efetivo", "designado", ""]).optional(),
  disciplinas: z.array(z.string()),
  turmas: z.array(z.string()),
  cargaHorariaMaximaSemanal: z.coerce.number().min(1).max(60),
});

type ProfForm = z.infer<typeof professorSchema>;

const DIA_LABELS_FULL: Record<string, string> = {
  segunda: "Segunda",
  terca: "Terça",
  quarta: "Quarta",
  quinta: "Quinta",
  sexta: "Sexta",
};

export default function Professores() {
  const [professores, setProfessores] = useProfessores();
  const [disciplinas] = useDisciplinas();
  const [turmas] = useTurmas();
  const [alocacoes, setAlocacoes] = useAlocacoes();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Professor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Professor | null>(null);
  const [disponibilidade, setDisponibilidade] = useState<Record<string, number[]>>({});
  const [search, setSearch] = useState("");
  const [fixoDisc, setFixoDisc] = useState("");
  const [fixoTurma, setFixoTurma] = useState("");
  const [fixoDia, setFixoDia] = useState("");
  const [fixoHorario, setFixoHorario] = useState("");
  const { toast } = useToast();

  const form = useForm<ProfForm>({
    resolver: zodResolver(professorSchema),
    defaultValues: { nomeCompleto: "", disciplinas: [], turmas: [], cargaHorariaMaximaSemanal: 20 },
  });

  function openCreate() {
    form.reset({ nomeCompleto: "", masp: "", dataAdmissao: "", tipoVinculo: "", disciplinas: [], turmas: [], cargaHorariaMaximaSemanal: 20 });
    const allDays: Record<string, number[]> = {};
    DIAS.forEach((d) => { allDays[d] = [1, 2, 3, 4, 5, 6]; });
    setDisponibilidade(allDays);
    setEditingProf(null);
    setModalOpen(true);
  }

  function openEdit(prof: Professor) {
    form.reset({
      nomeCompleto: prof.nomeCompleto,
      masp: prof.masp ?? "",
      dataAdmissao: prof.dataAdmissao ?? "",
      tipoVinculo: prof.tipoVinculo ?? "",
      disciplinas: prof.disciplinas,
      turmas: prof.turmas,
      cargaHorariaMaximaSemanal: prof.cargaHorariaMaximaSemanal,
    });
    setDisponibilidade(prof.disponibilidade);
    setEditingProf(prof);
    setModalOpen(true);
  }

  function toggleDisponibilidade(dia: string, horario: number) {
    setDisponibilidade((prev) => {
      const current = prev[dia] || [];
      if (current.includes(horario)) {
        return { ...prev, [dia]: current.filter((h) => h !== horario) };
      }
      return { ...prev, [dia]: [...current, horario].sort((a, b) => a - b) };
    });
  }

  function onSubmit(data: ProfForm) {
    const cleanData = {
      ...data,
      masp: data.masp || undefined,
      dataAdmissao: data.dataAdmissao || undefined,
      tipoVinculo: (data.tipoVinculo === "efetivo" || data.tipoVinculo === "designado")
        ? data.tipoVinculo
        : undefined,
    };
    if (editingProf) {
      setProfessores((prev) =>
        prev.map((p) => (p.id === editingProf.id ? { ...editingProf, ...cleanData, disponibilidade } : p))
      );
      toast({ title: "Professor atualizado com sucesso" });
    } else {
      const newProf: Professor = { id: generateId(), ...cleanData, disponibilidade };
      setProfessores((prev) => [...prev, newProf]);
      toast({ title: "Professor cadastrado com sucesso" });
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setProfessores((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast({ title: "Professor excluído", variant: "destructive" });
    setDeleteTarget(null);
  }

  function addHorarioFixo() {
    if (!fixoDisc || !fixoTurma || !fixoDia || !fixoHorario || !editingProf) return;
    setAlocacoes((prev) => [
      ...prev,
      {
        id: generateId(),
        turmaId: fixoTurma,
        disciplinaId: fixoDisc,
        professorId: editingProf.id,
        diaSemana: fixoDia,
        horario: Number(fixoHorario),
        isLocked: true,
      },
    ]);
    setFixoDisc("");
    setFixoTurma("");
    setFixoDia("");
    setFixoHorario("");
  }

  function removeHorarioFixo(id: string) {
    setAlocacoes((prev) => prev.filter((a) => a.id !== id));
  }

  const filtered = professores.filter((p) =>
    p.nomeCompleto.toLowerCase().includes(search.toLowerCase())
  );

  const maxPeriods = 6;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Professores</h1>
          <p className="text-muted-foreground mt-1">Gerencie o corpo docente e suas disponibilidades</p>
        </div>
        <Button onClick={openCreate} data-testid="button-novo-professor">
          <Plus className="w-4 h-4 mr-2" />
          Novo Professor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-4">
            <CardTitle className="text-base">Professores ({professores.length})</CardTitle>
            <Input
              placeholder="Buscar professor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs ml-auto"
              type="search"
              data-testid="input-search-professor"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Nenhum professor encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Disciplinas</TableHead>
                    <TableHead>Turmas</TableHead>
                    <TableHead>Carga Máx.</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((prof) => (
                    <TableRow key={prof.id} data-testid={`row-professor-${prof.id}`}>
                      <TableCell className="font-medium">{prof.nomeCompleto}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prof.disciplinas.map((dId) => {
                            const disc = disciplinas.find((d) => d.id === dId);
                            return disc ? (
                              <span
                                key={dId}
                                className="px-1.5 py-0.5 rounded text-xs font-medium text-white"
                                style={{ backgroundColor: disc.cor }}
                              >
                                {disc.abreviacao}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prof.turmas.map((tId) => {
                            const turma = turmas.find((t) => t.id === tId);
                            return turma ? (
                              <Badge key={tId} variant="secondary" className="text-xs">
                                {turma.nome}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{prof.cargaHorariaMaximaSemanal}h/sem</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(prof)} data-testid={`button-edit-professor-${prof.id}`}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(prof)}
                            className="text-destructive hover:text-destructive"
                            data-testid={`button-delete-professor-${prof.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frequência Semanal */}
      {alocacoes.length > 0 && professores.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Frequência Semanal por Professor
          </h2>
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left font-medium text-muted-foreground px-4 py-3 whitespace-nowrap">
                      Professor
                    </th>
                    {DIAS.map((dia) => (
                      <th
                        key={dia}
                        className="text-center font-medium text-muted-foreground px-3 py-3 whitespace-nowrap"
                      >
                        {DIA_LABELS_FULL[dia]}
                      </th>
                    ))}
                    <th className="text-center font-medium text-muted-foreground px-3 py-3 whitespace-nowrap">
                      Total / sem
                    </th>
                    <th className="text-center font-medium text-muted-foreground px-3 py-3 whitespace-nowrap">
                      Dias ativos
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {professores.map((prof, idx) => {
                    const profAlocs = alocacoes.filter((a) => a.professorId === prof.id);
                    const totalAulas = profAlocs.length;
                    const diasAtivos = new Set(profAlocs.map((a) => a.diaSemana)).size;

                    return (
                      <tr
                        key={prof.id}
                        className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                      >
                        <td className="px-4 py-3 font-medium whitespace-nowrap">
                          {prof.nomeCompleto.split(" ")[0]}{" "}
                          <span className="text-muted-foreground font-normal text-xs">
                            {prof.nomeCompleto.split(" ").slice(1).join(" ")}
                          </span>
                        </td>
                        {DIAS.map((dia) => {
                          const dayAlocs = profAlocs.filter((a) => a.diaSemana === dia);
                          if (dayAlocs.length === 0) {
                            return (
                              <td key={dia} className="px-3 py-3 text-center">
                                <span className="text-muted-foreground/40 text-xs">—</span>
                              </td>
                            );
                          }
                          return (
                            <td key={dia} className="px-3 py-3 text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="inline-flex flex-col items-center gap-1 cursor-default">
                                    <span className="font-semibold text-foreground text-base leading-none">
                                      {dayAlocs.length}
                                    </span>
                                    <div className="flex flex-wrap justify-center gap-0.5 max-w-[80px]">
                                      {Array.from(
                                        new Set(dayAlocs.map((a) => a.turmaId))
                                      ).map((tId) => {
                                        const turma = turmas.find((t) => t.id === tId);
                                        return turma ? (
                                          <span
                                            key={tId}
                                            className="bg-primary/10 text-primary rounded px-1 text-[10px] leading-4 font-medium"
                                          >
                                            {turma.nome.replace(" Ano ", "°")}
                                          </span>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[200px]">
                                  <p className="font-semibold mb-1">
                                    {DIA_LABELS_FULL[dia]} — {dayAlocs.length} aula(s)
                                  </p>
                                  <ul className="space-y-0.5">
                                    {dayAlocs
                                      .sort((a, b) => a.horario - b.horario)
                                      .map((a) => {
                                        const disc = disciplinas.find((d) => d.id === a.disciplinaId);
                                        const turma = turmas.find((t) => t.id === a.turmaId);
                                        return (
                                          <li key={a.id}>
                                            {a.horario}º — {disc?.abreviacao ?? "?"} · {turma?.nome ?? "?"}
                                          </li>
                                        );
                                      })}
                                  </ul>
                                </TooltipContent>
                              </Tooltip>
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 text-center">
                          <Badge variant={totalAulas > prof.cargaHorariaMaximaSemanal ? "destructive" : "secondary"}>
                            {totalAulas}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-foreground font-medium">{diasAtivos}</span>
                          <span className="text-muted-foreground text-xs"> / 5</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b">
            <DialogTitle>{editingProf ? "Editar Professor" : "Novo Professor"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-4 px-6 py-4 pb-2">
                <FormField
                  control={form.control}
                  name="nomeCompleto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do professor" {...field} data-testid="input-prof-nome" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="masp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>MASP</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: 1234567" {...field} data-testid="input-prof-masp" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipoVinculo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Vínculo</FormLabel>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-prof-vinculo">
                              <SelectValue placeholder="Selecionar..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="efetivo">Efetivo</SelectItem>
                            <SelectItem value="designado">Designado</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="dataAdmissao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admissão</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="Ex: 01/03/2020, Portaria nº 1234, CBA Nível I…" {...field} data-testid="input-prof-admissao" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cargaHorariaMaximaSemanal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carga Horária Máxima Semanal</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={60} {...field} data-testid="input-prof-carga" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Disciplinas */}
                <FormField
                  control={form.control}
                  name="disciplinas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Disciplinas que Leciona</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {disciplinas.map((d) => (
                          <label key={d.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted">
                            <Checkbox
                              checked={field.value.includes(d.id)}
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange([...field.value, d.id]);
                                else field.onChange(field.value.filter((v) => v !== d.id));
                              }}
                              data-testid={`checkbox-disc-${d.id}`}
                            />
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: d.cor }}
                            />
                            <span className="text-sm">{d.nome}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Turmas */}
                <FormField
                  control={form.control}
                  name="turmas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turmas Vinculadas</FormLabel>
                      <div className="grid grid-cols-2 gap-2">
                        {turmas.map((t) => (
                          <label key={t.id} className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-muted">
                            <Checkbox
                              checked={field.value.includes(t.id)}
                              onCheckedChange={(checked) => {
                                if (checked) field.onChange([...field.value, t.id]);
                                else field.onChange(field.value.filter((v) => v !== t.id));
                              }}
                              data-testid={`checkbox-turma-${t.id}`}
                            />
                            <span className="text-sm">{t.nome}</span>
                          </label>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Disponibilidade */}
                <div>
                  <label className="text-sm font-medium leading-none">Disponibilidade por Dia e Horário</label>
                  <div className="mt-2 overflow-x-auto">
                    <table className="text-sm border-collapse w-full">
                      <thead>
                        <tr>
                          <th className="text-left font-medium text-muted-foreground pb-2 pr-3">Horário</th>
                          {DIAS.map((d) => (
                            <th key={d} className="text-center font-medium text-muted-foreground pb-2 px-2">
                              {DIA_LABELS[d]}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((h) => (
                          <tr key={h}>
                            <td className="py-1 pr-3 text-muted-foreground">{h}º</td>
                            {DIAS.map((dia) => (
                              <td key={dia} className="text-center py-1 px-2">
                                <Checkbox
                                  checked={(disponibilidade[dia] || []).includes(h)}
                                  onCheckedChange={() => toggleDisponibilidade(dia, h)}
                                  data-testid={`disp-${dia}-${h}`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Horários Fixos */}
                {editingProf && (() => {
                  const lockedAlocs = alocacoes.filter(
                    (a) => a.professorId === editingProf.id && a.isLocked
                  );
                  const profDiscs = disciplinas.filter((d) =>
                    form.getValues("disciplinas").includes(d.id)
                  );
                  const profTurmas = turmas.filter((t) =>
                    form.getValues("turmas").includes(t.id)
                  );
                  return (
                    <div className="space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-4">
                      <label className="text-sm font-medium leading-none flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        Horários Fixos (Travados)
                        <span className="text-xs font-normal text-muted-foreground ml-1">— não podem ser movidos pelo gerador automático</span>
                      </label>

                      {lockedAlocs.length > 0 && (
                        <div className="space-y-1.5">
                          {lockedAlocs
                            .sort((a, b) => DIAS.indexOf(a.diaSemana as typeof DIAS[number]) - DIAS.indexOf(b.diaSemana as typeof DIAS[number]) || a.horario - b.horario)
                            .map((aloc) => {
                              const disc  = disciplinas.find((d) => d.id === aloc.disciplinaId);
                              const turma = turmas.find((t) => t.id === aloc.turmaId);
                              return (
                                <div key={aloc.id} className="flex items-center gap-2 rounded-md bg-white dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-3 py-1.5">
                                  <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span className="text-sm flex-1">
                                    <span className="font-medium" style={{ color: disc?.cor }}>{disc?.abreviacao ?? "?"}</span>
                                    {" · "}{turma?.nome ?? "?"}
                                    {" · "}{DIA_LABELS_FULL[aloc.diaSemana] ?? aloc.diaSemana}
                                    {" · "}{aloc.horario}º horário
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => removeHorarioFixo(aloc.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <Select value={fixoDisc} onValueChange={setFixoDisc}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Disciplina..." />
                          </SelectTrigger>
                          <SelectContent>
                            {profDiscs.map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.cor }} />
                                  {d.nome}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={fixoTurma} onValueChange={setFixoTurma}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Turma..." />
                          </SelectTrigger>
                          <SelectContent>
                            {profTurmas.map((t) => (
                              <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={fixoDia} onValueChange={setFixoDia}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Dia da semana..." />
                          </SelectTrigger>
                          <SelectContent>
                            {DIAS.map((d) => (
                              <SelectItem key={d} value={d}>{DIA_LABELS_FULL[d]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select value={fixoHorario} onValueChange={setFixoHorario}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue placeholder="Horário..." />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6].map((h) => (
                              <SelectItem key={h} value={String(h)}>{h}º horário</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
                        onClick={addHorarioFixo}
                        disabled={!fixoDisc || !fixoTurma || !fixoDia || !fixoHorario}
                      >
                        <Lock className="w-3.5 h-3.5 mr-1.5" />
                        Adicionar Horário Fixo
                      </Button>
                    </div>
                  );
                })()}
            </div>
          </div>
          <div className="shrink-0 border-t px-6 py-4 flex justify-end gap-2 bg-background">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              data-testid="button-submit-professor"
              onClick={() =>
                form.handleSubmit(onSubmit, (errors) => {
                  const msgs = Object.values(errors).map((e) => e?.message).filter(Boolean);
                  toast({
                    title: "Campos obrigatórios em falta",
                    description: msgs[0] as string || "Preencha todos os campos obrigatórios.",
                    variant: "destructive",
                  });
                })()
              }
            >
              {editingProf ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Professor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nomeCompleto}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
