import { useState, useCallback } from "react";
import type { Turma, Disciplina, Professor, Alocacao, MatrizCurricular, ConfiguracaoHorarios, RegistroPonto, HorarioRaw, BancoDeDados } from "@/types";

const SCHEMA_VERSION = "4";

const SEED_TURMAS: Turma[] = [
  { id: "t1", nome: "6º Ano A", turno: "manha", serie: "6º Ano", anoLetivo: 2025, observacoes: "Turma do período da manhã" },
  { id: "t2", nome: "7º Ano B", turno: "tarde", serie: "7º Ano", anoLetivo: 2025, observacoes: "" },
  { id: "t3", nome: "8º Ano A", turno: "manha", serie: "8º Ano", anoLetivo: 2025, observacoes: "" },
];

const SEED_DISCIPLINAS: Disciplina[] = [
  { id: "d1", nome: "Matemática", abreviacao: "MAT", cor: "#3B82F6", cargaHorariaSemanal: 5 },
  { id: "d2", nome: "Português", abreviacao: "POR", cor: "#22C55E", cargaHorariaSemanal: 5 },
  { id: "d3", nome: "Ciências", abreviacao: "CIE", cor: "#F97316", cargaHorariaSemanal: 3 },
  { id: "d4", nome: "História", abreviacao: "HIS", cor: "#A855F7", cargaHorariaSemanal: 2 },
  { id: "d5", nome: "Ed. Física", abreviacao: "EDF", cor: "#EF4444", cargaHorariaSemanal: 2 },
];

const SEED_MATRIZ: MatrizCurricular[] = [
  { turmaId: "t1", disciplinaId: "d1", aulasPorSemana: 4 },
  { turmaId: "t1", disciplinaId: "d2", aulasPorSemana: 4 },
  { turmaId: "t1", disciplinaId: "d3", aulasPorSemana: 3 },
  { turmaId: "t1", disciplinaId: "d4", aulasPorSemana: 2 },
  { turmaId: "t1", disciplinaId: "d5", aulasPorSemana: 2 },
  { turmaId: "t2", disciplinaId: "d1", aulasPorSemana: 4 },
  { turmaId: "t2", disciplinaId: "d2", aulasPorSemana: 4 },
  { turmaId: "t2", disciplinaId: "d3", aulasPorSemana: 3 },
  { turmaId: "t2", disciplinaId: "d4", aulasPorSemana: 2 },
  { turmaId: "t2", disciplinaId: "d5", aulasPorSemana: 2 },
  { turmaId: "t3", disciplinaId: "d1", aulasPorSemana: 5 },
  { turmaId: "t3", disciplinaId: "d2", aulasPorSemana: 4 },
  { turmaId: "t3", disciplinaId: "d3", aulasPorSemana: 3 },
  { turmaId: "t3", disciplinaId: "d4", aulasPorSemana: 2 },
  { turmaId: "t3", disciplinaId: "d5", aulasPorSemana: 2 },
];

const SEED_PROFESSORES: Professor[] = [
  {
    id: "p1",
    nomeCompleto: "Ana Paula Silva",
    disciplinas: ["d1"],
    turmas: ["t1", "t2", "t3"],
    disponibilidade: {
      segunda: [1, 2, 3, 4, 5, 6],
      terca: [1, 2, 3, 4, 5, 6],
      quarta: [1, 2, 3, 4, 5, 6],
      quinta: [1, 2, 3, 4, 5, 6],
      sexta: [1, 2, 3, 4, 5, 6],
    },
    cargaHorariaMaximaSemanal: 20,
  },
  {
    id: "p2",
    nomeCompleto: "Carlos Roberto Lima",
    disciplinas: ["d2", "d4"],
    turmas: ["t1", "t2", "t3"],
    disponibilidade: {
      segunda: [1, 2, 3, 4, 5, 6],
      terca: [1, 2, 3, 4, 5, 6],
      quarta: [1, 2, 3, 4, 5, 6],
      quinta: [1, 2, 3, 4, 5, 6],
      sexta: [1, 2, 3, 4, 5, 6],
    },
    cargaHorariaMaximaSemanal: 20,
  },
  {
    id: "p3",
    nomeCompleto: "Mariana Santos Oliveira",
    disciplinas: ["d3", "d5"],
    turmas: ["t1", "t2", "t3"],
    disponibilidade: {
      segunda: [1, 2, 3, 4, 5, 6],
      terca: [1, 2, 3, 4, 5, 6],
      quarta: [1, 2, 3, 4, 5, 6],
      quinta: [1, 2, 3, 4, 5, 6],
      sexta: [1, 2, 3, 4, 5, 6],
    },
    cargaHorariaMaximaSemanal: 20,
  },
];

const TARDE_DEFAULTS = {
  habilitarTarde: true,
  horarioInicialTarde: "12:00",
  quantidadeHorariosPorDiaTarde: 5,
  duracaoAulaMinutosTarde: 50,
  possuiIntervaloTarde: true,
  horarioIntervaloTarde: 3,
  duracaoIntervaloMinutosTarde: 15,
} as const;

