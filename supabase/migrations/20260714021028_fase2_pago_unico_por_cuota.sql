-- ============================================================
-- CRC — Migración: un solo pago por cuota (y por turno)
-- ============================================================
-- puede_cobrar() autoriza por ÁREA, no mira si la cuota ya está pagada
-- (a propósito: esa validación vive en el flujo, no en el permiso). Sin
-- un UNIQUE acá, nada impide insertar un segundo "pago" presencial para
-- una cuota que ya tiene uno — y cada insert dispara
-- trg_pago_movimiento, así que sería un ingreso duplicado en la
-- contabilidad. UNIQUE en una columna nullable permite muchos NULL
-- (los pagos de turno, que usan turno_id en vez de cuota_id) pero exige
-- unicidad entre los que sí tienen valor — exactamente lo que hace falta.

alter table pago add constraint pago_cuota_id_unica unique (cuota_id);
alter table pago add constraint pago_turno_id_unica unique (turno_id);
