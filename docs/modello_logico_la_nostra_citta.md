# Modello logico relazionale — La Nostra Città, Il Nostro Futuro

Schema relazionale corrispondente al modello ER concettuale. I tipi sono indicativi per **MySQL 8.0.16+**; gli identificatori sono chiavi primarie. `PK` = chiave primaria, `FK` = chiave esterna, `UQ` = vincolo di unicità.

## Convenzioni e assunzioni

- Gli identificatori sono interi auto-incrementali, salvo le chiavi composte indicate.
- Gli allegati sono rappresentati tramite `storage_key` e metadati. Se il progetto conserva le immagini direttamente in MySQL, usare `contenuto MEDIUMBLOB` al posto di `storage_key` (o mantenere entrambi se serve anche una copia esterna).
- Ogni segnalazione inviata deve avere almeno un media: il vincolo minimo va verificato nella transazione/servizio applicativo al momento dell’invio, poiché una normale FK non impone la presenza di righe figlie.
- `EVENTO_STATO` registra cambiamenti di stato della segnalazione e degli eventi di moderazione. `idUtente` è NULL per gli eventi di sistema.
- `creato_il` e `aggiornato_il` rappresentano rispettivamente creazione e ultima modifica. Gli orari sono memorizzati in UTC secondo la convenzione applicativa.
- Stato di avanzamento e stato di moderazione sono attributi distinti della segnalazione.

## Relazioni

- Un utente crea zero o molte segnalazioni; ogni segnalazione ha un solo autore.
- Un utente può risiedere in zero o un quartiere; un quartiere può essere associato a zero o molti utenti.
- Una segnalazione riguarda un quartiere; un quartiere può riguardare molte segnalazioni.
- Una segnalazione inviata ha uno o più media; ogni media appartiene a una sola segnalazione.
- Utente e segnalazione sono in relazione N:M tramite `SOSTEGNO`.
- Segnalazione e categoria sono in relazione N:M tramite `SEGNALAZIONE_CATEGORIA`; una segnalazione può inizialmente non avere categorie.
- Una segnalazione ha zero o molti eventi di stato; ogni evento appartiene a una segnalazione. Un evento può avere zero o un utente attore.
- Una segnalazione può essere eseguita/analizzata da zero o molti eventi di esecuzione; ogni evento di esecuzione riguarda una segnalazione e può essere attribuito a zero o un utente.

## Schema relazionale

### UTENTE

```text
UTENTE(
  idUtente          BIGINT UNSIGNED       PK,
  nome              VARCHAR(80)           NOT NULL,
  cognome           VARCHAR(80)           NOT NULL,
  email             VARCHAR(254)          NOT NULL UQ,
  password_hash     VARCHAR(255)          NOT NULL,
  verificato_il     DATETIME              NULL,
  ruolo             ENUM('CITTADINO','MODERATORE','AMMINISTRATORE') NOT NULL,
  stato_account     ENUM('ATTIVO','SOSPESO','ELIMINATO') NOT NULL,
  idQuartiere       INT UNSIGNED          NULL FK → QUARTIERE.idQuartiere,
  creato_il         DATETIME              NOT NULL,
  aggiornato_il     DATETIME              NOT NULL
)
```

`idQuartiere` modella la relazione facoltativa `RISIEDE_IN`. Non memorizzare password in chiaro; usare un hash robusto calcolato dall’applicazione.

### QUARTIERE

```text
QUARTIERE(
  idQuartiere       INT UNSIGNED          PK,
  nome              VARCHAR(100)          NOT NULL UQ
)
```

### SEGNALAZIONE

