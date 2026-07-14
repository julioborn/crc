-- hora_hasta <= hora_desde ahora significa que la franja cruza la
-- medianoche y termina al día siguiente (p. ej. pádel 08:30-02:30). La
-- app (generarCandidatos en slots.ts) ya interpreta esa semántica. Solo
-- se sigue prohibiendo una franja de largo cero (hora_hasta = hora_desde,
-- ambigua entre "nada" y "24hs").
alter table disponibilidad drop constraint disponibilidad_check;
alter table disponibilidad add constraint disponibilidad_check check (hora_hasta <> hora_desde);
