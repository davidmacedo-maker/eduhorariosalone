import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProfessores, useDisciplinas, useTurmas, generateId } from "@/store";
import type { Professor } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Pencil, Trash2, GraduationCap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
const DIA_LABELS: Record<string, string> = { segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex" };

const professorSchema = z.object({
  nomeCompleto: z.string().min(1, "Nome é obrigatório"),
  disciplinas: z.array(z.string()).min(1, "Selecione ao menos uma disciplina"),
  turmas: z.array(z.string()).min(1, "Selecione ao menos uma turma"),
  cargaHorariaMaximaSemanal: z.coerce.number().min(1).max(60),
});

type ProfForm = z.infer<typeof professorSchema>;

export default function Professores() {
  const [professores, setProfessores] = useProfessores();
  const [disciplinas] = useDisciplinas();
  const [turmas] = useTurmas();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Professor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Professor | null>(null);
  const [disponibilidade, setDisponibilidade] = useState<Record<string, number[]>>({});
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const form = useForm<ProfForm>({
    resolver: zodResolver(professorSchema),
    defaultValues: { nomeCompleto: "", disciplinas: [], turmas: [], cargaHorariaMaximaSemanal: 20 },
  });

  function openCreate() {
    form.reset({ nomeCompleto: "", disciplinas: [], turmas: [], cargaHorariaMaximaSemanal: 20 });
    const allDays: Record<string, number[]> = {};
    DIAS.forEach((d) => { allDays[d] = [1, 2, 3, 4, 5, 6]; });
    setDisponibilidade(allDays);
    setEditingProf(null);
    setModalOpen(true);
  }

  function openEdit(prof: Professor) {
    form.reset({
      nomeCompleto: prof.nomeCompleto,
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
    if (editingProf) {
      setProfessores((prev) =>
        prev.map((p) => (p.id === editingProf.id ? { ...editingProf, ...data, disponibilidade } : p))
      );
      toast({ title: "Professor atualizado com sucesso" });
    } else {
      const newProf: Professor = { id: generateId(), ...data, disponibilidade };
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

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingProf ? "Editar Professor" : "Novo Professor"}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 overflow-y-auto pr-4">
            <Form {...form}>
              <form id="prof-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pb-2">
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
                  <FormLabel>Disponibilidade por Dia e Horário</FormLabel>
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
              </form>
            </Form>
          </ScrollArea>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="prof-form" data-testid="button-submit-professor">
              {editingProf ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
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
