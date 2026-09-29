# Analisi tecnica della webapp La Nostra Città Il Nostro Futuro

## Premessa e fonti analizzate

La repository GitHub `iezzicarlotta/la-nostra-citta-webapp` è stata creata il 29 settembre 2026 ma, al momento dell'analisi, è vuota: non contiene commit, file o branch remoto effettivo. Di conseguenza non esiste ancora uno stack applicativo da ricostruire e non è possibile verificare funzionalità già implementate.

L'analisi progettuale usa i materiali forniti separatamente dalla repository:

- `test d'ingresso.docx`, traccia originale del progetto;
- `analisi_requisiti_esercizio_1.md`, analisi funzionale e modello logico;
- `database_la_nostra_citta_mysql.sql`, schema proposto per MySQL 8.0+.

I file sorgente non sono ancora presenti nella repository. Le valutazioni sul database si riferiscono quindi allo script fornito, non a uno schema già versionato o collegato all'applicazione.

## 1. Stato attuale del repository

### Stato Git

| Voce | Valore rilevato |
|---|---|
| Repository | `https://github.com/iezzicarlotta/la-nostra-citta-webapp.git` |
| Visibilità | Pubblica |
| Branch predefinito dichiarato | `main` |
| Branch remoto effettivo | Nessuno, perché non esistono commit |
| Branch locale dopo il clone | `main`, senza commit (`unborn branch`) |
| Remote | `origin` configurato sull'URL indicato |
| Working tree iniziale | Vuota |
| Ultimo commit | Non disponibile |
| Permessi della connessione verificata | Lettura e scrittura, inclusa amministrazione |

### Struttura rilevata

Prima della creazione del presente rapporto non esistevano file o cartelle di progetto. La struttura locale prodotta nella sola fase di analisi è:

```text
la-nostra-citta-webapp/
└── docs/
    └── analisi-tecnica.md
```

Non sono presenti `README.md`, `package.json`, `.gitignore`, `.env.example`, codice frontend, codice backend, route API, modelli, query applicative, autenticazione o gestione degli upload.

### Stack attuale

Lo stack attuale è **assente**. La sola tecnologia definita dai materiali è MySQL 8.0+ per il database progettato. Non risultano scelti o installati runtime, framework, librerie, sistema di build o strumenti di test.

### Modalità di avvio e dipendenze

Non esistono comandi di avvio, script npm o dipendenze. La webapp non è eseguibile nello stato attuale.

### Database

Lo script fornito esternamente descrive uno schema MySQL 8.0+ con dieci tabelle, trigger, viste, indici e dati iniziali. Lo script non è ancora nella repository, non è collegato ad alcuna applicazione e non è stato applicato a un'istanza MySQL verificabile.

### Funzionalità già implementate

Nessuna funzionalità applicativa è implementata. Lo schema SQL costituisce una buona base progettuale, ma non equivale a un backend funzionante.

### Funzionalità mancanti

Mancano tutte le funzionalità della webapp: registrazione, login/logout, ruoli, gestione utenti, quartieri, categorie, segnalazioni, upload, moderazione, sostegni, storico, classifica, filtri, mappa, interfaccia responsive, logging, recupero password, test e documentazione di avvio.

### Problemi tecnici e di configurazione

- Repository priva di commit e file essenziali.
- Assenza di gestione della configurazione e di `.env.example`.
- Assenza di `.gitignore`, con rischio futuro di pubblicare `.env`, upload o dipendenze.
- Nessun meccanismo di migrazione o versionamento dello schema.
- Nessun ambiente di sviluppo riproducibile.
- Nessuna strategia di gestione errori, logging, backup o test.
- La nota finale di `analisi_requisiti_esercizio_1.md` dichiara erroneamente che lo script è PostgreSQL, mentre il file SQL fornito è chiaramente MySQL 8.0+.

### Problemi di sicurezza rilevabili

Non è presente codice applicativo nel quale cercare credenziali o vulnerabilità. Nei materiali forniti non compaiono password, token o chiavi reali. Restano completamente da implementare hashing password, autorizzazione per ruolo, protezione CSRF, rate limiting, CORS ristretto, query parametrizzate, validazione degli input, controllo sicuro degli upload, audit log e protezione dei dati personali.

