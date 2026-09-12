-- REVIEWED SOURCE ONLY. Never apply without host/schema/index/backup inspection.
-- Provision accounts separately with generated secrets via protected local input.
-- Execute against the verified game schema using an authorized administrator.
-- Requires trixter_public_definer@localhost with ONLY the column SELECT grants
-- listed in README.md. The runtime reader receives SELECT on this view ONLY.
-- No CREATE OR REPLACE: existing names fail closed for deliberate review.
CREATE ALGORITHM=UNDEFINED
  DEFINER='trixter_public_definer'@'localhost'
  SQL SECURITY DEFINER
VIEW trixter_public_characters_v1 AS
SELECT
  c.id AS internalId,
  c.world AS world,
  c.name AS name,
  c.level AS level,
  c.exp AS exp,
  c.job AS jobId,
  c.fame AS fame,
  g.name AS guildName,
  CASE WHEN c.job IN (100, 120, 121, 122) AND EXISTS (
    SELECT 1 FROM queststatus AS q
    WHERE q.characterid = c.id
      AND q.quest = 999132900
      AND q.status = 0
      AND BINARY q.customData = BINARY 'TRIXTER_DA_WARRIOR_CARRIER_V1'
  ) THEN 1 ELSE 0 END AS isDemonAvenger
FROM characters AS c
LEFT JOIN guilds AS g ON g.guildid = c.guildid;
