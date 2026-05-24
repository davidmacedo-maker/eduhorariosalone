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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
      toast({ title: "Professor updated successfully" });
    } else {
      const newProf: Professor = { id: generateId(), ...cleanData, disponibilidade };
      setProfessores((prev) => [...prev, newProf]);
      toast({ title: "Professor registered successfully" });
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setProfessores((prev) => prev.filter((p) => p.id !== deleteTarget.id));
    toast({ title: "Professor deleted", variant: "destructive" });
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
                                key={d