## 2. Conformità ai requisiti

In questa tabella “presente” indica che il requisito è rappresentato nello schema SQL fornito; non significa che sia già disponibile nella webapp, che al momento non esiste.

| ID | Requisito | Stato | File coinvolti | Problema | Soluzione | Priorità |
|---|---|---|---|---|---|---|
| RF01 | Registrazione con dati minimi ed e-mail univoca | parzialmente presente | SQL: `utente` | Schema presente, ma nessuna API, verifica e-mail o validazione robusta | API di registrazione, Zod, query parametrizzate e verifica e-mail | critica |
| RF01-S | Password conservata come hash | parzialmente presente | SQL: `utente.password_hash` | Il campo esiste, ma non c'è codice di hashing | Hash Argon2id lato server e divieto di loggare la password | critica |
| RF02 | Login, logout e funzioni riservate | assente | Nessuno | Nessun backend o sistema di sessione | Sessione server-side con cookie sicuro e middleware di autenticazione | critica |
| RF02-R | Recupero password | assente | Nessuno | Nessun token monouso o flusso e-mail | Token con hash, scadenza breve e invalidazione dopo l'uso | media |
| RF03 | Ruoli cittadino, moderatore, amministratore | parzialmente presente | SQL: `utente.ruolo` | `CHECK` presente, ma nessuna autorizzazione applicativa | Middleware `requireRole` e test per ogni endpoint riservato | critica |
| RF04 | Gestione quartieri e residenza | parzialmente presente | SQL: `quartiere`, `utente` | Tabelle e relazione presenti; manca CRUD autorizzato | Endpoint di lettura e CRUD amministratore | alta |
| RF05 | Creazione segnalazione completa | parzialmente presente | SQL: `segnalazione` | Modello presente; nessuna API né transazione con allegati/categorie | Service transazionale per bozza, upload e invio | critica |
| RF06 | Almeno un allegato prima della pubblicazione | parzialmente presente | SQL: `allegato`, trigger `trg_verifica_pubblicazione` | Il trigger vale solo sugli update; la visibilità predefinita è pubblica e la vista mostra anche stati non approvati | Bozza privata iniziale, stati pubblicabili espliciti e controllo DB/API coerente | critica |
| RF06-V | Validazione tipo, dimensione, estensione e contenuto file | assente | Nessuno | Il DB conserva metadati ma non può verificare il file reale | Multer con limiti, allowlist, magic bytes, nomi casuali e scansione | critica |
| RF07 | Categorie molti-a-molti e almeno una categoria | parzialmente presente | SQL: `categoria`, `segnalazione_categoria` | Relazione corretta; obbligo aggirabile in inserimento/stato iniziale | Validazione transazionale e vincolo sul passaggio a stato pubblicabile | alta |
| RF08 | Elenco pubblico e dettaglio | parzialmente presente | SQL: vista `v_segnalazioni_pubbliche` | Nessuna API/UI; la vista include contenuti non ancora approvati | Endpoint paginati e vista limitata agli stati pubblicabili | alta |
| RF08-F | Filtri e ordinamenti | parzialmente presente | SQL: indici singoli e viste | Mancano query API, paginazione e indici compositi mirati | Query parametrizzate, whitelist ordinamento e indici misurati | alta |
| RF08-M | Visualizzazione su mappa | assente | SQL: coordinate | Nessun frontend o servizio cartografico | Modulo mappa caricato solo per record con coordinate | media |
| RF09 | Sostegno e revoca | parzialmente presente | SQL: `sostegno` | PK composta impedisce duplicati; manca API di aggiunta/revoca | Endpoint idempotenti e transazioni | alta |
| RF09-A | Divieto di autosostegno e account attivo | presente | SQL: `trg_verifica_sostegno` | Il controllo DB esiste, ma gli errori non sono tradotti per l'utente | Doppio controllo service/DB e mappatura errori | media |
| RF09-C | Classifica calcolata dai sostegni reali | parzialmente presente | SQL: `v_classifica_segnalazioni` | La vista include anche segnalazioni private | Filtrare visibilità e soli stati pubblicabili | alta |
| RF10 | Stati del ciclo di vita | presente | SQL: `stato_segnalazione`, seed | I nove stati sono caricati; manca controllo delle transizioni consentite | Matrice delle transizioni nel service o tabella dedicata | alta |
| RF10-S | Storico con operatore e motivazione | parzialmente presente | SQL: `storico_stato`, trigger storico | I trigger salvano operatore nullo e motivazione generica | Passare operatore/motivazione nel service transazionale e garantire audit completo | alta |
| RF11 | Moderazione automatica | predisposto | SQL: `analisi_ia` | Nessuna coda o integrazione IA | Contratto asincrono e stato “in revisione”; implementazione futura | bassa |
| RF12 | Classificazione automatica correggibile | predisposto | SQL: `analisi_ia`, `segnalazione_categoria` | Dati modellati, ma nessun workflow di conferma/correzione | Origine assegnazione, audit moderatore e job asincrono futuro | bassa |
| RF13 | Analisi immagini/video ed EXIF | predisposto | SQL: `allegato`, `analisi_ia` | Mancano estrazione, consenso e rimozione dei metadati sensibili | Job EXIF/vision isolato e policy privacy | bassa |
| RF14 | Coordinate da input, mappa, geocoding o EXIF | parzialmente presente | SQL: coordinate in `segnalazione` e `allegato` | Nessun servizio; coordinate EXIF senza `CHECK` di intervallo | Validazione Zod e `CHECK` anche sui campi EXIF | media |
| RNF-S1 | HTTPS e cookie sicuri | assente | Nessuno | Nessuna configurazione server/proxy | HTTPS in produzione; cookie `Secure`, `HttpOnly`, `SameSite` | critica |
| RNF-S2 | Query parametrizzate e anti SQL injection | assente | Nessuno | Non esiste accesso applicativo al DB | `mysql2.execute` con placeholder; mai concatenare input | critica |
| RNF-S3 | Rate limiting e CORS ristretto | assente | Nessuno | Nessun middleware | Limiti per IP/account e allowlist dell'origine frontend | alta |
| RNF-P | Privacy, consenso e separazione pubblico/privato | parzialmente presente | SQL: `visibilita` | Manca policy, cancellazione account, minimizzazione dati e gestione EXIF | Informativa, workflow disattivazione, autorizzazioni e pulizia metadati | alta |
| RNF-A | Accessibilità e responsive design | assente | Nessuno | Nessuna interfaccia | HTML semantico, tastiera, contrasto, label, test WCAG 2.2 AA | alta |
| RNF-PE | Prestazioni, paginazione e cache | parzialmente presente | SQL: indici | Mancano paginazione, misurazioni e cache | Paginazione limitata, indici da `EXPLAIN`, cache solo se necessaria | media |
| RNF-AF | Affidabilità, backup, transazioni ed errori | parzialmente presente | SQL: FK e trigger | Nessuna procedura operativa o gestione errori | Transazioni service, backup verificati e error handler centralizzato | alta |
| RNF-SC | Scalabilità e separazione dei servizi | predisposto | Analisi requisiti | Nessuna architettura implementata | Separare client, API, DB, storage e futuri job IA | media |
| BA01 | Azioni riconducibili a profilo verificato | assente | Nessuno | Lo schema non registra verifica e-mail o audit generale | `email_verificata_at` e audit delle operazioni sensibili | alta |
| BA02 | Moderazione e gestione anagrafiche riservate | assente | Nessuno | Nessun controllo applicativo dei permessi | Policy per ruolo applicata in route e service | critica |

