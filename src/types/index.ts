export type Turno = "manha" | "tarde" | "noite";

export interface Turma {
  id: string;
  nome: string;
  turno: Turno;
  serie: string;
  anoLetivo: number;
  observacoes?: string;
}

export interface ConfiguracaoHorarios {
  quantidadeHorariosPorDia: number;
  duracaoAulaMinutos: number;
  horarioInicial: string;
  possuiIntervalo: boolean;
  horarioIntervalo: number; // After which period
  duracaoIntervaloMinutos: number;
}

export interface Disciplina {
  id: string;
  nome: string;
  abreviacao: string;
  cor: string;
  cargaHorariaSemanal: number;
}

export interface MatrizCurricular {
  turmaId: string;
  disciplinaId: string;
  aulasPorSemana: number;
}

export interface Disponibilidade {
  [dia: string]: number[]; // "segunda": [1, 2, 3]
}

export interface Professor {
  id: string;
  nomeCompleto: string;
  disciplinas: string[]; // array of disciplinaId
  turmas: string[]; // array of turmaId
  disponibilidade: Disponibilidade;
  cargaHorariaMaximaSemanal: number;
}

export interface Alocacao {
  id: string;
  turmaId: string;
  disciplinaId: string;
  professorId: string;
  diaSemana: string; // "segunda", "terca", etc.
  horario: number; // 1-6
}
