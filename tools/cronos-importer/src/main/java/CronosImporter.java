import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;

/**
 * CronosImporter — Conversor de horários Cronos (.xls) para EduHorários (JSON)
 *
 * Uso:
 *   java -cp "cronos-importer.jar" CronosImporter <arquivo.xls> [saida.json]
 *
 * Caso o segundo argumento seja omitido, o JSON é gravado em "eduhorarios_import.json"
 * na pasta actual.
 *
 * Depois, no EduHorários: Exportar / Importar → "Importar Backup JSON" → seleccione o JSON gerado.
 */
public class CronosImporter {

    // ── Mapeamento de dias ────────────────────────────────────────────────────
    private static final Map<String, String> DIA_MAP = new LinkedHashMap<>();
    static {
        DIA_MAP.put("segunda-feira", "segunda");
        DIA_MAP.put("terca-feira",   "terca");
        DIA_MAP.put("terça-feira",   "terca");
        DIA_MAP.put("quarta-feira",  "quarta");
        DIA_MAP.put("quinta-feira",  "quinta");
        DIA_MAP.put("sexta-feira",   "sexta");
    }

    // ── Paleta de cores para disciplinas ─────────────────────────────────────
    private static final String[] COLORS = {
        "#4f46e5","#16a34a","#dc2626","#ea580c","#0284c7",
        "#7c3aed","#db2777","#0891b2","#65a30d","#d97706",
        "#0f766e","#9333ea","#c2410c","#1d4ed8","#15803d"
    };
    private static int colorIdx = 0;
    private static int idCounter = 1;

    private static String newId() { return "c" + (idCounter++); }
    private static String nextColor() { return COLORS[colorIdx++ % COLORS.length]; }

