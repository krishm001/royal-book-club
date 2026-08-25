import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

/**
 * Custom Playwright Reporter: Royal Book Club Checkout Matrix Compliance Report
 *
 * Generates a self-contained HTML report with:
 * - Overall pass/fail summary
 * - Spec compliance table (steps minimized, smooth UX, popup resumes)
 * - Detailed step-by-step journey logs per combination
 * - Dimension coverage matrix
 * - Failure details with error/stack trace
 *
 * Reports are saved to: frontend/test-reports/
 */

interface TestResultData {
  title: string;
  comboId: string;
  platform: string;
  userState: string;
  entryPoint: string;
  gatingConfig: string;
  status: string;
  duration: number;
  error?: { message: string; stack?: string };
  journeySteps: string;
  expectedSteps: string[];
  specCompliance: { stepsMinimized: boolean; smoothUx: boolean; popupResumesCorrectly: boolean };
}

export default class CheckoutMatrixReporter implements Reporter {
  private config: FullConfig | undefined;
  private results: TestResultData[] = [];

  onBegin(config: FullConfig, suite: Suite) {
    this.config = config;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    // Helper to extract annotation value by type
    const getAnnotation = (type: string): string =>
      test.annotations.find(a => a.type === type)?.description || '';

    const comboId = getAnnotation('combo_id') || 'Unknown';
    const platform = getAnnotation('platform');
    const userState = getAnnotation('user_state');
    const entryPoint = getAnnotation('entry_point');
    const gatingConfig = getAnnotation('gating_config');
    const journeySteps = getAnnotation('journey_steps');
    const expectedStepsRaw = getAnnotation('expected_steps');
    const specComplianceRaw = getAnnotation('spec_compliance');

    let expectedSteps: string[] = [];
    try { expectedSteps = JSON.parse(expectedStepsRaw); } catch { /* ignore */ }

    let specCompliance = { stepsMinimized: true, smoothUx: true, popupResumesCorrectly: false };
    try { specCompliance = JSON.parse(specComplianceRaw); } catch { /* ignore */ }

    this.results.push({
      title: test.title,
      comboId,
      platform,
      userState,
      entryPoint,
      gatingConfig,
      status: result.status,
      duration: result.duration,
      error: result.error ? { message: result.error.message || 'Unknown', stack: result.error.stack } : undefined,
      journeySteps,
      expectedSteps,
      specCompliance,
    });
  }