```text
SEGNALAZIONE(
  idSegnalazione    BIGINT UNSIGNED       PK,
  idAutore          BIGINT UNSIGNED       NOT NULL FK → UTENTE.idUtente,
  idQuartiere       INT UNSIGNED          NOT NULL FK → QUARTIERE.idQuartiere,
  descrizione       TEXT                  NOT NULL,
  latitudine        DECIMAL(10,7)         NULL,
  longitudine       DECIMAL(10,7)         NULL,
  origine_posizione ENUM('UTENTE','EXIF','GEOCODIFICA','MODERATORE') NOT NULL,
  revisione         INT UNSIGNED          NOT NULL DEFAULT 1,
  stato_avanzamento ENUM('BOZZA','INVIATA','IN_VERIFICA','APPROVATA',
                         'PRESA_IN_CARICO','IN_VALUTAZIONE',
                         'PROGRAMMA','INVIATA_AI_CANDIDATI','CHIUSA','RITIRATA') NOT NULL,
  stato_moderazione ENUM('IN_ATTESA','APPROVATA','RIFIUTATA','REVISIONE_RICHIESTA') NOT NULL,
  creata_il         DATETIME              NOT NULL,
  aggiornata_il     DATETIME              NOT NULL
)
```

Vincoli: coordinate entrambe NULL oppure entrambe valorizzate; latitudine tra -90 e 90, longitudine tra -180 e 180. L’eventuale regola di pubblicazione richiede `stato_moderazione = 'APPROVATA'` e stato avanzamento diverso da `RITIRATA`.

### MEDIA

```text
MEDIA(
  idMedia           BIGINT UNSIGNED       PK,
  idSegnalazione    BIGINT UNSIGNED       NOT NULL FK → SEGNALAZIONE.idSegnalazione,
  storage_key       VARCHAR(1000)         NOT NULL,
  tipo              ENUM('IMMAGINE','VIDEO') NOT NULL,
  mime              VARCHAR(150)          NOT NULL,
  byte_size         BIGINT UNSIGNED       NOT NULL,
  durata_ms         BIGINT UNSIGNED       NULL,
  sha256            CHAR(64)              NOT NULL,
  stato_file        ENUM('IN_CARICAMENTO','DISPONIBILE','RIFIUTATO','ELIMINATO') NOT NULL,
  exif              JSON                  NULL,
  derivato_key      VARCHAR(1000)         NULL,
  creato_il         DATETIME              NOT NULL,
  UNIQUE(sha256, idSegnalazione)
)
```

Per conservare il binario direttamente nel database, sostituire `storage_key` con `contenuto MEDIUMBLOB NOT NULL`; per file che possono superare il limite di `MEDIUMBLOB`, valutare `LONGBLOB` e configurare limiti coerenti lato server.

### CATEGORIA

```text
CATEGORIA(
  idCategoria       INT UNSIGNED          PK,
  codice            VARCHAR(60)           NOT NULL UQ,
  nome              VARCHAR(120)          NOT NULL,
  attiva            BOOLEAN               NOT NULL DEFAULT TRUE
)
```

### SEGNALAZIONE_CATEGORIA

```text
SEGNALAZIONE_CATEGORIA(
  idSegnalazione    BIGINT UNSIGNED       PK/FK → SEGNALAZIONE.idSegnalazione,
  idCategoria       INT UNSIGNED          PK/FK → CATEGORIA.idCategoria
)
```

La PK composta impedisce di assegnare più volte la stessa categoria alla medesima segnalazione.

### SOSTEGNO

```text
SOSTEGNO(
  idUtente          BIGINT UNSIGNED       PK/FK → UTENTE.idUtente,
  idSegnalazione    BIGINT UNSIGNED       PK/FK → SEGNALAZIONE.idSegnalazione,
  creato_il         DATETIME              NOT NULL
)
```

La PK composta impedisce sostegni duplicati. Il divieto di sostenere la propria segnalazione, e l’obbligo di profilo verificato e attivo, vanno controllati dal backend o con trigger/procedure.

### EVENTO_STATO

```text
EVENTO_STATO(
  idEvento          BIGINT UNSIGNED       PK,
  idSegnalazione    BIGINT UNSIGNED       NOT NULL FK → SEGNALAZIONE.idSegnalazione,
  idUtente          BIGINT UNSIGNED       NULL FK → UTENTE.idUtente,
  ambito            ENUM('AVANZAMENTO','MODERAZIONE') NOT NULL,
  da_stato          VARCHAR(40)           NULL,
  a_stato           VARCHAR(40)           NOT NULL,
  motivazione       TEXT                  NULL,
  tipo_attore       ENUM('UTENTE','SISTEMA') NOT NULL,
  revisione         INT UNSIGNED          NOT NULL,
  creato_il         DATETIME              NOT NULL
)
```

