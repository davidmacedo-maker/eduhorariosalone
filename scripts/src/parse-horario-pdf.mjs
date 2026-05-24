// Parses the schedule data visible in the attached PDF and generates a backup JSON.
// Run: node scripts/src/parse-horario-pdf.mjs

const CORES = [
  "#3B82F6","#22C55E","#F97316","#A855F7","#EF4444",
  "#0EA5E9","#F59E0B","#10B981","#EC4899","#6366F1",
  "#14B8A6","#F43F5E","#8B5CF6","#84CC16","#06B6D4",
  "#D946EF","#FB923C","#34D399","#60A5FA","#A78BFA","#FBBF24"
];

// ── Turmas (classes from the PDF grid: 82, 91, 92, 101, 201, 202, 301, 302) ──
const turmas = [
  { id: "turma_1", nome: "8º Ano - T2",  turno: "manha", serie: "8º Ano",  anoLetivo: 2026, observacoes: "" },
  { id: "turma_2", nome: "9º Ano - T1",  turno: "manha", serie: "9º Ano",  anoLetivo: 2026, observacoes: "" },
  { id: "turma_3", nome: "9º Ano - T2",  turno: "manha", serie: "9º Ano",  anoLetivo: 2026, observacoes: "" },
  { id: "turma_4", nome: "1º EM - T1",   turno: "manha", serie: "1º EM",   anoLetivo: 2026, observacoes: "" },
  { id: "turma_5", nome: "2º EM - T1",   turno: "manha", serie: "2º EM",   anoLetivo: 2026, observacoes: "" },
  { id: "turma_6", nome: "2º EM - T2",   turno: "manha", serie: "2º EM",   anoLetivo: 2026, observacoes: "" },
  { id: "turma_7", nome: "3º EM - T1",   turno: "manha", serie: "3º EM",   anoLetivo: 2026, observacoes: "" },
  { id: "turma_8", nome: "3º EM - T2",   turno: "manha", serie: "3º EM",   anoLetivo: 2026, observacoes: "" },
];

// Code → turmaId (as in PDF header row)
const TURMA_CODE = { "82":"turma_1","91":"turma_2","92":"turma_3","101":"turma_4","201":"turma_5","202":"turma_6","301":"turma_7","302":"turma_8" };

// ── Disciplines (all that appear in the PDF) ──────────────────────────────────
const discList = [
  { id:"disc_1",  nome:"MAT",         abreviacao:"MAT",    cor:CORES[0],  cargaHorariaSemanal:5 },
  { id:"disc_2",  nome:"GEO",         abreviacao:"GEO",    cor:CORES[1],  cargaHorariaSemanal:2 },
  { id:"disc_3",  nome:"ED FIS",      abreviacao:"EDF",    cor:CORES[2],  cargaHorariaSemanal:2 },
  { id:"disc_4",  nome:"SOC",         abreviacao:"SOC",    cor:CORES[3],  cargaHorariaSemanal:2 },
  { id:"disc_5",  nome:"POT",         abreviacao:"POT",    cor:CORES[4],  cargaHorariaSemanal:4 },
  { id:"disc_6",  nome:"BIO",         abreviacao:"BIO",    cor:CORES[5],  cargaHorariaSemanal:2 },
  { id:"disc_7",  nome:"CIE",         abreviacao:"CIE",    cor:CORES[6],  cargaHorariaSemanal:2 },
  { id:"disc_8",  nome:"FIL",         abreviacao:"FIL",    cor:CORES[7],  cargaHorariaSemanal:2 },
  { id:"disc_9",  nome:"HIST",        abreviacao:"HIST",   cor:CORES[8],  cargaHorariaSemanal:2 },
  { id:"disc_10", nome:"FIS",         abreviacao:"FIS",    cor:CORES[9],  cargaHorariaSemanal:2 },
  { id:"disc_11", nome:"QUI",         abreviacao:"QUI",    cor:CORES[10], cargaHorariaSemanal:2 },
  { id:"disc_12", nome:"ING",         abreviacao:"ING",    cor:CORES[11], cargaHorariaSemanal:2 },
  { id:"disc_13", nome:"ARTE",        abreviacao:"ARTE",   cor:CORES[12], cargaHorariaSemanal:2 },
  { id:"disc_14", nome:"ENS REL",     abreviacao:"EREL",   cor:CORES[13], cargaHorariaSemanal:1 },
  { id:"disc_15", nome:"INTERV CID",  abreviacao:"ICID",   cor:CORES[14], cargaHorariaSemanal:2 },
  { id:"disc_16", nome:"CONEX/MAT",   abreviacao:"CXMT",   cor:CORES[15], cargaHorariaSemanal:1 },
  { id:"disc_17", nome:"LEIT/PROTA",  abreviacao:"LPIT",   cor:CORES[16], cargaHorariaSemanal:1 },
  { id:"disc_18", nome:"PROD.CULT",   abreviacao:"PCLT",   cor:CORES[17], cargaHorariaSemanal:2 },
  { id:"disc_19", nome:"INOV SABER",  abreviacao:"INSB",   cor:CORES[18], cargaHorariaSemanal:1 },
  { id:"disc_20", nome:"SOLUC MATE",  abreviacao:"SLMT",   cor:CORES[19], cargaHorariaSemanal:1 },
  { id:"disc_21", nome:"EDUC DIGIT",  abreviacao:"EDGT",   cor:CORES[20], cargaHorariaSemanal:1 },
];
const DISC_MAP = Object.fromEntries(discList.map(d => [d.nome, d.id]));

