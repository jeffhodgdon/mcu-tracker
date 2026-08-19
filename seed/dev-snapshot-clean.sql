PRAGMA defer_foreign_keys=TRUE;
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "users" ("id","email","created_at") VALUES(8,'jeff.hodgdon95@gmail.com','2026-08-17 17:58:25');
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('d4NkZLP0Z3YlB_yxwmQO2_P1XOgb-gjV8ZP0IgNcjqo',8,'2026-09-16 17:58:25','2026-08-17 17:58:25');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('tRELgDJu7EV91NhR-md7lx8cfZRcwGBXIy5piYjsyNI',8,'2026-09-16 23:46:12','2026-08-17 23:46:12');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('oQ3VGRNXRg8MNICXqAwnf-zQHkd4gvgsxNg9i53NE90',8,'2026-09-17 01:33:18','2026-08-18 01:33:18');
INSERT INTO "sessions" ("id","user_id","expires_at","created_at") VALUES('QsQBvFM9aQemnLMyZwBuE6KJMg9Ti65fn5iH8KPPkAs',8,'2026-09-18 00:27:42','2026-08-19 00:27:42');
CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  item_id INTEGER REFERENCES items(id),
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,           -- Film, One-Shot, TV Series, Animated Series,
                                -- Special Presentation, Marvel Television
  release_date TEXT,            -- nullable; TBD entries are NULL, partial
                                -- placeholders like 2027-07-00 are kept verbatim
  phase TEXT,
  runtime_min INTEGER,          -- nullable where unknown/unreleased
  notes TEXT,
  is_estimate INTEGER NOT NULL DEFAULT 0   -- 1 if runtime is a flagged estimate
