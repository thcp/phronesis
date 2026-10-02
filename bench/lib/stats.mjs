// Least squares fit of cost = p0*cacheWrite + p1*cacheRead + p2*output.
// Uncached input is left out: Claude Code caches almost every input token, so uncached
// input is a near-constant handful of tokens whose price cannot be estimated from bills
// and whose cost is negligible. Returns the three prices plus relError, or null.
export function fitPrices(runs) {
  if (runs.length < 8) return null;
  const X = runs.map((r) => [r.cacheWriteTokens, r.cacheReadTokens, r.outputTokens]);
  const y = runs.map((r) => r.costUsd);
  const n = 3;
  const A = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => X.reduce((s, x) => s + x[i] * x[j], 0)));
  const b = Array.from({ length: n }, (_, i) => X.reduce((s, x, k) => s + x[i] * y[k], 0));
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    [b[c], b[p]] = [b[p], b[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const p = b.map((v, i) => v / A[i][i]);
  const fitted = X.map((x) => x.reduce((s, v, i) => s + v * p[i], 0));
  p.relError = fitted.reduce((s, f, k) => s + Math.abs(f - y[k]), 0) / y.reduce((s, v) => s + v, 0);
  return p;
}