## 3. Analisi MySQL

### Compatibilità MySQL 8.0+

Lo script fornito è scritto in sintassi MySQL e usa correttamente `AUTO_INCREMENT`, `ENGINE=InnoDB`, `utf8mb4`, `TIMESTAMP`, `DECIMAL`, `JSON`, chiavi esterne, indici, trigger, `DELIMITER`, `SIGNAL SQLSTATE` e viste. La collation `utf8mb4_0900_ai_ci` e l'effettiva applicazione dei vincoli `CHECK` richiedono MySQL 8.0; in particolare i `CHECK` sono applicati da MySQL 8.0.16. Lo script non è destinato a PostgreSQL.

La nota in `analisi_requisiti_esercizio_1.md` che definisce PostgreSQL lo script è un errore documentale da correggere quando il file sarà importato nella repository.

### Tabelle, chiavi e relazioni

| Tabella | Chiave primaria | Relazioni principali | Valutazione |
|---|---|---|---|
| `quartiere` | `id_quartiere` | 1:N con utenti e segnalazioni | Corretta; nome univoco |
| `utente` | `id_utente` | N:1 quartiere, 1:N segnalazioni e sostegni | Corretta; e-mail univoca e ruoli controllati |
| `stato_segnalazione` | `id_stato` | 1:N segnalazioni e storico | Corretta; nome e ordine univoci |
| `categoria` | `id_categoria` | N:M con segnalazioni | Corretta; nome univoco |
| `segnalazione` | `id_segnalazione` | autore, quartiere e stato correnti | Struttura corretta; flusso pubblicazione da correggere |
| `allegato` | `id_allegato` | N:1 segnalazione, 1:N analisi IA | Corretta come metadati; controlli file restano applicativi |
| `segnalazione_categoria` | coppia segnalazione-categoria | ponte N:M | Normalizzata e senza duplicati |
| `sostegno` | coppia utente-segnalazione | ponte N:M | Impedisce duplicati |
| `storico_stato` | `id_storico` | N:1 segnalazione, stato e operatore | Modello corretto; dati dei trigger incompleti |
| `analisi_ia` | `id_analisi` | N:1 opzionale verso segnalazione/allegato | Buona predisposizione; target ambiguo se entrambi valorizzati |

