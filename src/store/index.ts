import { useState, useCallback } from "react";
import type { Turma, Disciplina, Professor, Alocacao, MatrizCurricular, ConfiguracaoHorarios } from "../types";

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

const SEED_CONFIG: ConfiguracaoHorarios = {
  quantidadeHorariosPorDia: 6,
  duracaoAulaMinutos: 50,
  horarioInicial: "07:00",
  possuiIntervalo: true,
  horarioIntervalo: 3,
  duracaoIntervaloMinutos: 20,
};

const SEED_ALOCACOES: Alocacao[] = [
  { id: "a1", turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "segunda", horario: 1 },
  { id: "a2", turmaId: "t1", disciplinaId: "d2", professorId: "p2", diaSemana: "segunda", horario: 2 },
  { id: "a3", turmaId: "t1", disciplinaId: "d3", professorId: "p3", diaSemana: "segunda", horario: 3 },
  { id: "a4", turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "terca", horario: 1 },
  { id: "a5", turmaId: "t1", disciplinaId: "d4", professorId: "p2", diaSemana: "terca", horario: 2 },
  { id: "a6", turmaId: "t1", disciplinaId: "d5", professorId: "p3", diaSemana: "quarta", horario: 1 },
  { id: "a7", turmaId: "t1", disciplinaId: "d2", professorId: "p2", diaSemana: "quarta", horario: 2 },
  { id: "a8", turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "quinta", horario: 1 },
  { id: "a9", turmaId: "t1", disciplinaId: "d4", professorId: "p2", diaSemana: "quinta", horario: 2 },
  { id: "a10", turmaId: "t1", disciplinaId: "d2", professorId: "p2", diaSemana: "sexta", horario: 1 },
  { id: "a11", turmaId: "t1", disciplinaId: "d3", professorId: "p3", diaSemana: "sexta", horario: 2 },
  { id: "a12", turmaId: "t1", disciplinaId: "d1", professorId: "p1", diaSemana: "sexta", horario: 3 },
  { id: "a13", turmaId: "t2", disciplinaId: "d1", professorId: "p1", diaSemana: "segunda", horario: 4 },
  { id: "a14", turmaId: "t2", disciplinaId: "d2", professorId: "p2", diaSemana: "segunda", horario: 5 },
  { id: "a15", turmaId: "t2", disciplinaId: "d3", professorId: "p3", diaSemana: "terca", horario: 3 },
  { id: "a16", turmaId: "t2", disciplinaId: "d1", professorId: "p1", diaSemana: "terca", horario: 4 },
  { id: "a17", turmaId: "t2", disciplinaId: "d2", professorId: "p2", diaSemana: "quarta", horario: 3 },
  { id: "a18", turmaId: "t2", disciplinaId: "d5", professorId: "p3", diaSemana: "quinta", horario: 3 },
];

function initializeSeedData() {
  const initialized = localStorage.getItem("edu_initialized");
  if (!initialized) {
    localStorage.setItem("edu_turmas", JSON.stringify(SEED_TURMAS));
    localStorage.setItem("edu_disciplinas", JSON.stringify(SEED_DISCIPLINAS));
    localStorage.setItem("edu_matriz", JSON.stringify(SEED_MATRIZ));
    localStorage.setItem("edu_professores", JSON.stringify(SEED_PROFESSORES));
    localStorage.setItem("edu_config", JSON.stringify(SEED_CONFIG));
    localStorage.setItem("edu_alocacoes", JSON.stringify(SEED_ALOCACOES));
    localStorage.setItem("edu_initialized", "true");
  }
}

initializeSeedData();

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const newValue = typeof value === "function" ? (value as (prev: T) => T)(prev) : value;
        try {
          localStorage.setItem(key, JSON.stringify(newValue));
        } catch (e) {
          console.error("Error saving to localStorage", e);
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

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