const DISP = { segunda:[1,2,3,4,5], terca:[1,2,3,4,5], quarta:[1,2,3,4,5], quinta:[1,2,3,4,5], sexta:[1,2,3,4,5] };

// ── Teachers ──────────────────────────────────────────────────────────────────
const profList = [
  { id:"prof_1",  nomeCompleto:"Daniela",   disciplinas:["disc_2"],                     },
  { id:"prof_2",  nomeCompleto:"Claudiane", disciplinas:["disc_1"],                     },
  { id:"prof_3",  nomeCompleto:"Josy",      disciplinas:["disc_3"],                     },
  { id:"prof_4",  nomeCompleto:"Maiez",     disciplinas:["disc_1","disc_16","disc_20"],  },
  { id:"prof_5",  nomeCompleto:"Venisio",   disciplinas:["disc_4"],                     },
  { id:"prof_6",  nomeCompleto:"Soely",     disciplinas:["disc_5","disc_21"],            },
  { id:"prof_7",  nomeCompleto:"Geralda",   disciplinas:["disc_5"],                     },
  { id:"prof_8",  nomeCompleto:"Denalda",   disciplinas:["disc_6","disc_7","disc_19"],   },
  { id:"prof_9",  nomeCompleto:"Alana",     disciplinas:["disc_15"],                    },
  { id:"prof_10", nomeCompleto:"Barbara",   disciplinas:["disc_17","disc_18"],           },
  { id:"prof_11", nomeCompleto:"Ze Carlos", disciplinas:["disc_8","disc_2"],             },
  { id:"prof_12", nomeCompleto:"Ivete",     disciplinas:["disc_9"],                     },
  { id:"prof_13", nomeCompleto:"Dora",      disciplinas:["disc_10","disc_11"],           },
  { id:"prof_14", nomeCompleto:"Kleber",    disciplinas:["disc_12","disc_5"],            },
  { id:"prof_15", nomeCompleto:"Lula",      disciplinas:["disc_13"],                    },
  { id:"prof_16", nomeCompleto:"Liza",      disciplinas:["disc_14"],                    },
  { id:"prof_17", nomeCompleto:"Alcino",    disciplinas:["disc_9"],                     },
].map(p => ({ ...p, turmas:[], disponibilidade:DISP, cargaHorariaMaximaSemanal:20 }));

const PROF_MAP = Object.fromEntries(profList.map(p => [p.nomeCompleto.toUpperCase(), p.id]));
// Alias map for teacher name variants in the schedule
const PROF_ALIAS = {
  "DANIELA":"prof_1","CLAUDIANE":"prof_2","JOSY":"prof_3","MAIEZ":"prof_4",
  "VENISIO":"prof_5","SOELY":"prof_6","GERALDA":"prof_7","DENALDA":"prof_8",
  "ALANA":"prof_9","BARBARA":"prof_10","ZE CARLOS":"prof_11","IVETE":"prof_12",
  "DORA":"prof_13","KLEBER":"prof_14","LULA":"prof_15","LIZA":"prof_16","ALCINO":"prof_17",
};