const NOITE_DEFAULTS = {
  habilitarNoite: false,
  horarioInicialNoite: "19:00",
  quantidadeHorariosPorDiaNoite: 4,
  duracaoAulaMinutosNoite: 50,
  possuiIntervaloNoite: false,
  horarioIntervaloNoite: 2,
  duracaoIntervaloMinutosNoite: 15,
} as const;

const SEED_CONFIG: ConfiguracaoHorarios = {
  quantidadeHorariosPorDia: 6,
  duracaoAulaMinutos: 50,
  horarioInicial: "07:00",
  possuiIntervalo: true,
  horarioIntervalo: 3,
  duracaoIntervaloMinutos: 15,
  ...TARDE_DEFAULTS,
  ...NOITE_DEFAULTS,
};

const SEED_ALOCACOES: Alocacao[] = [
  { id: "a1",  turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "segunda", horario: 1 },
  { id: "a2",  turmaId: "t1", disciplinaId: "d2", professorId: "p2", diaSemana: "segunda", horario: 2 },
  { id: "a3",  turmaId: "t1", disciplinaId: "d3", professorId: "p3", diaSemana: "segunda", horario: 3 },
  { id: "a4",  turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "terca",   horario: 1 },
  { id: "a5",  turmaId: "t1", disciplinaId: "d4", professorId: "p2", diaSemana: "terca",   horario: 2 },
  { id: "a6",  turmaId: "t1", disciplinaId: "d5", professorId: "p3", diaSemana: "quarta",  horario: 1 },
  { id: "a7",  turmaId: "t1", disciplinaId: "d2", professorId: "p2", diaSemana: "quarta",  horario: 2 },
  { id: "a8",  turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "quinta",  horario: 1 },
  { id: "a9",  turmaId: "t1", disciplinaId: "d4", professorId: "p2", diaSemana: "quinta",  horario: 2 },
  { id: "a10", turmaId: "t1", disciplinaId: "d2", professorId: "p2", diaSemana: "sexta",   horario: 1 },
  { id: "a11", turmaId: "t1", disciplinaId: "d3", professorId: "p3", diaSemana: "sexta",   horario: 2 },
  { id: "a12", turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "sexta",   horario: 3 },
  { id: "a13", turmaId: "t2", disciplinaId: "d1", professorId: "p1", diaSemana: "segunda", horario: 1 },
  { id: "a14", turmaId: "t2", disciplinaId: "d2", professorId: "p2", diaSemana: "segunda", horario: 2 },
  { id: "a15", turmaId: "t2", disciplinaId: "d3", professorId: "p3", diaSemana: "terca",   horario: 1 },
  { id: "a16", turmaId: "t2", disciplinaId: "d1", professorId: "p1", diaSemana: "terca",   horario: 2 },
  { id: "a17", turmaId: "t2", disciplinaId: "d2", professorId: "p2", diaSemana: "quarta",  horario: 1 },
  { id: "a18", turmaId: "t2", disciplinaId: "d5", professorId: "p3", diaSemana: "quinta",  horario: 1 },
];

function atomicSave(state: {
  turmas?: Turma[];
  disciplinas?: Disciplina[];
  professores?: Professor[];
  alocacoes?: Alocacao[];
  config?: ConfiguracaoHorarios;
  matriz?: MatrizCurricular[];
}) {
  try {
    if (state.turmas      !== undefined) localStorage.setItem("edu_turmas",      JSON.stringify(state.turmas));
    if (state.disciplinas !== undefined) localStorage.setItem("edu_disciplinas",  JSON.stringify(state.disciplinas));
    if (state.professores !== undefined) localStorage.setItem("edu_professores",  JSON.stringify(state.professores));
    if (state.alocacoes   !== undefined) localStorage.setItem("edu_alocacoes",    JSON.stringify(state.alocacoes));
    if (state.config      !== undefined) localStorage.setItem("edu_config",       JSON.stringify(state.config));
    if (state.matriz      !== undefined) localStorage.setItem("edu_matriz",       JSON.stringify(state.matriz));
    localStorage.setItem("edu_last_saved", new Date().toISOString());
  } catch {
    // localStorage unavailable or quota exceeded
  }
}

export function exportFullState() {
  return {
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      turmas:      tryParse<Turma[]>("edu_turmas", []),
      disciplinas: tryParse<Disciplina[]>("edu_disciplinas", []),
      professores: tryParse<Professor[]>("edu_professores", []),
      alocacoes:   tryParse<Alocacao[]>("edu_alocacoes", []),
      config:      tryParse<ConfiguracaoHorarios>("edu_config", SEED_CONFIG),
      matriz:      tryParse<MatrizCurricular[]>("edu_matriz", []),
    },
  };
}