### Vincoli e integrità referenziale

Le chiavi esterne e le azioni `ON DELETE` sono in generale coerenti: i record operativi dipendenti vengono eliminati con la segnalazione, mentre quartieri, categorie e stati referenziati sono protetti da `RESTRICT`. L'utente autore non può essere eliminato fisicamente se ha segnalazioni; questo è coerente con una strategia di disattivazione o pseudonimizzazione.

I principali problemi da correggere prima dell'uso sono:

1. `visibilita` ha default `PUBBLICA`, quindi una segnalazione appena creata può risultare pubblica prima di avere allegati, categorie o approvazione.
2. `trg_verifica_pubblicazione` è solo `BEFORE UPDATE`; un inserimento diretto con stato avanzato non viene controllato.
3. `v_segnalazioni_pubbliche` mostra tutti gli stati tranne “Rifiutata”, inclusi “Inserita” e “In verifica”.
4. `v_classifica_segnalazioni` non filtra `visibilita` e può includere contenuti privati.
5. Le coordinate EXIF sono controllate come coppia, ma non hanno limiti `-90/90` e `-180/180`.
6. `analisi_ia.ck_ai_target` richiede almeno un target ma consente che segnalazione e allegato siano entrambi valorizzati; va definita la semantica o applicato uno XOR.
7. `allegato.risultato_analisi` sovrappone informazioni già normalizzate in `analisi_ia.risultato`; senza una regola chiara può produrre incoerenze.
8. I trigger di storico non registrano l'operatore e usano una motivazione generica, quindi non soddisfano pienamente l'audit richiesto.
9. `SET FOREIGN_KEY_CHECKS = 0` e i `DROP` rendono lo script adatto a inizializzazione locale, non a migrazioni incrementali di produzione.
10. Se lo script si interrompe prima della riga finale, i controlli FK restano disattivati per quella sessione.

### Normalizzazione

Il modello è sostanzialmente in terza forma normale. Le relazioni N:M sono risolte dalle tabelle associative e il numero dei sostegni viene calcolato dai record reali. L'unica ridondanza da chiarire è `allegato.risultato_analisi` rispetto alla tabella `analisi_ia`; si consiglia di eliminare il campo generico o limitarlo a un riepilogo derivato e non autorevole.

### Indici

Gli indici presenti coprono le principali chiavi esterne e gli accessi per data. Sono consigliati, dopo verifica con `EXPLAIN`:

