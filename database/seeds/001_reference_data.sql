INSERT INTO stato_segnalazione (nome, descrizione, ordine, pubblicabile) VALUES
  ('Inserita', 'Segnalazione appena inviata dal cittadino.', 1, FALSE),
  ('In verifica', 'Segnalazione in fase di controllo.', 2, FALSE),
  ('Approvata', 'Segnalazione verificata e pubblicabile.', 3, TRUE),
  ('Rifiutata', 'Segnalazione non approvata.', 4, FALSE),
  ('Presa in carico', 'Il problema è stato preso in carico.', 5, TRUE),
  ('In valutazione', 'La proposta è in fase di valutazione.', 6, TRUE),
  ('Inserita nel documento programmatico', 'Proposta inserita nel documento programmatico.', 7, TRUE),
  ('Inviata ai candidati', 'Proposta inviata ai candidati Sindaco.', 8, TRUE),
  ('Chiusa', 'Ciclo di vita concluso.', 9, TRUE)
ON DUPLICATE KEY UPDATE descrizione = VALUES(descrizione), ordine = VALUES(ordine), pubblicabile = VALUES(pubblicabile);

INSERT INTO categoria (nome, descrizione) VALUES
  ('Ambiente', 'Problemi ambientali e inquinamento.'),
  ('Mobilità urbana', 'Trasporto pubblico, traffico e spostamenti.'),
  ('Politiche giovanili', 'Esigenze e iniziative per i giovani.'),
  ('Decoro urbano', 'Pulizia, rifiuti e spazi pubblici.'),
  ('Sicurezza', 'Sicurezza dei cittadini.'),
  ('Illuminazione', 'Illuminazione pubblica.'),
  ('Manutenzione stradale', 'Buche, marciapiedi e strade.'),
  ('Verde pubblico', 'Parchi, alberi e aree verdi.'),
  ('Viabilità', 'Segnaletica e organizzazione del traffico.'),
  ('Rischio idrogeologico', 'Allagamenti e dissesto del territorio.')
ON DUPLICATE KEY UPDATE descrizione = VALUES(descrizione);

INSERT INTO quartiere (nome, descrizione, municipio) VALUES
  ('Centro Storico', 'Area centrale della città.', 1),
  ('Navigli', 'Zona dei Navigli.', 6),
  ('Isola', 'Quartiere Isola.', 9),
  ('Bicocca', 'Area Bicocca.', 9),
  ('Lambrate', 'Quartiere Lambrate.', 3),
  ('San Siro', 'Zona San Siro.', 7)
ON DUPLICATE KEY UPDATE descrizione = VALUES(descrizione), municipio = VALUES(municipio);