// ── Raw schedule: [dia, slot, turmaCode, discNome, profNome] ──────────────────
// Parsed from PDF: Horario_MANHA_PROVISORIO
const RAW = [
  // ─── SEGUNDA-FEIRA ────────────────────────────────────────────────────────
  ["segunda",1,"101","GEO","DANIELA"],    ["segunda",1,"201","MAT","CLAUDIANE"],  ["segunda",1,"202","ED FIS","JOSY"],
  ["segunda",1,"301","MAT","MAIEZ"],      ["segunda",1,"302","SOC","VENISIO"],    ["segunda",1,"82","POT","SOELY"],
  ["segunda",1,"91","POT","GERALDA"],     ["segunda",1,"92","CIE","DENALDA"],

  ["segunda",2,"101","BIO","DENALDA"],    ["segunda",2,"201","POT","GERALDA"],    ["segunda",2,"202","SOC","VENISIO"],
  ["segunda",2,"301","POT","SOELY"],      ["segunda",2,"302","MAT","MAIEZ"],      ["segunda",2,"82","ED FIS","JOSY"],
  ["segunda",2,"91","MAT","CLAUDIANE"],   ["segunda",2,"92","GEO","DANIELA"],

  ["segunda",3,"101","GEO","DANIELA"],    ["segunda",3,"201","POT","GERALDA"],    ["segunda",3,"202","MAT","CLAUDIANE"],
  ["segunda",3,"301","INTERV CID","ALANA"],["segunda",3,"302","POT","SOELY"],     ["segunda",3,"82","MAT","MAIEZ"],
  ["segunda",3,"91","CIE","DENALDA"],     ["segunda",3,"92","ED FIS","JOSY"],

  ["segunda",4,"101","CONEX/MAT","MAIEZ"],["segunda",4,"201","SOC","VENISIO"],   ["segunda",4,"202","MAT","CLAUDIANE"],
  ["segunda",4,"301","BIO","DENALDA"],    ["segunda",4,"302","FIL","ZE CARLOS"], ["segunda",4,"82","POT","SOELY"],
  ["segunda",4,"91","GEO","DANIELA"],     ["segunda",4,"92","POT","GERALDA"],

  ["segunda",5,"101","LEIT/PROTA","BARBARA"],["segunda",5,"201","BIO","DENALDA"],["segunda",5,"202","GEO","ZE CARLOS"],
  ["segunda",5,"301","SOC","VENISIO"],    ["segunda",5,"302","INTERV CID","ALANA"],["segunda",5,"82","MAT","MAIEZ"],
  ["segunda",5,"91","MAT","CLAUDIANE"],   ["segunda",5,"92","GEO","DANIELA"],

  // ─── TERÇA-FEIRA ──────────────────────────────────────────────────────────
  ["terca",1,"101","ED FIS","JOSY"],      ["terca",1,"201","POT","GERALDA"],      ["terca",1,"202","HIST","IVETE"],
  ["terca",1,"301","POT","SOELY"],        ["terca",1,"302","BIO","DENALDA"],      ["terca",1,"82","MAT","MAIEZ"],
  ["terca",1,"91","ING","KLEBER"],        ["terca",1,"92","ENS REL","LIZA"],

  ["terca",2,"101","FIS","DORA"],         ["terca",2,"201","ED FIS","JOSY"],      ["terca",2,"202","MAT","CLAUDIANE"],
  ["terca",2,"301","HIST","IVETE"],       ["terca",2,"302","POT","SOELY"],        ["terca",2,"82","CIE","DENALDA"],
  ["terca",2,"91","POT","GERALDA"],       ["terca",2,"92","GEO","DANIELA"],

  ["terca",3,"101","POT","KLEBER"],       ["terca",3,"201","POT","GERALDA"],      ["terca",3,"202","MAT","CLAUDIANE"],
  ["terca",3,"301","POT","SOELY"],        ["terca",3,"302","MAT","MAIEZ"],        ["terca",3,"82","ENS REL","LIZA"],
  ["terca",3,"91","ED FIS","JOSY"],       ["terca",3,"92","HIST","IVETE"],

  ["terca",4,"101","FIS","DORA"],         ["terca",4,"201","MAT","CLAUDIANE"],    ["terca",4,"202","POT","GERALDA"],
  ["terca",4,"301","MAT","MAIEZ"],        ["terca",4,"302","POT","SOELY"],        ["terca",4,"82","GEO","DANIELA"],
  ["terca",4,"91","HIST","IVETE"],        ["terca",4,"92","CIE","DENALDA"],

  ["terca",5,"101","MAT","CLAUDIANE"],    ["terca",5,"201","ING","KLEBER"],       ["terca",5,"202","FIS","DORA"],
  ["terca",5,"301","GEO","DANIELA"],      ["terca",5,"302","HIST","IVETE"],       ["terca",5,"82","MAT","MAIEZ"],
  ["terca",5,"91","ENS REL","LIZA"],      ["terca",5,"92","CIE","DENALDA"],

  // ─── QUARTA-FEIRA ─────────────────────────────────────────────────────────
  ["quarta",1,"101","ED FIS","JOSY"],     ["quarta",1,"201","FIS","DORA"],        ["quarta",1,"202","MAT","CLAUDIANE"],
  ["quarta",1,"301","MAT","MAIEZ"],       ["quarta",1,"302","BIO","DENALDA"],     ["quarta",1,"82","ARTE","LULA"],
  ["quarta",1,"91","POT","GERALDA"],      ["quarta",1,"92","ING","KLEBER"],

  ["quarta",2,"101","POT","KLEBER"],      ["quarta",2,"201","FIS","DORA"],        ["quarta",2,"202","POT","GERALDA"],
  ["quarta",2,"301","ED FIS","JOSY"],     ["quarta",2,"302","ARTE","LULA"],       ["quarta",2,"82","MAT","MAIEZ"],
  ["quarta",2,"91","CIE","DENALDA"],      ["quarta",2,"92","MAT","CLAUDIANE"],

  ["quarta",3,"101","BIO","DENALDA"],     ["quarta",3,"201","MAT","CLAUDIANE"],   ["quarta",3,"202","ING","KLEBER"],
  ["quarta",3,"301","FIS","DORA"],        ["quarta",3,"302","MAT","MAIEZ"],       ["quarta",3,"82","HIST","ALCINO"],
  ["quarta",3,"91","ED FIS","JOSY"],      ["quarta",3,"92","POT","GERALDA"],

  ["quarta",4,"101","POT","KLEBER"],      ["quarta",4,"201","ARTE","LULA"],       ["quarta",4,"202","BIO","DENALDA"],
  ["quarta",4,"301","MAT","MAIEZ"],       ["quarta",4,"302","FIS","DORA"],        ["quarta",4,"82","HIST","ALCINO"],
  ["quarta",4,"91","POT","GERALDA"],      ["quarta",4,"92","MAT","CLAUDIANE"],

  ["quarta",5,"101","MAT","CLAUDIANE"],   ["quarta",5,"201","PROD.CULT","BARBARA"],["quarta",5,"202","FIS","DORA"],
  ["quarta",5,"301","FIL","ZE CARLOS"],   ["quarta",5,"302","MAT","MAIEZ"],       ["quarta",5,"82","ING","KLEBER"],
  ["quarta",5,"91","CIE","DENALDA"],      ["quarta",5,"92","ARTE","LULA"],

  // ─── QUINTA-FEIRA ─────────────────────────────────────────────────────────
  ["quinta",1,"101","EDUC DIGIT","SOELY"],["quinta",1,"201","INOV SABER","DENALDA"],["quinta",1,"202","HIST","IVETE"],
  ["quinta",1,"301","MAT","MAIEZ"],       ["quinta",1,"302","ING","KLEBER"],      ["quinta",1,"82","ED FIS","JOSY"],
  ["quinta",1,"91","MAT","CLAUDIANE"],    ["quinta",1,"92","POT","GERALDA"],

  ["quinta",2,"101","MAT","CLAUDIANE"],   ["quinta",2,"201","QUI","DORA"],        ["quinta",2,"202","POT","GERALDA"],
  ["quinta",2,"301","SOLUC MATE","MAIEZ"],["quinta",2,"302","POT","SOELY"],       ["quinta",2,"82","CIE","DENALDA"],
  ["quinta",2,"91","HIST","IVETE"],       ["quinta",2,"92","ED FIS","JOSY"],

  ["quinta",3,"101","MAT","CLAUDIANE"],   ["quinta",3,"201","POT","GERALDA"],     ["quinta",3,"202","INOV SABER","DENALDA"],
  ["quinta",3,"301","GEO","DANIELA"],     ["quinta",3,"302","ED FIS","JOSY"],     ["quinta",3,"82","POT","SOELY"],
  ["quinta",3,"91","HIST","IVETE"],       ["quinta",3,"92","ING","KLEBER"],

  ["quinta",4,"101","QUI","DORA"],        ["quinta",4,"201","MAT","CLAUDIANE"],   ["quinta",4,"202","POT","GERALDA"],
  ["quinta",4,"301","POT","SOELY"],       ["quinta",4,"302","MAT","MAIEZ"],       ["quinta",4,"82","CIE","DENALDA"],
  ["quinta",4,"91","GEO","DANIELA"],      ["quinta",4,"92","HIST","IVETE"],

  ["quinta",5,"101","POT","KLEBER"],      ["quinta",5,"201","HIST","IVETE"],      ["quinta",5,"202","QUI","DORA"],
  ["quinta",5,"301","BIO","DENALDA"],     ["quinta",5,"302","SOLUC MATE","MAIEZ"],["quinta",5,"82","HIST","ALCINO"],
  ["quinta",5,"91","GEO","DANIELA"],      ["quinta",5,"92","MAT","CLAUDIANE"],

  // ─── SEXTA-FEIRA ──────────────────────────────────────────────────────────
  ["sexta",1,"101","ING","KLEBER"],       ["sexta",1,"201","HIST","IVETE"],       ["sexta",1,"202","ARTE","LULA"],
  ["sexta",1,"301","POT","SOELY"],        ["sexta",1,"302","QUI","DORA"],         ["sexta",1,"82","GEO","DANIELA"],
  ["sexta",1,"91","POT","GERALDA"],       ["sexta",1,"92","MAT","CLAUDIANE"],

  ["sexta",2,"101","HIST","IVETE"],       ["sexta",2,"201","PROD.CULT","BARBARA"],["sexta",2,"202","QUI","DORA"],
  ["sexta",2,"301","ARTE","LULA"],        ["sexta",2,"302","POT","SOELY"],        ["sexta",2,"82","GEO","DANIELA"],
  ["sexta",2,"91","MAT","CLAUDIANE"],     ["sexta",2,"92","POT","GERALDA"],

  ["sexta",3,"101","ARTE","LULA"],        /* 201 blank */                         ["sexta",3,"202","POT","GERALDA"],
  ["sexta",3,"301","QUI","DORA"],         ["sexta",3,"302","GEO","DANIELA"],      ["sexta",3,"82","POT","SOELY"],
  ["sexta",3,"91","ING","KLEBER"],        ["sexta",3,"92","HIST","IVETE"],

  ["sexta",4,"101","QUI","DORA"],         ["sexta",4,"201","GEO","DANIELA"],      ["sexta",4,"202","PROD.CULT","BARBARA"],
  ["sexta",4,"301","ING","KLEBER"],       ["sexta",4,"302","HIST","IVETE"],       ["sexta",4,"82","POT","SOELY"],
  ["sexta",4,"91","MAT","CLAUDIANE"],     ["sexta",4,"92","POT","GERALDA"],

  ["sexta",5,"101","SOC","VENISIO"],      ["sexta",5,"201","QUI","DORA"],         ["sexta",5,"202","PROD.CULT","BARBARA"],
  ["sexta",5,"301","HIST","IVETE"],       ["sexta",5,"302","GEO","DANIELA"],      ["sexta",5,"82","ING","KLEBER"],
  ["sexta",5,"91","ARTE","LULA"],         ["sexta",5,"92","MAT","CLAUDIANE"],
];