- un indice su `segnalazione_categoria(id_categoria, id_segnalazione)` per il filtro per categoria;
- indici compositi su `segnalazione` coerenti con le query reali, per esempio `(id_stato_corrente, id_quartiere, data_inserimento)`;
- un vincolo `UNIQUE` sulla chiave di storage dell'allegato, se il percorso identifica univocamente l'oggetto;
- eventuali indici su account/stato solo se giustificati dai volumi.

Non vanno aggiunti molti indici preventivi: ogni indice deve derivare da query e misurazioni reali.

### Trigger e viste

I trigger di controllo autore e sostegno rafforzano le regole aziendali. L'applicazione deve comunque controllare le stesse condizioni per restituire errori comprensibili. Il flusso di pubblicazione e lo storico richiedono invece una revisione progettuale, preferibilmente tramite un service transazionale che aggiorni stato e storico insieme, lasciando al database i vincoli impossibili da aggirare.

Le viste sono utili, ma devono applicare la stessa definizione di “pubblicabile” usata dall'applicazione. La soluzione consigliata è usare una lista esplicita di stati pubblici e richiedere `visibilita IN ('PUBBLICA','ANONIMA')` in entrambe le viste.

## 4. Stack consigliato

| Area | Scelta | Motivazione |
|---|---|---|
| Backend | Node.js con Express.js | È semplice, molto documentato e adatto al livello scolastico; consente di separare route, controller, service e repository senza la complessità di NestJS. Fastify è valido e più orientato alle prestazioni, ma qui il vantaggio non compensa il minore valore didattico e l'ecosistema meno familiare. |
| Frontend | HTML, CSS e JavaScript modulare con Vite | La repository è vuota e non richiede lo stato complesso che giustificherebbe React o Vue. Vite fornisce build e sviluppo rapido senza imporre un framework. |
| Database | MySQL 8.0+ | È un vincolo esplicito ed è già supportato dallo schema fornito. |
| Accesso dati | `mysql2/promise` con repository dedicati | Mantiene visibili SQL e modello relazionale, usa query parametrizzate ed evita il peso di Prisma/Sequelize. Knex può essere valutato solo se le migrazioni manuali diventano difficili. |
| Schema ufficiale | SQL versionato e migrazioni incrementali | Lo script SQL deve restare disponibile come riferimento; dopo la prima versione non si devono usare `DROP` distruttivi per gli aggiornamenti. |
| Validazione | Zod | Un solo schema leggibile per body, parametri e query; errori strutturati e riutilizzabili nei test. Joi è equivalente ma meno comodo per tipi; `express-validator` lega maggiormente la validazione alle route. |
| Autenticazione | Sessione server-side e cookie `HttpOnly` | È più semplice e sicura per una webapp same-origin: il browser non espone il token a JavaScript. Cookie `Secure`, `SameSite=Lax`, rotazione sessione al login, scadenza e protezione CSRF. Il dominio applicativo resta riutilizzabile da una futura app, alla quale si potrà aggiungere un adapter token. |
| Password | Argon2id | È la scelta raccomandata per password; parametri configurabili e hash mai salvati nei log. `bcrypt` resta un'alternativa accettabile. |
| Upload | Multer per sviluppo, storage locale fuori dalla cartella pubblica | Integrazione diretta con Express e limiti semplici. In produzione lo storage va sostituito con object storage senza cambiare controller/service. |
| Controllo file | Allowlist MIME/estensioni, magic bytes, nomi casuali e limiti | Il valore dichiarato dal browser non è sufficiente; il file deve essere verificato dal contenuto e mai salvato con il nome originale come percorso. |
| Configurazione | Variabili d'ambiente validate all'avvio | `.env` locale non tracciato e `.env.example` senza segreti. Avvio bloccato se manca una variabile obbligatoria. |
| Testing | `node:test` o Vitest, Supertest e database MySQL di test | Test unitari per service/validator e integrazione per API, transazioni, trigger e viste. |
| Logging | Pino con redazione dei dati sensibili | Log strutturati senza password, cookie, token o dati personali non necessari. |

## 5. Architettura proposta

### Flusso web principale

