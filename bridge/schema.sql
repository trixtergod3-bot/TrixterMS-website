-- REVIEWED SOURCE ONLY. Never apply without host/schema/index/backup inspection.
-- Provision accounts separately with generated secrets via protected local input.
-- Execute against the verified game schema using an authorized administrator.
-- Requires trixter_public_definer@localhost with ONLY the column SELECT grants
-- listed in README.md. The runtime reader receives SELECT on this view ONLY.
-- No CREATE OR REPLACE: existing names fail closed for deliberate review.
CREATE ALGORITHM=UNDEFINED
  DEFINER='trixter_public_definer'@'localhost'
  SQL SECURITY DEFINER
VIEW trixter_public_rankings_v2 AS
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
  ) THEN 1 ELSE 0 END AS isDemonAvenger,
  CAST(GREATEST(c.meso, 0) AS CHAR) AS currentMesos,
  CAST(COALESCE(te.counter_value, 0) AS CHAR) AS expEarned,
  CAST(COALESCE(tm.counter_value, 0) AS CHAR) AS mesosEarned,
  CASE WHEN c.id = (
    SELECT c2.id FROM characters AS c2
    WHERE c2.accountid = c.accountid
    ORDER BY c2.level DESC, c2.exp DESC, c2.id ASC
    LIMIT 1
  ) THEN CAST(
    CAST(GREATEST(a.NxCredit, 0) AS UNSIGNED) +
    CAST(GREATEST(a.NxPrepaid, 0) AS UNSIGNED)
    AS CHAR
  ) ELSE NULL END AS currentNx,
  CAST(COALESCE(tn.counter_value, 0) AS CHAR) AS nxEarned,
  CAST(COALESCE(tnc.counter_value, 0) AS CHAR) AS nxCreditEarned,
  CAST(COALESCE(tnp.counter_value, 0) AS CHAR) AS nxPrepaidEarned
FROM characters AS c
LEFT JOIN accounts AS a ON a.id = c.accountid
LEFT JOIN guilds AS g ON g.guildid = c.guildid
LEFT JOIN trixter_telemetry_character_counters AS te
  ON te.character_id = c.id
  AND te.metric_key = 'progress.exp_earned'
  AND te.dimension_key = 'all'
LEFT JOIN trixter_telemetry_character_counters AS tm
  ON tm.character_id = c.id
  AND tm.metric_key = 'economy.mesos_earned'
  AND tm.dimension_key = 'all'
LEFT JOIN trixter_telemetry_character_counters AS tn
  ON tn.character_id = c.id
  AND tn.metric_key = 'economy.nx_earned'
  AND tn.dimension_key = 'all'
LEFT JOIN trixter_telemetry_character_counters AS tnc
  ON tnc.character_id = c.id
  AND tnc.metric_key = 'economy.nx_earned'
  AND tnc.dimension_key = 'nx_credit'
LEFT JOIN trixter_telemetry_character_counters AS tnp
  ON tnp.character_id = c.id
  AND tnp.metric_key = 'economy.nx_earned'
  AND tnp.dimension_key = 'nx_prepaid';
