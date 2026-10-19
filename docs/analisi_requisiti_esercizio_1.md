
## 6. Entità principali

### UTENTE

Rappresenta il cittadino o il membro del comitato.

Attributi principali:

- `id_utente`;
- `nome`;
- `cognome`;
- `email`;
- `password_hash`;
- `ruolo`;
- `data_registrazione`;
- `stato_account`;
- `id_quartiere_residenza`.

### QUARTIERE

Rappresenta una zona cittadina.

Attributi principali:

- `id_quartiere`;
- `nome`;
- `descrizione`;
- `municipio`.

### SEGNALAZIONE

Rappresenta una proposta o un problema urbano.

Attributi principali:

- `id_segnalazione`;
- `titolo`;
- `descrizione`;
- `data_inserimento`;
- `latitudine`;
- `longitudine`;
- `indirizzo`;
- `visibilita`;
- `id_autore`;
- `id_quartiere`;
- `id_stato_corrente`.

### ALLEGATO

Rappresenta una fotografia o un video.

Attributi principali:

- `id_allegato`;
- `nome_file`;
- `percorso_file`;
- `tipo_mime`;
- `tipo_media`;
- `dimensione_bytes`;
- `data_caricamento`;
- coordinate EXIF;
- `id_segnalazione`.

