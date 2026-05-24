import type { Turma, Disciplina, Professor, Alocacao, MatrizCurricular, ConfiguracaoHorarios } from "../types";

export interface TimeSlot {
  period: number;
  start: string;
  end: string;
  isBreak: boolean;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function generateTimeSlots(config: ConfiguracaoHorarios): TimeSlot[] {
  const slots: TimeSlot[] = [];
  let current = config.horarioInicial;
  let periodCount = 0;

  for (let i = 1; i <= config.quantidadeHorariosPorDia; i++) {
    periodCount++;
    const start = current;
    const end = addMinutes(current, config.duracaoAulaMinutos);
    slots.push({ period: i, start, end, isBreak: false });
    current = end;

    if (config.possuiIntervalo && periodCount === config.horarioIntervalo) {
      const breakStart = current;
      const breakEnd = addMinutes(current, config.duracaoIntervaloMinutos);
      slots.push({ period: 0, start: breakStart, end: breakEnd, isBreak: true });
      current = breakEnd;
    }
  }

  return slots;
}

export interface Conflito {
  descricao: string;
  tipo: "professor_duplo" | "carga_excedida" | "disponibilidade";
}

export function detectConflicts(
  alocacoes: Alocacao[],
  professores: Professor[],
  _disciplinas: Disciplina[],
  _turmas: Turma[],
  _matriz: MatrizCurricular[]
): Conflito[] {
  const conflicts: Conflito[] = [];
  const days = ["segunda", "terca", "quarta", "quinta", "sexta"];

  for (const dia of days) {
    for (let horario = 1; horario <= 10; horario++) {
      const slot = alocacoes.filter((a) => a.diaSemana === dia && a.horario === horario);
      const profCount: Record<string, number> = {};
      slot.forEach((a) => {
        profCount[a.professorId] = (profCount[a.professorId] || 0) + 1;
      });
      Object.entries(profCount).forEach(([profId, count]) => {
        if (count > 1) {
          const prof = professores.find((p) => p.id === profId);
          const dayNames: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };
          conflicts.push({
            descricao: `Prof. ${prof?.nomeCompleto || profId} está em ${count} turmas ao mesmo tempo (${dayNames[dia]}, ${horario}º horário)`,
            tipo: "professor_duplo",
          });
        }
      });
    }
  }

  alocacoes.forEach((a) => {
    const prof = professores.find((p) => p.id === a.professorId);
    if (prof) {
      const available = prof.disponibilidade[a.diaSemana] || [];
      if (!available.includes(a.horario)) {
        const dayNames: Record<string, string> = { segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta" };
        conflicts.push({
          descricao: `Prof. ${prof.nomeCompleto} não está disponível em ${dayNames[a.diaSemana]} no ${a.horario}º horário`,
          tipo: "disponibilidade",
        });
      }
    }
  });

  return conflicts;
}

export function runAllocation(
  turmas: Turma[],
  disciplinas: Disciplina[],
  professores: Professor[],
  matriz: MatrizCurricular[],
  config: ConfiguracaoHorarios
): { alocacoes: Alocacao[]; conflitos: Conflito[] } {
  const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const result: Alocacao[] = [];
  const conflitos: Conflito[] = [];
  let idCounter = 1;

  const profSlots: Record<string, Set<string>> = {};
  professores.forEach((p) => {
    profSlots[p.id] = new Set();
  });

  for (const turma of turmas) {
    const turmaMatriz = matriz.filter((m) => m.turmaId === turma.id);

    for (const entry of turmaMatriz) {
      const disciplina = disciplinas.find((d) => d.id === entry.disciplinaId);
      if (!disciplina) continue;

      const eligibleProfs = professores.filter(
        (p) => p.disciplinas.includes(entry.disciplinaId) && p.turmas.includes(turma.id)
      );

      if (eligibleProfs.length === 0) {
        conflitos.push({
          descricao: `Nenhum professor disponível para ${disciplina.nome} na turma ${turma.nome}`,
          tipo: "disponibilidade",
        });
        continue;
      }

      let assigned = 0;
      let lastDay = "";

      for (const dia of DIAS) {
        if (assigned >= entry.aulasPorSemana) break;

        for (let horario = 1; horario <= config.quantidadeHorariosPorDia; horario++) {
          if (assigned >= entry.aulasPorSemana) break;

          const slotTaken = result.some(
            (a) => a.turmaId === turma.id && a.diaSemana === dia && a.horario === horario
          );
          if (slotTaken) continue;

          // Avoid consecutive same subject (prefer different days)
          if (dia === lastDay && assigned > 0) continue;

          const availableProf = eligibleProfs.find((p) => {
            const slotKey = `${dia}-${horario}`;
            return !profSlots[p.id].has(slotKey) && (p.disponibilidade[dia] || []).includes(horario);
          });

          if (availableProf) {
            const slotKey = `${dia}-${horario}`;
            profSlots[availableProf.id].add(slotKey);
            result.push({
              id: `gen-${idCounter++}`,
              turmaId: turma.id,
              disciplinaId: entry.disciplinaId,
              professorId: availableProf.id,
              diaSemana: dia,
              horario,
            });
            lastDay = dia;
            assigned++;
          }
        }
      }

      // Second pass without the same-day avoidance if not enough
      if (assigned < entry.aulasPorSemana) {
        for (const dia of DIAS) {
          if (assigned >= entry.aulasPorSemana) break;
          for (let horario = 1; horario <= config.quantidadeHorariosPorDia; horario++) {
            if (assigned >= entry.aulasPorSemana) break;
            const slotTaken = result.some(
              (a) => a.turmaId === turma.id && a.diaSemana === dia && a.horario === horario
            );
            if (slotTaken) continue;

            const availableProf = eligibleProfs.find((p) => {
              const slotKey = `${dia}-${horario}`;
              return !profSlots[p.id].has(slotKey) && (p.disponibilidade[dia] || []).includes(horario);
            });

            if (availableProf) {
              const slotKey = `${dia}-${horario}`;
              profSlots[availableProf.id].add(slotKey);
              result.push({
                id: `gen-${idCounter++}`,
                turmaId: turma.id,
                disciplinaId: entry.disciplinaId,
                professorId: availableProf.id,
                diaSemana: dia,
                horario,
              });
              assigned++;
            }
          }
        }
      }

      if (assigned < entry.aulasPorSemana) {
        conflitos.push({
          descricao: `Não foi possível alocar todas as aulas de ${disciplina.nome} para ${turma.nome} (${assigned}/${entry.aulasPorSemana} aulas alocadas)`,
          tipo: "carga_excedida",
        });
      }
    }
  }

  return { alocacoes: result, conflitos };
}