    // ── main ──────────────────────────────────────────────────────────────────
    public static void main(String[] args) throws Exception {
        if (args.length < 1) {
            System.out.println("Uso: java -cp \"cronos-importer.jar\" CronosImporter <arquivo.xls> [saida.json]");
            System.out.println("Exemplo: java -cp \"cronos-importer.jar\" CronosImporter Cronos_Horario.xls horario.json");
            System.exit(1);
        }

        String inputFile  = args[0];
        String outputFile = args.length > 1 ? args[1] : "eduhorarios_import.json";

        System.out.println("Lendo: " + inputFile);

        FileInputStream fis = new FileInputStream(inputFile);
        Workbook wb = new HSSFWorkbook(fis);
        fis.close();

        // ── Estruturas de dados ───────────────────────────────────────────────
        String schoolName = "Escola";
        String turnoGlobal = "manha";

        // chave = nome normalizado → dados
        Map<String, Map<String, Object>> discMap  = new LinkedHashMap<>();
        Map<String, Map<String, Object>> profMap  = new LinkedHashMap<>();
        Map<String, Map<String, Object>> turmaMap = new LinkedHashMap<>();
        List<Map<String, Object>> alocacoes = new ArrayList<>();
        List<Map<String, Object>> matriz    = new ArrayList<>();
        Set<String> matrizKeys = new HashSet<>(); // turmaId-discId

        // ── Sheet 1: nome da escola e turno ──────────────────────────────────
        Sheet sheet1 = wb.getSheetAt(0);
        for (int r = 0; r <= 6; r++) {
            Row row = sheet1.getRow(r);
            if (row == null) continue;
            String val = cellStr(row.getCell(0)).trim();
            if (r == 4 && !val.isBlank()) schoolName = val;
            if (val.toLowerCase().contains("turno:")) {
                if (val.toLowerCase().contains("vespertino")) turnoGlobal = "tarde";
                else if (val.toLowerCase().contains("noturno")) turnoGlobal = "noite";
                else turnoGlobal = "manha";
            }
        }
        System.out.println("Escola : " + schoolName);
        System.out.println("Turno  : " + turnoGlobal);

        // ── Loop pelas sheets ─────────────────────────────────────────────────
        String currentDay  = "segunda";
        int    totalSlots  = 5;
        String horarioInicio = "07:00";
        int    duracaoMin    = 50;
        int    intervaloApos = 3;  // após o 3º horário
        boolean hasIntervalo = true;
        int    intervDurMin  = 15;

        for (int si = 1; si < wb.getNumberOfSheets(); si++) {
            Sheet sheet = wb.getSheetAt(si);
            Row   row0  = sheet.getRow(0);
            if (row0 == null) continue;
            String firstCell = cellStr(row0.getCell(0));

            // ── Sheet de cabeçalho do dia ─────────────────────────────────────
            if (firstCell.contains("arrayDias")) {
                String dayFull = afterLastSemicolon(firstCell).trim().toLowerCase();
                currentDay = DIA_MAP.getOrDefault(dayFull, "segunda");

                // Extrair slots de horário (linhas 3..7)
                List<String> slots = new ArrayList<>();
                for (int r = 3; r <= 7; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) break;
                    String s = afterLastSemicolon(cellStr(row.getCell(0))).trim();
                    // Formato: "07:00 - 07:50"
                    if (s.matches("\\d{2}:\\d{2}\\s*-\\s*\\d{2}:\\d{2}")) slots.add(s);
                }

                if (!slots.isEmpty()) {
                    totalSlots   = slots.size();
                    horarioInicio = slots.get(0).split("\\s*-\\s*")[0].trim();
                    // Calcular duração a partir do primeiro slot
                    try {
                        String[] parts = slots.get(0).split("\\s*-\\s*");
                        duracaoMin = minutesBetween(parts[0].trim(), parts[1].trim());
                    } catch (Exception ignored) {}
                    // Detectar intervalo: quando o início do slot[i] != fim do slot[i-1]
                    hasIntervalo = false;
                    intervaloApos = totalSlots;
                    for (int i = 1; i < slots.size(); i++) {
                        String prevEnd  = slots.get(i-1).split("\\s*-\\s*")[1].trim();
                        String curStart = slots.get(i).split("\\s*-\\s*")[0].trim();
                        if (!prevEnd.equals(curStart)) {
                            hasIntervalo = true;
                            intervaloApos = i; // após o horário i (1-indexed = i)
                            intervDurMin  = minutesBetween(prevEnd, curStart);
                            break;
                        }
                    }
                }
                System.out.printf("Dia: %-12s | %d horários | início %s%n",
                    currentDay, totalSlots, horarioInicio);
                continue;
            }

            // ── Sheet de turma ─────────────────────────────────────────────────
            if (firstCell.contains("arrayTurmas")) {
                String turmaNome = afterLastSemicolon(firstCell).trim();
                if (turmaNome.isBlank()) continue;

                if (!turmaMap.containsKey(turmaNome)) {
                    Map<String, Object> t = new LinkedHashMap<>();
                    t.put("id",    newId());
                    t.put("nome",  turmaNome);
                    t.put("turno", turnoGlobal);
                    turmaMap.put(turmaNome, t);
                }
                String turmaId = (String) turmaMap.get(turmaNome).get("id");

                // Linhas 1..N = alocações por horário (horário 1 = linha 1, etc.)
                for (int r = 1; r <= totalSlots; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    String cell = cellStr(row.getCell(0)).trim();
                    if (cell.isBlank() || cell.equals(" ")) continue;

                    // Extrair nome completo da disciplina e nome do professor
                    // Formato da célula:
                    //   if(...){ document.write("MATEMATICA / CLAUDIANE"); }else{ document.write("MAT / CLAUDIANE"); }MAT / CLAUDIANE
                    String discFullName = "";
                    String discAbrev    = "";
                    String profName     = "";

                    // Tentar extrair nome completo da 1ª ocorrência de document.write
                    Pattern fullPat = Pattern.compile("document\\.write\\(\"([^\"]+)\"\\)\\s*;\\s*\\}\\s*else\\s*\\{");
                    Matcher fullMat = fullPat.matcher(cell);
                    if (fullMat.find()) {
                        String[] parts = fullMat.group(1).split("\\s*/\\s*", 2);
                        if (parts.length == 2) {
                            discFullName = parts[0].trim();
                            profName     = parts[1].trim();
                        }
                    }

                    // Extrair abreviação da 2ª ocorrência de document.write (o else)
                    Pattern abrevPat = Pattern.compile("\\}else\\s*\\{[^}]*document\\.write\\(\"([^\"]+)\"\\)");
                    Matcher abrevMat = abrevPat.matcher(cell);
                    if (abrevMat.find()) {
                        String[] parts = abrevMat.group(1).split("\\s*/\\s*", 2);
                        if (parts.length >= 1) discAbrev = parts[0].trim();
                    }

                    // Fallback: usar o texto após o último "}"
                    if (discFullName.isBlank()) {
                        String fallback = afterLastBrace(cell).trim();
                        String[] parts  = fallback.split("\\s*/\\s*", 2);
                        if (parts.length == 2) {
                            discAbrev    = parts[0].trim();
                            discFullName = parts[0].trim();
                            profName     = parts[1].trim();
                        }
                    }
                    if (discAbrev.isBlank()) discAbrev = discFullName;
                    if (discFullName.isBlank() || profName.isBlank()) continue;

                    // ── Registar disciplina ───────────────────────────────────
                    String discKey = discFullName.toUpperCase();
                    if (!discMap.containsKey(discKey)) {
                        Map<String, Object> d = new LinkedHashMap<>();
                        d.put("id",         newId());
                        d.put("nome",       toTitleCase(discFullName));
                        d.put("abreviacao", abbreviate(discAbrev));
                        d.put("cor",        nextColor());
                        discMap.put(discKey, d);
                    }
                    String discId = (String) discMap.get(discKey).get("id");

                    // ── Registar professor ────────────────────────────────────
                    String profKey = profName.toUpperCase();
                    if (!profMap.containsKey(profKey)) {
                        Map<String, Object> p = new LinkedHashMap<>();
                        p.put("id",           newId());
                        p.put("nomeCompleto", toTitleCase(profName));
                        p.put("disciplinas",  new ArrayList<String>());
                        profMap.put(profKey, p);
                    }
                    @SuppressWarnings("unchecked")
                    List<String> profDiscs = (List<String>) profMap.get(profKey).get("disciplinas");
                    if (!profDiscs.contains(discId)) profDiscs.add(discId);
                    String profId = (String) profMap.get(profKey).get("id");

                    // ── Registar alocação ─────────────────────────────────────
                    Map<String, Object> aloc = new LinkedHashMap<>();
                    aloc.put("id",           newId());
                    aloc.put("turmaId",      turmaId);
                    aloc.put("disciplinaId", discId);
                    aloc.put("professorId",  profId);
                    aloc.put("diaSemana",    currentDay);
                    aloc.put("horario",      r);
                    alocacoes.add(aloc);

                    // ── Registar matriz curricular ────────────────────────────
                    String matKey = turmaId + "-" + discId;
                    if (!matrizKeys.contains(matKey)) {
                        matrizKeys.add(matKey);
                        Map<String, Object> mc = new LinkedHashMap<>();
                        mc.put("turmaId",       turmaId);
                        mc.put("disciplinaId",  discId);
                        mc.put("aulasPorSemana", 0); // será calculado abaixo
                        matriz.add(mc);
                    }
                }
            }
        }

