// The public reader remains SELECT-only. MariaDB may deny EXPLAIN for a
// SQL SECURITY DEFINER view even while the actual bounded SELECT succeeds.
// That exact denial requires a separate protected administrator plan check,
// never additional reader grants or base-table access.
export async function inspectQueryPlan(source, limit) {
  let plan;
  try { plan = await source.explain(limit); }
  catch (error) {
    if (error?.errno === 1345) {
      return { queryPlanVerified: false, explainRequiresAdministrator: true, plan: null };
    }
    throw new Error('Read-only query plan validation failed');
  }
  if (!Array.isArray(plan) || plan.length === 0 || plan.length > 256) {
    throw new Error('Read-only query plan validation failed');
  }
  const types = new Set(['system', 'const', 'eq_ref', 'ref', 'fulltext', 'ref_or_null',
    'index_merge', 'unique_subquery', 'index_subquery', 'range', 'index', 'ALL']);
  return { queryPlanVerified: true, explainRequiresAdministrator: false,
    plan: plan.map((row) => ({ accessType: types.has(row.type) ? row.type : null,
      estimatedRows: Number.isSafeInteger(Number(row.rows)) && Number(row.rows) >= 0 ? Number(row.rows) : null,
      usesIndex: row.key != null,
      filesort: String(row.Extra ?? '').includes('filesort'),
      temporary: String(row.Extra ?? '').includes('temporary') })) };
}
