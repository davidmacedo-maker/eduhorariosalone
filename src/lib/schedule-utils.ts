import type { Turma, Disciplina, Professor, Alocacao, MatrizCurricular, ConfiguracaoHorarios } from "../types";

export interface TimeSlot {
  period: number;
  start: string;
  end: string;
  isBreak: boolean;
  turno: "manha" | "tarde" | "noite";
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function generateTimeSlotsForTurno(
  config: ConfiguracaoHorarios,
  turno: "manha" | "tarde" | "noite"
): TimeSlot[] {
  const slots: TimeSlot[] = [];

  const isTarde = turno === "tarde";
  const isNoite = turno === "noite";
  const qtd    = isNoite ? (config.quantidadeHorariosPorDiaNoite ?? 4)
               : isTarde ? (config.quantidadeHorariosPorDiaTarde ?? 5)
               : config.quantidadeHorariosPorDia;
  const duracao = isNoite ? (config.duracaoAulaMinutosNoite    ?? 50)
                : isTarde ? (config.duracaoAulaMinutosTarde    ?? 50)
                : config.duracaoAulaMinutos;
  const inicio  = isNoite ? (config.horarioInicialNoite        ?? "19:00")
                : isTarde ? (config.horarioInicialTarde        ?? "13:00")
                : config.horarioInicial;
  const temInt  = isNoite ? (config.possuiIntervaloNoite       ?? false)
                : isTarde ? (config.possuiIntervaloTarde       ?? true)
                : config.possuiIntervalo;
  const aposHor = isNoite ? (config.horarioIntervaloNoite      ?? 2)
                : isTarde ? (config.horarioIntervaloTarde      ?? 3)
                : config.horarioIntervalo;
  const durInt  = isNoite ? (config.duracaoIntervaloMinutosNoite ?? 15)
                : isTarde ? (config.duracaoIntervaloMinutosTarde  ?? 15)
                : config.duracaoIntervaloMinutos;

  let current = inicio;
  let periodCount = 0;

  for (let i = 1; i <= qtd; i++) {
    periodCount++;
    const start = current;
    const end = addMinutes(current, duracao);
    slots.push({ period: i, start, end, isBreak: false, turno });
    current = end;

    if (temInt && periodCount === aposHor) {
      const breakStart = current;
      const breakEnd = addMinutes(current, durInt);
      slots.push({ period: 0, start: breakStart, end: breakEnd, isBreak: true, turno });
      current = breakEnd;
    }
  }

  return slots;
}

/** Backward-compat: returns matutino slots */
export function generateTimeSlots(config: ConfiguracaoHorarios): TimeSlot[] {
  return generateTimeSlotsForTurno(config, "manha");
}

// ─────────────────────────────────────────────────────────────────────────────

export interface Conflito {
  descricao: string;
  tipo: "professor_duplo" | "turma_dupla" | "carga_excedida" | "disponibilidade";
  dia?: string;
  horario?: number;
  turmaId?: string;
  professorId?: string;
}

const DAY_NAMES: Record<string, string> = {
  segunda: "Segunda", terca: "Terça", quarta: "Quarta", quinta: "Quinta", sexta: "Sexta",
};
const DAYS = ["segunda", "terca", "quarta", "quinta", "sexta"];

export function detectConflicts(
  alocacoes: Alocacao[],
  professores: Professor[],
  disciplinas: Disciplina[],
  turmas: Turma[],
  _matriz: MatrizCurricular[]
): Conflito[] {
  const conflicts: Conflito[] = [];

  const profMap  = new Map(professores.map((p) => [p.id, p]));
  const discMap  = new Map(disciplinas.map((d) => [d.id, d]));
  const turmaMap = new Map(turmas.map((t) => [t.id, t]));

  for (const dia of DAYS) {
    for (let horario = 1; horario <= 12; horario++) {
      const slot = alocacoes.filter((a) => a.diaSemana === dia && a.horario === horario);
      if (slot.length === 0) continue;

      // 1. Professor duplicado — only flag if same turno (different turno = different times, ok)
      const profByTurno = new Map<string, Alocacao[]>(); // key = "profId-turno"
      slot.forEach((a) => {
        const turno = turmaMap.get(a.turmaId)?.turno ?? "manha";
        const key = `${a.professorId}-${turno}`;
        const arr = profByTurno.get(key) ?? [];
        arr.push(a);
        profByTurno.set(key, arr);
      });
      profByTurno.forEach((alocs, key) => {
        if (alocs.length > 1) {
          const profId = key.split("-")[0];
          const turno = key.split("-").slice(1).join("-");
          const prof = profMap.get(profId);
          const turmaNames = alocs.map((a) => turmaMap.get(a.turmaId)?.nome ?? "?").join(", ");
          const turnoLabel = turno === "noite" ? "Noturno" : turno === "tarde" ? "Vespertino" : "Matutino";
          conflicts.push({
            descricao: `Prof. ${prof?.nomeCompleto ?? "?"} está em ${alocs.length} turmas ao mesmo tempo (${turnoLabel}): ${turmaNames} — ${DAY_NAMES[dia]}, ${horario}º horário`,
            tipo: "professor_duplo",
            dia,
            horario,
            professorId: profId,
          });
        }
      });

      // 2. Turma com 2 disciplinas no mesmo horário (within the same turno)
      const turmaCount = new Map<string, Alocacao[]>();
      slot.forEach((a) => {
        const arr = turmaCount.get(a.turmaId) ?? [];
        arr.push(a);
        turmaCount.set(a.turmaId, arr);
      });
      turmaCount.forEach((alocs, turmaId) => {
        if (alocs.length > 1) {
          const turma = turmaMap.get(turmaId);
          const discNames = alocs.map((a) => discMap.get(a.disciplinaId)?.nome ?? "?").join(", ");
          conflicts.push({
            descricao: `Turma ${turma?.nome ?? "?"} tem ${alocs.length} disciplinas ao mesmo tempo: ${discNames} — ${DAY_NAMES[dia]}, ${horario}º horário`,
            tipo: "turma_dupla",
            dia,
            horario,
            turmaId,
          });
        }
      });
    }
  }

  // 3. Professor fora da disponibilidade
  alocacoes.forEach((a) => {
    const prof = profMap.get(a.professorId);
    if (prof) {
      const available = prof.disponibilidade[a.diaSemana] ?? [];
      if (available.length > 0 && !available.includes(a.horario)) {
        const turma = turmaMap.get(a.turmaId);
        const disc  = discMap.get(a.disciplinaId);
        conflicts.push({
          descricao: `Prof. ${prof.nomeCompleto} não está disponível em ${DAY_NAMES[a.diaSemana]} no ${a.horario}º horário (${disc?.nome ?? "?"} — ${turma?.nome ?? "?"})`,
          tipo: "disponibilidade",
          dia: a.diaSemana,
          horario: a.horario,
          professorId: a.professorId,
          turmaId: a.turmaId,
        });
      }
    }
  });

  return conflicts;
}

// ─────────────────────────────────────────────────────────────────────────────

// ── Resolução automática de conflitos ────────────────────────────────────────
export function autoResolveConflicts(
  alocacoes: Alocacao[],
  professores: Professor[],
  turmas: Turma[]
): { resolved: Alocacao[]; removedIds: string[]; descricoes: string[] } {
  const turmaMap  = new Map(turmas.map((t) => [t.id, t]));
  const profMap   = new Map(professores.map((p) => [p.id, p]));
  const idsToRemove = new Set<string>();
  const descricoes: string[] = [];

  for (const dia of DAYS) {
    for (let horario = 1; horario <= 12; horario++) {
      const slot = alocacoes.filter((a) => a.diaSemana === dia && a.horario === horario);
      if (slot.length === 0) continue;

      // Professor duplicado
      const profByTurno = new Map<string, Alocacao[]>();
      slot.forEach((a) => {
        const turno = turmaMap.get(a.turmaId)?.turno ?? "manha";
        const key = `${a.professorId}-${turno}`;
        profByTurno.set(key, [...(profByTurno.get(key) ?? []), a]);
      });
      profByTurno.forEach((alocs) => {
        if (alocs.length <= 1) return;
        const sorted = [...alocs].sort((a) => (a.isLocked ? -1 : 1));
        sorted.slice(1).forEach((a) => {
          if (!a.isLocked && !idsToRemove.has(a.id)) {
            idsToRemove.add(a.id);
            descricoes.push(`Prof. ${profMap.get(a.professorId)?.nomeCompleto ?? "?"} duplicado em ${DAY_NAMES[dia]}, ${horario}º horário`);
          }
        });
      });

      // Turma duplicada
      const turmaCount = new Map<string, Alocacao[]>();
      slot.forEach((a) => {
        turmaCount.set(a.turmaId, [...(turmaCount.get(a.turmaId) ?? []), a]);
      });
      turmaCount.forEach((alocs, turmaId) => {
        if (alocs.length <= 1) return;
        const sorted = [...alocs].sort((a) => (a.isLocked ? -1 : 1));
        sorted.slice(1).forEach((a) => {
          if (!a.isLocked && !idsToRemove.has(a.id)) {
            idsToRemove.add(a.id);
            descricoes.push(`Turma ${turmaMap.get(turmaId)?.nome ?? "?"} duplicada em ${DAY_NAMES[dia]}, ${horario}º horário`);
          }
        });
      });
    }
  }

  // Disponibilidade
  alocacoes.forEach((a) => {
    if (idsToRemove.has(a.id) || a.isLocked) return;
    const prof = profMap.get(a.professorId);
    if (prof) {
      const available = prof.disponibilidade[a.diaSemana] ?? [];
      if (available.length > 0 && !available.includes(a.horario)) {
        idsToRemove.add(a.id);
        descricoes.push(`Prof. ${prof.nomeCompleto} fora da disponibilidade em ${DAY_NAMES[a.diaSemana]}, ${a.horario}º horário`);
      }
    }
  });

  return {
    resolved: alocacoes.filter((a) => !idsToRemove.has(a.id)),
    removedIds: Array.from(idsToRemove),
    descricoes,
  };
}

export function runAllocation(
  turmas: Turma[],
  disciplinas: Disciplina[],
  professores: Professor[],
  matriz: MatrizCurricular[],
  config: ConfiguracaoHorarios,
  lockedAlocacoes: Alocacao[] = []
): { alocacoes: Alocacao[]; conflitos: Conflito[] } {
  const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"];
  const result: Alocacao[] = [...lockedAlocacoes];
  const conflitos: Conflito[] = [];
  let idCounter = 1;

  const profUsed  = new Map<string, Set<string>>(); // key = "profId", set of "dia-turno-horario"
  const turmaUsed = new Map<string, Set<string>>(); // key = "turmaId", set of "dia-horario"
  professores.forEach((p) => profUsed.set(p.id, new Set()));
  turmas.forEach((t) => turmaUsed.set(t.id, new Set()));

  // Pre-occupy slots for locked allocations
  const turmaMapForLock = new Map(turmas.map((t) => [t.id, t]));
  lockedAlocacoes.forEach((a) => {
    const turno = turmaMapForLock.get(a.turmaId)?.turno ?? "manha";
    turmaUsed.get(a.turmaId)?.add(`${a.diaSemana}-${a.horario}`);
    profUsed.get(a.professorId)?.add(`${a.diaSemana}-${turno}-${a.horario}`);
  });

  const discMap  = new Map(disciplinas.map((d) => [d.id, d]));
  const turmaMap = new Map(turmas.map((t) => [t.id, t]));

  interface Req {
    turmaId: string;
    disciplinaId: string;
    aulasPorSemana: number;
    eligibleProfIds: string[];
    turnaName: string;
    discName: string;
    turno: string;
    maxHorarios: number;
  }

  const requirements: Req[] = [];
  for (const turma of turmas) {
    const turno = turma.turno;
    const maxHorarios = turno === "noite"
      ? (config.quantidadeHorariosPorDiaNoite ?? 4)
      : turno === "tarde"
        ? (config.quantidadeHorariosPorDiaTarde ?? 5)
        : config.quantidadeHorariosPorDia;

    for (const entry of matriz.filter((m) => m.turmaId === turma.id)) {
      const disc = discMap.get(entry.disciplinaId);
      const eligible = professores.filter(
        (p) => p.disciplinas.includes(entry.disciplinaId) && p.turmas.includes(turma.id)
      );
      if (eligible.length === 0) {
        conflitos.push({
          descricao: `Nenhum professor disponível para ${disc?.nome ?? entry.disciplinaId} na turma ${turma.nome}`,
          tipo: "disponibilidade",
        });
        continue;
      }
      requirements.push({
        turmaId: turma.id,
        disciplinaId: entry.disciplinaId,
        aulasPorSemana: entry.aulasPorSemana,
        eligibleProfIds: eligible.map((p) => p.id),
        turnaName: turma.nome,
        discName: disc?.nome ?? entry.disciplinaId,
        turno,
        maxHorarios,
      });
    }
  }

  // MRV sort
  requirements.sort((a, b) => {
    const diff = a.eligibleProfIds.length - b.eligibleProfIds.length;
    return diff !== 0 ? diff : b.aulasPorSemana - a.aulasPorSemana;
  });

  function canPlace(req: Req, profId: string, dia: string, horario: number): boolean {
    const turmaSlotKey = `${dia}-${horario}`;
    if (turmaUsed.get(req.turmaId)?.has(turmaSlotKey)) return false;

    // Prof conflict only within same turno
    const profSlotKey = `${dia}-${req.turno}-${horario}`;
    if (profUsed.get(profId)?.has(profSlotKey)) return false;

    const prof = professores.find((p) => p.id === profId);
    return Boolean(prof && (prof.disponibilidade[dia] ?? []).includes(horario));
  }

  function place(req: Req, profId: string, disciplinaId: string, dia: string, horario: number) {
    turmaUsed.get(req.turmaId)!.add(`${dia}-${horario}`);
    profUsed.get(profId)!.add(`${dia}-${req.turno}-${horario}`);
    result.push({ id: `gen-${idCounter++}`, turmaId: req.turmaId, disciplinaId, professorId: profId, diaSemana: dia, horario });
  }

  function pickProf(req: Req, dia: string, horario: number): string | undefined {
    return req.eligibleProfIds
      .filter((pid) => canPlace(req, pid, dia, horario))
      .sort((a, b) => (profUsed.get(a)?.size ?? 0) - (profUsed.get(b)?.size ?? 0))[0];
  }

  for (const req of requirements) {
    let assigned = 0;
    const diasUsed = new Set<string>();

    for (const dia of DIAS) {
      if (assigned >= req.aulasPorSemana) break;
      if (diasUsed.has(dia)) continue;
      for (let h = 1; h <= req.maxHorarios; h++) {
        if (assigned >= req.aulasPorSemana) break;
        const profId = pickProf(req, dia, h);
        if (profId) {
          place(req, profId, req.disciplinaId, dia, h);
          diasUsed.add(dia);
          assigned++;
          break;
        }
      }
    }

    if (assigned < req.aulasPorSemana) {
      for (const dia of DIAS) {
        if (assigned >= req.aulasPorSemana) break;
        for (let h = 1; h <= req.maxHorarios; h++) {
          if (assigned >= req.aulasPorSemana) break;
          const profId = pickProf(req, dia, h);
          if (profId) {
            place(req, profId, req.disciplinaId, dia, h);
            assigned++;
          }
        }
      }
    }

    if (assigned < req.aulasPorSemana) {
      const disc = discMap.get(req.disciplinaId);
      const turma = turmaMap.get(req.turmaId);
      conflitos.push({
        descricao: `Não foi possível alocar todas as aulas de ${disc?.nome ?? req.discName} para ${turma?.nome ?? req.turnaName} (${assigned}/${req.aulasPorSemana} aulas alocadas)`,
        tipo: "carga_excedida",
      });
    }
  }

  return { alocacoes: result, conflitos };
}
