USE la_nostra_citta;

START TRANSACTION;

-- ============================================================
-- QUARTIERI
-- ============================================================

INSERT INTO quartiere (idQuartiere, nome, descrizione, municipio)
VALUES
    (1, 'Brera', 'Zona centrale con aree residenziali e culturali.', 'Municipio 1'),
    (2, 'Isola', 'Quartiere a nord del centro cittadino.', 'Municipio 9'),
    (3, 'Navigli', 'Zona caratterizzata dai canali.', 'Municipio 6'),
    (4, 'Lambrate', 'Quartiere nella parte orientale della città.', 'Municipio 3'),
    (5, 'Bicocca', 'Area universitaria e residenziale a nord-est.', 'Municipio 9');

-- ============================================================
-- UTENTI DEMO
-- Questi hash sono segnaposto e non consentono l'accesso.
-- ============================================================

INSERT INTO utente (
    idUtente,
    nome,
    cognome,
    email,
    passwordHash,
    ruolo,
    dataRegistrazione,
    statoAccount,
    idQuartiereResidenza
)
VALUES
    (1, 'Giulia', 'Rossi', 'giulia.rossi@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'CITTADINO', '2026-09-01 10:00:00', 'ATTIVO', 1),

    (2, 'Marco', 'Bianchi', 'marco.bianchi@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'CITTADINO', '2026-09-02 11:30:00', 'ATTIVO', 2),

    (3, 'Sara', 'Verdi', 'sara.verdi@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'CITTADINO', '2026-09-03 09:15:00', 'ATTIVO', 3),

    (4, 'Luca', 'Neri', 'luca.neri@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'CITTADINO', '2026-09-04 14:45:00', 'ATTIVO', 4),

    (5, 'Elena', 'Gallo', 'elena.gallo@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'CITTADINO', '2026-09-05 08:20:00', 'ATTIVO', 5),

    (6, 'Paolo', 'Fontana', 'paolo.moderatore@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'MODERATORE', '2026-08-20 09:00:00', 'ATTIVO', 1),

    (7, 'Admin', 'Sistema', 'admin@example.test',
     'SOSTITUIRE_CON_HASH_BCRYPT_O_ARGON2',
     'AMMINISTRATORE', '2026-08-15 08:00:00', 'ATTIVO', 1);

-- ============================================================
-- SEGNALAZIONI
-- Gli stati 1, 2, 3 e 5 sono stati inseriti dallo script iniziale.
-- ============================================================

INSERT INTO segnalazione (
    idSegnalazione,
    titolo,
    descrizione,
    dataInserimento,
    latitudine,
    longitudine,
    indirizzo,
    visibilita,
    idAutore,
    idQuartiere,
    idStatoCorrente
)
VALUES
    (
        1,
        'Buche pericolose in via Brera',
        'Sono presenti diverse buche profonde lungo il tratto vicino all’attraversamento pedonale. La situazione può essere pericolosa per ciclisti e motociclisti.',
        '2026-09-10 09:20:00',
        45.4719000,
        9.1881000,
        'Via Brera, Milano',
        'PUBBLICA',
        1,
        1,
        3
    ),
    (
        2,
        'Illuminazione insufficiente nel parco',
        'Alcuni lampioni del parco non funzionano. Dopo il tramonto alcune aree rimangono al buio e risultano difficili da attraversare.',
        '2026-09-11 19:10:00',
        45.4890000,
        9.1900000,
        'Area verde del quartiere Isola, Milano',
        'PUBBLICA',
        2,
        2,
        5
    ),
    (
        3,
        'Rifiuti abbandonati vicino al Naviglio',
        'Sono presenti sacchi e rifiuti abbandonati lungo il percorso pedonale. Si richiedono la pulizia dell’area e controlli più frequenti.',
        '2026-09-12 08:40:00',
        45.4525000,
        9.1740000,
        'Alzaia Naviglio Grande, Milano',
        'PUBBLICA',
        3,
        3,
        2
    ),
    (
        4,
        'Marciapiede danneggiato vicino alla fermata',
        'Una parte del marciapiede è sollevata e rende difficile il passaggio a persone con passeggini o mobilità ridotta.',
        '2026-09-13 12:05:00',
        45.4840000,
        9.2350000,
        'Via Conte Rosso, Milano',
        'PUBBLICA',
        4,
        4,
        3
    ),
    (
        5,
        'Mancano rastrelliere per biciclette',
        'Nell’area vicino agli edifici universitari sono presenti poche rastrelliere. Molte biciclette vengono legate a recinzioni e pali.',
        '2026-09-14 16:30:00',
        45.5140000,
        9.2110000,
        'Piazza dell’Ateneo Nuovo, Milano',
        'PUBBLICA',
        5,
        5,
        1
    );

-- ============================================================
-- ALLEGATI
-- I percorsi sono dimostrativi: i file fisici non vengono creati
-- da SQL e vanno caricati nello storage usato dall'applicazione.
-- ============================================================

INSERT INTO allegato (
    idAllegato,
    nomeFile,
    percorsoFile,
    tipoMIME,
    tipoMedia,
    dimensione,
    dataCaricamento,
    latitudineEXIF,
    longitudineEXIF,
    risultatoAnalisi,
    idSegnalazione
)
VALUES
    (1, 'buche-via-brera.jpg',
     'uploads/segnalazioni/1/buche-via-brera.jpg',
     'image/jpeg', 'IMMAGINE', 245760,
     '2026-09-10 09:22:00', 45.4719000, 9.1881000, NULL, 1),

    (2, 'lampione-parco-isola.jpg',
     'uploads/segnalazioni/2/lampione-parco-isola.jpg',
     'image/jpeg', 'IMMAGINE', 318400,
     '2026-09-11 19:12:00', NULL, NULL, NULL, 2),

    (3, 'rifiuti-naviglio.jpg',
     'uploads/segnalazioni/3/rifiuti-naviglio.jpg',
     'image/jpeg', 'IMMAGINE', 402100,
     '2026-09-12 08:43:00', 45.4525000, 9.1740000, NULL, 3),

    (4, 'marciapiede-danneggiato.jpg',
     'uploads/segnalazioni/4/marciapiede-danneggiato.jpg',
     'image/jpeg', 'IMMAGINE', 287300,
     '2026-09-13 12:08:00', NULL, NULL, NULL, 4),

    (5, 'rastrelliere-biciclette.jpg',
     'uploads/segnalazioni/5/rastrelliere-biciclette.jpg',
     'image/jpeg', 'IMMAGINE', 355900,
     '2026-09-14 16:34:00', NULL, NULL, NULL, 5);

-- ============================================================
-- CATEGORIE DELLE SEGNALAZIONI
-- Gli ID categoria corrispondono all'ordine iniziale:
-- 1 Manutenzione stradale
-- 2 Mobilità urbana
-- 3 Verde pubblico
-- 4 Illuminazione
-- 5 Decoro urbano
-- 6 Sicurezza
-- 7 Ambiente
-- 8 Politiche giovanili
-- ============================================================

INSERT INTO segnalazione_categoria (
    idSegnalazione,
    idCategoria,
    origineAssegnazione,
    affidabilitaIA,
    dataAssegnazione
)
VALUES
    (1, 1, 'MANUALE', NULL, '2026-09-10 09:25:00'),
    (1, 6, 'IA', 0.9100, '2026-09-10 09:26:00'),

    (2, 4, 'MANUALE', NULL, '2026-09-11 19:15:00'),
    (2, 6, 'IA', 0.8600, '2026-09-11 19:16:00'),

    (3, 5, 'MANUALE', NULL, '2026-09-12 08:45:00'),
    (3, 7, 'IA', 0.8900, '2026-09-12 08:46:00'),

    (4, 1, 'MANUALE', NULL, '2026-09-13 12:10:00'),
    (4, 2, 'IA', 0.7800, '2026-09-13 12:11:00'),

    (5, 2, 'MANUALE', NULL, '2026-09-14 16:36:00');

-- ============================================================
-- SOSTEGNI
-- Gli autori non sostengono le proprie segnalazioni.
-- ============================================================

INSERT INTO sostegno (idUtente, idSegnalazione, dataSostegno)
VALUES
    (2, 1, '2026-09-15 09:00:00'),
    (3, 1, '2026-09-15 10:15:00'),
    (4, 1, '2026-09-15 12:40:00'),
    (5, 1, '2026-09-16 08:20:00'),

    (1, 2, '2026-09-15 13:10:00'),
    (3, 2, '2026-09-15 14:30:00'),
    (5, 2, '2026-09-16 09:05:00'),

    (1, 3, '2026-09-16 10:00:00'),
    (2, 3, '2026-09-16 10:40:00'),

    (1, 4, '2026-09-16 11:30:00'),
    (2, 4, '2026-09-16 12:05:00'),
    (5, 4, '2026-09-16 14:00:00'),

    (1, 5, '2026-09-17 08:30:00'),
    (3, 5, '2026-09-17 09:10:00');

-- ============================================================
-- ANALISI IA DIMOSTRATIVE
-- Ogni record ha almeno uno tra idSegnalazione e idAllegato.
-- ============================================================

INSERT INTO analisi_ia (
    idAnalisi,
    tipoAnalisi,
    modello,
    risultato,
    punteggio,
    dataAnalisi,
    idSegnalazione,
    idAllegato
)
VALUES
    (
        1,
        'CLASSIFICAZIONE_TESTO',
        'modello-demo-1',
        JSON_OBJECT(
            'categorie_suggerite',
            JSON_ARRAY('Manutenzione stradale', 'Sicurezza'),
            'esito',
            'classificazione completata'
        ),
        0.9100,
        '2026-09-10 09:26:00',
        1,
        NULL
    ),
    (
        2,
        'MODERAZIONE_TESTO',
        'modello-demo-1',
        JSON_OBJECT(
            'esito',
            'nessun contenuto offensivo rilevato',
            'richiede_revisione',
            FALSE
        ),
        0.9800,
        '2026-09-10 09:26:30',
        1,
        NULL
    ),
    (
        3,
        'ANALISI_IMMAGINE',
        'vision-demo-1',
        JSON_OBJECT(
            'esito',
            'immagine pertinente alla segnalazione',
            'oggetti',
            JSON_ARRAY('strada', 'buche')
        ),
        0.8800,
        '2026-09-10 09:27:00',
        NULL,
        1
    ),
    (
        4,
        'CLASSIFICAZIONE_TESTO',
        'modello-demo-1',
        JSON_OBJECT(
            'categorie_suggerite',
            JSON_ARRAY('Illuminazione', 'Sicurezza'),
            'esito',
            'classificazione completata'
        ),
        0.8600,
        '2026-09-11 19:16:00',
        2,
        NULL
    ),
    (
        5,
        'ANALISI_IMMAGINE',
        'vision-demo-1',
        JSON_OBJECT(
            'esito',
            'immagine analizzata',
            'coordinate_exif',
            'non presenti'
        ),
        0.8000,
        '2026-09-11 19:17:00',
        NULL,
        2
    );

COMMIT;

-- ============================================================
-- VERIFICA DEL POPOLAMENTO
-- ============================================================

SELECT 'quartiere' AS tabella, COUNT(*) AS record FROM quartiere
UNION ALL
SELECT 'utente', COUNT(*) FROM utente
UNION ALL
SELECT 'stato_segnalazione', COUNT(*) FROM stato_segnalazione
UNION ALL
SELECT 'categoria', COUNT(*) FROM categoria
UNION ALL
SELECT 'segnalazione', COUNT(*) FROM segnalazione
UNION ALL
SELECT 'allegato', COUNT(*) FROM allegato
UNION ALL
SELECT 'segnalazione_categoria', COUNT(*) FROM segnalazione_categoria
UNION ALL
SELECT 'sostegno', COUNT(*) FROM sostegno
UNION ALL
SELECT 'storico_stato', COUNT(*) FROM storico_stato
UNION ALL
SELECT 'analisi_ia', COUNT(*) FROM analisi_ia;

-- Classifica delle segnalazioni per numero di sostegni.
SELECT *
FROM v_classifica_segnalazioni
ORDER BY numeroSostegni DESC, dataInserimento DESC;