        // Calcular aulasPorSemana na matriz
        Map<String, Integer> alocCount = new HashMap<>();
        for (Map<String, Object> a : alocacoes) {
            String key = a.get("turmaId") + "-" + a.get("disciplinaId");
            alocCount.merge(key, 1, Integer::sum);
        }
        for (Map<String, Object> mc : matriz) {
            String key = mc.get("turmaId") + "-" + mc.get("disciplinaId");
            mc.put("aulasPorSemana", alocCount.getOrDefault(key, 0));
        }

        // ── Configuração de horários ──────────────────────────────────────────
        Map<String, Object> config = new LinkedHashMap<>();
        config.put("quantidadeHorariosPorDia",    totalSlots);
        config.put("duracaoAulaMinutos",          duracaoMin);
        config.put("horarioInicial",              horarioInicio);
        config.put("possuiIntervalo",             hasIntervalo);
        config.put("horarioIntervalo",            intervaloApos);
        config.put("duracaoIntervaloMinutos",     hasIntervalo ? intervDurMin : 15);
        config.put("habilitarTarde",              false);
        config.put("horarioInicialTarde",         "13:00");
        config.put("quantidadeHorariosPorDiaTarde", 5);
        config.put("duracaoAulaMinutosTarde",     50);
        config.put("possuiIntervaloTarde",        true);
        config.put("horarioIntervaloTarde",       3);
        config.put("duracaoIntervaloMinutosTarde", 15);

        // ── Resumo ────────────────────────────────────────────────────────────
        System.out.println("\n=== Resumo da importação ===");
        System.out.println("Turmas      : " + turmaMap.size());
        System.out.println("Disciplinas : " + discMap.size());
        System.out.println("Professores : " + profMap.size());
        System.out.println("Alocações   : " + alocacoes.size());