```text
Browser
  ↓
Frontend web Vite in HTML CSS JavaScript
  ↓
API REST Node.js ed Express
  ↓
Middleware autenticazione autorizzazione e validazione
  ↓
Controller HTTP
  ↓
Service con regole aziendali e transazioni
  ↓
Repository con query parametrizzate mysql2
  ↓
MySQL 8.0+
```

Il controller traduce HTTP in chiamate applicative ma non contiene SQL. Il service applica regole come ruoli, transizioni di stato, allegato obbligatorio e storico. Il repository è l'unico livello che esegue query. Questa separazione permette a un futuro client mobile di riusare la stessa API e gli stessi service.

### Flusso degli allegati

```text
Browser
  ↓
Upload API autenticata
  ↓
Limiti dimensione allowlist e verifica magic bytes
  ↓
Nome casuale e storage locale privato o object storage
  ↓
Metadati e chiave storage nella tabella allegato
```

La creazione di una segnalazione deve usare un flusso a bozza: si crea un record privato, si caricano allegati e categorie, poi una transazione valida i requisiti e porta la segnalazione a “Inserita”. Un file non deve diventare pubblico tramite un percorso diretto non autorizzato.

### Futura integrazione IA

```text
Segnalazione inviata
  ↓
Evento applicativo e coda di elaborazione
  ↓
Moderazione classificazione EXIF e computer vision
  ↓
Risultati versionati nella tabella analisi_ia
  ↓
Revisione e correzione del moderatore
```

L'integrazione IA non deve essere sincrona con la richiesta di upload. Ogni risultato deve indicare modello, versione, data, punteggio e target. L'IA suggerisce o segnala: la decisione finale resta verificabile dal moderatore.

### Confini di sicurezza

- Il browser non accede mai direttamente a MySQL o allo storage.
- Le route pubbliche espongono solo dati approvati e campi consentiti.
- Ogni azione di moderazione/amministrazione verifica sessione e ruolo nel server.
- Le operazioni composte usano transazioni e rollback.
- CORS accetta solo l'origine prevista; se frontend e API sono same-origin, CORS può essere evitato.
- Gli upload sono serviti tramite route controllata o URL temporanei.

## 6. Struttura di progetto consigliata

