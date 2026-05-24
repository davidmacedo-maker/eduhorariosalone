import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDisciplinas, useMatrizCurricular, useTurmas, generateId } from "@/store";
import type { Disciplina } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const disciplinaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  abreviacao: z.string().min(1).max(5, "Máximo 5 caracteres"),
  cor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  cargaHorariaSemanal: z.coerce.number().min(1).max(30),
});

type DisciplinaForm = z.infer<typeof disciplinaSchema>;

export default function Disciplinas() {
  const [disciplinas, setDisciplinas] = useDisciplinas();
  const [matriz, setMatriz] = useMatrizCurricular();
  const [turmas] = useTurmas();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDisc, setEditingDisc] = useState<Disciplina | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disciplina | null>(null);
  const { toast } = useToast();

  const form = useForm<DisciplinaForm>({
    resolver: zodResolver(disciplinaSchema),
    defaultValues: { nome: "", abreviacao: "", cor: "#3B82F6", cargaHorariaSemanal: 2 },
  });

  function openCreate() {
    form.reset({ nome: "", abreviacao: "", cor: "#3B82F6", cargaHorariaSemanal: 2 });
    setEditingDisc(null);
    setModalOpen(true);
  }

  function openEdit(d: Disciplina) {
    form.reset({ nome: d.nome, abreviacao: d.abreviacao, cor: d.cor, cargaHorariaSemanal: d.cargaHorariaSemanal });
    setEditingDisc(d);
    setModalOpen(true);
  }

  function onSubmit(data: DisciplinaForm) {
    if (editingDisc) {
      setDisciplinas((prev) => prev.map((d) => (d.id === editingDisc.id ? { ...editingDisc, ...data } : d)));
      toast({ title: "Disciplina atualizada com sucesso" });
    } else {
      const newDisc: Disciplina = { id: generateId(), ...data };
      setDisciplinas((prev) => [...prev, newDisc]);
      toast({ title: "Disciplina criada com sucesso" });
    }
    setModalOpen(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    setDisciplinas((prev) => prev.filter((d) => d.id !== deleteTarget.id));
    setMatriz((prev) => prev.filter((m) => m.disciplinaId !== deleteTarget.id));
    toast({ title: "Disciplina excluída", variant: "destructive" });
    setDeleteTarget(null);
  }

  function getMatrizValue(turmaId: string, disciplinaId: string) {
    return matriz.find((m) => m.turmaId === turmaId && m.disciplinaId === disciplinaId)?.aulasPorSemana ?? 0;
  }

  function setMatrizValue(turmaId: string, disciplinaId: string, value: number) {
    setMatriz((prev) => {
      const existing = prev.find((m) => m.turmaId === turmaId && m.disciplinaId === disciplinaId);
      if (existing) {
        if (value === 0) return prev.filter((m) => !(m.turmaId === turmaId && m.disciplinaId === disciplinaId));
        return prev.map((m) => (m.turmaId === turmaId && m.disciplinaId === disciplinaId ? { ...m, aulasPorSemana: value } : m));
      }
      if (value > 0) return [...prev, { turmaId, disciplinaId, aulasPorSemana: value }];
      return prev;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Disciplinas</h1>
          <p className="text-muted-foreground mt-1">Gerencie disciplinas e a matriz curricular</p>
        </div>
        <Button onClick={openCreate} data-testid="button-nova-disciplina">
          <Plus className="w-4 h-4 mr-2" />
          Nova Disciplina
        </Button>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {disciplinas.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma disciplina cadastrada</p>
          </div>
        )}
        {disciplinas.map((d) => (
          <Card key={d.id} className="relative overflow-hidden" data-testid={`card-disciplina-${d.id}`}>
            <div className="h-1.5 w-full" style={{ backgroundColor: d.cor }} />
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{d.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded font-bold text-white"
                      style={{ backgroundColor: d.cor }}
                    >
                      {d.abreviacao}
                    </span>
                    <span className="text-xs text-muted-foreground">{d.cargaHorariaSemanal}h/sem</span>
                  </div>
                </div>
                <div className="flex gap-1 ml-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(d)} data-testid={`button-edit-disciplina-${d.id}`}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(d)}
                    data-testid={`button-delete-disciplina-${d.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Matriz Curricular */}
      {turmas.length > 0 && disciplinas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Matriz Curricular — Aulas por Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Turma</TableHead>
                    {disciplinas.map((d) => (
                      <TableHead key={d.id} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: d.cor }}
                          />
                          <span className="text-xs">{d.abreviacao}</span>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {turmas.map((turma) => {
                    const total = disciplinas.reduce((sum, d) => sum + getMatrizValue(turma.id, d.id), 0);
                    return (
                      <TableRow key={turma.id} data-testid={`matriz-row-${turma.id}`}>
                        <TableCell className="font-medium">{turma.nome}</TableCell>
                        {disciplinas.map((d) => (
                          <TableCell key={d.id} className="text-center p-1">
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              className="w-14 text-center mx-auto h-8 text-sm"
                              value={getMatrizValue(turma.id, d.id)}
                              onChange={(e) => setMatrizValue(turma.id, d.id, Number(e.target.value))}
                              data-testid={`matriz-input-${turma.id}-${d.id}`}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-semibold text-primary">{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingDisc ? "Editar Disciplina" : "Nova Disciplina"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Matemática" {...field} data-testid="input-disc-nome" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="abreviacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abreviação</FormLabel>
                      <FormControl>
                        <Input placeholder="MAT" maxLength={5} {...field} data-testid="input-disc-abrev" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cargaHorariaSemanal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carga Semanal (h)</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={30} {...field} data-testid="input-disc-carga" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="cor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cor</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          {...field}
                          className="h-9 w-16 cursor-pointer rounded border border-input"
                          data-testid="input-disc-cor"
                        />
                        <span className="text-sm font-mono text-muted-foreground">{field.value}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" data-testid="button-submit-disciplina">
                  {editingDisc ? "Salvar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Disciplina</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.nome}</strong>? Isso também removerá as entradas na matriz curricular.
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