        // ── Gerar JSON ────────────────────────────────────────────────────────
        StringBuilder json = new StringBuilder();
        json.append("{\n");
        json.append("  \"turmas\": ").append(listToJson(new ArrayList<>(turmaMap.values()), 2)).append(",\n");
        json.append("  \"disciplinas\": ").append(listToJson(new ArrayList<>(discMap.values()), 2)).append(",\n");
        json.append("  \"professores\": ").append(listToJson(new ArrayList<>(profMap.values()), 2)).append(",\n");
        json.append("  \"alocacoes\": ").append(listToJson(alocacoes, 2)).append(",\n");
        json.append("  \"config\": ").append(mapToJson(config, 2)).append(",\n");
        json.append("  \"matriz\": ").append(listToJson(matriz, 2)).append(",\n");
        json.append("  \"_meta\": {\n");
        json.append("    \"escola\": ").append(jsonStr(schoolName)).append(",\n");
        json.append("    \"turno\": ").append(jsonStr(turnoGlobal)).append(",\n");
        json.append("    \"geradoPor\": \"CronosImporter\",\n");
        json.append("    \"versaoSchema\": \"3\"\n");
        json.append("  }\n");
        json.append("}\n");

        try (Writer w = new OutputStreamWriter(new FileOutputStream(outputFile), StandardCharsets.UTF_8)) {
            w.write(json.toString());
        }

        System.out.println("\nJSON gerado: " + new File(outputFile).getAbsolutePath());
        System.out.println("Pronto! Importe este arquivo em EduHorários → Exportar/Importar → Importar Backup JSON");
        wb.close();
    }

    // ── Utilitários ───────────────────────────────────────────────────────────

    static String cellStr(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    static String afterLastSemicolon(String s) {
        int i = s.lastIndexOf(';');
        return i >= 0 ? s.substring(i + 1) : s;
    }

    static String afterLastBrace(String s) {
        int i = s.lastIndexOf('}');
        return i >= 0 ? s.substring(i + 1) : s;
    }

    static int minutesBetween(String t1, String t2) {
        // t1/t2 = "HH:MM"
        String[] p1 = t1.split(":");
        String[] p2 = t2.split(":");
        int m1 = Integer.parseInt(p1[0]) * 60 + Integer.parseInt(p1[1]);
        int m2 = Integer.parseInt(p2[0]) * 60 + Integer.parseInt(p2[1]);
        return m2 - m1;
    }

    static String toTitleCase(String s) {
        // "MATEMATICA" → "Matematica", "JOSE CARLOS" → "Jose Carlos"
        String[] words = s.toLowerCase().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (!w.isBlank()) {
                sb.append(Character.toUpperCase(w.charAt(0)));
                if (w.length() > 1) sb.append(w.substring(1));
                sb.append(' ');
            }
        }
        return sb.toString().trim();
    }

    static String abbreviate(String s) {
        // Limitar a 8 chars e maiúsculo
        String up = s.toUpperCase().replaceAll("[^A-ZÁÉÍÓÚÀÃÕÇÂÊÔÜ/.]", "");
        return up.length() > 8 ? up.substring(0, 8) : up;
    }

    // ── Serialização JSON simples ─────────────────────────────────────────────

    static String jsonStr(Object v) {
        if (v == null) return "null";
        String s = v.toString()
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r");
        return "\"" + s + "\"";
    }

    @SuppressWarnings("unchecked")
    static String mapToJson(Map<String, Object> map, int indent) {
        String pad = " ".repeat(indent);
        String pad2 = " ".repeat(indent + 2);
        StringBuilder sb = new StringBuilder("{\n");
        int i = 0;
        for (Map.Entry<String, Object> e : map.entrySet()) {
            sb.append(pad2).append("\"").append(e.getKey()).append("\": ");
            Object v = e.getValue();
            if (v instanceof Map)
                sb.append(mapToJson((Map<String, Object>) v, indent + 2));
            else if (v instanceof List)
                sb.append(listToJson((List<Object>) v, indent + 2));
            else if (v instanceof Boolean || v instanceof Integer || v instanceof Long)
                sb.append(v);
            else
                sb.append(jsonStr(v));
            if (++i < map.size()) sb.append(",");
            sb.append("\n");
        }
        sb.append(pad).append("}");
        return sb.toString();
    }

    @SuppressWarnings("unchecked")
    static String listToJson(List<?> list, int indent) {
        if (list.isEmpty()) return "[]";
        String pad = " ".repeat(indent);
        String pad2 = " ".repeat(indent + 2);
        StringBuilder sb = new StringBuilder("[\n");
        for (int i = 0; i < list.size(); i++) {
            Object item = list.get(i);
            sb.append(pad2);
            if (item instanceof Map)
                sb.append(mapToJson((Map<String, Object>) item, indent + 2));
            else if (item instanceof List)
                sb.append(listToJson((List<Object>) item, indent + 2));
            else if (item instanceof Boolean || item instanceof Integer || item instanceof Long)
                sb.append(item);
            else
                sb.append(jsonStr(item));
            if (i < list.size() - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append(pad).append("]");
        return sb.toString();
    }
}
