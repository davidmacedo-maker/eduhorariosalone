import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  useTurmas, useProfessores, useDisciplinas, useAlocacoes,
  useConfiguracaoHorarios, useRegistrosPonto, useNomeEscola, generateId,
} from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, ClipboardList, Zap, ChevronDown, ChevronUp, Check, Trash2, Undo2, Redo2, Eraser } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Alocacao, RegistroPonto } from "@/types";

const MESES_ABREV = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
const JS_DAY_NOME = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const JS_DAY_KEY  = ["domingo","segunda","terca","quarta","quinta","sexta","sabado"];
const IS_WEEKEND  = (d: number) => d === 0 || d === 6;

function getDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month - 1, 1);
  while (d.getMonth() === month - 1) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
}
function toISO(d: Date) { return d.toISOString().slice(0, 10); }

const cellBase = "border border-black align-middle";
const thBase   = "border border-black bg-gray-100 print:bg-white text-center align-middle font-bold";

// ── Feriados Nacionais Brasileiros ────────────────────────────────────────────
const FERIADOS_FIXOS = new Set([
  "01-01","04-21","05-01","09-07","10-12","11-02","11-15","11-20","12-25",
]);
function easterDate(y: number): Date {
  const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3);
  const h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4;
  const l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451);
  const mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;
  return new Date(y,mo-1,da);
}
const _movCache = new Map<number,Set<string>>();
function isFeriadoNacional(date: Date): boolean {
  const mm=String(date.getMonth()+1).padStart(2,"0");
  const dd=String(date.getDate()).padStart(2,"0");
  if (FERIADOS_FIXOS.has(`${mm}-${dd}`)) return true;
  const y=date.getFullYear();
  if (!_movCache.has(y)) {
    const e=easterDate(y);
    const fmt=(d:Date)=>`${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const add=(d:Date,n:number)=>{const r=new Date(d);r.setDate(r.getDate()+n);return r;};
    _movCache.set(y,new Set([fmt(add(e,-2)),fmt(add(e,-48)),fmt(add(e,-47)),fmt(add(e,60))]));
  }
  return (_movCache.get(y) as Set<string>).has(`${mm}-${dd}`);
}
const FALTA_TOKENS = new Set(["f","falta","0","x","a","ausente","-"]);
const derivePresente = (v: string) => v.trim().length > 0 && !FALTA_TOKENS.has(v.trim().toLowerCase());

interface SimboloInfo { cor: string; bgCls: string; textCls: string; descricao: string; }
const SIMBOLO_MAPA: Record<string, SimboloInfo> = {
  // ── Seção 2: Símbolos Especiais nos Horários ──
  "@":  { cor: "#16a34a", bgCls: "bg-green-100",  textCls: "text-green-700",  descricao: "Reunião Pedagógica Coletiva" },
  "&":  { cor: "#7c3aed", bgCls: "bg-purple-100", textCls: "text-purple-700", descricao: "Cumprimento de Carga Horária Extraclasse" },
  "CC": { cor: "#7c3aed", bgCls: "bg-purple-100", textCls: "text-purple-700", descricao: "Conselho de Classe Extra-turno" },
  "!":  { cor: "#ea580c", bgCls: "bg-orange-100", textCls: "text-orange-600", descricao: "Coordenação do Novo Ensino Médio" },
  // ── Seção 1: Observações (abreviações) ──
  "F":  { cor: "#64748b", bgCls: "bg-slate-100",  textCls: "text-slate-600",  descricao: "Feriado" },
  "RP": { cor: "#16a34a", bgCls: "bg-green-100",  textCls: "text-green-700",  descricao: "Reunião Pedagógica" },
  "PE": { cor: "#0284c7", bgCls: "bg-sky-100",    textCls: "text-sky-700",    descricao: "Planejamento Escolar" },
  "PF": { cor: "#d97706", bgCls: "bg-amber-100",  textCls: "text-amber-700",  descricao: "Ponto Facultativo" },
  "EE": { cor: "#0891b2", bgCls: "bg-cyan-100",   textCls: "text-cyan-700",   descricao: "Evento Escolar" },
  "SL": { cor: "#2563eb", bgCls: "bg-blue-100",   textCls: "text-blue-700",   descricao: "Sábado Letivo" },
};
const SIMBOLOS_ESPECIAIS_KEYS = ["&", "!"] as const;
const PRESET_SIMBOLO: Record<string, string> = {
  "Feriado":            "F",
  "Reunião Pedagógica": "RP",
  "Planejamento Escolar": "PE",
  "Ponto Facultativo":  "PF",
  "Evento Escolar":     "EE",
  "Sábado Letivo":      "SL",
  "Reunião Pedagógica Coletiva": "@",
  "Conselho de Classe": "CC",
};
function getSimInfo(v: string): SimboloInfo | null {
  const t = v.trim();
  return SIMBOLO_MAPA[t] ?? SIMBOLO_MAPA[t.toUpperCase()] ?? null;
}

const QUICK_PRESETS = [
  "Feriado",
  "Ponto Facultativo",
  "Evento Escolar",
  "Sábado Letivo",
  "Reunião Pedagógica Coletiva",
  "Conselho de Classe",
];

export default function LivroPonto() {
  const [turmas]                  = useTurmas();
  const [professores]             = useProfessores();
  const [disciplinas]             = useDisciplinas();
  const [alocacoes]               = useAlocacoes();
  const [config]                  = useConfiguracaoHorarios();
  const [registros, setRegistros] = useRegistrosPonto();
  const [nomeEscola]              = useNomeEscola();
  const { toast }                 = useToast();

  const now  = new Date();
  const [profId, setProfId] = useState(() => professores[0]?.id ?? "");
  const [discId, setDiscId] = useState("__todas__");
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year,  setYear]    = useState(now.getFullYear());

  const [quickText,    setQuickText]    = useState("");
  const [quickDay,     setQuickDay]     = useState("");
  const [quickDow,     setQuickDow]     = useState<number[]>([]);
  const [quickSlots,   setQuickSlots]   = useState<string[]>(["todos"]);
  const [quickMonths,  setQuickMonths]  = useState<number[]>([now.getMonth() + 1]);
  const [quickApplied, setQuickApplied] = useState(false);
  const quickInputRef = useRef<HTMLInputElement>(null);

  const [specSymbol,  setSpecSymbol]  = useState<string>("&");
  const [specDay,     setSpecDay]     = useState<string>("todos");
  const [specDow,     setSpecDow]     = useState<number[]>([]);
  const [specSlots,   setSpecSlots]   = useState<string[]>(["todos"]);
  const [specApplied,  setSpecApplied]  = useState(false);
  const [specMonths,   setSpecMonths]   = useState<number[]>([month]);

  const obsRef = useRef<HTMLTextAreaElement>(null);

  function toggleQuickDow(dow: number) {
    setQuickDow(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);
    setQuickDay("todos");
  }
  function toggleQuickSlot(val: string) {
    if (val === "todos") { setQuickSlots(["todos"]); return; }
    setQuickSlots(prev => {
      const without = prev.filter(s => s !== "todos" && s !== val);
      const next = prev.includes(val) ? without : [...without, val];
      return next.length === 0 ? ["todos"] : next;
    });
  }

  function toggleQuickMonth(m: number) {
    setQuickMonths(prev => prev.includes(m)
      ? prev.length > 1 ? prev.filter(x => x !== m) : prev
      : [...prev, m]);
  }

  function toggleSpecDow(dow: number) {
    setSpecDow(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);
    setSpecDay("todos");
  }

  function toggleSpecMonth(m: number) {
    setSpecMonths(prev => prev.includes(m)
      ? prev.length > 1 ? prev.filter(x => x !== m) : prev
      : [...prev, m]);
  }

  function toggleSpecSlot(val: string) {
    if (val === "todos") { setSpecSlots(["todos"]); return; }
    setSpecSlots(prev => {
      const without = prev.filter(s => s !== "todos" && s !== val);
      const next = prev.includes(val) ? without : [...without, val];
      return next.length === 0 ? ["todos"] : next;
    });
  }

  // ── Undo / Redo ──────────────────────────────────────────────────────────────
  const undoStackRef  = useRef<RegistroPonto[][]>([]);
  const redoStackRef  = useRef<RegistroPonto[][]>([]);
  const registrosRef  = useRef<RegistroPonto[]>(registros);
  registrosRef.current = registros;
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, [profId, year, month]);

  // ── Escalar .a4-sheet na impressão (manual ou auto) ───────────────────────
  useEffect(() => {
    const beforePrint = () => {
      const el = document.querySelector('.a4-sheet') as HTMLElement | null;
      if (!el) return;
      (el.style as any).zoom = '';
      // @page margin: 1.9cm top/bot, 1.7cm left, 1.2cm right
      // Conteúdo útil de impressão: 259mm alto × 181mm largo
      // No ecrã o .a4-sheet tem padding idêntico (mesmas margens visuais),
      // por isso subtraímos o padding vertical para obter a altura real do conteúdo.
      const pxPerMm  = 3.7795;
      const padV     = 38 * pxPerMm;   // 1.9cm + 1.9cm
      const contentH = el.scrollHeight - padV;
      const availH   = 259 * pxPerMm;
      const availW   = 210 * pxPerMm;  // largura do elemento no ecrã
      const scaleH   = availH / contentH;
      const scaleW   = availW / el.scrollWidth;
      const autoScale = Math.min(scaleH, scaleW);
      if (autoScale < 0.999) {
        (el.style as any).zoom = autoScale.toFixed(4);
      }
    };
    const afterPrint = () => {
      const el = document.querySelector('.a4-sheet') as HTMLElement | null;
      if (el) (el.style as any).zoom = '';
    };
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', afterPrint);
    };
  }, []);

  function saveToHistory(snapshot: RegistroPonto[]) {
    undoStackRef.current = [...undoStackRef.current.slice(-29), snapshot];
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }

  function undoAction() {
    if (undoStackRef.current.length === 0) return;
    const prev = undoStackRef.current[undoStackRef.current.length - 1];
    redoStackRef.current = [registrosRef.current, ...redoStackRef.current.slice(0, 29)];
    undoStackRef.current = undoStackRef.current.slice(0, -1);
    setRegistros(prev);
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    toast({ title: "Grelha restaurada", description: "Use Refazer para reverter." });
  }

  function redoAction() {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current[0];
    undoStackRef.current = [...undoStackRef.current.slice(-29), registrosRef.current];
    redoStackRef.current = redoStackRef.current.slice(1);
    setRegistros(next);
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    toast({ title: "Grelha refeita" });
  }

  function clearAllRegistros() {
    if (!confirm("Limpar todos os registros do mês para este professor? Esta ação pode ser desfeita.")) return;
    saveToHistory(registrosRef.current);
    const profAlocIds = new Set(profAlocs.map(a => a.id));
    const daysSet = new Set(days.map(d => toISO(d)));
    setRegistros(prev => prev.filter(r => !(profAlocIds.has(r.alocacaoId) && daysSet.has(r.data))));
    saveExtra({});
    // Also clear Saturday event markers and per-day observations for the current month
    setAssinMap({});
    localStorage.setItem(assinKey, JSON.stringify({}));
    toast({ title: "Registros limpos", description: "Use Desfazer para reverter." });
  }

  const assinKey = `edu_ponto_assin_${profId}_${year}_${month}`;
  const loadAssin = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(assinKey) ?? "{}") ?? {}; } catch { return {}; }
  };
  const [assinMap, setAssinMap] = useState<Record<string,string>>(loadAssin);
  useEffect(() => { setAssinMap(loadAssin()); }, [profId, year, month]); // eslint-disable-line
  const saveAssin = (dayNum: number, value: string) => {
    const next = { ...assinMap, [String(dayNum)]: value };
    setAssinMap(next);
    localStorage.setItem(assinKey, JSON.stringify(next));
  };

  const extraKey = `edu_ponto_extra_${profId}_${year}_${month}`;
  const loadExtra = (): Record<string, string> => {
    try { return JSON.parse(localStorage.getItem(extraKey) ?? "{}") ?? {}; } catch { return {}; }
  };
  const [extraSimbolos, setExtraSimbolos] = useState<Record<string,string>>(loadExtra);
  useEffect(() => { setExtraSimbolos(loadExtra()); }, [profId, year, month]); // eslint-disable-line
  const saveExtra = (next: Record<string, string>) => {
    setExtraSimbolos(next);
    localStorage.setItem(extraKey, JSON.stringify(next));
  };
  const removeExtra = (k: string) => {
    const next = { ...extraSimbolos };
    delete next[k];
    saveExtra(next);
  };

  // Observações: partilhadas por TODOS os professores no mesmo mês
  const obsKey = `edu_ponto_obs_shared_${year}_${month}`;
  const [obs, setObs] = useState(() => localStorage.getItem(obsKey) ?? "");
  const obsHistoryRef = useRef<string[]>([]);
  useEffect(() => {
    setObs(localStorage.getItem(`edu_ponto_obs_shared_${year}_${month}`) ?? "");
    obsHistoryRef.current = [];
  }, [year, month]);
  const handleObsChange = (v: string) => {
    obsHistoryRef.current = [...obsHistoryRef.current.slice(-29), obs];
    setObs(v);
    localStorage.setItem(`edu_ponto_obs_shared_${year}_${month}`, v);
  };

  // ── Auto-resize textarea de Observações sempre que o texto muda ──────────
  useEffect(() => {
    const el = obsRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [obs]);
  const undoObs = () => {
    if (obsHistoryRef.current.length === 0) return;
    const prev = obsHistoryRef.current[obsHistoryRef.current.length - 1];
    obsHistoryRef.current = obsHistoryRef.current.slice(0, -1);
    setObs(prev);
    localStorage.setItem(`edu_ponto_obs_shared_${year}_${month}`, prev);
    toast({ title: "Observação desfeita" });
  };

  // ── Resumo mensal — overrides manuais ──────────────────────────────────────
  type ResumoFields = { presenca: string; faltas: string; licenca: string; freq: string; obsResumo: string };
  const resumoKey = `edu_ponto_resumo_${profId}_${year}_${month}`;
  const loadResumo = (): ResumoFields => {
    try { return JSON.parse(localStorage.getItem(resumoKey) ?? "null") ?? { presenca: "", faltas: "", licenca: "", freq: "", obsResumo: "" }; }
    catch { return { presenca: "", faltas: "", licenca: "", freq: "", obsResumo: "" }; }
  };
  const [resumo, setResumo] = useState<ResumoFields>(loadResumo);
  useEffect(() => { setResumo(loadResumo()); }, [profId, year, month]); // eslint-disable-line
  const saveResumo = (patch: Partial<ResumoFields>) => {
    const next = { ...resumo, ...patch };
    setResumo(next);
    localStorage.setItem(resumoKey, JSON.stringify(next));
  };

  const prof     = useMemo(() => professores.find(p => p.id === profId), [professores, profId]);
  const turmaMap = useMemo(() => new Map(turmas.map(t => [t.id, t])), [turmas]);
  const discMap  = useMemo(() => new Map(disciplinas.map(d => [d.id, d])), [disciplinas]);

  const manhaQtd  = config.quantidadeHorariosPorDia;
  const tardeQtd  = config.habilitarTarde ? config.quantidadeHorariosPorDiaTarde : 0;
  const noiteQtd  = useMemo(() => {
    const allProfAlocs = alocacoes.filter(a => a.professorId === profId);
    const noiteAlocs   = allProfAlocs.filter(a => turmaMap.get(a.turmaId)?.turno === "noite");
    const fromAlocs    = noiteAlocs.length > 0 ? Math.max(...noiteAlocs.map(a => a.horario)) : 0;
    const fromConfig   = config.habilitarNoite ? config.quantidadeHorariosPorDiaNoite : 0;
    return Math.max(fromAlocs, fromConfig);
  }, [alocacoes, profId, turmaMap, config]);

  const hasNoiteTurmas = useMemo(() => turmas.some(t => t.turno === "noite"), [turmas]);
  const displayNoiteQtd = hasNoiteTurmas || config.habilitarNoite
    ? Math.max(noiteQtd, config.quantidadeHorariosPorDiaNoite ?? 4)
    : noiteQtd;
  const totalCols = 2 + manhaQtd + tardeQtd + noiteQtd + 1;

  const profAlocs = useMemo(() => {
    let a = alocacoes.filter(x => x.professorId === profId);
    if (discId !== "__todas__") a = a.filter(x => x.disciplinaId === discId);
    return a;
  }, [alocacoes, profId, discId]);

  const alocIdx = useMemo(() => {
    const m = new Map<string, Alocacao>();
    for (const a of profAlocs) {
      const turno = turmaMap.get(a.turmaId)?.turno ?? "manha";
      m.set(`${a.diaSemana}-${turno}-${a.horario}`, a);
    }
    return m;
  }, [profAlocs, turmaMap]);

  const regIdx = useMemo(() => {
    const m = new Map<string, RegistroPonto>();
    for (const r of registros) m.set(`${r.alocacaoId}-${r.data}`, r);
    return m;
  }, [registros]);

  const lookupAloc = useCallback((date: Date, horario: number, turno: "manha" | "tarde" | "noite"): Alocacao | null =>
    alocIdx.get(`${JS_DAY_KEY[date.getDay()]}-${turno}-${horario}`) ?? null,
  [alocIdx]);

  const lookupReg = useCallback((alocId: string | null, dateStr: string): RegistroPonto | null => {
    if (!alocId) return null;
    return regIdx.get(`${alocId}-${dateStr}`) ?? null;
  }, [regIdx]);

  const updateReg = useCallback((aloc: Alocacao, dateStr: string, valor: string) => {
    undoStackRef.current = [...undoStackRef.current.slice(-29), registrosRef.current];
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    setRegistros(prev => {
      const ex = prev.find(r => r.alocacaoId === aloc.id && r.data === dateStr);
      if (valor === "" && ex)  return prev.filter(r => r.id !== ex.id);
      if (valor === "" && !ex) return prev;
      const presente = derivePresente(valor);
      if (ex) return prev.map(r => r.id === ex.id ? { ...r, valor, presente } : r);
      return [...prev, { id: generateId(), alocacaoId: aloc.id, data: dateStr, presente, valor }];
    });
  }, [setRegistros]);

  const days = useMemo(() => getDays(year, month), [year, month]);

  const stats = useMemo(() => {
    let presencas = 0, faltas = 0;
    for (const day of days) {
      if (IS_WEEKEND(day.getDay())) continue;
      const dateStr = toISO(day);
      const diaKey  = JS_DAY_KEY[day.getDay()];
      const dayAlocs = profAlocs.filter(a => a.diaSemana === diaKey);
      if (!dayAlocs.length) continue;
      const regs = dayAlocs.map(a => lookupReg(a.id, dateStr));
      if (regs.some(r => r?.presente))           presencas++;
      else if (regs.some(r => r && !r.presente)) faltas++;
    }
    const total = presencas + faltas;
    return { presencas, faltas, freq: total > 0 ? Math.round(presencas / total * 100) : 0 };
  }, [days, profAlocs, lookupReg]);

  const materiaLabel = discId !== "__todas__"
    ? (discMap.get(discId)?.nome ?? "")
    : (prof?.disciplinas.map(id => discMap.get(id)?.nome).filter(Boolean).join(" / ") ?? "");

  const turnoLabel = (() => {
    const m = profAlocs.filter(a => { const tr = turmaMap.get(a.turmaId)?.turno; return !tr || tr === "manha"; }).length;
    const t = profAlocs.filter(a => turmaMap.get(a.turmaId)?.turno === "tarde").length;
    const n = profAlocs.filter(a => turmaMap.get(a.turmaId)?.turno === "noite").length;
    if (m > 0 && t > 0 && n > 0) return "Manhã/Tarde/Noite";
    if (m > 0 && t > 0) return "Manhã/Tarde";
    if (m > 0 && n > 0) return "Manhã/Noite";
    if (t > 0 && n > 0) return "Tarde/Noite";
    if (n > 0) return "Noite";
    if (t > 0) return "Tarde";
    return "Manhã";
  })();

  const numAulasSemana = new Set(profAlocs.map(a => `${a.diaSemana}-${a.horario}`)).size;
  const cargoLabel     = prof?.tipoVinculo === "efetivo" ? "PEB" : prof?.tipoVinculo === "designado" ? "PEB-D" : "PEB";
  const vinculoLabel   = prof?.tipoVinculo === "efetivo" ? "Efetivo" : prof?.tipoVinculo === "designado" ? "Designado" : "";
  const emptyRows      = Math.max(0, 31 - days.length);

  // Mapa turno+horario → nomes de turmas (para sub-cabeçalho)
  const slotTurmaMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const a of profAlocs) {
      const turno = turmaMap.get(a.turmaId)?.turno ?? "manha";
      const key = `${turno}-${a.horario}`;
      const s = m.get(key) ?? new Set<string>();
      s.add(turmaMap.get(a.turmaId)?.nome ?? "");
      m.set(key, s);
    }
    return m;
  }, [profAlocs, turmaMap]);

  function abrevTurma(nome: string): string {
    const m = nome.match(/(\d+)[ºo°]?\s*(?:ano\s+)?([A-Z]?)/i);
    if (m) return `${m[1]}º${m[2]}`;
    return nome.length <= 5 ? nome : nome.slice(0, 5);
  }

  function slotTurmas(turno: "manha" | "tarde", horario: number): string {
    const s = slotTurmaMap.get(`${turno}-${horario}`);
    if (!s || s.size === 0) return "";
    return Array.from(s).map(abrevTurma).join("/");
  }

  function formatDateBR(s?: string): string {
    if (!s) return "—";
    const parts = s.split("-");
    if (parts.length !== 3) return s;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function applyQuickFill() {
    if (!quickText.trim()) return;
    if (quickDow.length === 0 && (quickDay === "" || quickDay === "todos")) {
      toast({ title: "Selecione um dia", description: "Escolha um ou mais dias da semana ou uma data específica.", variant: "destructive" });
      return;
    }
    saveToHistory(registrosRef.current);
    const text     = quickText.trim();
    const simbol   = PRESET_SIMBOLO[text] ?? null;
    const desc     = simbol ? (SIMBOLO_MAPA[simbol]?.descricao ?? text) : text;
    const prefix   = simbol ? `${simbol} ` : "";
    const allSlots = quickSlots.includes("todos");
    const selectedCodes = allSlots
      ? [
          ...Array.from({ length: manhaQtd }, (_, i) => `m${i + 1}`),
          ...Array.from({ length: tardeQtd  }, (_, i) => `t${i + 1}`),
          ...Array.from({ length: noiteQtd  }, (_, i) => `n${i + 1}`),
        ]
      : quickSlots;
    const slotSuffix = allSlots ? "" : ` (${selectedCodes.map(s => s.startsWith("m") ? `${s.slice(1)}ªM` : s.startsWith("t") ? `${s.slice(1)}ªV` : `${s.slice(1)}ªN`).join(", ")})`;

    const DOW_LABEL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    let allRegs = [...registrosRef.current];
    const obsLines: string[] = [];

    for (const m of quickMonths) {
      const mDays = getDays(year, m);
      let targetDays: Date[];
      let obsLine = "";

      if (quickDow.length > 0) {
        targetDays = mDays.filter(d => quickDow.includes(d.getDay()));
        const dowLabels = quickDow.map(d => DOW_LABEL[d]).join(", ");
        obsLine = `${prefix}${desc}${slotSuffix} — ${dowLabels} de ${MESES[m - 1]}/${year}`;
      } else if (quickDay === "todos") {
        targetDays = mDays.filter(d => !IS_WEEKEND(d.getDay()));
        obsLine = `${prefix}${desc}${slotSuffix} — dias úteis de ${MESES[m - 1]}/${year}`;
      } else {
        const d = mDays.find(d => d.getDate() === Number(quickDay));
        if (!d) continue;
        targetDays = [d];
        const dayName = JS_DAY_NOME[d.getDay()];
        obsLine = `Dia ${String(d.getDate()).padStart(2, "0")}/${String(m).padStart(2, "0")} (${dayName}): ${prefix}${desc}${slotSuffix}`;
        if (m === month && (IS_WEEKEND(d.getDay()) || isFeriadoNacional(d))) saveAssin(d.getDate(), "");
      }
      if (targetDays.length === 0) continue;

      if (simbol) {
        // Apply to registros
        for (const d of targetDays) {
          const dk = JS_DAY_KEY[d.getDay()];
          const ds = toISO(d);
          let dayAlocs = profAlocs.filter(a => a.diaSemana === dk);
          if (!allSlots) {
            dayAlocs = dayAlocs.filter(a => selectedCodes.some(s => {
              const turno = s.startsWith("m") ? "manha" : s.startsWith("t") ? "tarde" : "noite";
              const num   = Number(s.slice(1));
              return a.horario === num && (turmaMap.get(a.turmaId)?.turno ?? "manha") === turno;
            }));
          }
          for (const aloc of dayAlocs) {
            const ex = allRegs.find(r => r.alocacaoId === aloc.id && r.data === ds);
            if (ex) allRegs = allRegs.map(r => r.id === ex.id ? { ...r, valor: simbol, presente: true } : r);
            else    allRegs = [...allRegs, { id: generateId(), alocacaoId: aloc.id, data: ds, presente: true, valor: simbol }];
          }
        }
        // Apply to extras for this month
        const mExtraKey = `edu_ponto_extra_${profId}_${year}_${m}`;
        let extras: Record<string, string>;
        try { extras = { ...(JSON.parse(localStorage.getItem(mExtraKey) ?? "{}") ?? {}) }; } catch { extras = {}; }
        if (m === month) extras = { ...extraSimbolos };
        for (const d of targetDays) {
          if (IS_WEEKEND(d.getDay()) || isFeriadoNacional(d)) continue;
          const ds = toISO(d);
          const dk = JS_DAY_KEY[d.getDay()];
          for (const s of selectedCodes) {
            const turno = s.startsWith("m") ? "manha" as const : s.startsWith("t") ? "tarde" as const : "noite" as const;
            const num   = Number(s.slice(1));
            const hasAloc = profAlocs.some(a => a.diaSemana === dk && a.horario === num && (turmaMap.get(a.turmaId)?.turno ?? "manha") === turno);
            if (!hasAloc) extras[`${ds}_${num}_${turno}`] = simbol;
          }
        }
        localStorage.setItem(mExtraKey, JSON.stringify(extras));
        if (m === month) setExtraSimbolos(extras);
      }
      obsLines.push(obsLine);
    }

    if (simbol) setRegistros(allRegs);

    const append = obsLines.join("\n");
    if (append) {
      handleObsChange(obs ? `${obs}\n${append}` : append);
      setQuickApplied(true);
      setTimeout(() => setQuickApplied(false), 1500);
      toast({ title: "Preenchimento aplicado", description: `${quickMonths.map(m => MESES_ABREV[m - 1]).join(", ")}` });
    }
  }

  function applySpecialSymbol() {
    saveToHistory(registrosRef.current);
    const symbol   = specSymbol;
    const info     = SIMBOLO_MAPA[symbol];
    const allSlots = specSlots.includes("todos");
    const selectedCodes = allSlots
      ? [
          ...Array.from({ length: manhaQtd }, (_, i) => `m${i + 1}`),
          ...Array.from({ length: tardeQtd  }, (_, i) => `t${i + 1}`),
          ...Array.from({ length: noiteQtd  }, (_, i) => `n${i + 1}`),
        ]
      : specSlots;
    const slotLabel = allSlots
      ? "todos os horários"
      : selectedCodes.map(s => s.startsWith("m") ? `${s.slice(1)}ª M` : s.startsWith("t") ? `${s.slice(1)}ª V` : `${s.slice(1)}ª N`).join(", ");

    function slotsForDay(d: Date): Alocacao[] {
      const dk = JS_DAY_KEY[d.getDay()];
      const base = profAlocs.filter(a => a.diaSemana === dk);
      if (allSlots) return base;
      return base.filter(a => selectedCodes.some(s => {
        const turno = s.startsWith("m") ? "manha" : s.startsWith("t") ? "tarde" : "noite";
        const num   = Number(s.slice(1));
        return a.horario === num && (turmaMap.get(a.turmaId)?.turno ?? "manha") === turno;
      }));
    }

    // Accumulate all registro changes across all selected months in one pass
    let allRegs = [...registrosRef.current];
    const obsLines: string[] = [];
    const DOW_LABEL = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

    for (const m of specMonths) {
      const mDays = getDays(year, m);
      let targetDays: Date[];
      let obsLine = "";

      if (specDow.length > 0) {
        targetDays = mDays.filter(d => specDow.includes(d.getDay()));
        const dowLabels = specDow.map(d => DOW_LABEL[d]).join(", ");
        obsLine = `${symbol} ${info?.descricao ?? symbol} — ${dowLabels} (${slotLabel}) — ${MESES[m-1]}/${year}`;
      } else if (specDay === "todos") {
        targetDays = mDays.filter(d => !IS_WEEKEND(d.getDay()));
        obsLine = `${symbol} ${info?.descricao ?? symbol} — dias úteis (${slotLabel}) — ${MESES[m-1]}/${year}`;
      } else {
        const d = mDays.find(d => d.getDate() === Number(specDay));
        if (!d) continue;
        targetDays = [d];
        const dayName = JS_DAY_NOME[d.getDay()];
        obsLine = `Dia ${String(d.getDate()).padStart(2,"0")}/${String(m).padStart(2,"0")} (${dayName}): ${symbol} ${info?.descricao ?? symbol} — ${slotLabel}`;
      }
      if (targetDays.length === 0) continue;

      // Apply to registros (accumulated)
      for (const d of targetDays) {
        const ds = toISO(d);
        for (const aloc of slotsForDay(d)) {
          const ex = allRegs.find(r => r.alocacaoId === aloc.id && r.data === ds);
          if (ex) allRegs = allRegs.map(r => r.id === ex.id ? { ...r, valor: symbol, presente: true } : r);
          else    allRegs = [...allRegs, { id: generateId(), alocacaoId: aloc.id, data: ds, presente: true, valor: symbol }];
        }
      }

      // Apply to extras for this specific month
      const mExtraKey = `edu_ponto_extra_${profId}_${year}_${m}`;
      let extras: Record<string, string>;
      try { extras = { ...(JSON.parse(localStorage.getItem(mExtraKey) ?? "{}") ?? {}) }; } catch { extras = {}; }
      if (m === month) extras = { ...extraSimbolos };

      for (const d of targetDays) {
        if (IS_WEEKEND(d.getDay()) || isFeriadoNacional(d)) continue;
        const ds = toISO(d);
        const dk = JS_DAY_KEY[d.getDay()];
        for (const s of selectedCodes) {
          const turno = s.startsWith("m") ? "manha" as const : s.startsWith("t") ? "tarde" as const : "noite" as const;
          const num   = Number(s.slice(1));
          const hasAloc = profAlocs.some(
            a => a.diaSemana === dk && a.horario === num
              && (turmaMap.get(a.turmaId)?.turno ?? "manha") === turno
          );
          if (!hasAloc) extras[`${ds}_${num}_${turno}`] = symbol;
        }
      }
      localStorage.setItem(mExtraKey, JSON.stringify(extras));
      if (m === month) setExtraSimbolos(extras);

      obsLines.push(obsLine);
    }

    setRegistros(allRegs);

    if (obsLines.length > 0) {
      const append = obsLines.join("\n");
      handleObsChange(obs ? `${obs}\n${append}` : append);
    }

    setSpecApplied(true);
    setTimeout(() => setSpecApplied(false), 1500);
    toast({
      title: "Símbolo aplicado",
      description: `${symbol} — ${info?.descricao ?? symbol} — ${specMonths.map(m => MESES_ABREV[m-1]).join(", ")}`,
    });
  }

  function clearSpecialSymbols() {
    saveToHistory(registrosRef.current);
    const allSlotsClear = specSlots.includes("todos");
    const selectedCodes = allSlotsClear
      ? [
          ...Array.from({ length: manhaQtd }, (_, i) => `m${i + 1}`),
          ...Array.from({ length: tardeQtd  }, (_, i) => `t${i + 1}`),
          ...Array.from({ length: noiteQtd  }, (_, i) => `n${i + 1}`),
        ]
      : specSlots;

    let allRegs = [...registrosRef.current];

    for (const m of specMonths) {
      const mDays = getDays(year, m);
      const targetDays = specDow.length > 0
        ? mDays.filter(d => specDow.includes(d.getDay()))
        : specDay === "todos"
          ? mDays.filter(d => !IS_WEEKEND(d.getDay()))
          : mDays.filter(d => d.getDate() === Number(specDay));

      if (targetDays.length === 0) continue;

      // Remove from extras for this month
      const mExtraKey = `edu_ponto_extra_${profId}_${year}_${m}`;
      let extras: Record<string, string>;
      try { extras = { ...(JSON.parse(localStorage.getItem(mExtraKey) ?? "{}") ?? {}) }; } catch { extras = {}; }
      if (m === month) extras = { ...extraSimbolos };
      for (const d of targetDays) {
        const ds = toISO(d);
        for (const s of selectedCodes) {
          const turno = s.startsWith("m") ? "manha" : s.startsWith("t") ? "tarde" : "noite";
          const num   = Number(s.slice(1));
          delete extras[`${ds}_${num}_${turno}`];
        }
      }
      localStorage.setItem(mExtraKey, JSON.stringify(extras));
      if (m === month) setExtraSimbolos(extras);

      // Remove symbol from registros (accumulated)
      const targetSet = new Set(targetDays.map(d => toISO(d)));
      allRegs = allRegs.map(r => {
        if (!targetSet.has(r.data)) return r;
        const aloc = profAlocs.find(a => a.id === r.alocacaoId);
        if (!aloc) return r;
        const d = targetDays.find(d => toISO(d) === r.data)!;
        const dk = JS_DAY_KEY[d.getDay()];
        if (aloc.diaSemana !== dk) return r;
        const matches = selectedCodes.some(s => {
          const turno = s.startsWith("m") ? "manha" : s.startsWith("t") ? "tarde" : "noite";
          const num   = Number(s.slice(1));
          return aloc.horario === num && (turmaMap.get(aloc.turmaId)?.turno ?? "manha") === turno;
        });
        return matches ? { ...r, valor: undefined, presente: false } : r;
      });
    }

    setRegistros(allRegs);
    toast({ title: "Símbolos removidos", description: `Meses: ${specMonths.map(m => MESES_ABREV[m-1]).join(", ")}` });
  }

  function handlePrintAll() {

    function abrevT(nome: string): string {
      const m = nome.match(/(\d+)[ºo°]?\s*(?:ano\s+)?([A-Z]?)/i);
      return m ? `${m[1]}º${m[2]}` : nome.slice(0, 5);
    }
    function fmtDate(s?: string) {
      if (!s) return "—";
      const p = s.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : s;
    }

    const profDocs = professores.map((p, profIdx) => {
      const pAlocs = alocacoes.filter(a => a.professorId === p.id);
      const days   = getDays(year, month);

      // slot → turma labels
      function slotLabel(turno: "manha" | "tarde" | "noite", horario: number) {
        const names = new Set(
          pAlocs
            .filter(a => a.horario === horario && (turmaMap.get(a.turmaId)?.turno ?? "manha") === turno)
            .map(a => abrevT(turmaMap.get(a.turmaId)?.nome ?? ""))
        );
        return Array.from(names).join("/");
      }
      const pNoiteQtd = (() => {
        const noiteAlocs = pAlocs.filter(a => turmaMap.get(a.turmaId)?.turno === "noite");
        const fromAlocs  = noiteAlocs.length > 0 ? Math.max(...noiteAlocs.map(a => a.horario)) : 0;
        const fromConfig = config.habilitarNoite ? config.quantidadeHorariosPorDiaNoite : 0;
        return Math.max(fromAlocs, fromConfig);
      })();

      // stats
      let presencas = 0, faltas = 0;
      for (const day of days) {
        if (IS_WEEKEND(day.getDay())) continue;
        const ds = toISO(day);
        const dk = JS_DAY_KEY[day.getDay()];
        const da = pAlocs.filter(a => a.diaSemana === dk);
        if (!da.length) continue;
        const regs = da.map(a => registros.find(r => r.alocacaoId === a.id && r.data === ds));
        if (regs.some(r => r?.presente)) presencas++;
        else if (regs.some(r => r && !r.presente)) faltas++;
      }
      const freq = (presencas + faltas) > 0 ? Math.round(presencas / (presencas + faltas) * 100) : 0;

      const turnoLbl = (() => {
        const m = pAlocs.filter(a => (turmaMap.get(a.turmaId)?.turno ?? "manha") === "manha").length;
        const t = pAlocs.filter(a => turmaMap.get(a.turmaId)?.turno === "tarde").length;
        const n = pAlocs.filter(a => turmaMap.get(a.turmaId)?.turno === "noite").length;
        if (m > 0 && t > 0 && n > 0) return "Manhã/Tarde/Noite";
        if (m > 0 && t > 0) return "Manhã/Tarde";
        if (m > 0 && n > 0) return "Manhã/Noite";
        if (t > 0 && n > 0) return "Tarde/Noite";
        if (n > 0) return "Noite";
        if (t > 0) return "Tarde";
        return "Manhã";
      })();
      const materias  = p.disciplinas.map(id => discMap.get(id)?.nome).filter(Boolean).join(" / ");
      const numAulas  = new Set(pAlocs.map(a => `${a.diaSemana}-${a.horario}`)).size;
      const cargo     = p.tipoVinculo === "efetivo" ? "PEB" : p.tipoVinculo === "designado" ? "PEB-D" : "PEB";
      const vinculo   = p.tipoVinculo === "efetivo" ? " – Efetivo" : p.tipoVinculo === "designado" ? " – Designado" : "";

      const W = `style="background:#eeeeee"`;
      const TH = `style="text-align:center;background:white;font-weight:bold"`;

      const pTotalCols = 2 + manhaQtd + tardeQtd + pNoiteQtd + 1;
      const pHalf  = Math.ceil(pTotalCols / 2);
      const pHalf2 = Math.floor(pTotalCols / 2);
      const mH1 = manhaQtd  > 0 ? `<td colspan="${manhaQtd}"  ${TH}>Matutino</td>`  : "";
      const tH1 = tardeQtd  > 0 ? `<td colspan="${tardeQtd}"  ${TH}>Vespertino</td>` : "";
      const nH1 = pNoiteQtd > 0 ? `<td colspan="${pNoiteQtd}" ${TH}>Noturno</td>`    : "";
      const mH2 = Array.from({length: manhaQtd}, (_, i) =>
        `<td ${TH} style="text-align:center;background:white;font-weight:bold;font-size:12px">${i+1}ª<br>aula</td>`).join("");
      const tH2 = Array.from({length: tardeQtd}, (_, i) =>
        `<td ${TH} style="text-align:center;background:white;font-weight:bold;font-size:12px">${i+1}ª<br>aula</td>`).join("");
      const nH2 = Array.from({length: pNoiteQtd}, (_, i) =>
        `<td ${TH} style="text-align:center;background:white;font-weight:bold;font-size:12px">${i+1}ª<br>aula</td>`).join("");
      const mH3 = Array.from({length: manhaQtd}, (_, i) =>
        `<td style="text-align:center;background:white;font-size:7px;font-weight:600">${slotLabel("manha", i+1)}</td>`).join("");
      const tH3 = Array.from({length: tardeQtd}, (_, i) =>
        `<td style="text-align:center;background:white;font-size:7px;font-weight:600">${slotLabel("tarde", i+1)}</td>`).join("");
      const nH3 = Array.from({length: pNoiteQtd}, (_, i) =>
        `<td style="text-align:center;background:white;font-size:7px;font-weight:600">${slotLabel("noite", i+1)}</td>`).join("");

      const pAssinData = (() => { try { return JSON.parse(localStorage.getItem(`edu_ponto_assin_${p.id}_${year}_${month}`) ?? "{}") ?? {}; } catch { return {} as Record<string,string>; } })();
      const pExtraData: Record<string,string> = (() => { try { return JSON.parse(localStorage.getItem(`edu_ponto_extra_${p.id}_${year}_${month}`) ?? "{}") ?? {}; } catch { return {}; } })();
      function satCellHtml(day: Date, horario: number, turno: string): string {
        const hasEv = pAssinData[String(day.getDate())] !== undefined;
        if (day.getDay() === 6 && hasEv) {
          const ds = toISO(day);
          const satSym = Object.entries(pExtraData).find(([k]) => k.startsWith(`${ds}_`))?.[1] ?? "SL";
          const symColors: Record<string,string> = { "@":"#16a34a","SL":"#2563eb","F":"#64748b","RP":"#16a34a","PE":"#0284c7","PF":"#d97706","EE":"#0891b2","CC":"#7c3aed","&":"#7c3aed","!":"#ea580c" };
          const symBg:     Record<string,string> = { "@":"#dcfce7","SL":"#dbeafe","F":"#f1f5f9","RP":"#dcfce7","PE":"#e0f2fe","PF":"#fef3c7","EE":"#cffafe","CC":"#ede9fe","&":"#ede9fe","!":"#fff7ed" };
          const clr = symColors[satSym] ?? "#16a34a";
          const bg  = symBg[satSym]    ?? "#dcfce7";
          return `<td style="text-align:center;background:${bg};font-weight:bold;color:${clr}">${satSym}</td>`;
        }
        return `<td style="text-align:center;color:#aaa;background:#eeeeee;font-size:7px">***</td>`;
      }
      const rows = days.map(day => {
        const we  = IS_WEEKEND(day.getDay());
        const ds  = toISO(day);
        const dk  = JS_DAY_KEY[day.getDay()];
        const fer = isFeriadoNacional(day);
        const wS  = (we || fer) ? `style="background:${fer && !we ? "#fff7ed" : "#eeeeee"}"` : "";
        const mCells = Array.from({length: manhaQtd}, (_, i) => {
          if (we) return satCellHtml(day, i+1, "manha");
          if (fer) return `<td style="text-align:center;background:#fff7ed;font-weight:bold;color:#c2410c">*</td>`;
          const a = pAlocs.find(x => x.diaSemana === dk && x.horario === i+1 && (turmaMap.get(x.turmaId)?.turno ?? "manha") === "manha");
          if (!a) return `<td style="background:white"></td>`;
          const r = registros.find(x => x.alocacaoId === a.id && x.data === ds);
          const tn = abrevT(turmaMap.get(a.turmaId)?.nome ?? "");
          const mark = !r ? "" : (r.valor ?? (r.presente ? "✓" : "F"));
          return `<td style="text-align:center;padding:0"><div style="display:flex;flex-direction:column;align-items:center;padding:1px 0"><span style="font-size:6px;color:#000;line-height:1">${tn}</span><span style="font-size:9px;font-weight:bold;line-height:1">${mark}</span></div></td>`;
        }).join("");
        const tCells = Array.from({length: tardeQtd}, (_, i) => {
          if (we) return satCellHtml(day, i+1, "tarde");
          if (fer) return `<td style="text-align:center;background:#fff7ed;font-weight:bold;color:#c2410c">*</td>`;
          const a = pAlocs.find(x => x.diaSemana === dk && x.horario === i+1 && turmaMap.get(x.turmaId)?.turno === "tarde");
          if (!a) return `<td style="background:white"></td>`;
          const r = registros.find(x => x.alocacaoId === a.id && x.data === ds);
          const tn = abrevT(turmaMap.get(a.turmaId)?.nome ?? "");
          const mark = !r ? "" : (r.valor ?? (r.presente ? "✓" : "F"));
          return `<td style="text-align:center;padding:0"><div style="display:flex;flex-direction:column;align-items:center;padding:1px 0"><span style="font-size:6px;color:#000;line-height:1">${tn}</span><span style="font-size:9px;font-weight:bold;line-height:1">${mark}</span></div></td>`;
        }).join("");
        const nCells = Array.from({length: pNoiteQtd}, (_, i) => {
          if (we) return satCellHtml(day, i+1, "noite");
          if (fer) return `<td style="text-align:center;background:#fff7ed;font-weight:bold;color:#c2410c">*</td>`;
          const a = pAlocs.find(x => x.diaSemana === dk && x.horario === i+1 && turmaMap.get(x.turmaId)?.turno === "noite");
          if (!a) return `<td style="background:white"></td>`;
          const r = registros.find(x => x.alocacaoId === a.id && x.data === ds);
          const tn = abrevT(turmaMap.get(a.turmaId)?.nome ?? "");
          const mark = !r ? "" : (r.valor ?? (r.presente ? "✓" : "F"));
          return `<td style="text-align:center;padding:0"><div style="display:flex;flex-direction:column;align-items:center;padding:1px 0"><span style="font-size:6px;color:#000;line-height:1">${tn}</span><span style="font-size:9px;font-weight:bold;line-height:1">${mark}</span></div></td>`;
        }).join("");
        const dayName = JS_DAY_NOME[day.getDay()];
        const assinOverride = pAssinData[String(day.getDate())];
        const assinTxt = assinOverride !== undefined ? assinOverride
          : we ? "********" : fer ? "FERIADO NACIONAL" : "&nbsp;";
        const assinStyle = (we || fer) && assinOverride === undefined
          ? "text-align:center;font-weight:bold;" + (fer && !we ? "color:#c2410c;" : "color:#555;")
          : "";
        return `<tr ${wS}>
          <td style="text-align:center;font-weight:bold;${we?"background:#eeeeee":fer?"background:#fff7ed":""}"> ${day.getDate()}</td>
          <td style="padding-left:3px;${we?"background:#eeeeee;font-weight:600;color:#555":fer?"background:#fff7ed;color:#c2410c;font-weight:600":""}">${dayName}</td>
          ${mCells}${tCells}${nCells}
          <td style="${assinStyle}${we?"background:#eeeeee":fer&&!we?"background:#fff7ed":""}">${assinTxt}</td>
        </tr>`;
      }).join("");

      const emptyRowsHTML = Array.from({length: Math.max(0, 31 - days.length)}, (_, i) =>
        `<tr style="background:white">
          <td style="text-align:center;color:#ccc">${days.length+i+1}</td>
          <td style="color:#ccc;text-align:center">—</td>
          ${Array.from({length: manhaQtd+tardeQtd+pNoiteQtd}, () => "<td></td>").join("")}
          <td></td>
        </tr>`).join("");

      const turnoColspan = Math.max(1, manhaQtd + tardeQtd + pNoiteQtd - 4);
      const obsColText = (() => { const o = localStorage.getItem(`edu_ponto_obs_shared_${year}_${month}`); return o ?? ""; })();
      return `<table>
        <tbody>
          <tr><td colspan="${pTotalCols}" style="text-align:center;font-weight:bold;font-size:12px;padding:4px;border:2px solid #000;text-transform:uppercase">
            PONTO DOS PROFESSORES — ${nomeEscola.toUpperCase()}
          </td></tr>
          <tr>
            <td colspan="${pTotalCols-1}" style="text-align:center;font-weight:bold;font-size:11px;border:1px solid #000;text-transform:uppercase">ENSINO FUNDAMENTAL E MÉDIO</td>
            <td style="text-align:center;font-weight:bold;border:1px solid #000;white-space:nowrap">Nº ${String(profIdx+1).padStart(2,"0")} de ${String(professores.length).padStart(2,"0")}</td>
          </tr>
          <tr>
            <td colspan="3"><b>MÊS:</b> ${MESES[month-1]}</td>
            <td colspan="2"><b>ANO:</b> ${year}</td>
            <td colspan="${turnoColspan}"><b>TURNO:</b> ${turnoLbl}</td>
            <td colspan="3" style="white-space:nowrap"><b>Admissão:</b> ${fmtDate(p.dataAdmissao)}</td>
          </tr>
          <tr>
            <td colspan="${pTotalCols-3}"><b>NOME:</b> ${p.nomeCompleto.toUpperCase()}</td>
            <td colspan="3"><b>MASP</b> ${p.masp ?? "—"}</td>
          </tr>
          <tr>
            <td colspan="${pTotalCols-3}"><b>MATÉRIA:</b> ${materias}${vinculo} &nbsp;<b>Nº de aulas</b> ${numAulas}</td>
            <td colspan="3"><b>Cargo</b> ${cargo}</td>
          </tr>
          <tr>
            <td rowspan="2" ${TH}><span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block">Dias</span></td>
            <td rowspan="2" ${TH}><span style="writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block">Semana</span></td>
            ${mH1}${tH1}${nH1}
            <td rowspan="2" ${TH}>Assinatura</td>
          </tr>
          <tr>${mH2}${tH2}${nH2}</tr>
          ${rows}${emptyRowsHTML}
          <tr><td colspan="${pTotalCols}" style="border:1px solid #000;padding:2px 6px;background:white">
            <span style="font-weight:bold;font-size:7.5px;text-transform:uppercase;letter-spacing:0.05em;color:#555">Legenda:</span>
            ${Object.entries(SIMBOLO_MAPA).map(([sym,info]) =>
              `<span style="margin-left:12px;font-size:7.5px"><b style="color:${info.cor}">${sym}</b> = ${info.descricao}</span>`
            ).join("")}
            <span style="margin-left:12px;font-size:7.5px"><b style="color:#ea580c">*</b> = Feriado Nacional</span>
          </td></tr>
          <tr><td colspan="${pTotalCols}" style="border:1px solid #000;padding:3px 6px">
            <b style="font-size:8px">Observações:</b><br>
            <span style="font-size:8px;white-space:pre-wrap">${obsColText}</span>
          </td></tr>
          <tr><td colspan="${pTotalCols}" style="border:2px solid #000;padding:4px;font-weight:600">
            Assinatura do Diretor:&nbsp;&nbsp;___________________________________________
          </td></tr>
          <tr><td colspan="${pTotalCols}" style="text-align:center;background:white;font-weight:bold;font-size:11px;border:2px solid #000;text-transform:uppercase;padding:3px">RESUMO MENSAL</td></tr>
          ${(() => {
            const rk = `edu_ponto_resumo_${p.id}_${year}_${month}`;
            let r: Record<string,string> = {};
            try { r = JSON.parse(localStorage.getItem(rk) ?? "{}") ?? {}; } catch { r = {}; }
            const vPresenca = r.presenca ?? "";
            const vFaltas   = r.faltas   ?? "";
            const vLicenca  = r.licenca  ?? "";
            const vFreq     = r.freq     ?? "";
            const vObs      = r.obsResumo ?? "";
            const obsColBody = (() => { const o = localStorage.getItem(`edu_ponto_obs_shared_${year}_${month}`); return o ? `<br>${o}` : ""; })();
            return `
          <tr>
            <td colspan="${pHalf}" style="padding:3px 6px"><b>PRESENÇA:</b> ${vPresenca}</td>
            <td colspan="${pHalf2}" style="padding:3px 6px"><b>FALTAS:</b> ${vFaltas}</td>
          </tr>
          <tr>
            <td colspan="${pTotalCols}" style="padding:3px 6px"><b>LICENÇA:</b> ${vLicenca.replace(/\n/g,'<br>')}</td>
          </tr>
          <tr>
            <td colspan="${pTotalCols}" style="padding:3px 6px"><b>FREQUÊNCIA:</b> ${vFreq}</td>
          </tr>
          `;
          })()}
        </tbody>
      </table>`;
    });

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) { alert("Ative popups no navegador para imprimir todos os professores."); return; }
    win.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
      <meta charset="UTF-8">
      <title>Livro de Ponto — ${MESES[month-1]} ${year}</title>
      <style>
        @page { size: A4 portrait; margin-top: 1.9cm; margin-right: 1.2cm; margin-bottom: 1.9cm; margin-left: 1.7cm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { background: white !important; background-color: white !important; margin: 0; padding: 0; width: 100%; }
        body { font-family: Arial, sans-serif; font-size: 13px; margin: 0; color: black; }
        table { border-collapse: collapse; width: 100%; }
        td { border: 1px solid #000; padding: 1px 3px; vertical-align: middle; }
        .prof {
          page-break-after: always;
          break-after: page;
          page-break-inside: avoid;
          break-inside: avoid;
          width: 100%;
          height: 259mm;
          box-sizing: border-box;
          padding: 0;
        }
        .prof:last-child { page-break-after: auto; break-after: auto; }
        .prof table { width: 100% !important; height: 259mm !important; table-layout: fixed !important; border-collapse: collapse !important; }
        .prof tr.ponto-data-row td { height: 10mm !important; min-height: 10mm !important; }
      </style>
    </head><body>
      ${profDocs.map(html => `<div class="prof">${html}</div>`).join("")}
      <script>
        window.onload = function() {
          var profs = document.querySelectorAll('.prof');
          var pxPerMm = 3.7795;
          var availH  = 259 * pxPerMm;
          var availW  = 181 * pxPerMm;
          profs.forEach(function(el) {
            var scale = Math.min(availH / el.scrollHeight, availW / el.scrollWidth, 1);
            if (scale < 0.999) el.style.zoom = scale.toFixed(4);
          });
          setTimeout(function() { window.print(); }, 600);
        };
      <\/script>
    </body></html>`);
    win.document.close();
  }

  function renderSlotCell(day: Date, horario: number, turno: "manha" | "tarde" | "noite", key: string) {
    const weekend = IS_WEEKEND(day.getDay());
    if (weekend) {
      const hasEvent = assinMap[String(day.getDate())] !== undefined;
      if (day.getDay() === 6 && hasEvent) {
        // Look up the actual symbol stored for any slot on this Saturday
        const dateStr = toISO(day);
        const satSym = Object.entries(extraSimbolos)
          .find(([k]) => k.startsWith(`${dateStr}_`))?.[1] ?? null;
        const satInfo = satSym ? SIMBOLO_MAPA[satSym] : null;
        return (
          <td key={key} className={`${cellBase} text-center ${satInfo?.bgCls ?? "bg-green-100"} print:bg-white`}>
            <span className={`text-[14px] font-bold select-none ${satInfo?.textCls ?? "text-green-700"} print:text-black`}>
              {satSym ?? "SL"}
            </span>
          </td>
        );
      }
      return (
        <td key={key} className={`${cellBase} text-center text-gray-400 text-[12px] bg-gray-200 print:bg-gray-200`}>***</td>
      );
    }
    if (isFeriadoNacional(day)) return (
      <td key={key} className={`${cellBase} text-center bg-orange-50 print:bg-white`}>
        <span className="text-[14px] font-bold text-orange-400 print:text-gray-500 select-none">*</span>
      </td>
    );
    const aloc    = lookupAloc(day, horario, turno);
    const dateStr = toISO(day);
    const reg     = lookupReg(aloc?.id ?? null, dateStr);
    if (!aloc) {
      const extraK   = `${dateStr}_${horario}_${turno}`;
      const extraSym = extraSimbolos[extraK];
      if (!extraSym) return <td key={key} className={`${cellBase} bg-white`} />;
      const eInfo = SIMBOLO_MAPA[extraSym];
      return (
        <td
          key={key}
          className={`${cellBase} text-center cursor-pointer ${eInfo?.bgCls ?? "bg-purple-100"} print:bg-white`}
          title="Clique para remover"
          onClick={() => removeExtra(extraK)}
        >
          <span className={`text-[14px] font-bold select-none ${eInfo?.textCls ?? "text-purple-700"} print:text-black`}>
            {extraSym}
          </span>
        </td>
      );
    }
    const currentVal = reg?.valor ?? (reg?.presente === true ? "✓" : reg?.presente === false ? "F" : "");
    const simInfo    = getSimInfo(currentVal);
    const isFalta    = !simInfo && currentVal !== "" && FALTA_TOKENS.has(currentVal.trim().toLowerCase());
    const turmaNome  = turmaMap.get(aloc.turmaId)?.nome ?? "";
    const turmaAbr   = abrevTurma(turmaNome);
    const tdBg = simInfo    ? `${simInfo.bgCls} print:bg-white`
               : isFalta    ? "bg-red-50 print:bg-white"
               : currentVal ? "bg-green-50 print:bg-white"
                            : "bg-white hover:bg-blue-50/30";
    const inputTxt = simInfo    ? `${simInfo.textCls} print:text-black`
                   : isFalta    ? "text-red-700 print:text-black"
                   : currentVal ? "text-green-800 print:text-black"
                                : "text-gray-300";
    return (
      <td key={key} className={`${cellBase} text-center p-0 transition-colors ${tdBg}`}>
        <div className="flex flex-col items-center justify-center leading-none py-0.5 gap-px">
          <span className="text-[11px] font-semibold text-gray-900 print:text-gray-900 leading-none select-none">{turmaAbr}</span>
          <input
            type="text"
            value={currentVal}
            onChange={e => updateReg(aloc, dateStr, e.target.value)}
            className={`w-full text-center text-[13px] font-bold leading-none bg-transparent border-none outline-none min-w-0 ${inputTxt}`}
            placeholder="·"
            title={`${turmaNome}`}
          />
        </div>
      </td>
    );
  }

  return (
    <div className="flex gap-4 pb-8 items-start">

      {/* ══ Sidebar de Preenchimento Rápido (fixa) ═══════════════════════════ */}
      <aside className="no-print sticky top-4 w-72 shrink-0 rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3 max-h-[calc(100vh-5rem)] overflow-y-auto">

        {/* ── Seção 1: Observações partilhadas ─────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" />
            Observações
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Partilhado · todos os professores · mês atual
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map(preset => {
            const sym  = PRESET_SIMBOLO[preset];
            const info = sym ? SIMBOLO_MAPA[sym] : null;
            const active = quickText === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => { setQuickText(preset); quickInputRef.current?.focus(); }}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1
                  ${active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted text-foreground"}`}
              >
                {sym && (
                  <span
                    style={active ? {} : { color: info?.cor }}
                    className="font-bold text-[10px]"
                  >
                    {sym}
                  </span>
                )}
                {preset}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Texto personalizado</label>
          <Input
            ref={quickInputRef}
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            placeholder="Ex: Reunião, Evento cultural…"
            className="h-8 text-xs w-full"
            onKeyDown={e => { if (e.key === "Enter") applyQuickFill(); }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Dia</label>
          <div className="flex flex-wrap gap-1">
            {([{label:"Seg",dow:1},{label:"Ter",dow:2},{label:"Qua",dow:3},{label:"Qui",dow:4},{label:"Sex",dow:5},{label:"Sáb",dow:6}] as const).map(({label,dow}) => (
              <button
                key={dow}
                type="button"
                onClick={() => toggleQuickDow(dow)}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                  ${quickDow.includes(dow)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Select
            value={quickDow.length > 0 ? "" : quickDay}
            onValueChange={v => { setQuickDow([]); setQuickDay(v); }}
          >
            <SelectTrigger className="h-7 text-xs w-full mt-1"><SelectValue placeholder="Data específica…" /></SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {days.filter(d => d.getDay() !== 0).map(d => (
                <SelectItem key={d.getDate()} value={String(d.getDate())}>
                  Dia {d.getDate()} — {JS_DAY_NOME[d.getDay()]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Horários</label>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => toggleQuickSlot("todos")}
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                ${quickSlots.includes("todos")
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted text-foreground"}`}
            >
              Todos
            </button>
            {manhaQtd > 0 && Array.from({ length: manhaQtd }, (_, i) => {
              const val = `m${i + 1}`;
              const active = quickSlots.includes(val);
              return (
                <button key={val} type="button" onClick={() => toggleQuickSlot(val)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                    ${active ? "bg-blue-600 text-white border-blue-600" : "bg-background border-border hover:bg-muted text-foreground"}`}
                  title={`${i + 1}ª aula — Matutino`}
                >
                  {i + 1}ªM
                </button>
              );
            })}
            {tardeQtd > 0 && Array.from({ length: tardeQtd }, (_, i) => {
              const val = `t${i + 1}`;
              const active = quickSlots.includes(val);
              return (
                <button key={val} type="button" onClick={() => toggleQuickSlot(val)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                    ${active ? "bg-orange-500 text-white border-orange-500" : "bg-background border-border hover:bg-muted text-foreground"}`}
                  title={`${i + 1}ª aula — Vespertino`}
                >
                  {i + 1}ªV
                </button>
              );
            })}
            {displayNoiteQtd > 0 && Array.from({ length: displayNoiteQtd }, (_, i) => {
              const val = `n${i + 1}`;
              const active = quickSlots.includes(val);
              return (
                <button key={val} type="button" onClick={() => toggleQuickSlot(val)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                    ${active ? "bg-purple-600 text-white border-purple-600" : "bg-background border-border hover:bg-muted text-foreground"}`}
                  title={`${i + 1}ª aula — Noturno`}
                >
                  {i + 1}ªN
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Meses</label>
          <div className="flex flex-wrap gap-1">
            {MESES_ABREV.map((label, i) => {
              const m = i + 1;
              const active = quickMonths.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleQuickMonth(m)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                    ${active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted text-foreground"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="h-8 gap-1.5 flex-1" onClick={applyQuickFill} disabled={!quickText.trim()}>
            {quickApplied ? <><Check className="w-3.5 h-3.5" />Aplicado!</> : <><Zap className="w-3.5 h-3.5" />Aplicar</>}
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1" title="Desfazer alteração nas Observações" aria-label="Desfazer observações" onClick={undoObs} disabled={obsHistoryRef.current.length === 0}>
            <Undo2 className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10" title="Limpar campo" onClick={() => { handleObsChange(""); toast({ title: "Campo limpo" }); }} disabled={!obs}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Adiciona texto ao campo <em>Observações</em>. Use <strong>↩</strong> para desfazer ou <strong>🗑</strong> para limpar.
        </p>

        {/* ── Seção 2: Símbolos Especiais ───────────────────────────────── */}
        <div className="border-t-2 border-purple-200 pt-3 space-y-2">
          <div>
            <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
              <span className="font-bold">§</span>
              Símbolos Especiais nos Horários
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Individual · professor selecionado · meses escolhidos abaixo
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Símbolo</label>
            <Select value={specSymbol} onValueChange={setSpecSymbol}>
              <SelectTrigger className="h-8 text-xs w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SIMBOLOS_ESPECIAIS_KEYS.map(sym => {
                  const info = SIMBOLO_MAPA[sym];
                  return (
                    <SelectItem key={sym} value={sym}>
                      <span style={{ color: info.cor }} className="font-bold mr-1">{sym}</span>
                      <span className="text-xs text-muted-foreground">= {info.descricao}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Dia</label>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => { setSpecDow([]); setSpecDay("todos"); }}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                  ${specDow.length === 0
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-background border-border hover:bg-muted text-foreground"}`}
              >
                Todos
              </button>
              {([{label:"Seg",dow:1},{label:"Ter",dow:2},{label:"Qua",dow:3},{label:"Qui",dow:4},{label:"Sex",dow:5},{label:"Sáb",dow:6}] as const).map(({label,dow}) => (
                <button
                  key={dow}
                  type="button"
                  onClick={() => toggleSpecDow(dow)}
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                    ${specDow.includes(dow)
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-background border-border hover:bg-muted text-foreground"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Horários</label>
            <div className="flex flex-wrap gap-1">
              {/* "Todos" chip */}
              <button
                type="button"
                onClick={() => toggleSpecSlot("todos")}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                  ${specSlots.includes("todos")
                    ? "bg-purple-600 text-white border-purple-600"
                    : "bg-background border-border hover:bg-muted text-foreground"}`}
              >
                Todos
              </button>
              {/* Matutino chips */}
              {manhaQtd > 0 && Array.from({ length: manhaQtd }, (_, i) => {
                const val = `m${i+1}`;
                const active = specSlots.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleSpecSlot(val)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                      ${active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-background border-border hover:bg-muted text-foreground"}`}
                    title={`${i+1}ª aula — Matutino`}
                  >
                    {i+1}ªM
                  </button>
                );
              })}
              {/* Vespertino chips */}
              {tardeQtd > 0 && Array.from({ length: tardeQtd }, (_, i) => {
                const val = `t${i+1}`;
                const active = specSlots.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleSpecSlot(val)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                      ${active
                        ? "bg-orange-500 text-white border-orange-500"
                        : "bg-background border-border hover:bg-muted text-foreground"}`}
                    title={`${i+1}ª aula — Vespertino`}
                  >
                    {i+1}ªV
                  </button>
                );
              })}
              {/* Noturno chips */}
              {displayNoiteQtd > 0 && Array.from({ length: displayNoiteQtd }, (_, i) => {
                const val = `n${i+1}`;
                const active = specSlots.includes(val);
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleSpecSlot(val)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                      ${active
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-background border-border hover:bg-muted text-foreground"}`}
                    title={`${i+1}ª aula — Noturno`}
                  >
                    {i+1}ªN
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Meses</label>
            <div className="flex flex-wrap gap-1">
              {MESES_ABREV.map((label, i) => {
                const m = i + 1;
                const active = specMonths.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleSpecMonth(m)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors
                      ${active
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-background border-border hover:bg-muted text-foreground"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="h-8 flex-1 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white"
              onClick={applySpecialSymbol}
            >
              {specApplied
                ? <><Check className="w-3.5 h-3.5" />Aplicado!</>
                : <><Zap className="w-3.5 h-3.5" />Aplicar</>}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={clearSpecialSymbols}
              title="Limpar símbolos das células selecionadas"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Preenche as células selecionadas. O botão <span className="text-destructive">✕</span> remove os símbolos do dia/horário escolhido.
          </p>
        </div>
      </aside>

      {/* ══ Conteúdo principal ═══════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 space-y-4">

      {/* ── Controles (ecrã apenas) ─────────────────────────────────────────── */}
      <div className="no-print flex items-center gap-2 flex-wrap pb-3 border-b border-border">
        <ClipboardList className="w-5 h-5 text-primary shrink-0" />
        <h1 className="text-lg font-bold">Livro de Ponto</h1>
        <div className="flex gap-2 ml-auto flex-wrap items-center">
          <Select value={profId} onValueChange={v => { setProfId(v); setDiscId("__todas__"); }}>
            <SelectTrigger className="w-52 h-8 text-xs"><SelectValue placeholder="Professor" /></SelectTrigger>
            <SelectContent>
              {professores.map(p => <SelectItem key={p.id} value={p.id}>{p.nomeCompleto}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={discId} onValueChange={setDiscId}>
            <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Disciplina" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__todas__">Todas as disciplinas</SelectItem>
              {prof?.disciplinas.map(id => discMap.get(id)).filter(Boolean).map(d => (
                <SelectItem key={d!.id} value={d!.id}>{d!.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(month)} onValueChange={v => setMonth(Number(v))}>
            <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
            <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[2024, 2025, 2026, 2027, 2028].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10" onClick={clearAllRegistros} title="Limpar todos os registros do mês">
            <Eraser className="w-3.5 h-3.5" />Limpar
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={undoAction} disabled={!canUndo} title="Desfazer última alteração na grelha" aria-label="Desfazer grelha">
            <Undo2 className="w-3.5 h-3.5" />Desfazer
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={redoAction} disabled={!canRedo} title="Refazer última alteração na grelha" aria-label="Refazer grelha">
            <Redo2 className="w-3.5 h-3.5" />Refazer
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />Imprimir
          </Button>
          <Button size="sm" className="h-8 gap-1.5" onClick={handlePrintAll}>
            <Printer className="w-3.5 h-3.5" />Imprimir Todos
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1 print:hidden">
          <span className="font-semibold">Dica:</span> no diálogo de impressão do browser, desmarque <span className="italic">"Cabeçalhos e rodapés"</span> para remover a data/hora e o URL automáticos do browser.
        </p>
      </div>

      {/* ── Documento oficial (proporções A4) ────────────────────────────────── */}
      <div className="overflow-x-auto">
        {(() => {
          const totalSlots = manhaQtd + tardeQtd + noiteQtd;
          // Dias 3% + Semana 8% + Assinatura 37% = 48% → slots share 52%
          const slotPct = totalSlots > 0 ? (52 / totalSlots) : 0;
          const tableFontSize = totalSlots >= 9 ? "13px" : totalSlots >= 7 ? "14px" : "15px";
          return (
        <div className="a4-sheet mx-auto bg-white shadow-md print:shadow-none" style={{ width: "210mm", minHeight: "297mm", padding: "1.9cm 1.2cm 1.9cm 1.7cm", boxSizing: "border-box" }}>
        <table className="border-collapse w-full" style={{ tableLayout: "fixed", fontSize: tableFontSize }}>
          <colgroup>{[
            <col key="dias" style={{ width: "3%" }} />,
            <col key="sem"  style={{ width: "8%" }} />,
            ...Array.from({ length: manhaQtd }, (_, i) => <col key={`m${i}`} style={{ width: `${slotPct.toFixed(1)}%` }} />),
            ...Array.from({ length: tardeQtd }, (_, i) => <col key={`t${i}`} style={{ width: `${slotPct.toFixed(1)}%` }} />),
            ...Array.from({ length: noiteQtd }, (_, i) => <col key={`n${i}`} style={{ width: `${slotPct.toFixed(1)}%` }} />),
            <col key="ass" style={{ width: "37%" }} />,
          ]}</colgroup>

          <tbody>
            {/* ── TÍTULO ─────────────────────────────────────────────────── */}
            <tr>
              <td colSpan={totalCols} className="border-2 border-black text-center font-bold text-[13px] py-1.5 uppercase tracking-wide bg-white">
                PONTO DOS PROFESSORES — {nomeEscola.toUpperCase()}
              </td>
            </tr>
            <tr>
              <td colSpan={totalCols - 1} className="border border-black text-center font-bold text-[12px] py-0.5 uppercase bg-white">
                ENSINO FUNDAMENTAL E MÉDIO
              </td>
              <td className="border border-black text-center font-bold py-0.5 bg-white whitespace-nowrap text-[11px]">
                {(() => {
                  const idx = professores.findIndex(p => p.id === profId);
                  const n   = (idx + 1).toString().padStart(2, "0");
                  const tot = professores.length.toString().padStart(2, "0");
                  return `Nº ${n} de ${tot}`;
                })()}
              </td>
            </tr>

            {/* ── MÊS | ANO | TURNO | ADMISSÃO ───────────────────────────── */}
            <tr>
              <td colSpan={3} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">MÊS:</span> {MESES[month - 1]}
              </td>
              <td colSpan={2} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">ANO:</span> {year}
              </td>
              <td colSpan={Math.max(1, manhaQtd + tardeQtd + noiteQtd - 3)} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">TURNO:</span> {turnoLabel}
              </td>
              <td colSpan={3} className={`${cellBase} px-1 py-0.5 bg-white whitespace-nowrap`}>
                <span className="font-bold">Admissão:</span> {formatDateBR(prof?.dataAdmissao)}
              </td>
            </tr>

            {/* ── NOME | MASP ─────────────────────────────────────────────── */}
            <tr>
              <td colSpan={totalCols - 3} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">NOME:</span> {prof?.nomeCompleto?.toUpperCase() ?? "—"}
              </td>
              <td colSpan={3} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">MASP</span> {prof?.masp ?? "—"}
              </td>
            </tr>

            {/* ── MATÉRIA | Nº AULAS | CARGO ─────────────────────────────── */}
            <tr>
              <td colSpan={totalCols - 3} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">MATÉRIA:</span> {materiaLabel}{vinculoLabel ? ` – ${vinculoLabel}` : ""}
                <span className="ml-3 font-bold">Nº de aulas</span> {numAulasSemana}
                <span className="font-normal text-[10px] text-gray-500 ml-1">/ sem.</span>
              </td>
              <td colSpan={3} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <span className="font-bold">Cargo</span> {cargoLabel}
              </td>
            </tr>

            {/* ── CABEÇALHO DA TABELA (2 linhas) ──────────────────────────── */}
            <tr>
              <td rowSpan={2} className={`${thBase} py-0.5 text-[14px]`}><span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", display: "inline-block" }}>Dias</span></td>
              <td rowSpan={2} className={`${thBase} py-0.5 text-[14px]`}><span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", display: "inline-block" }}>Semana</span></td>
              {manhaQtd > 0 && <td colSpan={manhaQtd} className={`${thBase} py-0.5`}>Matutino</td>}
              {tardeQtd > 0 && <td colSpan={tardeQtd} className={`${thBase} py-0.5`}>Vespertino</td>}
              {noiteQtd > 0 && <td colSpan={noiteQtd} className={`${thBase} py-0.5`}>Noturno</td>}
              <td rowSpan={2} className={`${thBase} py-0.5 text-[14px]`}>Assinatura</td>
            </tr>
            <tr>
              {Array.from({ length: manhaQtd }, (_, i) => (
                <td key={`mh${i}`} className={`${thBase} py-0.5 text-[13px] leading-tight`}>{i + 1}ª<br />aula</td>
              ))}
              {Array.from({ length: tardeQtd }, (_, i) => (
                <td key={`th${i}`} className={`${thBase} py-0.5 text-[13px] leading-tight`}>{i + 1}ª<br />aula</td>
              ))}
              {Array.from({ length: noiteQtd }, (_, i) => (
                <td key={`nh${i}`} className={`${thBase} py-0.5 text-[13px] leading-tight`}>{i + 1}ª<br />aula</td>
              ))}
            </tr>

            {/* ── DIAS DO MÊS ─────────────────────────────────────────────── */}
            {days.map((day, dayIdx) => {
              const weekend = IS_WEEKEND(day.getDay());
              const wCls    = weekend ? "bg-gray-200 print:bg-gray-200" : "bg-white";
              const dateStr = toISO(day);
              return (
                <tr key={dateStr} className={`ponto-data-row ${weekend ? "bg-gray-200" : "bg-white hover:bg-blue-50/20"}`} style={{ height: "10mm" }}>
                  <td className={`${cellBase} text-center font-bold py-0.5 ${wCls}`}>{day.getDate()}</td>
                  <td className={`${cellBase} px-1 py-0.5 ${wCls} ${weekend ? "text-gray-500 font-semibold" : ""}`}>
                    {JS_DAY_NOME[day.getDay()]}
                  </td>
                  {Array.from({ length: manhaQtd }, (_, i) => renderSlotCell(day, i + 1, "manha", `${dateStr}-m${i + 1}`))}
                  {Array.from({ length: tardeQtd }, (_, i) => renderSlotCell(day, i + 1, "tarde", `${dateStr}-t${i + 1}`))}
                  {Array.from({ length: noiteQtd }, (_, i) => renderSlotCell(day, i + 1, "noite", `${dateStr}-n${i + 1}`))}
                  {(() => {
                    const feriado    = isFeriadoNacional(day);
                    const dayKey     = String(day.getDate());
                    const override   = assinMap[dayKey];
                    const hasOverride = override !== undefined;
                    const autoText   = weekend ? "********" : feriado ? "FERIADO NACIONAL" : "";
                    const displayText = hasOverride ? override : autoText;
                    const isFixed    = (weekend || feriado) && !hasOverride;
                    return (
                      <td className={`${cellBase} ${wCls} ${feriado && !weekend ? "bg-orange-50 print:bg-white" : ""} p-0`}>
                        {isFixed ? (
                          <div className="flex items-center justify-center h-full px-1">
                            <span className={`text-[13px] font-bold text-center select-none ${
                              feriado ? "text-orange-600 print:text-black" : "text-gray-500 print:text-gray-600"
                            }`}>{displayText}</span>
                          </div>
                        ) : (
                          <input
                            type="text"
                            value={displayText}
                            onChange={e => saveAssin(day.getDate(), e.target.value)}
                            className="w-full bg-transparent border-none outline-none text-[13px] px-1 focus:bg-blue-50/20"
                          />
                        )}
                      </td>
                    );
                  })()}
                </tr>
              );
            })}

            {/* ── LINHAS VAZIAS (até 31) ───────────────────────────────────── */}
            {Array.from({ length: emptyRows }, (_, i) => (
              <tr key={`emp${i}`} className="ponto-data-row bg-white" style={{ height: "10mm" }}>
                <td className={`${cellBase} text-center text-gray-300 py-0.5`}>{days.length + i + 1}</td>
                <td className={`${cellBase} text-center text-gray-300`}>—</td>
                {Array.from({ length: manhaQtd + tardeQtd + noiteQtd }, (_, j) => (
                  <td key={j} className={`${cellBase} bg-white`} />
                ))}
                <td className={`${cellBase} bg-white`} />
              </tr>
            ))}

            {/* ── LEGENDA DE SÍMBOLOS ──────────────────────────────────────── */}
            <tr>
              <td colSpan={totalCols} className={`${cellBase} px-2 py-0.5 bg-white`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-[8px]">
                  <span className="font-bold text-gray-900 uppercase tracking-wide mr-1">Legenda:</span>
                  {Object.entries(SIMBOLO_MAPA).map(([sym, info]) => (
                    <span key={sym} className="flex items-center gap-1">
                      <strong style={{ color: info.cor }} className="text-[9px]">{sym}</strong>
                      <span className="text-gray-900">= {info.descricao}</span>
                    </span>
                  ))}
                  <span className="flex items-center gap-1">
                    <strong className="text-orange-500 text-[9px]">*</strong>
                    <span className="text-gray-900">= Feriado Nacional</span>
                  </span>
                </div>
              </td>
            </tr>

            {/* ── PUBLICAÇÕES, LICENÇAS E OUTROS ───────────────────────────── */}
            <tr>
              <td colSpan={totalCols} className={`${cellBase} px-1 py-0.5 bg-white`}>
                <div className="text-[9px] font-bold text-gray-700 mb-0.5">Observações:</div>
                <textarea
                  ref={obsRef}
                  className="w-full text-[9px] leading-snug resize-none border-0 outline-none bg-transparent placeholder:text-gray-300 break-words whitespace-pre-wrap"
                  style={{ minHeight: "28px", height: "auto", overflowY: "hidden" }}
                  placeholder="Registros de publicações, licenças médicas, afastamentos e outros…"
                  value={obs}
                  onChange={e => handleObsChange(e.target.value)}
                />
              </td>
            </tr>

            {/* ── ASSINATURA DO DIRETOR ────────────────────────────────────── */}
            <tr>
              <td colSpan={totalCols} className="border-2 border-black bg-white py-1.5 px-2 font-semibold text-[11px]">
                Assinatura do Diretor:&nbsp;&nbsp;___________________________________________
              </td>
            </tr>

            {/* ── RESUMO MENSAL ────────────────────────────────────────────── */}
            <tr>
              <td colSpan={totalCols} className="border-2 border-black bg-gray-100 print:bg-white text-center font-bold py-1 text-[12px] uppercase tracking-wide">
                RESUMO MENSAL
              </td>
            </tr>
            {/* Linha 1: PRESENÇA | LICENÇA (lado a lado) */}
            <tr>
              <td colSpan={Math.ceil(totalCols / 4)} className={`${cellBase} px-2 py-1 bg-white`}>
                <span className="font-bold">PRESENÇA:</span>&nbsp;
                <input
                  type="text"
                  value={resumo.presenca}
                  onChange={e => saveResumo({ presenca: e.target.value })}
                  className="print:hidden underline font-semibold bg-transparent border-none outline-none w-16 text-current"
                />
                <span className="hidden print:inline underline font-semibold">{resumo.presenca}</span>
              </td>
              <td colSpan={totalCols - Math.ceil(totalCols / 4)} className={`${cellBase} px-2 py-1 bg-white`}>
                <span className="font-bold">LICENÇA:</span>&nbsp;
                <textarea
                  value={resumo.licenca}
                  onChange={e => saveResumo({ licenca: e.target.value })}
                  rows={1}
                  className="print:hidden underline font-semibold bg-transparent border-none outline-none w-full resize-none text-current text-[10px] align-top"
                  placeholder="Ex: Licença médica 10/05 a 12/05 — CID X00, Licença prêmio 20/05…"
                />
                <span className="hidden print:inline underline font-semibold whitespace-pre-wrap">{resumo.licenca}</span>
              </td>
            </tr>
            {/* Linha 2: FALTAS | FREQUÊNCIA */}
            <tr>
              <td colSpan={Math.ceil(totalCols / 4)} className={`${cellBase} px-2 py-1 bg-white`}>
                <span className="font-bold">FALTAS:</span>&nbsp;
                <input
                  type="text"
                  value={resumo.faltas}
                  onChange={e => saveResumo({ faltas: e.target.value })}
                  className="print:hidden underline font-semibold bg-transparent border-none outline-none w-16 text-current"
                />
                <span className="hidden print:inline underline font-semibold">{resumo.faltas}</span>
              </td>
              <td colSpan={totalCols - Math.ceil(totalCols / 4)} className={`${cellBase} px-2 py-1 bg-white`}>
                <span className="font-bold">FREQUÊNCIA:</span>&nbsp;
                <input
                  type="text"
                  value={resumo.freq}
                  onChange={e => saveResumo({ freq: e.target.value })}
                  className="print:hidden underline font-semibold bg-transparent border-none outline-none w-24 text-current"
                />
                <span className="hidden print:inline underline font-semibold">{resumo.freq}</span>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
          ); /* /a4-sheet */
        })()}
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin-top: 1.9cm; margin-right: 1.2cm; margin-bottom: 1.9cm; margin-left: 1.7cm; }
          .no-print { display: none !important; }
          html, body {
            background: white !important;
            background-color: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          body > div, body > div > div,
          #root, #root > div, #root > div > div,
          main, main > div, .overflow-x-auto {
            background: white !important;
            background-color: white !important;
            box-shadow: none !important;
            height: auto !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          /* @page já define as margens; o .a4-sheet ocupa 100% da área útil */
          .a4-sheet {
            background: white !important;
            background-color: white !important;
            width: 100% !important;
            height: 259mm !important;
            min-height: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            display: block !important;
          }
          .a4-sheet table {
            width: 100% !important;
            height: 259mm !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          td, th { padding: 1px 2px !important; vertical-align: middle !important; }
          textarea { resize: none !important; border: none !important; outline: none !important; overflow: hidden !important; }
          input[type="text"] { border: none !important; outline: none !important; background: transparent !important; }
        }
        .a4-sheet { box-sizing: border-box; }
      `}</style>
      </div>
    </div>
  );
}