, chrono_order INTEGER, chrono_setting TEXT);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(1,'Iron Man','Film','2008-05-02','Phase 1',126,NULL,0,7,'2010');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(2,'The Incredible Hulk','Film','2008-06-13','Phase 1',112,NULL,0,9,'2011');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(3,'Iron Man 2','Film','2010-05-07','Phase 1',124,NULL,0,8,'2011');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(4,'Thor','Film','2011-05-06','Phase 1',115,NULL,0,11,'2011');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(5,'Captain America: The First Avenger','Film','2011-07-22','Phase 1',124,NULL,0,2,'1943 - 1945');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(6,'The Consultant','One-Shot','2011-09-13','Phase 1',4,'Home video short',0,10,'2011');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(7,'A Funny Thing Happened on the Way to Thor''s Hammer','One-Shot','2011-10-25','Phase 1',4,'Home video short',0,12,'2011');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(8,'The Avengers','Film','2012-05-04','Phase 1',143,NULL,0,13,'2012');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(9,'Item 47','One-Shot','2012-09-25','Phase 1',12,'Home video short',0,14,'2012');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(10,'Iron Man 3','Film','2013-05-03','Phase 2',130,NULL,0,15,'2012 - 2013');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(11,'Agent Carter','One-Shot','2013-09-08','Phase 2',15,'Home video short',0,3,'1946');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(12,'Agents of S.H.I.E.L.D. (Season 1)','Marvel Television','2013-09-24','Marvel Television',935,'ABC - Overlaps Winter Soldier; HYDRA reveal',0,19,'2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(13,'Thor: The Dark World','Film','2013-11-08','Phase 2',112,NULL,0,16,'2013');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(14,'All Hail the King','One-Shot','2014-02-25','Phase 2',14,'Home video short',0,17,'2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(15,'Captain America: The Winter Soldier','Film','2014-04-04','Phase 2',136,NULL,0,18,'2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(16,'Guardians of the Galaxy','Film','2014-08-01','Phase 2',122,NULL,0,20,'1988 / 2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(17,'Agents of S.H.I.E.L.D. (Season 2)','Marvel Television','2014-09-23','Marvel Television',941,'ABC - Inhumans / Terrigen introduced',0,24,'2014 - 2015');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(18,'Agent Carter (Season 1)','Marvel Television','2015-01-06','Marvel Television',333,'ABC - Follows the Agent Carter one-shot',0,4,'1946');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(19,'Daredevil (Season 1)','Marvel Television','2015-04-10','Marvel Television',679,'Netflix - The Hand groundwork; post-Avengers NYC',0,26,'2015');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(20,'Avengers: Age of Ultron','Film','2015-05-01','Phase 2',141,NULL,0,25,'2015');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(21,'Ant-Man','Film','2015-07-17','Phase 2',117,NULL,0,29,'2015');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(22,'Agents of S.H.I.E.L.D. (Season 3)','Marvel Television','2015-09-29','Marvel Television',941,'ABC - Secret Warriors',0,28,'2015 - 2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(23,'Jessica Jones (Season 1)','Marvel Television','2015-11-20','Marvel Television',670,'Netflix',0,27,'2015');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(24,'Agent Carter (Season 2)','Marvel Television','2016-01-19','Marvel Television',424,'ABC - Darkforce introduced',0,5,'1947');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(25,'Daredevil (Season 2)','Marvel Television','2016-03-18','Marvel Television',690,'Netflix - Introduces Punisher and Elektra; The Hand',0,30,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(26,'Captain America: Civil War','Film','2016-05-06','Phase 3',147,NULL,0,35,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(27,'Team Thor','One-Shot','2016-08-28','Phase 3',3,'Mockumentary short',0,32,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(28,'Agents of S.H.I.E.L.D. (Season 4)','Marvel Television','2016-09-20','Marvel Television',941,'ABC - DARKHOLD arc; Ghost Rider, LMDs, Framework',0,40,'2016 - 2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(29,'Luke Cage (Season 1)','Marvel Television','2016-09-30','Marvel Television',703,'Netflix',0,31,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(30,'Doctor Strange','Film','2016-11-04','Phase 3',115,NULL,0,39,'2016 - 2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(31,'Team Thor: Part 2','One-Shot','2017-02-28','Phase 3',5,'Mockumentary short',0,33,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(32,'Iron Fist (Season 1)','Marvel Television','2017-03-17','Marvel Television',703,'Netflix - K''un-Lun and The Hand',0,41,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(33,'Guardians of the Galaxy Vol. 2','Film','2017-05-05','Phase 3',136,NULL,0,23,'2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(34,'Spider-Man: Homecoming','Film','2017-07-07','Phase 3',133,NULL,0,38,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(35,'The Defenders (Season 1)','Marvel Television','2017-08-18','Marvel Television',393,'Netflix - The Hand crossover event',0,42,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(36,'Inhumans (Season 1)','Marvel Television','2017-09-29','Marvel Television',338,'ABC - Attilan; ties to AoS Inhumans arc',0,43,'2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(37,'Thor: Ragnarok','Film','2017-11-03','Phase 3',130,NULL,0,44,'2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(38,'The Punisher (Season 1)','Marvel Television','2017-11-17','Marvel Television',675,'Netflix - Frank Castle solo',0,45,'2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(39,'Runaways (Season 1)','Marvel Television','2017-11-21','Marvel Television',493,'Hulu',0,46,'2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(40,'Agents of S.H.I.E.L.D. (Season 5)','Marvel Television','2017-12-01','Marvel Television',934,'ABC - Future arc; ends at the Snap',0,47,'2018 / 2091');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(41,'Black Panther','Film','2018-02-16','Phase 3',134,NULL,0,37,'2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(42,'Team Darryl','One-Shot','2018-03-06','Phase 3',6,'Mockumentary short',0,34,'2017');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(43,'Jessica Jones (Season 2)','Marvel Television','2018-03-08','Marvel Television',665,'Netflix',0,49,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(44,'Avengers: Infinity War','Film','2018-04-27','Phase 3',149,NULL,0,62,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(45,'Cloak & Dagger (Season 1)','Marvel Television','2018-06-07','Marvel Television',418,'Freeform - Darkforce powers',0,50,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(46,'Luke Cage (Season 2)','Marvel Television','2018-06-22','Marvel Television',752,'Netflix',0,51,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(47,'Ant-Man and the Wasp','Film','2018-07-06','Phase 3',118,NULL,0,48,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(48,'Iron Fist (Season 2)','Marvel Television','2018-09-07','Marvel Television',516,'Netflix',0,52,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(49,'Daredevil (Season 3)','Marvel Television','2018-10-19','Marvel Television',648,'Netflix - Bullseye; leads into Born Again',0,53,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(50,'Runaways (Season 2)','Marvel Television','2018-12-21','Marvel Television',615,'Hulu',0,54,'2018');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(51,'The Punisher (Season 2)','Marvel Television','2019-01-18','Marvel Television',671,'Netflix',0,55,'2019');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(52,'Captain Marvel','Film','2019-03-08','Phase 3',124,NULL,0,6,'1995');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(53,'Cloak & Dagger (Season 2)','Marvel Television','2019-04-04','Marvel Television',417,'Freeform - Crosses over with Runaways',0,56,'2019');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(54,'Avengers: Endgame','Film','2019-04-26','Phase 3',181,NULL,0,64,'2018 / 2023');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(55,'Agents of S.H.I.E.L.D. (Season 6)','Marvel Television','2019-05-10','Marvel Television',548,'ABC - Timeline begins diverging',0,59,'2019');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(56,'Jessica Jones (Season 3)','Marvel Television','2019-06-14','Marvel Television',652,'Netflix',0,57,'2019');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(57,'Spider-Man: Far From Home','Film','2019-07-02','Phase 3',129,NULL,0,71,'2024');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(58,'Peter''s To-Do List','One-Shot','2019-07-02','Phase 3',4,'Home video short (Spider-Man: Far From Home bonus)',0,72,'2024');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(59,'Runaways (Season 3)','Marvel Television','2019-12-13','Marvel Television',481,'Hulu - Cloak & Dagger crossover',0,58,'2019');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(60,'Agents of S.H.I.E.L.D. (Season 7)','Marvel Television','2020-05-27','Marvel Television',553,'ABC - Time travel; splits into its own branch timeline',0,60,'1931 - 2019');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(61,'Helstrom (Season 1)','Marvel Television','2020-10-16','Marvel Television',499,'Hulu - Loosest canon tie of the group',0,61,'2020');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(62,'WandaVision (Season 1)','TV Series','2021-01-15','Phase 4',322,NULL,0,67,'2023');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(63,'The Falcon and the Winter Soldier (Season 1)','TV Series','2021-03-19','Phase 4',302,NULL,0,68,'2024');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(64,'Loki (Season 1)','TV Series','2021-06-09','Phase 4',285,NULL,0,65,'Outside time');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(65,'Black Widow','Film','2021-07-09','Phase 4',134,'1995 prologue, main story set 2016',0,36,'1995 / 2016');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(66,'What If...? (Season 1)','Animated Series','2021-08-11','Phase 4',294,NULL,1,106,'Multiverse');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(67,'Shang-Chi and the Legend of the Ten Rings','Film','2021-09-03','Phase 4',132,NULL,0,69,'2024');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(68,'Eternals','Film','2021-11-05','Phase 4',156,NULL,0,73,'5000 BC - 2024');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(69,'Hawkeye (Season 1)','TV Series','2021-11-24','Phase 4',288,NULL,1,75,'2024');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(70,'Spider-Man: No Way Home','Film','2021-12-17','Phase 4',148,NULL,0,77,'2024 - 2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(71,'Moon Knight (Season 1)','TV Series','2022-03-30','Phase 4',290,NULL,1,76,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(72,'Doctor Strange in the Multiverse of Madness','Film','2022-05-06','Phase 4',126,NULL,0,78,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(73,'Ms. Marvel (Season 1)','TV Series','2022-06-08','Phase 4',285,NULL,1,74,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(74,'Thor: Love and Thunder','Film','2022-07-08','Phase 4',119,NULL,0,79,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(75,'I Am Groot (Season 1)','Animated Series','2022-08-10','Phase 4',25,'Shorts collection',1,21,'2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(76,'She-Hulk: Attorney at Law (Season 1)','TV Series','2022-08-18','Phase 4',306,NULL,1,80,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(77,'Werewolf by Night','Special Presentation','2022-10-07','Phase 4',55,'Special Presentation',0,63,'Unspecified');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(78,'Black Panther: Wakanda Forever','Film','2022-11-11','Phase 4',161,NULL,0,81,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(79,'The Guardians of the Galaxy Holiday Special','Special Presentation','2022-11-25','Phase 4',42,'Special Presentation',1,82,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(80,'Ant-Man and the Wasp: Quantumania','Film','2023-02-17','Phase 5',124,NULL,0,89,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(81,'Guardians of the Galaxy Vol. 3','Film','2023-05-05','Phase 5',150,NULL,0,90,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(82,'Secret Invasion (Season 1)','TV Series','2023-06-21','Phase 5',284,NULL,1,87,'2025 - 2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(83,'I Am Groot (Season 2)','Animated Series','2023-09-06','Phase 5',25,'Shorts collection',1,22,'2014');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(84,'Loki (Season 2)','TV Series','2023-10-05','Phase 5',297,NULL,0,66,'Outside time');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(85,'The Marvels','Film','2023-11-10','Phase 5',105,NULL,0,88,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(86,'What If...? (Season 2)','Animated Series','2023-12-22','Phase 5',289,NULL,1,107,'Multiverse');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(87,'Echo (Season 1)','TV Series','2024-01-09','Phase 5',218,'Marvel Spotlight banner',1,83,'2025');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(88,'X-Men ''97 (Season 1)','Animated Series','2024-03-20','Phase 5',334,'Outside main timeline',1,109,'1990s (own timeline)');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(89,'Deadpool & Wolverine','Film','2024-07-26','Phase 5',128,NULL,0,91,'2024 - 2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(90,'Agatha All Along (Season 1)','TV Series','2024-09-18','Phase 5',368,NULL,1,70,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(91,'What If...? (Season 3)','Animated Series','2024-12-22','Phase 5',254,NULL,1,108,'Multiverse');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(92,'Your Friendly Neighborhood Spider-Man (Season 1)','Animated Series','2025-01-29','Phase 5',300,'Outside main timeline',1,111,'Own timeline');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(93,'Captain America: Brave New World','Film','2025-02-14','Phase 5',118,NULL,0,92,'2027');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(94,'Daredevil: Born Again (Season 1)','TV Series','2025-03-04','Phase 5',426,NULL,1,84,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(95,'Thunderbolts*','Film','2025-05-02','Phase 5',126,'aka The New Avengers',0,93,'2027');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(96,'Ironheart (Season 1)','TV Series','2025-06-24','Phase 5',289,NULL,1,94,'2027');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(97,'The Fantastic Four: First Steps','Film','2025-07-25','Phase 6',115,'Set on Earth-828',0,98,'1960s (Earth-828)');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(98,'Eyes of Wakanda (Season 1)','Animated Series','2025-08-01','Phase 6',118,'Sacred Timeline canon; earliest-set MCU project',1,1,'1260 BC - 1896 AD');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(99,'Wonder Man (Season 1)','TV Series','2026-01-27','Phase 6',250,'Renewed for Season 2',0,95,'2027');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(100,'Daredevil: Born Again (Season 2)','TV Series','2026-03-24','Phase 6',360,NULL,1,85,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(101,'The Punisher: One Last Kill','Special Presentation','2026-05-12','Phase 6',48,'Special Presentation',1,86,'2026');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(102,'Spider-Noir (Season 1)','TV Series','2026-05-27','Phase 6',344,'Outside main timeline',1,112,'1930s (own timeline)');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(103,'X-Men ''97 (Season 2)','Animated Series','2026-07-01','Phase 6',297,'Outside main timeline',1,110,'1990s (own timeline)');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(104,'Spider-Man: Brand New Day','Film','2026-07-31','Phase 6',145,'MUTANT ENTRY POINT: introduces Earth-616 Jean Grey (Sadie Sink); Punisher appears',0,97,'2027');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(105,'VisionQuest (Season 1)','TV Series','2026-10-14','Phase 6',240,'SOURCES CONFLICT: some list Jan 7 2026, recent reporting says Oct 14 2026',1,96,'2027');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(106,'Avengers: Doomsday','Film','2026-12-18','Phase 6',165,'UPCOMING; delayed from May 1 2026',0,99,'TBD');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(107,'Untitled Marvel Film','Film','2027-07-00','Phase 6',NULL,'UPCOMING; dated, untitled',0,NULL,NULL);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(108,'Avengers: Secret Wars','Film','2027-12-17','Phase 6',NULL,'UPCOMING; Multiverse Saga finale, delayed from May 2027',0,100,'TBD');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(109,'Ghost Rider','Film','2028-00-00','TBD',NULL,'UPCOMING; Ryan Gosling, announced SDCC 2026, exact date TBD',0,102,'TBD');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(110,'Untitled Marvel Film','Film','2028-02-18','TBD',NULL,'UPCOMING; date held, untitled',0,NULL,NULL);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(111,'Untitled Marvel Film','Film','2028-05-05','TBD',NULL,'UPCOMING; date held, untitled',0,NULL,NULL);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(112,'Untitled Marvel Film','Film','2028-11-10','TBD',NULL,'UPCOMING; date held, untitled',0,NULL,NULL);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(113,'Black Panther 3','Film','2028-12-15','TBD',NULL,'UPCOMING; David Jonsson as Toussaint, dir. Coogler',0,101,'TBD');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(114,'Untitled Marvel Film','Film','2029-00-00','TBD',NULL,'UPCOMING; date held, untitled',0,NULL,NULL);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(115,'Untitled Marvel Film','Film','2029-00-01','TBD',NULL,'UPCOMING; date held, untitled',0,NULL,NULL);
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(116,'X-Men (MCU reboot)','Film',NULL,'TBD',NULL,'UPCOMING; dir. Jake Schreier, no date announced',0,103,'TBD');
INSERT INTO "items" ("id","title","type","release_date","phase","runtime_min","notes","is_estimate","chrono_order","chrono_setting") VALUES(117,'Wonder Man (Season 2)','TV Series',NULL,'TBD',NULL,'UPCOMING; renewed, no date announced',0,104,'TBD');
CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  countdown_target_date TEXT,   -- nullable; user-chosen countdown date
  countdown_label TEXT          -- e.g. "Avengers: Secret Wars", nullable
, watchlist_sort TEXT);
INSERT INTO "user_settings" ("user_id","countdown_target_date","countdown_label","watchlist_sort") VALUES(8,'2026-12-18','Avengers: Doomsday',NULL);
CREATE TABLE other_universes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  universe TEXT NOT NULL,       
  title TEXT NOT NULL,
  setting TEXT,                 
  release_date TEXT,            
  runtime_min INTEGER,          
  notes TEXT
);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(1,'Fox X-Men / Deadpool (Earth-10005)','X-Men Origins: Wolverine','1845 - 1979','2009-05-01',126,'Largely retconned later');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(2,'Fox X-Men / Deadpool (Earth-10005)','X-Men: First Class','1944 / 1962','2011-06-03',132,'Cuban Missile Crisis');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(3,'Fox X-Men / Deadpool (Earth-10005)','X-Men','2000','2000-07-14',104,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(4,'Fox X-Men / Deadpool (Earth-10005)','X2: X-Men United','2003','2003-05-02',134,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(5,'Fox X-Men / Deadpool (Earth-10005)','X-Men: The Last Stand','2006','2006-05-26',104,'First Dark Phoenix arc');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(6,'Fox X-Men / Deadpool (Earth-10005)','The Wolverine','2013','2013-07-26',126,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(7,'Fox X-Men / Deadpool (Earth-10005)','X-Men: Days of Future Past','1973 / 2023','2014-05-23',132,'SPLIT POINT: 1973 rewrite rebuilds timeline');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(8,'Fox X-Men / Deadpool (Earth-10005)','X-Men: Apocalypse','1983','2016-05-27',144,'Post-split');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(9,'Fox X-Men / Deadpool (Earth-10005)','Dark Phoenix','1992','2019-06-07',113,'Post-split; second Dark Phoenix arc');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(10,'Fox X-Men / Deadpool (Earth-10005)','The New Mutants','2010s','2020-08-28',94,'Placement loose');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(11,'Fox X-Men / Deadpool (Earth-10005)','Deadpool','2016','2016-02-12',108,'Wade Wilson''s origin');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(12,'Fox X-Men / Deadpool (Earth-10005)','Deadpool 2','2018','2018-05-18',119,'Time travel; Cable');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(13,'Fox X-Men / Deadpool (Earth-10005)','Logan','2029','2017-03-03',137,'End of the Fox timeline');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(14,'Fox X-Men / Deadpool (Earth-10005)','-> Deadpool & Wolverine','2024 / TVA','2024-07-26',128,'SEE FILMS TAB: Wade crosses into Sacred Timeline');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(15,'Fox Fantastic Four & Daredevil (each its own continuity)','The Fantastic Four (Corman)','contemporary','1994',NULL,'Never officially released');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(16,'Fox Fantastic Four & Daredevil (each its own continuity)','Daredevil','contemporary','2003-02-14',103,'Affleck version');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(17,'Fox Fantastic Four & Daredevil (each its own continuity)','Elektra','contemporary','2005-01-14',97,'Daredevil spin-off');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(18,'Fox Fantastic Four & Daredevil (each its own continuity)','Fantastic Four','contemporary','2005-07-08',106,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(19,'Fox Fantastic Four & Daredevil (each its own continuity)','Fantastic Four: Rise of the Silver Surfer','contemporary','2007-06-15',92,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(20,'Fox Fantastic Four & Daredevil (each its own continuity)','Fantastic Four (Trank)','contemporary','2015-08-07',100,'aka Fant4stic; own continuity');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(21,'Fox Fantastic Four & Daredevil (each its own continuity)','-> The Fantastic Four: First Steps','1960s','2025-07-25',115,'SEE FILMS TAB: MCU, Earth-828, unrelated to above');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(22,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Spider-Man','2002','2002-05-03',121,'RAIMI (Earth-96283)');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(23,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Spider-Man 2','2004','2004-06-30',127,'Raimi');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(24,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Spider-Man 3','2007','2007-05-04',139,'Raimi; first live-action Venom');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(25,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','The Amazing Spider-Man','2012','2012-07-03',136,'WEBB (Earth-120703)');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(26,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','The Amazing Spider-Man 2','2014','2014-05-02',142,'Webb');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(27,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Madame Web','1973 / 2003','2024-02-14',116,'SSU; earliest SSU setting');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(28,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Venom','2018','2018-10-05',112,'SSU; universe ambiguous, see notes');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(29,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Venom: Let There Be Carnage','2021','2021-10-01',97,'SSU; post-credits briefly crosses into MCU');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(30,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Morbius','2022','2022-04-01',104,'SSU; Keaton''s Toomes appears');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(31,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Kraven the Hunter','contemporary','2024-12-13',127,'SSU');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(32,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','Venom: The Last Dance','2024','2024-10-25',109,'SSU');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(33,'Sony Live-Action Spider-Man (Raimi / Webb / SSU)','-> Spider-Man: No Way Home','2024','2021-12-17',148,'SEE FILMS TAB: Maguire and Garfield both cross over');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(34,'Sony Spider-Verse (Animated)','Spider-Man: Into the Spider-Verse','contemporary','2018-12-14',117,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(35,'Sony Spider-Verse (Animated)','Spider-Man: Across the Spider-Verse','contemporary','2023-06-02',140,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(36,'Sony Spider-Verse (Animated)','Spider-Man: Beyond the Spider-Verse','contemporary','2027-06-04',NULL,'Delayed repeatedly; currently dated');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(37,'Pre-MCU Marvel Films (each its own continuity)','Captain America','1943 / 1993','1990',97,'Direct to video in the US');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(38,'Pre-MCU Marvel Films (each its own continuity)','Howard the Duck','1986','1986-08-01',110,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(39,'Pre-MCU Marvel Films (each its own continuity)','The Punisher (Lundgren)','1989','1989',89,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(40,'Pre-MCU Marvel Films (each its own continuity)','Blade','1998','1998-08-21',120,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(41,'Pre-MCU Marvel Films (each its own continuity)','Blade II','2002','2002-03-22',117,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(42,'Pre-MCU Marvel Films (each its own continuity)','Hulk (Ang Lee)','2003','2003-06-20',138,'Unrelated to The Incredible Hulk');
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(43,'Pre-MCU Marvel Films (each its own continuity)','The Punisher','2004','2004-04-16',124,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(44,'Pre-MCU Marvel Films (each its own continuity)','Blade: Trinity','2004','2004-12-08',113,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(45,'Pre-MCU Marvel Films (each its own continuity)','Man-Thing','2005','2005-04-30',98,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(46,'Pre-MCU Marvel Films (each its own continuity)','Ghost Rider','2007','2007-02-16',114,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(47,'Pre-MCU Marvel Films (each its own continuity)','Punisher: War Zone','2008','2008-12-05',107,NULL);
INSERT INTO "other_universes" ("id","universe","title","setting","release_date","runtime_min","notes") VALUES(48,'Pre-MCU Marvel Films (each its own continuity)','Ghost Rider: Spirit of Vengeance','2012','2012-02-17',95,NULL);
CREATE TABLE watchlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mcu',  
  UNIQUE(user_id, item_id, source)
);
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(478,8,1,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(479,8,2,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(480,8,3,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(481,8,4,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(482,8,5,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(483,8,8,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(484,8,10,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(485,8,13,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(486,8,15,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(487,8,16,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(488,8,20,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(489,8,21,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(490,8,26,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(491,8,30,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(492,8,33,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(493,8,34,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(494,8,37,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(495,8,41,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(496,8,44,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(497,8,47,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(498,8,52,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(499,8,54,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(500,8,57,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(501,8,65,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(502,8,67,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(503,8,68,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(504,8,70,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(505,8,72,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(506,8,74,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(507,8,78,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(508,8,80,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(509,8,81,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(510,8,85,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(511,8,89,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(512,8,93,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(513,8,95,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(514,8,97,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(515,8,104,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(527,8,4,'other');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(528,8,3,'other');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(529,8,5,'other');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(530,8,1,'other');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(531,8,2,'other');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(532,8,7,'other');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(620,8,62,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(621,8,63,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(622,8,64,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(623,8,69,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(624,8,71,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(625,8,73,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(626,8,7,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(627,8,6,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(628,8,77,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(629,8,79,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(630,8,101,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(631,8,66,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(632,8,75,'mcu');
INSERT INTO "watchlist" ("id","user_id","item_id","source") VALUES(633,8,83,'mcu');
CREATE TABLE episodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  episode_number INTEGER NOT NULL,
  title TEXT,
  runtime_min INTEGER,
  is_estimate INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(22,66,1,'...Captain Carter Were the First Avenger?',33,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(23,66,2,'...T''Challa Became a Star-Lord?',32,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(24,66,3,'...the World Lost Its Mightiest Heroes?',32,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(25,66,4,'...Doctor Strange Lost His Heart Instead of His Hands?',36,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(26,66,5,'...Zombies?!',31,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(27,66,6,'...Killmonger Rescued Tony Stark?',33,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(28,66,7,'...Thor Were an Only Child?',32,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(29,66,8,'...Ultron Won?',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(30,66,9,'...the Watcher Broke His Oath?',35,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(31,69,1,'Never Meet Your Heroes',49,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(32,69,2,'Hide and Seek',51,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(33,69,3,'Echoes',43,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(34,69,4,'Partners, Am I Right?',40,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(35,69,5,'Ronin',44,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(36,69,6,'So This Is Christmas?',61,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(37,71,1,'The Goldfish Problem',45,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(38,71,2,'Summon the Suit',50,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(39,71,3,'The Friendly Type',50,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(40,71,4,'The Tomb',53,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(41,71,5,'Asylum',50,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(42,71,6,'Gods and Monsters',42,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(43,73,1,'Generation Why',49,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(44,73,2,'Crushed',51,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(45,73,3,'Destined',47,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(46,73,4,'Seeing Red',48,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(47,73,5,'Time and Again',41,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(48,73,6,'No Normal',49,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(49,75,1,'Short 1',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(50,75,2,'Short 2',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(51,75,3,'Short 3',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(52,75,4,'Short 4',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(53,75,5,'Short 5',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(54,76,1,'A Normal Amount of Rage',38,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(55,76,2,'Superhuman Law',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(56,76,3,'The People vs. Emil Blonsky',34,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(57,76,4,'Is This Not Real Magic?',36,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(58,76,5,'Mean, Green, and Straight Poured into These Jeans',31,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(59,76,6,'Just Jen',31,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(60,76,7,'The Retreat',35,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(61,76,8,'Ribbit and Rip It',36,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(62,76,9,'Whose Show Is This?',35,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(63,77,1,'Werewolf by Night',53,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(64,79,1,'The Guardians of the Galaxy Holiday Special',42,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(65,82,1,'Resurrection',55,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(66,82,2,'Promises',58,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(67,82,3,'Betrayed',50,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(68,82,4,'Beloved',38,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(69,82,5,'Harvest',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(70,82,6,'Home',38,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(71,83,1,'Short 1',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(72,83,2,'Short 2',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(73,83,3,'Short 3',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(74,83,4,'Short 4',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(75,83,5,'Short 5',5,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(82,86,1,'...Nebula Joined the Nova Corps?',31,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(83,86,2,'...Peter Quill Attacked Earth''s Mightiest Heroes?',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(84,86,3,'...Happy Hogan Saved Christmas?',29,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(85,86,4,'...Iron Man Crashed Into the Grandmaster?',34,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(86,86,5,'...Captain Carter Fought the Hydra Stomper?',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(87,86,6,'...Kahhori Reshaped the World?',34,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(88,86,7,'...Hela Found the Ten Rings?',31,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(89,86,8,'...The Avengers Assembled in 1602?',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(90,86,9,'...Strange Supreme Intervened?',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(91,87,1,'Chafa',49,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(92,87,2,'Lowak',39,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(93,87,3,'Tuklo',42,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(94,87,4,'Taloa',51,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(95,87,5,'Maya',37,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(96,88,1,'To Me, My X-Men',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(97,88,2,'Mutant Liberation Begins',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(98,88,3,'Fire Made Flesh',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(99,88,4,'Motendo / Lifedeath – Part 1',29,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(100,88,5,'Remember It',36,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(101,88,6,'Lifedeath – Part 2',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(102,88,7,'Bright Eyes',34,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(103,88,8,'Tolerance Is Extinction – Part 1',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(104,88,9,'Tolerance Is Extinction – Part 2',31,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(105,88,10,'Tolerance Is Extinction – Part 3',42,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(106,90,1,'Seekest Thou the Road',40,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(107,90,2,'Circle Sewn with Fate / Unlock Thy Secret',41,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(108,90,3,'Through Many Miles / Of Tricks and Trials',37,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(109,90,4,'If I Can''t Reach You / Let My Song Teach You',44,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(110,90,5,'Darkest Hour / Wake Thy Power',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(111,90,6,'Familiar by Thy Side',47,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(112,90,7,'Death''s Hand in Mine',36,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(113,90,8,'Follow Me My Friend / To Glory at the End',49,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(114,90,9,'Maiden Mother Crone',42,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(115,91,1,'Episode 1',31,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(116,91,2,'...Agatha Went to Hollywood?',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(117,91,3,'Episode 3',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(118,91,4,'Episode 4',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(119,91,5,'Episode 5',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(120,91,6,'Episode 6',32,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(121,91,7,'Episode 7',28,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(122,91,8,'Episode 8',34,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(123,92,1,'Episode 1',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(124,92,2,'Episode 2',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(125,92,3,'Episode 3',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(126,92,4,'Episode 4',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(127,92,5,'Episode 5',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(128,92,6,'Episode 6',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(129,92,7,'Episode 7',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(130,92,8,'Episode 8',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(131,92,9,'Episode 9',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(132,92,10,'Episode 10',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(133,94,1,'Heaven''s Half Hour',58,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(134,94,2,'Optics',47,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(135,94,3,'The Hollow of His Hand',44,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(136,94,4,'Sic Semper Systema',52,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(137,94,5,'With Interest',39,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(138,94,6,'Excessive Force',42,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(139,94,7,'Art for Art''s Sake',40,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(140,94,8,'Isle of Joy',47,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(141,94,9,'Straight to Hell',57,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(142,96,1,'Episode 1',41,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(143,96,2,'Episode 2',48,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(144,96,3,'Episode 3',53,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(145,96,4,'Episode 4',50,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(146,96,5,'Episode 5',57,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(147,96,6,'Episode 6',40,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(148,98,1,'Episode 1',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(149,98,2,'Episode 2',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(150,98,3,'Episode 3',30,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(151,98,4,'Episode 4',28,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(152,99,1,'Matinee',33,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(153,99,2,'Self-Tape',32,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(154,99,3,'Pacoima',32,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(155,99,4,'Doorman',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(156,99,5,'Found Footage',24,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(157,99,6,'Callback',34,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(158,99,7,'Kathy Friedman',33,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(159,99,8,'Yucca Valley',32,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(160,101,1,'The Punisher: One Last Kill',48,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(161,105,1,'Episode 1',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(162,105,2,'Episode 2',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(163,105,3,'Episode 3',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(164,105,4,'Episode 4',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(165,105,5,'Episode 5',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(166,105,6,'Episode 6',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(167,105,7,'Episode 7',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(168,105,8,'Episode 8',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(169,100,1,'Episode 1',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(170,100,2,'Episode 2',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(171,100,3,'Episode 3',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(172,100,4,'Episode 4',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(173,100,5,'Episode 5',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(174,100,6,'Episode 6',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(175,100,7,'Episode 7',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(176,100,8,'Episode 8',45,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(177,103,1,'Episode 1',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(178,103,2,'Episode 2',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(179,103,3,'Episode 3',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(180,103,4,'Episode 4',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(181,103,5,'Episode 5',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(182,103,6,'Episode 6',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(183,103,7,'Episode 7',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(184,103,8,'Episode 8',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(185,103,9,'Episode 9',33,1);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(186,62,1,'Filmed Before a Live Studio Audience',27,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(187,62,2,'Don''t Touch That Dial',34,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(188,62,3,'Now in Color',30,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(189,62,4,'We Interrupt This Program',33,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(190,62,5,'On a Very Special Episode…',38,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(191,62,6,'All-New Halloween Spooktacular!',35,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(192,62,7,'Breaking the Fourth Wall',35,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(193,62,8,'Previously On',43,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(194,62,9,'The Series Finale',47,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(195,63,1,'New World Order',47,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(196,63,2,'The Star-Spangled Man',47,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(197,63,3,'Power Broker',51,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(198,63,4,'The Whole World Is Watching',51,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(199,63,5,'Truth',57,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(200,63,6,'One World, One People',49,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(207,84,1,'Ouroboros',45,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(208,84,2,'Breaking Brad',49,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(209,84,3,'1893',54,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(210,84,4,'Heart of the TVA',48,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(211,84,5,'Science/Fiction',45,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(212,84,6,'Glorious Purpose',56,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(213,64,1,'Glorious Purpose',50,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(214,64,2,'The Variant',53,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(215,64,3,'Lamentis',41,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(216,64,4,'The Nexus Event',48,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(217,64,5,'Journey Into Mystery',48,0);
INSERT INTO "episodes" ("id","item_id","episode_number","title","runtime_min","is_estimate") VALUES(218,64,6,'For All Time. Always.',45,0);
CREATE TABLE watch_status (
  user_id INTEGER NOT NULL REFERENCES users(id),
  item_id INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'mcu',
  episode_id INTEGER NOT NULL DEFAULT 0,  -- 0 = season-level, else episodes.id
  status TEXT NOT NULL DEFAULT 'unwatched',
  episode_progress TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, item_id, source, episode_id)
);
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,1,'mcu',0,'unwatched',NULL,'2026-08-18 12:39:08');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,2,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:19');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,3,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:19');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,4,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:19');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,5,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:19');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,8,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,6,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,7,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,9,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,10,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,11,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,12,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:20');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,13,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:21');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,14,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:21');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,15,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:21');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,16,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:21');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,17,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:21');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,18,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:21');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,19,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,20,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,21,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,22,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,23,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,24,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,25,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:22');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,26,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:23');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,27,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:23');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,28,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:23');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,29,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:23');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,30,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:23');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,31,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:23');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,32,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,33,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,34,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,35,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,36,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,37,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,38,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:24');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,39,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:25');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,40,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:25');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,41,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:25');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,42,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:25');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,43,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:25');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,44,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:25');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,45,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:26');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,46,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:26');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,47,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:26');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,48,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:26');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,49,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:26');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,50,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:26');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,51,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,52,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,53,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,54,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,55,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,56,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,57,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:27');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,58,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:28');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,59,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:28');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,60,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:28');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,61,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:28');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,62,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:28');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,63,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:28');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,64,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:29');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,65,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:29');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,66,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:29');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,67,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:29');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,68,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:29');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,69,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:29');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,70,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,71,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,72,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,73,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,74,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,75,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,76,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:30');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,77,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:31');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,78,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:31');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,79,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:31');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,80,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:31');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,81,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:31');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,82,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:31');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,83,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,84,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,85,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,86,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,87,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,88,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,89,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:32');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,90,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:33');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,91,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:33');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,92,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:33');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,93,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:33');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,94,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:33');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,95,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:33');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,96,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,97,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,98,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,99,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,100,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,101,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,102,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:34');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,103,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:35');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,104,'mcu',0,'unwatched',NULL,'2026-08-18 12:13:35');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,3,'other',0,'unwatched',NULL,'2026-08-18 13:44:06');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,4,'other',0,'unwatched',NULL,'2026-08-18 13:44:10');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,63,'mcu',10,'unwatched',NULL,'2026-08-18 23:47:45');
INSERT INTO "watch_status" ("user_id","item_id","source","episode_id","status","episode_progress","updated_at") VALUES(8,63,'mcu',11,'unwatched',NULL,'2026-08-18 23:47:44');
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('users',8);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('items',117);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('other_universes',48);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('watchlist',633);
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('episodes',218);