```text
la-nostra-citta-webapp/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── main.js
│   ├── index.html
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── repositories/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   └── package.json
├── database/
│   ├── schema/
│   ├── migrations/
│   └── seeds/
├── docs/
│   └── analisi-tecnica.md
├── storage/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

Il `package.json` principale può usare npm workspaces per avviare client e server insieme. `storage/` contiene solo dati locali di sviluppo ed è esclusa da Git, salvo `.gitkeep`. Non è necessario creare ora cartelle per IA, code, app mobile o desktop.

## 7. Piano di implementazione

| Fase | File coinvolti | Attività | Dipendenze | Rischi | Criterio di completamento |
|---:|---|---|---|---|---|
| 1. Analisi e sistemazione | `docs/`, `README.md`, `.gitignore` | Importare e correggere la documentazione, definire convenzioni e proteggere file locali | Conferma del presente piano | Copiare la nota PostgreSQL errata o dati sensibili | Documenti coerenti, nessun segreto e struttura minima approvata |
| 2. Configurazione Node.js | `package.json`, `client/`, `server/` | Creare workspaces, script dev/test/start, Vite ed Express | Fase 1 | Dipendenze superflue o versioni incompatibili | Installazione pulita e client/server avviabili |
| 3. Collegamento MySQL | `database/`, `server/src/config/db.js`, `.env.example` | Versionare schema corretto, connessione pool, migrazione iniziale e health check | MySQL 8.0+ | Script distruttivo applicato all'ambiente sbagliato | Schema applicabile a DB vuoto e query di health funzionante |
| 4. Autenticazione | route/controller/service/repository utenti e sessioni | Registrazione, login, logout, Argon2id, cookie e CSRF | DB e validazione | Furto sessione, enumeration e brute force | Test di login/logout, cookie sicuri e password mai in chiaro |
| 5. Ruoli | middleware auth e test | Implementare `requireAuth` e `requireRole` | Autenticazione | Escalation privilegi | Matrice permessi coperta da test 401/403/200 |
| 6. Quartieri | moduli quartieri client/server | Lista pubblica e CRUD amministratore | Ruoli | Cancellazione di record referenziati | CRUD validato e FK rispettate |
| 7. Categorie | moduli categorie client/server | Lista e CRUD amministratore | Ruoli | Duplicati e rimozioni in uso | Nomi univoci e gestione corretta di `RESTRICT` |
| 8. Segnalazioni | moduli segnalazioni | Bozza privata, creazione, modifica propria, dettaglio e invio | Utenti, quartieri, categorie | Pubblicazione prematura e transazioni parziali | Nessuna segnalazione pubblicata senza requisiti completi |
| 9. Allegati | middleware upload, storage service, tabella `allegato` | Upload/download controllati, limiti, magic bytes, cleanup errori | Segnalazioni | File malevoli, path traversal, file orfani | Tipi ammessi accettati; casi vietati rifiutati; nessun file orfano |
| 10. Sostegni | moduli sostegni | Aggiunta/revoca idempotente e conteggio | Auth e segnalazioni pubbliche | Duplicati e autosostegno | Vincoli DB e test concorrenza superati |
| 11. Stati e storico | service moderazione e repository storico | Transizioni ammesse, motivazione e operatore | Ruoli | Storico incompleto o doppio | Ogni cambio valido crea un solo record audit completo |
| 12. Dashboard e filtri | endpoint query e pagine client | Paginazione, filtri, ordinamento, classifica e mappa | Moduli precedenti | Query lente o esposizione privata | Query con `EXPLAIN`, risultati autorizzati e UI responsive |
| 13. Validazione e sicurezza | middleware globali e configurazione | Zod, headers, rate limit, CORS, CSRF, redazione log e privacy | Tutte le route | Protezioni incoerenti | Checklist sicurezza e test negativi completati |
| 14. Test | `server/tests/`, test client | Unitari, API, DB e percorsi critici end-to-end | Feature complete | Test dipendenti da dati locali | Test ripetibili su DB isolato e pipeline verde |
| 15. Documentazione | `README.md`, `docs/`, OpenAPI opzionale | Setup, variabili, schema, API, ruoli e troubleshooting | Configurazione stabile | Istruzioni non aggiornate | Nuovo sviluppatore avvia il progetto seguendo solo README |
| 16. Predisposizione IA | contratti eventi, repository analisi, documentazione | Definire job, stati, payload e revisione senza collegare modelli reali | Workflow stabile | Accoppiamento o trattamento improprio dati | Interfacce e schema pronti; nessuna IA sincrona o non verificata |

### Ordine e priorità

Le fasi 1-5 e la correzione del flusso di pubblicazione sono bloccanti. Upload e transazioni devono precedere qualsiasi esposizione pubblica. Dashboard, mappa e predisposizione IA vengono dopo la correttezza dei dati e dei permessi.

### Decisioni da approvare prima dell'implementazione

1. Confermare Express, Vite vanilla, `mysql2`, Zod, sessioni server-side e Argon2id.
2. Confermare che una nuova segnalazione nasca privata e diventi pubblica solo dopo la moderazione.
3. Confermare i limiti iniziali degli upload, per esempio 10 MB per immagine e 50 MB per video.
4. Confermare se l'autore pubblico debba mostrare nome e cognome o uno pseudonimo.
5. Confermare se la prima implementazione includa davvero il recupero password via e-mail o solo la predisposizione.

## Esito della fase di analisi

La progettazione dei dati copre bene entità, relazioni e gran parte dei vincoli richiesti, ma la repository non contiene ancora la webapp. Lo schema fornito è compatibile con MySQL 8.0+ e non con PostgreSQL, nonostante la nota errata nel documento dei requisiti. Prima di scrivere il backend è necessario correggere la pubblicazione prematura delle segnalazioni, le viste che espongono contenuti privati/non approvati e lo storico privo di operatore.

La soluzione proposta riguarda esclusivamente una webapp responsive. Non prevede Android, iOS, React Native, Flutter, Electron, PWA completa o pacchetti per store. L'API REST e la separazione dei livelli mantengono possibile un riuso futuro senza sviluppare ora client aggiuntivi.
