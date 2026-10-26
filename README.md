# La Nostra Città Il Nostro Futuro

Webapp civica per raccogliere, verificare e ordinare le segnalazioni urbane dei cittadini di Milano. Il progetto è pensato per il comitato **Insieme per Milano** e mantiene separati frontend, API REST, database e storage degli allegati.

## Funzionalità

- registrazione, login, logout e profilo;
- ruoli `CITTADINO`, `MODERATORE` e `AMMINISTRATORE`;
- quartieri, categorie e stati configurabili;
- creazione di segnalazioni con almeno un allegato obbligatorio;
- controllo reale del formato tramite magic bytes;
- filtri, ordinamento, paginazione e classifica per sostegni;
- sostegno idempotente, senza duplicati e senza autosostegno;
- moderazione con transizioni controllate e storico completo;
- visibilità pubblica, anonima o privata;
- API amministrative per utenti, quartieri e categorie;
- schema predisposto per future analisi IA asincrone;
- interfaccia responsive e utilizzabile da tastiera.

## Stack

- frontend: HTML, CSS e JavaScript modulare con Vite;
- backend: Node.js ed Express;
- database: MySQL 8.0.16+ con `mysql2`;
- autenticazione: sessione server-side e cookie `HttpOnly`;
- password: Argon2id;
- validazione: Zod;
- upload: Multer, verifica `file-type` e storage locale privato in sviluppo;
- sicurezza: Helmet, CORS ristretto, CSRF, rate limiting, query parametrizzate e audit log;
- test: Node test runner e Supertest.

## Requisiti

- Node.js 20 o successivo;
- npm 10 o successivo;
- MySQL 8.0.16 o successivo.

## Configurazione locale

1. Clonare la repository e installare le dipendenze:

   ```bash
   git clone https://github.com/iezzicarlotta/la-nostra-citta-webapp.git
   cd la-nostra-citta-webapp
   npm install
   ```

2. Creare il database e un utente dedicato. Sostituire la password di esempio:

   ```sql
   CREATE DATABASE la_nostra_citta CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'una-password-locale-sicura';
   GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, REFERENCES,
         CREATE VIEW, SHOW VIEW, TRIGGER ON la_nostra_citta.* TO 'app_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

3. Copiare la configurazione e inserire valori locali:

   ```bash
   cp .env.example .env
   ```

   Impostare una `SESSION_SECRET` casuale di almeno 32 caratteri e non versionare `.env`.

4. Applicare schema e dati iniziali:

   ```bash
   mysql -u app_user -p la_nostra_citta < database/schema/001_initial_schema.sql
   mysql -u app_user -p la_nostra_citta < database/seeds/001_reference_data.sql
   npm run import:nil --workspace server
   ```

   Per un database preesistente con colonne in formato camelCase e dati da conservare, eseguire una volta il migratore:

   ```bash
   npm run migrate:legacy --workspace server
   ```

   Per un database già in formato snake_case ma privo dei campi aggiunti successivamente, applicare invece `database/schema/002_existing_database_compatibility.sql`.

5. Avviare frontend e backend:

   ```bash
   npm run dev
   ```

   Frontend: `http://localhost:5173`  
   API: `http://localhost:3000/api`

## Primo amministratore

Registrare normalmente il primo account, quindi promuoverlo una sola volta dal database locale:

```sql
UPDATE utente
SET ruolo = 'AMMINISTRATORE'
WHERE email = 'indirizzo@example.com';
```

Al login successivo l'account visualizzerà l'area amministrativa. Non inserire password o hash manualmente nei seed.

## Comandi

| Comando | Descrizione |
|---|---|
| `npm run dev` | Avvia API e frontend in sviluppo |
| `npm test` | Esegue i test dei workspace |
| `npm run build` | Genera il frontend di produzione |
| `npm start` | Avvia il server in modalità configurata |

Per la produzione eseguire prima `npm run build`, impostare `NODE_ENV=production` e avviare `npm start`. Il server serve automaticamente `client/dist`. HTTPS deve essere terminato da un reverse proxy affidabile e `TRUST_PROXY=1` deve essere usato soltanto dietro tale proxy.

## Regole degli allegati

- massimo 5 file per segnalazione;
- immagini: JPG, PNG o WEBP, massimo 10 MB per impostazione predefinita;
- video: MP4, MOV o WEBM, massimo 50 MB per impostazione predefinita;
- i limiti sono configurabili in `.env`;
- i nomi reali nello storage sono casuali;
- i file non vengono esposti come cartella statica;
- in produzione lo storage locale deve essere sostituito con object storage e scansione antivirus.

## API principali

| Metodo | Endpoint | Accesso |
|---|---|---|
| `GET` | `/api/meta` | pubblico |
| `GET` | `/api/reports` | pubblico |
| `GET` | `/api/reports/mine` | autenticato |
| `GET` | `/api/reports/:id` | pubblico se approvato, altrimenti proprietario/moderatore |
| `POST` | `/api/auth/register` | pubblico con CSRF |
| `POST` | `/api/auth/login` | pubblico con CSRF |
| `POST` | `/api/reports` | autenticato |
| `POST/DELETE` | `/api/reports/:id/support` | autenticato |
| `GET` | `/api/reports/moderation` | moderatore/amministratore |
| `PATCH` | `/api/reports/:id/state` | moderatore/amministratore |
| `GET` | `/api/admin/users` | amministratore |
| `PATCH` | `/api/admin/users/:id` | amministratore |
| `POST/PUT/DELETE` | `/api/admin/neighborhoods` | amministratore |
| `POST/PUT/DELETE` | `/api/admin/categories` | amministratore |

Le richieste che modificano dati devono includere l'header `x-csrf-token`, ottenuto da `GET /api/auth/csrf`, e mantenere il cookie di sessione.

La ricerca indirizzi usa Nominatim e le mappe stradali OpenStreetMap; serve una connessione Internet. La mappa mostra l’attribuzione richiesta e i confini NIL provengono dal dataset comunale “NIL vigenti - PGT 2030”.

## Privacy e sicurezza

La modalità anonima nasconde il nome nelle risposte pubbliche, ma l'autore resta noto al comitato per garantire responsabilità e moderazione. Le coordinate e i metadati EXIF sono dati personali: prima della pubblicazione reale servono informativa privacy, base giuridica, tempi di conservazione e una procedura di cancellazione o pseudonimizzazione.

Non memorizzare nel repository `.env`, dump reali, upload, cookie, log contenenti dati personali o chiavi di servizi esterni.

## Documentazione

- [`docs/analisi-tecnica.md`](docs/analisi-tecnica.md): confronto requisiti, analisi MySQL, architettura e piano.
- [`docs/analisi_requisiti_esercizio_1.md`](docs/analisi_requisiti_esercizio_1.md): requisiti funzionali, modello concettuale e schema logico.
- [`database/schema/001_initial_schema.sql`](database/schema/001_initial_schema.sql): schema MySQL ufficiale.
- [`database/seeds/001_reference_data.sql`](database/seeds/001_reference_data.sql): soli dati iniziali fittizi e di riferimento.