`idUtente` è NULL per eventi automatici di sistema; quando `tipo_attore = 'UTENTE'`, l’applicazione deve richiedere l’utente responsabile.

### ESECUZIONE

```text
ESECUZIONE(
  idEsecuzione      BIGINT UNSIGNED       PK,
  idSegnalazione    BIGINT UNSIGNED       NOT NULL FK → SEGNALAZIONE.idSegnalazione,
  idUtente          BIGINT UNSIGNED       NULL FK → UTENTE.idUtente,
  tipo              ENUM('MODERAZIONE','CLASSIFICAZIONE','ESTRAZIONE_EXIF',
                         'ANALISI_MEDIA','ALTRO') NOT NULL,
  esito             JSON                  NULL,
  iniziata_il       DATETIME              NOT NULL,
  terminata_il      DATETIME              NULL
)
```

`ESECUZIONE` registra l’attore/servizio che esegue controlli o analisi. I risultati IA dettagliati possono stare in `esito` in JSON; se occorre versionare i modelli o interrogare frequentemente i risultati, si può separare una tabella `ANALISI_IA` dedicata.

## Vincoli d’integrità e regole applicative

1. `UTENTE.email` e `QUARTIERE.nome` sono univoci.
2. Ogni segnalazione ha un solo autore e un quartiere associato.
3. Coordinate: entrambe assenti o entrambe presenti e nei rispettivi intervalli geografici.
4. Ogni segnalazione inviata/pubblicata deve avere almeno un record in `MEDIA`; verificare in una transazione lato servizio prima di cambiare lo stato.
5. Ogni file deve superare controlli di autenticità del formato, dimensione, MIME e stato prima di essere reso disponibile.
6. `SOSTEGNO` ha PK composta `(idUtente, idSegnalazione)`; l’autore non può sostenere la propria segnalazione.
7. La relazione fra categorie è N:M e può essere vuota in bozza; la classificazione IA non sostituisce la revisione umana.
8. Gli eventi di sistema in `EVENTO_STATO`/`ESECUZIONE` possono avere `idUtente` NULL.
9. La pubblicazione richiede moderazione approvata; le segnalazioni rifiutate o ritirate non appaiono nel catalogo pubblico.
10. Le modifiche di stato incrementano/registrano la revisione e aggiungono un evento storico; non sovrascrivere lo storico.
11. I dati personali non necessari non devono essere esposti nelle viste pubbliche; l’identità dell’autore può essere omessa quando la segnalazione è anonima.

## Indici consigliati

```text
UTENTE(email)                                      UNIQUE
SEGNALAZIONE(idAutore, creata_il)
SEGNALAZIONE(idQuartiere, stato_avanzamento, creata_il)
SEGNALAZIONE(stato_moderazione, stato_avanzamento, creata_il)
MEDIA(idSegnalazione, stato_file)
SOSTEGNO(idSegnalazione, creato_il)
EVENTO_STATO(idSegnalazione, creato_il)
ESECUZIONE(idSegnalazione, tipo, iniziata_il)
SEGNALAZIONE_CATEGORIA(idCategoria, idSegnalazione)
```

Gli indici vanno confermati con le query reali e con `EXPLAIN`; evitare indici ridondanti.

## Nota sul modello concettuale fornito

Il diagramma concettuale include `ESEGUI` ma non una specifica entità associata. Per mantenere la semantica richiesta di registrare chi esegue una verifica o un’elaborazione, questo schema introduce `ESECUZIONE` come entità storica. In alternativa, se si desidera un modello più minimale, si può eliminare `ESECUZIONE` e conservare solo `EVENTO_STATO`, ma non si registrerebbero tutte le analisi che non causano cambi di stato.
