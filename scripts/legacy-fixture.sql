-- Reconstructed legacy MySQL 5.7 schema, plus a small fixture that exercises
-- every branch of `scripts/migrate-from-mysql.ts`.
--
-- The real database has no dump in either repository, so this DDL is inferred
-- from the SQL strings in `../centauro_old` (`BLL/*.php` prepared statements
-- and the `bind_param` type codes). Column names, order and types match what
-- those statements imply; widths and nullability are best guesses and the real
-- dump takes precedence over this file wherever they disagree.
--
--   docker compose -f docker-compose.dev.yml --profile etl up -d mysql
--   docker exec -i centauro-mysql-etl mysql -uroot -petl localdb < scripts/legacy-fixture.sql
--   pnpm db:migrate-legacy --dry-run
--
-- The fixture deliberately contains dirty data: dangling foreign keys, a
-- duplicate daily close, a voided payment, float drift on a stored balance,
-- an origination that disagrees with `total * 1.15`, and a `cancel` flag that
-- contradicts its own ledger. A clean run over this file proves nothing; the
-- point is that each one is reported.

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `balance`, `credit`, `customer`, `route`, `collector`, `commerce`, `income`, `user`;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `commerce` (
  `idCommerce` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`idCommerce`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `collector` (
  `idCollector` int(11) NOT NULL AUTO_INCREMENT,
  `firstName` varchar(50) DEFAULT NULL,
  `lastName` varchar(50) DEFAULT NULL,
  `address` varchar(200) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `DPI` varchar(20) DEFAULT NULL,
  `birthDate` date DEFAULT NULL,
  `state` int(1) DEFAULT '0',
  PRIMARY KEY (`idCollector`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `route` (
  `idRoute` int(11) NOT NULL AUTO_INCREMENT,
  `codeRoute` varchar(20) DEFAULT NULL,
  `routeName` varchar(100) DEFAULT NULL,
  `details` varchar(200) DEFAULT NULL,
  `_idCollector` int(11) DEFAULT NULL,
  `state` int(1) DEFAULT '0',
  PRIMARY KEY (`idRoute`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `customer` (
  `idCustomer` int(11) NOT NULL AUTO_INCREMENT,
  `_idCommerce` int(11) DEFAULT NULL,
  `_idRoute` int(11) DEFAULT NULL,
  `DPI` varchar(20) DEFAULT NULL,
  `firstName` varchar(50) DEFAULT NULL,
  `lastName` varchar(50) DEFAULT NULL,
  `address` varchar(200) DEFAULT NULL,
  `mobile` varchar(20) DEFAULT NULL,
  `mobile2` varchar(20) DEFAULT NULL,
  `state` int(1) DEFAULT '0',
  PRIMARY KEY (`idCustomer`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- `total` is the principal; the payoff is `total * 1.15`, materialised only in
-- the origination row of `balance`. Money columns are doubles throughout.
CREATE TABLE `credit` (
  `idCredit` int(11) NOT NULL AUTO_INCREMENT,
  `_idCustomer` int(11) DEFAULT NULL,
  `_idCollector` int(11) DEFAULT NULL,
  `code` varchar(20) DEFAULT NULL,
  `dateStart` date DEFAULT NULL,
  `total` double DEFAULT NULL,
  `cancel` int(1) DEFAULT '0',
  `record` int(1) DEFAULT '0',
  PRIMARY KEY (`idCredit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- `balpay`: 0 = origination, 1 = payment. `state`: 1 = voided.
CREATE TABLE `balance` (
  `idBalance` int(11) NOT NULL AUTO_INCREMENT,
  `_idCredit` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `balpay` int(1) DEFAULT NULL,
  `amount` double DEFAULT NULL,
  `balance` double DEFAULT NULL,
  `state` int(1) DEFAULT '0',
  PRIMARY KEY (`idBalance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE `income` (
  `idIncome` int(11) NOT NULL AUTO_INCREMENT,
  `_idCollector` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `incomes` double DEFAULT NULL,
  `base` double DEFAULT NULL,
  `exes` double DEFAULT NULL,
  `credits` double DEFAULT NULL,
  PRIMARY KEY (`idIncome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- `permissions`: 0 drew the admin sidebar, 1 the collector one.
CREATE TABLE `user` (
  `idUser` int(11) NOT NULL AUTO_INCREMENT,
  `_idCollector` int(11) DEFAULT NULL,
  `firstName` varchar(50) DEFAULT NULL,
  `lastName` varchar(50) DEFAULT NULL,
  `userName` varchar(50) DEFAULT NULL,
  `passWord` varchar(255) DEFAULT NULL,
  `permissions` int(1) DEFAULT '0',
  `state` int(1) DEFAULT '0',
  PRIMARY KEY (`idUser`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ---------------------------------------------------------------- fixture

INSERT INTO `commerce` (`idCommerce`, `name`) VALUES
  (1, 'Mercado Central'),
  (2, 'Mercado La Terminal');

INSERT INTO `collector` VALUES
  (1, 'Carlos', 'Mejía', '12 calle 4-52, Zona 1', '5512 8834', '1874 55201 0101', '1985-03-14', 0),
  -- soft-deleted, and a zero date MySQL accepts but Postgres has no value for
  (2, 'Byron', 'Castillo', '5a calle 9-14, Amatitlán', '4118 9023', '', '0000-00-00', 1);

INSERT INTO `route` VALUES
  (1, 'R-01', 'Zona 1 Centro', 'Casco histórico', 1, 0),
  -- points at a collector that no longer exists: the link is dropped, the route survives
  (2, 'R-02', 'La Terminal', 'Zona 4', 99, 0);

INSERT INTO `customer` VALUES
  (1, 1, 1, '2312 44890 0101', 'Rosa', 'Martínez', 'Local 42, Mercado Central', '5812 3390', '2232 1180', 0),
  -- `_idCommerce = 0` is how the old app writes "none"
  (2, 0, 2, '1998 71230 0104', 'Jorge', 'Wittfield', 'Bodega 8, La Terminal', '4471 1180', '', 0),
  (3, 2, 1, '2455 09912 0107', 'Lucía', 'Chen', '5a calle 3-17', '2296 6654', '', 1);

INSERT INTO `credit` VALUES
  (1, 1, 1, 'A-1', '2024-01-08', 1000, 0, 0),   -- open and healthy
  (2, 2, 1, 'A-2', '2024-02-05', 2000, 1, 0),   -- paid off in 25 days
  (3, 1, 1, 'A-3', '2023-10-02', 1000, 1, 1),   -- paid off in 70 days: bad record
  (4, 1, 1, 'A-4', '2024-03-25', 1000, 0, 0),   -- carries a voided payment
  (5, 1, 1, 'A-5', '2024-04-01', 333.33, 0, 0), -- origination lost a centavo
  (6, 99, 1, 'A-6', '2024-04-10', 500, 0, 0),   -- customer 99 does not exist
  (7, 1, 1, 'A-7', '2024-04-15', 1000, 0, 0),   -- stored balance drifted
  (8, 1, 1, 'A-8', '2024-05-01', 1000, 1, 0),   -- flagged paid off, but still owes
  (9, 1, 1, 'A-9', '2024-05-10', 1000, 0, 0);   -- no ledger rows at all

INSERT INTO `balance` VALUES
  -- credit 1
  (1,  1, '2024-01-08', 0, 1150,   1150,   0),
  (2,  1, '2024-01-15', 1, 200,    950,    0),
  (3,  1, '2024-01-22', 1, 200,    750,    0),
  -- credit 2, cleared 2024-03-01
  (4,  2, '2024-02-05', 0, 2300,   2300,   0),
  (5,  2, '2024-02-12', 1, 1150,   1150,   0),
  (6,  2, '2024-03-01', 1, 1150,   0,      0),
  -- credit 3, cleared 2023-12-11 — 70 days after 2023-10-02
  (7,  3, '2023-10-02', 0, 1150,   1150,   0),
  (8,  3, '2023-10-23', 1, 575,    575,    0),
  (9,  3, '2023-12-11', 1, 575,    0,      0),
  -- credit 4: row 12 was voided, so the legacy app re-derived row 13 but left
  -- row 12's own balance stale. The ETL must not read that as corruption.
  (10, 4, '2024-03-25', 0, 1150,   1150,   0),
  (11, 4, '2024-04-01', 1, 150,    1000,   0),
  (12, 4, '2024-04-08', 1, 150,    850,    1),
  (13, 4, '2024-04-15', 1, 150,    850,    0),
  -- credit 5: 333.33 * 1.15 = 383.33, but a float wrote 383.32
  (14, 5, '2024-04-01', 0, 383.32, 383.32, 0),
  -- credit 6: parent credit is unmigratable, so this goes with it
  (15, 6, '2024-04-10', 0, 575,    575,    0),
  -- credit 7: the stored running balance is a centavo off
  (16, 7, '2024-04-15', 0, 1150,   1150,   0),
  (17, 7, '2024-04-22', 1, 100,    1049.99, 0),
  -- credit 8: still owing, yet `cancel = 1`
  (18, 8, '2024-05-01', 0, 1150,   1150,   0),
  (19, 8, '2024-05-08', 1, 100,    1050,   0),
  -- a payment whose credit was hard-deleted, exactly as the old delete does
  (20, 999, '2024-05-08', 1, 100,  0,      0);

INSERT INTO `income` VALUES
  (1, 1, '2024-05-27', 4820, 1500, 620, 2700),
  (2, 1, '2024-05-27', 4900, 1500, 700, 2700), -- same collector, same day
  (3, 1, '2024-05-26', 4410, 1500, 510, 2200),
  (4, 99, '2024-05-26', 3620, 1200, 320, 2000); -- collector 99 does not exist

-- The hashes are real PHP `password_hash(..., PASSWORD_BCRYPT)` output for the
-- password "centauro"; `bcryptjs` verifies the `$2y$` prefix unchanged.
INSERT INTO `user` VALUES
  (1, 0, 'Marlon', 'Véliz', 'mveliz', '$2y$10$uaEh/.h3g1vTfb2zf4q5GuEeiRAAAL0zCwOvNQ4C0CexBpMF3P0Ui', 0, 0),
  (2, 1, 'Carlos', 'Mejía', 'cmejia', '$2y$10$uaEh/.h3g1vTfb2zf4q5GuEeiRAAAL0zCwOvNQ4C0CexBpMF3P0Ui', 1, 0),
  (3, 99, 'Byron', 'Castillo', 'bcastillo', '$2y$10$uaEh/.h3g1vTfb2zf4q5GuEeiRAAAL0zCwOvNQ4C0CexBpMF3P0Ui', 1, 1);
