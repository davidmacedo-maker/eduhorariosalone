import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useConfiguracaoHorarios } from "@/store";
import { generateTimeSlots } from "@/lib/schedule-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Save, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

const configSchema = z.object({
  quantidadeHorariosPorDia: z.coerce.number().min(1).max(12),
  duracaoAulaMinutos: z.coerce.number().min(15).max(120),
  horarioInicial: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  possuiIntervalo: z.boolean(),
  horarioIntervalo: z.coerce.number().min(1).max(12),
  duracaoIntervaloMinutos: z.coerce.number().min(5).max(60),
});

type ConfigForm = z.infer<typeof configSchema>;

export default function Horarios() {
  const [config, setConfig] = useConfiguracaoHorarios();
  const { toast } = useToast();

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: config,
  });

  useEffect(() => {
    form.reset(config);
  }, []);

  const watchedValues = form.watch();
  const previewSlots = (() => {
    try {
      return generateTimeSlots({
        quantidadeHorariosPorDia: Number(watchedValues.quantidadeHorariosPorDia) || 6,
        duracaoAulaMinutos: Number(watchedValues.duracaoAulaMinutos) || 50,
        horarioInicial: watchedValues.horarioInicial || "07:00",
        possuiIntervalo: watchedValues.possuiIntervalo,
        horarioIntervalo: Number(watchedValues.horarioIntervalo) || 3,
        duracaoIntervaloMinutos: Number(watchedValues.duracaoIntervaloMinutos) || 20,
      });
    } catch {
      return [];
    }
  })();

  function onSubmit(data: ConfigForm) {
    setConfig(data);
    toast({ title: "Configuração salva com sucesso" });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração de Horários</h1>
        <p className="text-muted-foreground mt-1">Configure a estrutura de horários do turno</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Parâmetros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="horarioInicial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário de Início</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} data-testid="input-horario-inicial" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantidadeHorariosPorDia"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aulas por Dia</FormLabel>
                        <FormControl>
                          <Input type="number" min={1} max={12} {...field} data-testid="input-qtd-horarios" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duracaoAulaMinutos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (min)</FormLabel>
                        <FormControl>
                          <Input type="number" min={15} max={120} {...field} data-testid="input-duracao-aula" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="possuiIntervalo"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-3">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-intervalo"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Possui Intervalo / Recreio</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {watchedValues.possuiIntervalo && (
                  <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                    <FormField
                      control={form.control}
                      name="horarioIntervalo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Após o horário nº</FormLabel>
                          <FormControl>
                            <Input type="number" min={1} max={12} {...field} data-testid="input-horario-intervalo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duracaoIntervaloMinutos"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração do Intervalo (min)</FormLabel>
                          <FormControl>
                            <Input type="number" min={5} max={60} {...field} data-testid="input-duracao-intervalo" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <Button type="submit" className="w-full" data-testid="button-save-horarios">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Configuração
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pré-visualização da Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {previewSlots.map((slot, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-sm ${
                    slot.isBreak
                      ? "bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100"
                      : "bg-muted"
                  }`}
                  data-testid={`slot-preview-${i}`}
                >
                  <span className="font-medium">
                    {slot.isBreak ? "Intervalo" : `${slot.period}º Horário`}
                  </span>
                  <span className="text-muted-foreground font-mono">
                    {slot.start} – {slot.end}
                  </span>
                  {!slot.isBreak && (
                    <span className="text-xs text-muted-foreground">
                      {watchedValues.duracaoAulaMinutos} min
                    </span>
                  )}
                </div>
              ))}
              {previewSlots.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Configure os parâmetros para ver a pré-visualização
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
