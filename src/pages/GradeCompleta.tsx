import { useMemo, Fragment, useEffect } from "react";
import { useTurmas, useProfessores, useDisciplinas, useAlocacoes, useConfiguracaoHorarios, useNomeEscola } from "@/store";
import { generateTimeSlotsForTurno } from "@/lib/schedule-utils";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const DIAS = ["segunda", "terca", "quarta", "quinta", "sexta"] as const;
type Dia = typeof DIAS[number];

const DIA_LABELS: Record<Dia, string> = {
  segunda: "Segunda-feira",
  terca: "Terça-feira",
  quarta: "Quarta-feira",
  quinta: "Quinta-feira",
  sexta: "Sexta-feira",
};

const DIA_SHORT: Record<Dia, string> = {
  segunda: "Seg", terca: "Ter", quarta: "Qua", quinta: "Qui", sexta: "Sex",
};

function shortTurma(nome: string): string {
  return nome.replace(/º\s*/g, "").replace(/\s*-\s*/g, "-").replace(/\s+EM\s*/gi, "EM").replace(/\s+Ano\s*/gi, "").trim();
}

export default function GradeCompleta() {
  const [turmas]      = useTurmas();
  const [professores] = useProfessores();
  const [disciplinas] = useDisciplinas();
  const [alocacoes]   = useAlocacoes();
  const [config]      = useConfiguracaoHorarios();
  const [nomeEscola]  = useNomeEscola();

  // ── Slot generation ────────────────────────────────────────────────────────
  const manhaSlots = useMemo(() => generateTimeSlotsForTurno(config, "manha"), [config]);
  const tardeSlots = useMemo(
    () => config.habilitarTarde ? generateTimeSlotsForTurno(config, "tarde") : [],
    [config]
  );
  const noiteSlots = useMemo(
    () => config.habilitarNoite ? generateTimeSlotsForTurno(config, "noite") : [],
    [config]
  );

  const manhaPeriods = useMemo(() => manhaSlots.filter((s) => !s.isBreak), [manhaSlots]);
  const tardePeriods = useMemo(() => tardeSlots.filter((s) => !s.isBreak), [tardeSlots]);
  const noitePeriods = useMemo(() => noiteSlots.filter((s) => !s.isBreak), [noiteSlots]);
  const manhaBreak   = useMemo(() => manhaSlots.find((s) => s.isBreak), [manhaSlots]);
  const tardeBreak   = useMemo(() => tardeSlots.find((s) => s.isBreak), [tardeSlots]);
  const noiteBreak   = useMemo(() => noiteSlots.find((s) => s.isBreak), [noiteSlots]);

  const manhaBreakAfter = config.possuiIntervalo      ? config.horarioIntervalo      : null;
  const tardeBreakAfter = config.possuiIntervaloTarde  ? config.horarioIntervaloTarde  : null;
  const noiteBreakAfter = config.possuiIntervaloNoite  ? config.horarioIntervaloNoite  : null;

  // ── Turma grouping ─────────────────────────────────────────────────────────
  const manhaTurmas = useMemo(
    () => [...turmas].filter((t) => !t.turno || t.turno === "manha").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [turmas]
  );
  const tardeTurmas = useMemo(
    () => [...turmas].filter((t) => t.turno === "tarde").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [turmas]
  );
  const noiteTurmas = useMemo(
    () => [...turmas].filter((t) => t.turno === "noite").sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    [turmas]
  );
  const profsOrdenados = useMemo(
    () => [...professores].sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto, "pt-BR")),
    [professores]
  );

  const hasTarde = config.habilitarTarde && tardeTurmas.length > 0;
  const hasNoite = config.habilitarNoite && noiteTurmas.length > 0;

  function getCells(dia: Dia, period: number, turmaId: string) {
    return alocacoes.filter((a) => a.turmaId === turmaId && a.diaSemana === dia && a.horario === period);
  }

  function getProfCells(profId: string, dia: Dia, period: number, turno: "manha" | "tarde" | "noite") {
    const turmaIds = new Set(turmas.filter((t) => turno === "manha" ? (!t.turno || t.turno === "manha") : t.turno === turno).map((t) => t.id));
    return alocacoes.filter(
      (a) => a.professorId === profId && a.diaSemana === dia && a.horario === period && turmaIds.has(a.turmaId)
    );
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("autoprint") !== "1") return;
    const timer = setTimeout(() => window.print(), 800);
    return () => clearTimeout(timer);
  }, []);

  // ── Shared cell renderer ───────────────────────────────────────────────────
  function TurmaCell({ dia, period, turmaId }: { dia: Dia; period: number; turmaId: string }) {
    const cells = getCells(dia, period, turmaId);
    return (
      <td className="border border-gray-300 px-0.5 py-0.5 text-center align-middle" style={{ minWidth: 0 }}>
        {cells.length === 0 ? (
          <span className="text-gray-300 text-[9px]">—</span>
        ) : (
          <div className="space-y-0.5">
            {cells.map((aloc) => {
              const disc = disciplinas.find((d) => d.id === aloc.disciplinaId);
              const prof = professores.find((p) => p.id === aloc.professorId);
              const firstName = prof ? prof.nomeCompleto.split(" ")[0].toUpperCase() : "";
              return (
                <div key={aloc.id} className="leading-tight">
                  <span className="font-bold text-[9px]">{disc?.abreviacao ?? "?"}</span>
                  {" / "}
                  <span className="text-[9px]">{firstName}</span>
                </div>
              );
            })}
          </div>
        )}
      </td>
    );
  }

  // ── Shift grid renderer ────────────────────────────────────────────────────
  function ShiftGrid({
    turno,
    turmList,
    periods,
    breakSlot,
    breakAfter,
  }: {
    turno: "manha" | "tarde";
    turmList: typeof manhaTurmas;
    periods: typeof manhaPeriods;
    breakSlot: typeof manhaBreak;
    breakAfter: number | null;
  }) {
    const isManha = turno === "manha";
    const headerBg = isManha
      ? "bg-blue-700 text-white"
      : "bg-orange-600 text-white";
    const subHeaderBg = isManha
      ? "bg-blue-50 print:bg-blue-50"
      : "bg-orange-50 print:bg-orange-50";
    const label = isManha ? "☀ MATUTINO" : "☾ VESPERTINO";

    if (turmList.length === 0) return null;

    return (
      <>
        {/* Shift sub-header */}
        {hasTarde && (
          <div className={`${headerBg} text-center text-[10px] font-bold uppercase tracking-widest py-0.5 mt-1`}>
            {label}
          </div>
        )}
        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-[10px] leading-tight" style={{ tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: "80px" }} />
              {turmList.map((t) => <col key={t.id} />)}
            </colgroup>
            <thead>
              <tr className={subHeaderBg}>
                <th className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">Horário</th>
                {turmList.map((t) => (
                  <th key={t.id} className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">
                    {shortTurma(t.nome)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((slot, idx) => {
                const showBreak = breakAfter !== null && idx > 0 && periods[idx - 1].period === breakAfter;
                return (
                  <Fragment key={`${turno}-${slot.period}`}>
                    {showBreak && breakSlot && (
                      <tr className="bg-gray-50">
                        <td
                          colSpan={turmList.length + 1}
                          className="border border-gray-300 text-center text-[8px] font-semibold text-gray-500 italic py-0.5"
                        >
                          Intervalo {breakSlot.start} – {breakSlot.end}
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-300">
                      <td className={`border border-gray-400 px-1 py-0.5 text-center align-middle ${subHeaderBg}`}>
                        <div className="font-mono text-[9px] font-semibold whitespace-nowrap">
                          {slot.start}–{slot.end}
                        </div>
                      </td>
                      {turmList.map((turma) => (
                        <TurmaCell key={turma.id} dia={DIAS[DIAS.indexOf(DIAS[0])]} period={slot.period} turmaId={turma.id} />
                      ))}
                    </tr>
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/grade">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Voltar
            </Button>
          </Link>
          <span className="text-sm font-semibold text-gray-700">Horário Completo — {nomeEscola}</span>
          {(hasTarde || hasNoite) && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {["Matutino", hasTarde && "Vespertino", hasNoite && "Noturno"].filter(Boolean).join(" + ")}
            </span>
          )}
        </div>
        <Button onClick={() => window.print()} size="sm">
          <Printer className="w-4 h-4 mr-1.5" />
          Imprimir / Salvar PDF
        </Button>
      </div>

      <div className="px-4 py-4 print:px-0 print:py-0">
        {/* Document header */}
        <div className="text-center mb-4 border-b-2 border-black pb-2">
          <p className="text-base font-extrabold uppercase tracking-widest leading-tight">{nomeEscola || "ESCOLA MUNICIPAL"}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mt-0.5">
            Horário de Aulas
            {[" — Turnos:", hasTarde || hasNoite ? null : " Matutino"].filter(Boolean).join("")}
            {!(hasTarde || hasNoite) ? null : [" Matutino", hasTarde && " + Vespertino", hasNoite && " + Noturno"].filter(Boolean).join("")}
            {" — Ano Letivo "}{new Date().getFullYear()}
          </p>
        </div>

        {/* ─── Grade por dia ─── */}
        {DIAS.map((dia) => (
          <div key={dia} className="mb-5" style={{ breakInside: "avoid-page" }}>
            {/* Day header */}
            <div
              className="bg-gray-800 text-white text-center text-[11px] font-bold uppercase tracking-widest py-1 print:py-0.5"
              style={{ breakAfter: "avoid", breakBefore: "auto" }}
            >
              {DIA_LABELS[dia]}
            </div>

            {/* Matutino grid */}
            {manhaTurmas.length > 0 && (
              <>
                {(hasTarde || hasNoite) && (
                  <div className="bg-blue-700 text-white text-center text-[9px] font-bold uppercase tracking-widest py-0.5">
                    ☀ MATUTINO
                  </div>
                )}
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full border-collapse text-[10px] leading-tight" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "80px" }} />
                      {manhaTurmas.map((t) => <col key={t.id} />)}
                    </colgroup>
                    <thead>
                      <tr className="bg-blue-50 print:bg-blue-50">
                        <th className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">Horário</th>
                        {manhaTurmas.map((t) => (
                          <th key={t.id} className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">
                            {shortTurma(t.nome)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {manhaPeriods.map((slot, idx) => {
                        const showBreak = manhaBreakAfter !== null && idx > 0 && manhaPeriods[idx - 1].period === manhaBreakAfter;
                        return (
                          <Fragment key={`manha-${dia}-${slot.period}`}>
                            {showBreak && manhaBreak && (
                              <tr className="bg-gray-50">
                                <td colSpan={manhaTurmas.length + 1} className="border border-gray-300 text-center text-[8px] font-semibold text-gray-500 italic py-0.5">
                                  Intervalo {manhaBreak.start} – {manhaBreak.end}
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-gray-300">
                              <td className="border border-gray-400 px-1 py-0.5 text-center align-middle bg-blue-50 print:bg-blue-50">
                                <div className="font-mono text-[9px] font-semibold whitespace-nowrap">{slot.start}–{slot.end}</div>
                              </td>
                              {manhaTurmas.map((turma) => {
                                const cells = getCells(dia, slot.period, turma.id);
                                return (
                                  <td key={turma.id} className="border border-gray-300 px-0.5 py-0.5 text-center align-middle" style={{ minWidth: 0 }}>
                                    {cells.length === 0 ? (
                                      <span className="text-gray-300 text-[9px]">—</span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        {cells.map((aloc) => {
                                          const disc = disciplinas.find((d) => d.id === aloc.disciplinaId);
                                          const prof = professores.find((p) => p.id === aloc.professorId);
                                          return (
                                            <div key={aloc.id} className="leading-tight">
                                              <span className="font-bold text-[9px]">{disc?.abreviacao ?? "?"}</span>
                                              {" / "}
                                              <span className="text-[9px]">{prof ? prof.nomeCompleto.split(" ")[0].toUpperCase() : ""}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Noturno grid */}
            {hasNoite && noiteTurmas.length > 0 && (
              <>
                <div className="bg-purple-700 text-white text-center text-[9px] font-bold uppercase tracking-widest py-0.5 mt-0.5">
                  🌙 NOTURNO
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full border-collapse text-[10px] leading-tight" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "80px" }} />
                      {noiteTurmas.map((t) => <col key={t.id} />)}
                    </colgroup>
                    <thead>
                      <tr className="bg-purple-50 print:bg-purple-50">
                        <th className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">Horário</th>
                        {noiteTurmas.map((t) => (
                          <th key={t.id} className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">
                            {shortTurma(t.nome)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {noitePeriods.map((slot, idx) => {
                        const showBreak = noiteBreakAfter !== null && idx > 0 && noitePeriods[idx - 1].period === noiteBreakAfter;
                        return (
                          <Fragment key={`noite-${dia}-${slot.period}`}>
                            {showBreak && noiteBreak && (
                              <tr className="bg-gray-50">
                                <td colSpan={noiteTurmas.length + 1} className="border border-gray-300 text-center text-[8px] font-semibold text-gray-500 italic py-0.5">
                                  Intervalo {noiteBreak.start} – {noiteBreak.end}
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-gray-300">
                              <td className="border border-gray-400 px-1 py-0.5 text-center align-middle bg-purple-50 print:bg-purple-50">
                                <div className="font-mono text-[9px] font-semibold whitespace-nowrap">{slot.start}–{slot.end}</div>
                              </td>
                              {noiteTurmas.map((turma) => {
                                const cells = getCells(dia, slot.period, turma.id);
                                return (
                                  <td key={turma.id} className="border border-gray-300 px-0.5 py-0.5 text-center align-middle" style={{ minWidth: 0 }}>
                                    {cells.length === 0 ? (
                                      <span className="text-gray-300 text-[9px]">—</span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        {cells.map((aloc) => {
                                          const disc = disciplinas.find((d) => d.id === aloc.disciplinaId);
                                          const prof = professores.find((p) => p.id === aloc.professorId);
                                          return (
                                            <div key={aloc.id} className="leading-tight">
                                              <span className="font-bold text-[9px]">{disc?.abreviacao ?? "?"}</span>
                                              {" / "}
                                              <span className="text-[9px]">{prof ? prof.nomeCompleto.split(" ")[0].toUpperCase() : ""}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Vespertino grid */}
            {hasTarde && tardeTurmas.length > 0 && (
              <>
                <div className="bg-orange-600 text-white text-center text-[9px] font-bold uppercase tracking-widest py-0.5 mt-0.5">
                  🌅 VESPERTINO
                </div>
                <div className="overflow-x-auto print:overflow-visible">
                  <table className="w-full border-collapse text-[10px] leading-tight" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "80px" }} />
                      {tardeTurmas.map((t) => <col key={t.id} />)}
                    </colgroup>
                    <thead>
                      <tr className="bg-orange-50 print:bg-orange-50">
                        <th className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">Horário</th>
                        {tardeTurmas.map((t) => (
                          <th key={t.id} className="border border-gray-400 px-1 py-0.5 text-center font-bold text-[9px]">
                            {shortTurma(t.nome)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tardePeriods.map((slot, idx) => {
                        const showBreak = tardeBreakAfter !== null && idx > 0 && tardePeriods[idx - 1].period === tardeBreakAfter;
                        return (
                          <Fragment key={`tarde-${dia}-${slot.period}`}>
                            {showBreak && tardeBreak && (
                              <tr className="bg-gray-50">
                                <td colSpan={tardeTurmas.length + 1} className="border border-gray-300 text-center text-[8px] font-semibold text-gray-500 italic py-0.5">
                                  Intervalo {tardeBreak.start} – {tardeBreak.end}
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-gray-300">
                              <td className="border border-gray-400 px-1 py-0.5 text-center align-middle bg-orange-50 print:bg-orange-50">
                                <div className="font-mono text-[9px] font-semibold whitespace-nowrap">{slot.start}–{slot.end}</div>
                              </td>
                              {tardeTurmas.map((turma) => {
                                const cells = getCells(dia, slot.period, turma.id);
                                return (
                                  <td key={turma.id} className="border border-gray-300 px-0.5 py-0.5 text-center align-middle" style={{ minWidth: 0 }}>
                                    {cells.length === 0 ? (
                                      <span className="text-gray-300 text-[9px]">—</span>
                                    ) : (
                                      <div className="space-y-0.5">
                                        {cells.map((aloc) => {
                                          const disc = disciplinas.find((d) => d.id === aloc.disciplinaId);
                                          const prof = professores.find((p) => p.id === aloc.professorId);
                                          return (
                                            <div key={aloc.id} className="leading-tight">
                                              <span className="font-bold text-[9px]">{disc?.abreviacao ?? "?"}</span>
                                              {" / "}
                                              <span className="text-[9px]">{prof ? prof.nomeCompleto.split(" ")[0].toUpperCase() : ""}</span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ))}

        {/* ─── Grade por Professor ─── */}
        {profsOrdenados.length > 0 && (
          <div className="mt-6 print:mt-4">
            <div className="border-t-2 border-b border-gray-800 mb-3 py-1 text-center">
              <p className="text-[11px] font-extrabold uppercase tracking-widest">Grade por Professor</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3 gap-3">
              {profsOrdenados.map((prof) => {
                const profAlocs = alocacoes.filter((a) => a.professorId === prof.id);
                if (profAlocs.length === 0) return null;

                const profTurmas = new Set(profAlocs.map((a) => turmas.find((t) => t.id === a.turmaId)?.turno ?? "manha"));
                const hasManhaAlocs = profTurmas.has("manha");
                const hasTardeAlocs = profTurmas.has("tarde") && config.habilitarTarde;
                const hasNoiteAlocs = profTurmas.has("noite") && config.habilitarNoite;

                return (
                  <div key={prof.id} className="border border-gray-400 break-inside-avoid print:break-inside-avoid">
                    <div className="bg-gray-200 border-b border-gray-400 px-1 py-0.5 text-center">
                      <p className="text-[9px] font-bold uppercase tracking-wide">{prof.nomeCompleto.toUpperCase()}</p>
                      <p className="text-[7px] text-gray-500">
                        {[hasManhaAlocs && "Matutino", hasTardeAlocs && "Vespertino", hasNoiteAlocs && "Noturno"].filter(Boolean).join(" + ")}
                      </p>
                    </div>

                    {/* Manha sub-table */}
                    {hasManhaAlocs && (
                      <>
                        {hasTardeAlocs && (
                          <div className="bg-blue-100 text-blue-800 text-center text-[7px] font-bold py-0.5">☀ MATUTINO</div>
                        )}
                        <table className="w-full border-collapse text-[8px]">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">#</th>
                              {DIAS.map((d) => <th key={d} className="border border-gray-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">{DIA_SHORT[d]}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {manhaPeriods.map((slot, idx) => {
                              const showBreak = manhaBreakAfter !== null && idx > 0 && manhaPeriods[idx - 1].period === manhaBreakAfter;
                              return (
                                <Fragment key={`prof-manha-${prof.id}-${slot.period}`}>
                                  {showBreak && <tr><td colSpan={6} className="border border-gray-200 text-center text-[7px] text-gray-400 italic py-0.5 bg-gray-50">Intervalo</td></tr>}
                                  <tr>
                                    <td className="border border-gray-300 px-0.5 py-0.5 text-center font-mono text-[7px] bg-gray-50 whitespace-nowrap">{slot.start}</td>
                                    {DIAS.map((dia) => {
                                      const cells = getProfCells(prof.id, dia, slot.period, "manha");
                                      return (
                                        <td key={dia} className="border border-gray-300 px-0.5 py-0.5 text-center">
                                          {cells.length === 0 ? <span className="text-gray-300">__</span> : cells.map((aloc) => {
                                            const turma = turmas.find((t) => t.id === aloc.turmaId);
                                            const disc  = disciplinas.find((d) => d.id === aloc.disciplinaId);
                                            return <div key={aloc.id} className="leading-tight"><span className="font-semibold">{shortTurma(turma?.nome ?? "")}</span><span className="text-gray-500"> ({disc?.abreviacao ?? "?"})</span></div>;
                                          })}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Tarde sub-table */}
                    {hasTardeAlocs && (
                      <>
                        <div className="bg-orange-100 text-orange-800 text-center text-[7px] font-bold py-0.5">🌅 VESPERTINO</div>
                        <table className="w-full border-collapse text-[8px]">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">#</th>
                              {DIAS.map((d) => <th key={d} className="border border-gray-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">{DIA_SHORT[d]}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {tardePeriods.map((slot, idx) => {
                              const showBreak = tardeBreakAfter !== null && idx > 0 && tardePeriods[idx - 1].period === tardeBreakAfter;
                              return (
                                <Fragment key={`prof-tarde-${prof.id}-${slot.period}`}>
                                  {showBreak && <tr><td colSpan={6} className="border border-gray-200 text-center text-[7px] text-gray-400 italic py-0.5 bg-gray-50">Intervalo</td></tr>}
                                  <tr>
                                    <td className="border border-gray-300 px-0.5 py-0.5 text-center font-mono text-[7px] bg-gray-50 whitespace-nowrap">{slot.start}</td>
                                    {DIAS.map((dia) => {
                                      const cells = getProfCells(prof.id, dia, slot.period, "tarde");
                                      return (
                                        <td key={dia} className="border border-gray-300 px-0.5 py-0.5 text-center">
                                          {cells.length === 0 ? <span className="text-gray-300">__</span> : cells.map((aloc) => {
                                            const turma = turmas.find((t) => t.id === aloc.turmaId);
                                            const disc  = disciplinas.find((d) => d.id === aloc.disciplinaId);
                                            return <div key={aloc.id} className="leading-tight"><span className="font-semibold">{shortTurma(turma?.nome ?? "")}</span><span className="text-gray-500"> ({disc?.abreviacao ?? "?"})</span></div>;
                                          })}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}

                    {/* Noite sub-table */}
                    {hasNoiteAlocs && (
                      <>
                        <div className="bg-purple-100 text-purple-800 text-center text-[7px] font-bold py-0.5">🌙 NOTURNO</div>
                        <table className="w-full border-collapse text-[8px]">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="border border-gray-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">#</th>
                              {DIAS.map((d) => <th key={d} className="border border-gray-300 px-0.5 py-0.5 text-center font-semibold text-[8px]">{DIA_SHORT[d]}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {noitePeriods.map((slot, idx) => {
                              const showBreak = noiteBreakAfter !== null && idx > 0 && noitePeriods[idx - 1].period === noiteBreakAfter;
                              return (
                                <Fragment key={`prof-noite-${prof.id}-${slot.period}`}>
                                  {showBreak && <tr><td colSpan={6} className="border border-gray-200 text-center text-[7px] text-gray-400 italic py-0.5 bg-gray-50">Intervalo</td></tr>}
                                  <tr>
                                    <td className="border border-gray-300 px-0.5 py-0.5 text-center font-mono text-[7px] bg-gray-50 whitespace-nowrap">{slot.start}</td>
                                    {DIAS.map((dia) => {
                                      const cells = getProfCells(prof.id, dia, slot.period, "noite");
                                      return (
                                        <td key={dia} className="border border-gray-300 px-0.5 py-0.5 text-center">
                                          {cells.length === 0 ? <span className="text-gray-300">__</span> : cells.map((aloc) => {
                                            const turma = turmas.find((t) => t.id === aloc.turmaId);
                                            const disc  = disciplinas.find((d) => d.id === aloc.disciplinaId);
                                            return <div key={aloc.id} className="leading-tight"><span className="font-semibold">{shortTurma(turma?.nome ?? "")}</span><span className="text-gray-500"> ({disc?.abreviacao ?? "?"})</span></div>;
                                          })}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="hidden print:block mt-6 pt-2 border-t border-gray-300 text-center text-[8px] text-gray-500">
          <p>{nomeEscola} — Horário Provisório — Gerado automaticamente pelo EduHorários</p>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