// ── Build alocações ───────────────────────────────────────────────────────────
let alocId = 0;
const alocacoes = [];
for (const [dia, slot, code, disc, prof] of RAW) {
  const turmaId = TURMA_CODE[code];
  const discId  = DISC_MAP[disc];
  const profId  = PROF_ALIAS[prof];
  if (!turmaId || !discId || !profId) {
    process.stderr.write(`WARN: missing mapping for disc="${disc}" prof="${prof}" turma="${code}"\n`);
    continue;
  }
  alocacoes.push({ id:`aloc_${++alocId}`, turmaId, disciplinaId:discId, professorId:profId, diaSemana:dia, horario:slot });
}

// ── Fill professor.turmas from alocações ──────────────────────────────────────
for (const aloc of alocacoes) {
  const prof = profList.find(p => p.id === aloc.professorId);
  if (prof && !prof.turmas.includes(aloc.turmaId)) prof.turmas.push(aloc.turmaId);
}

// ── Matriz curricular (hours per week per turma+disc) ─────────────────────────
const matrizMap = {};
for (const aloc of alocacoes) {
  const key = `${aloc.turmaId}_${aloc.disciplinaId}`;
  matrizMap[key] = (matrizMap[key] || 0) + 1;
}
const matriz = Object.entries(matrizMap).map(([key, count]) => {
  const [turmaId, disciplinaId] = key.split("_");
  return { turmaId, disciplinaId, aulasPorSemana: count };
});

// ── Config ────────────────────────────────────────────────────────────────────
const config = {
  horarioInicial: "07:00",
  duracaoAulaMinutos: 50,
  quantidadeHorariosPorDia: 5,
  intervaloApos: 3,
  duracaoIntervaloMinutos: 15,
};

const backup = { turmas, disciplinas: discList, professores: profList, alocacoes, matriz, config };

process.stdout.write(JSON.stringify(backup));
process.stderr.write(`\nStats: ${turmas.length} turmas, ${discList.length} disciplinas, ${profList.length} professores, ${alocacoes.length} alocações, ${matriz.length} matriz entries\n`);
