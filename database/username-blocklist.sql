-- Lista inicial, deliberadamente curta e auditável. Amplie somente com critérios documentados.
INSERT INTO blocked_usernames (normalized_username, category) VALUES
  ('merda', 'linguagem_ofensiva'),
  ('caralho', 'linguagem_ofensiva'),
  ('porra', 'linguagem_ofensiva'),
  ('buceta', 'linguagem_ofensiva'),
  ('arrombado', 'linguagem_ofensiva'),
  ('filhodaputa', 'linguagem_ofensiva'),
  ('hitler', 'referencia_historica_inaceitavel'),
  ('adolfhitler', 'referencia_historica_inaceitavel'),
  ('himmler', 'referencia_historica_inaceitavel'),
  ('heinrichhimmler', 'referencia_historica_inaceitavel'),
  ('mussolini', 'referencia_historica_inaceitavel'),
  ('benitomussolini', 'referencia_historica_inaceitavel'),
  ('stalin', 'referencia_historica_inaceitavel'),
  ('josephstalin', 'referencia_historica_inaceitavel'),
  ('binladen', 'referencia_historica_inaceitavel'),
  ('osamabinladen', 'referencia_historica_inaceitavel')
ON CONFLICT (normalized_username) DO NOTHING;