function tryParse<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function migrateIfNeeded() {
  const savedVersion = localStorage.getItem("edu_schema_version");

  // Always ensure tarde/noite defaults are filled in (backward-compat for configs before multi-shift)
  const storedConfig = tryParse<Record<string, unknown>>("edu_config", {});
  if (storedConfig && !("habilitarTarde" in storedConfig)) {
    localStorage.setItem("edu_config", JSON.stringify({ ...storedConfig, ...TARDE_DEFAULTS }));
  }
  if (storedConfig && !("habilitarNoite" in storedConfig)) {
    const current = tryParse<Record<string, unknown>>("edu_config", {});
    localStorage.setItem("edu_config", JSON.stringify({ ...current, ...NOITE_DEFAULTS }));
  }

  if (savedVersion === SCHEMA_VERSION) return;

  // v4: standardise schedule defaults — interval 15 min, afternoon starts 12:00, afternoon enabled
  if (savedVersion !== "4") {
    const cfg = tryParse<Record<string, unknown>>("edu_config", {});
    const patches: Record<string, unknown> = {};
    if (cfg["duracaoIntervaloMinutos"] === 20)   patches["duracaoIntervaloMinutos"] = 15;
    if (cfg["horarioInicialTarde"]     === "13:00") patches["horarioInicialTarde"] = "12:00";
    if (cfg["habilitarTarde"]          === false) patches["habilitarTarde"] = true;
    if (Object.keys(patches).length > 0) {
      localStorage.setItem("edu_config", JSON.stringify({ ...cfg, ...patches }));
    }
  }

  localStorage.setItem("edu_schema_version", SCHEMA_VERSION);
}

function initializeSeedData() {
  migrateIfNeeded();
  const initialized = localStorage.getItem("edu_initialized");
  if (!initialized) {
    atomicSave({
      turmas: SEED_TURMAS,
      disciplinas: SEED_DISCIPLINAS,
      professores: SEED_PROFESSORES,
      config: SEED_CONFIG,
      alocacoes: SEED_ALOCACOES,
      matriz: SEED_MATRIZ,
    });
    localStorage.setItem("edu_initialized", "true");
  }
}

initializeSeedData();

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => tryParse<T>(key, initialValue));

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
          localStorage.setItem("edu_last_saved", new Date().toISOString());
        } catch {
          // Quota exceeded or private-mode restriction
        }
        return newValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}

export function useTurmas() {
  return useLocalStorage<Turma[]>("edu_turmas", []);
}

export function useDisciplinas() {
  return useLocalStorage<Disciplina[]>("edu_disciplinas", []);
}

export function useMatrizCurricular() {
  return useLocalStorage<MatrizCurricular[]>("edu_matriz", []);
}

export function useProfessores() {
  return useLocalStorage<Professor[]>("edu_professores", []);
}

export function useConfiguracaoHorarios() {
  return useLocalStorage<ConfiguracaoHorarios>("edu_config", SEED_CONFIG);
}

export function useAlocacoes() {
  return useLocalStorage<Alocacao[]>("edu_alocacoes", []);
}

export function useNomeEscola() {
  return useLocalStorage<string>("edu_escola_nome", "Escola Municipal");
}

export function useRegistrosPonto() {
  return useLocalStorage<RegistroPonto[]>("edu_registros_ponto", []);
}

/**
 * Banco de dados hierárquico: { "Matutino": { "Segunda_6A_1": HorarioRaw } }
 * Espelha a estrutura Firebase /horarios/TURNO/idRegistro —
 * cada turno fica numa "pasta" separada, nunca sobrescreve o outro.
 */
export function useHorarios() {
  return useLocalStorage<BancoDeDados>("edu_horarios", {});
}

/**
 * Merge da estrutura hierárquica BancoDeDados.
 * Para cada turno, combina os registros existentes com os novos
 * e remove duplicatas pelo idRegistro (chave interna dia_turma_aula).
 * Equivale a: updates[`/horarios/${turno}/${idRegistro}`] = item do Firebase.
 */
export function mergeHorarios(existentes: BancoDeDados, novos: BancoDeDados): BancoDeDados {
  const resultado: BancoDeDados = { ...existentes };
  for (const turno of Object.keys(novos)) {
    resultado[turno] = { ...(resultado[turno] ?? {}), ...novos[turno] };
  }
  return resultado;
}

/**
 * Converte o BancoDeDados hierárquico numa lista plana de HorarioRaw.
 * Útil para exibir todos os registros em tabelas.
 */
export function horariosParaLista(banco: BancoDeDados): HorarioRaw[] {
  return Object.values(banco).flatMap(grupo => Object.values(grupo));
}

/**
 * Retorna apenas os horários de um turno específico.
 * Equivale a: ref(db, `horarios/${turnoDesejado}`) do Firebase.
 */
export function horariosDoTurno(banco: BancoDeDados, turno: string): HorarioRaw[] {
  return Object.values(banco[turno] ?? {});
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
