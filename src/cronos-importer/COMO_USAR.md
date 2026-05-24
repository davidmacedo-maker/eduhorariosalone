# Cronos → EduHorários: Guia de Uso

Este programa Java lê um arquivo `.xls` exportado pelo **Cronos Horário** e gera
um arquivo JSON pronto para importar no **EduHorários**.

---

## Pré-requisitos

- Java 17 ou superior instalado ([download](https://adoptium.net/))
- Maven 3.x instalado ([download](https://maven.apache.org/)) — apenas para compilar

Verificar instalação:
```bash
java -version
mvn -version
```

---

## Passo 1 — Compilar (uma vez só)

Na pasta `cronos-importer`, execute:

```bash
mvn package
```

Isto gera o arquivo `target/cronos-importer.jar` com todas as dependências incluídas.

---

## Passo 2 — Converter o arquivo XLS

```bash
java -jar target/cronos-importer.jar Cronos_Horario.xls horario.json
```

Exemplos:
```bash
# Arquivo XLS na mesma pasta, JSON chamado "importar.json"
java -jar target/cronos-importer.jar Cronos_Horario_(2).xls importar.json

# Se o arquivo XLS estiver noutro caminho
java -jar target/cronos-importer.jar "C:\Users\Joao\Desktop\Cronos_Horario.xls" saida.json
```

O programa exibe um resumo:
```
Lendo: Cronos_Horario.xls
Escola : EE SUL AMERICA
Turno  : manha
Dia: segunda      | 5 horários | início 07:00
Dia: terca        | 5 horários | início 07:00
...

=== Resumo da importação ===
Turmas      : 8
Disciplinas : 14
Professores : 10
Alocações   : 192

JSON gerado: /caminho/para/horario.json
Pronto! Importe este arquivo em EduHorários → Exportar/Importar → Importar Backup JSON
```

---

## Passo 3 — Importar no EduHorários

1. Abra o **EduHorários** no navegador
2. Clique em **Exportar / Importar** no menu lateral
3. Na secção **Importar**, clique em **"Selecionar arquivo JSON"**
4. Escolha o arquivo `.json` gerado no passo anterior
5. Reveja o resumo e clique em **"Confirmar Importação"**

---

## O que é importado?

| Dado               | Fonte no XLS                        |
|--------------------|-------------------------------------|
| Turmas             | Nome de cada turma (ex: "101", "61")|
| Disciplinas        | Nome completo da disciplina         |
| Professores        | Nome do professor em cada alocação  |
| Alocações          | Dia × horário × turma × disciplina  |
| Configuração       | Horário de início, duração, intervalo|
| Matriz curricular  | Calculada a partir das alocações    |

---

## Notas importantes

- O programa detecta automaticamente o **turno** (Matutino/Vespertino) da folha.
- Cada **arquivo XLS** contém apenas um turno — se a escola tiver dois turnos,
  execute o programa duas vezes e importe os dois JSONs separadamente.
- Os dados existentes no EduHorários **serão substituídos** na importação.
- As cores das disciplinas são atribuídas automaticamente e podem ser
  alteradas depois no EduHorários.
