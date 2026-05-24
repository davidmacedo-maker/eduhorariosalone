export type Turno = "manha" | "tarde" | "noite";
export type TipoVinculo = "efetivo" | "designado";

export interface HorarioRaw {
  id: string;           // chave interna: dia_turma_aula
  turno: string;        // label: "Matutino" | "Vespertino" | "Noturno"
  turma: string;
  disciplina: string;
  professor: string;
  dia: string;
  aula: number;
  horarioInicio?: string; // ex: "07:00" — coluna horario_inicio do CSV
  horarioFim?: string;    // ex: "07:50" — coluna horario_fim do CSV
  masp?: string;
  cargo?: string;
  importadoEm: string;  // ISO timestamp
}

/**
 * Estrutura hierárquica que espelha o Firebase /horarios/TURNO/idRegistro.
 * Cada turno fica numa "pasta" separada — Matutino nunca sobrescreve Vespertino.
 */
export type BancoDeDados = Record<string, Record<string, HorarioRaw>>;

export interface Turma {
  id: string;
  nome: string;
  turno: Turno;
  serie: string;
  anoLetivo: number;
  observacoes?: string;
}

export interface ConfiguracaoHorarios {
  // ── Turno Matutino ──────────────────────────────
  quantidadeHorariosPorDia: number;
  duracaoAulaMinutos: number;
  horarioInicial: string;
  possuiIntervalo: boolean;
  horarioIntervalo: number;
  duracaoIntervaloMinutos: number;
  // ── Turno Vespertino ─────────────────────────────
  habilitarTarde: boolean;
  horarioInicialTarde: string;
  quantidadeHorariosPorDiaTarde: number;
  duracaoAulaMinutosTarde: number;
  possuiIntervaloTarde: boolean;
  horarioIntervaloTarde: number;
  duracaoIntervaloMinutosTarde: number;
  // ── Turno Noturno ────────────────────────────────
  habilitarNoite: boolean;
  horarioInicialNoite: string;
  quantidadeHorariosPorDiaNoite: number;
  duracaoAulaMinutosNoite: number;
  possuiIntervaloNoite: boolean;
  horarioIntervaloNoite: number;
  duracaoIntervaloMinutosNoite: number;
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
  [dia: string]: number[];
}

export interface Professor {
  id: string;
  nomeCompleto: string;
  masp?: string;
  dataAdmissao?: string;
  tipoVinculo?: TipoVinculo;
  disciplinas: string[];
  turmas: string[];
  disponibilidade: Disponibilidade;
  cargaHorariaMaximaSemanal: number;
}

export interface Alocacao {
  id: string;
  turmaId: string;
  disciplinaId: string;
  professorId: string;
  diaSemana: string;
  horario: number;
  isLocked?: boolean;
}

export interface RegistroPonto {
  id: string;
  alocacaoId: string;
  data: string;
  presente: boolean;
  observacao?: string;
  valor?: string;
}