  onEnd(result: FullResult) {
    // Use process.cwd() which is the frontend/ dir, not config.rootDir (which is e2e/)
    const reportDir = path.join(process.cwd(), 'test-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    const htmlFile = path.join(reportDir, `checkout-matrix-report-${date}.html`);
    const htmlLatestFile = path.join(reportDir, `checkout-matrix-report.html`);
    const jsonFile = path.join(reportDir, `checkout-matrix-report.json`);

    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed' || r.status === 'timedOut').length;
    const skipped = this.results.filter(r => r.status === 'skipped').length;
    const total = this.results.length;

    // Compute dimension coverage
    const platforms = new Set(this.results.map(r => r.platform).filter(Boolean));
    const userStates = new Set(this.results.map(r => r.userState).filter(Boolean));
    const entryPoints = new Set(this.results.map(r => r.entryPoint).filter(Boolean));
    const gatingConfigs = new Set(this.results.map(r => r.gatingConfig).filter(Boolean));

    // Write JSON summary
    fs.writeFileSync(jsonFile, JSON.stringify({
      generatedAt: new Date().toISOString(),
      summary: { total, passed, failed, skipped },
      coverage: {
        platforms: Array.from(platforms),
        userStates: Array.from(userStates),
        entryPoints: Array.from(entryPoints),
        gatingConfigs: Array.from(gatingConfigs),
      },
      results: this.results,
    }, null, 2));

    // Build compliance table rows
    const complianceRows = this.results.map(r => {
      const stepCount = r.journeySteps ? r.journeySteps.split('\n').filter(s => s.trim()).length : 0;
      const statusClass = r.status === 'passed' ? 'pass' : (r.status === 'skipped' ? 'skip' : 'fail');
      return `<tr>
        <td title="${r.title}">${r.comboId !== 'Unknown' ? r.comboId : r.title.substring(0, 60)}</td>
        <td>${r.platform || '-'}</td>
        <td>${r.userState || '-'}</td>
        <td>${r.entryPoint || '-'}</td>
        <td>${r.gatingConfig || '-'}</td>
        <td>${stepCount}</td>
        <td>${r.specCompliance.stepsMinimized ? '✅' : '❌'}</td>
        <td>${r.specCompliance.smoothUx ? '✅' : '❌'}</td>
        <td>${r.specCompliance.popupResumesCorrectly ? '✅' : '—'}</td>
        <td>${(r.duration / 1000).toFixed(1)}s</td>
        <td class="${statusClass}">${r.status.toUpperCase()}</td>
      </tr>`;
    }).join('\n');

    // Build journey detail sections
    const journeyDetails = this.results.map(r => {
      const steps = r.journeySteps ? r.journeySteps.split('\n').filter(s => s.trim()) : [];
      const stepsHtml = steps.length > 0
        ? steps.map((s, i) => `Step ${i + 1}: ${escapeHtml(s)}`).join('\n')
        : 'No journey logs recorded.';
      const durationStr = (r.duration / 1000).toFixed(1);
      const statusEmoji = r.status === 'passed' ? '✅' : (r.status === 'skipped' ? '⏭️' : '❌');
      const errorHtml = r.error
        ? `<div class="error-block"><strong>Error:</strong> ${escapeHtml(r.error.message)}${r.error.stack ? `\n\n<strong>Stack:</strong>\n${escapeHtml(r.error.stack)}` : ''}</div>`
        : '';
      return `<div class="journey-entry">
        <h3>${statusEmoji} ${escapeHtml(r.title)}</h3>
        <p class="meta">ID: ${r.comboId} | Duration: ${durationStr}s | Status: <span class="${r.status === 'passed' ? 'pass' : 'fail'}">${r.status.toUpperCase()}</span></p>
        <div class="code-block">${stepsHtml}</div>
        ${errorHtml}
      </div>`;
    }).join('\n');

    // Build failure section (only if failures exist)
    const failures = this.results.filter(r => r.status === 'failed' || r.status === 'timedOut');
    const failuresHtml = failures.length > 0
      ? `<h2>🚨 Failures (${failures.length})</h2>
        ${failures.map(r => `<div class="failure-entry">
          <h3>❌ ${escapeHtml(r.title)}</h3>
          <p><strong>Combo ID:</strong> ${r.comboId}</p>
          <div class="error-block">${escapeHtml(r.error?.message || 'Unknown error')}${r.error?.stack ? `\n\n${escapeHtml(r.error.stack)}` : ''}</div>
          <p><em>Screenshot: test-reports/screenshots/${r.comboId}-failure.png (if captured)</em></p>
        </div>`).join('\n')}`
      : '<h2>🎉 No Failures!</h2><p>All tested combinations passed spec compliance.</p>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Royal Book Club — Checkout Flow Matrix Report — ${date}</title>
<style>
  * { box-sizing: border-box; }
  body { background: #0d1117; color: #e6d9c0; font-family: Georgia, 'Playfair Display', serif; margin: 0; padding: 24px; line-height: 1.6; }
  h1 { color: #d4af37; font-size: 2rem; border-bottom: 2px solid #d4af37; padding-bottom: 12px; }
  h2 { color: #d4af37; font-size: 1.5rem; margin-top: 40px; }
  h3 { color: #c9a537; font-size: 1.1rem; margin-bottom: 4px; }
  .summary-bar { display: flex; gap: 24px; flex-wrap: wrap; margin: 16px 0 32px 0; }
  .summary-item { padding: 12px 20px; border-radius: 8px; border: 1px solid #333; background: #161b22; }
  .pass { color: #2ea043; font-weight: bold; }
  .fail { color: #da3633; font-weight: bold; }
  .warn { color: #d29922; font-weight: bold; }
  .skip { color: #8b949e; font-weight: bold; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0 32px; font-size: 0.9rem; }
  th, td { border: 1px solid #30363d; padding: 8px 10px; text-align: left; }
  th { background: #1a1a2e; color: #d4af37; position: sticky; top: 0; }
  tr:nth-child(even) { background: #0d1117; }
  tr:nth-child(odd) { background: #161b22; }
  .code-block { background: #1a1a2e; padding: 14px; border: 1px solid #30363d; white-space: pre-wrap; font-family: 'SF Mono', Monaco, Consolas, monospace; color: #c9d1d9; border-radius: 6px; margin: 8px 0 16px; font-size: 0.85rem; line-height: 1.7; }
  .error-block { background: #2d1111; border: 1px solid #da3633; padding: 14px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; color: #f85149; margin: 8px 0 16px; font-size: 0.85rem; }
  .journey-entry { margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid #21262d; }
  .failure-entry { margin-bottom: 24px; padding: 16px; border: 1px solid #da3633; border-radius: 8px; background: #1a0505; }
  .meta { color: #8b949e; font-size: 0.85rem; margin: 4px 0 12px; }
  .coverage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; margin: 16px 0; }
  .coverage-item { padding: 12px; border-radius: 8px; border: 1px solid #30363d; background: #161b22; }
</style>
</head>
<body>
  <h1>👑 Royal Book Club — Checkout Flow Matrix Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Date:</strong> ${date}</p>

  <div class="summary-bar">
    <div class="summary-item"><strong>Total:</strong> ${total}</div>
    <div class="summary-item pass">✅ Passed: ${passed}</div>
    <div class="summary-item ${failed > 0 ? 'fail' : ''}">❌ Failed: ${failed}</div>
    <div class="summary-item skip">⏭️ Skipped: ${skipped}</div>
    <div class="summary-item"><strong>Pass Rate:</strong> ${total > 0 ? ((passed / total) * 100).toFixed(1) : 0}%</div>
  </div>

  <h2>📊 Dimension Coverage</h2>
  <div class="coverage-grid">
    <div class="coverage-item"><strong>Platforms:</strong> ${platforms.size}/3 ${platforms.size >= 3 ? '✅' : '⚠️'}<br>${Array.from(platforms).join(', ') || 'None'}</div>
    <div class="coverage-item"><strong>User States:</strong> ${userStates.size}/6 ${userStates.size >= 6 ? '✅' : '⚠️'}<br>${Array.from(userStates).join(', ') || 'None'}</div>
    <div class="coverage-item"><strong>Entry Points:</strong> ${entryPoints.size}/5 ${entryPoints.size >= 5 ? '✅' : '⚠️'}<br>${Array.from(entryPoints).join(', ') || 'None'}</div>
    <div class="coverage-item"><strong>Gating Configs:</strong> ${gatingConfigs.size}/4 ${gatingConfigs.size >= 4 ? '✅' : '⚠️'}<br>${Array.from(gatingConfigs).join(', ') || 'None'}</div>
  </div>

  <h2>📋 Spec Compliance Summary</h2>
  <div style="overflow-x: auto;">
  <table>
    <tr>
      <th>Combo ID</th>
      <th>Platform</th>
      <th>User State</th>
      <th>Entry Point</th>
      <th>Gating</th>
      <th>Steps</th>
      <th>Minimized?</th>
      <th>Smooth UX?</th>
      <th>Popup→Resume?</th>
      <th>Duration</th>
      <th>Result</th>
    </tr>
    ${complianceRows}
  </table>
  </div>

  ${failuresHtml}

  <h2>📖 Detailed Step-by-Step Journey Logs</h2>
  ${journeyDetails}

  <footer style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #30363d; color: #8b949e; text-align: center; font-size: 0.8rem;">
    <p>Royal Book Club — Automated Checkout Matrix E2E Report</p>
    <p>Test data isolation: isTest=true | ISBN prefix: E2E_TEST_ | NFC prefix: e2e000 | QR range: 999000001+</p>
  </footer>
</body>
</html>`;

    // Write both dated and latest reports
    fs.writeFileSync(htmlFile, html);
    fs.writeFileSync(htmlLatestFile, html);

    console.log(`\n📊 Checkout Matrix Report written to:`);
    console.log(`   HTML (dated): ${htmlFile}`);
    console.log(`   HTML (latest): ${htmlLatestFile}`);
    console.log(`   JSON: ${jsonFile}`);
    console.log(`   Summary: ${passed} passed, ${failed} failed, ${skipped} skipped (${total} total)\n`);
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
