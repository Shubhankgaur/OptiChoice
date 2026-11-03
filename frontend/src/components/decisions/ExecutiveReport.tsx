import { useState } from "react";
import { Sparkles, Printer, Copy, Check, AlertCircle, FileText, Download, Award, ShieldCheck, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DecisionExplanation } from "@/services/decisionService";
import { toast } from "sonner";

interface RankingItem {
  rank: number;
  alternativeName: string;
  score: number;
}

interface CriterionItem {
  id: string;
  name: string;
  type: "benefit" | "cost";
  weight: number;
  unit?: string | undefined;
}

interface Props {
  decisionTitle: string;
  decisionDescription?: string | undefined;
  explanation: DecisionExplanation;
  winnerName?: string | undefined;
  winnerScore?: number | undefined;
  ranking?: RankingItem[] | undefined;
  criteria?: CriterionItem[] | undefined;
}

export function ExecutiveReport({
  decisionTitle,
  decisionDescription,
  explanation,
  winnerName,
  winnerScore,
  ranking,
  criteria,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);

  const formattedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const getFullMarkdown = () => {
    return [
      `# OPTICHOICE EXECUTIVE DECISION REPORT`,
      `**Decision:** ${decisionTitle}`,
      decisionDescription ? `**Context:** ${decisionDescription}` : "",
      `**Date:** ${formattedDate}`,
      `**Evaluation Model:** Deterministic Multi-Criteria Weighted Sum`,
      "",
      `---`,
      "",
      `## 1. Executive Summary`,
      explanation.summary,
      "",
      winnerName ? `### Leading Recommendation: **${winnerName}** (Composite Score: ${winnerScore}/100)` : "",
      "",
      `## 2. Final Standings & Rankings`,
      ranking?.length
        ? `| Rank | Option | Score (0–100) | Relative Gap |` +
          `\n| :--- | :--- | :--- | :--- |` +
          `\n` +
          ranking
            .map(
              (r) =>
                `| #${r.rank} | **${r.alternativeName}** | ${r.score}% | ${
                  r.rank === 1 ? "Leader" : `-${Math.round(((winnerScore ?? 0) - r.score) * 100) / 100}%`
                } |`
            )
            .join("\n")
        : "",
      "",
      `## 3. Evaluation Criteria & Priority Weights`,
      criteria?.length
        ? `| Priority / Criterion | Direction | Weight | Unit |` +
          `\n| :--- | :--- | :--- | :--- |` +
          `\n` +
          criteria
            .map((c) => `| ${c.name} | ${c.type === "benefit" ? "Higher is better" : "Lower is better"} | ${c.weight}% | ${c.unit || "—"} |`)
            .join("\n")
        : "",
      "",
      `## 4. Key Winning Drivers & Rationale`,
      explanation.winnerRationale,
      "",
      explanation.tradeOffs.length
        ? `## 5. Strategic Trade-Offs & Margins\n${explanation.tradeOffs.map((t) => `- ${t}`).join("\n")}`
        : "",
      "",
      explanation.caveats?.length
        ? `## 6. Assumptions & Sensitivity Notes\n${explanation.caveats.map((c) => `- ${c}`).join("\n")}`
        : "",
      "",
      `---`,
      `*Report synthesized objectively via OptiChoice Decision Intelligence Engine.*`,
    ]
      .filter(Boolean)
      .join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getFullMarkdown());
      setCopied(true);
      toast.success("Complete executive report copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy report.");
    }
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([getFullMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `OptiChoice-Report-${decisionTitle.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded as Markdown!");
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const rankingRows = (ranking ?? [])
      .map((r) => {
        const margin = winnerScore ? Math.round((winnerScore - r.score) * 100) / 100 : 0;
        return `
          <tr style="${r.rank === 1 ? 'background: #f8fafc; font-weight: 600;' : ''}">
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">#${r.rank}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${r.alternativeName}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right;">${r.score}%</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #64748b;">${r.rank === 1 ? 'Leader' : `-${margin}%`}</td>
          </tr>
        `;
      })
      .join("");

    const criteriaRows = (criteria ?? [])
      .map(
        (c) => `
          <tr>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${c.name}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #475569;">${c.type === 'benefit' ? 'Maximize (Higher is better)' : 'Minimize (Lower is better)'}</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 600;">${c.weight}%</td>
            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${c.unit || '—'}</td>
          </tr>
        `
      )
      .join("");

    const tradeOffItems = explanation.tradeOffs
      .map((t) => `<li style="margin-bottom: 6px; color: #334155;">${t}</li>`)
      .join("");

    const caveatItems = (explanation.caveats ?? [])
      .map((c) => `<li style="margin-bottom: 4px; color: #475569;">• ${c}</li>`)
      .join("");

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${decisionTitle} - Executive Decision Report</title>
          <style>
            @page {
              size: letter portrait;
              margin: 16mm 16mm 16mm 16mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              line-height: 1.5;
              margin: 0;
              padding: 0;
              font-size: 12px;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 12px;
              margin-bottom: 16px;
            }
            .brand {
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.12em;
              text-transform: uppercase;
              color: #64748b;
            }
            .date {
              font-size: 11px;
              color: #64748b;
              float: right;
            }
            h1 {
              font-size: 20px;
              font-weight: 800;
              margin: 8px 0 3px 0;
              color: #0f172a;
              line-height: 1.25;
            }
            .context {
              font-size: 11px;
              color: #475569;
              font-style: italic;
              margin-top: 3px;
            }
            .meta-bar {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              padding: 8px 12px;
              border-radius: 6px;
              margin: 14px 0;
              font-size: 11px;
            }
            .meta-bar span { color: #64748b; display: block; margin-bottom: 1px; }
            .meta-bar strong { font-weight: 600; color: #0f172a; }
            .callout {
              background: #f8fafc;
              border-left: 4px solid #0f172a;
              padding: 12px 14px;
              border-radius: 6px;
              margin: 14px 0;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .callout-title {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #475569;
            }
            .winner-title {
              font-size: 17px;
              font-weight: 700;
              color: #0f172a;
              margin: 3px 0;
            }
            .section {
              margin: 18px 0;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .section-title {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #475569;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 4px;
              margin-bottom: 6px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 6px;
              font-size: 11px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            th {
              background: #f8fafc;
              text-align: left;
              padding: 6px 10px;
              font-weight: 600;
              color: #334155;
              border-bottom: 1px solid #cbd5e1;
            }
            ul {
              margin: 6px 0 0 16px;
              padding: 0;
            }
            .footer {
              margin-top: 24px;
              padding-top: 10px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              font-size: 9px;
              color: #94a3b8;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <span class="brand">OptiChoice Decision Support System</span>
            <span class="date">${formattedDate}</span>
            <h1>${decisionTitle}</h1>
            ${decisionDescription ? `<div class="context">Context: ${decisionDescription}</div>` : ''}
          </div>

          <div class="meta-bar">
            <div><span>Evaluation Model:</span><strong>Min–Max Normalization</strong></div>
            <div><span>Options Compared:</span><strong>${ranking?.length ?? 3} Alternatives</strong></div>
            <div><span>Status:</span><strong style="color: #059669;">Mathematically Evaluated</strong></div>
          </div>

          ${
            winnerName
              ? `
            <div class="callout">
              <div class="callout-title">Final Recommendation</div>
              <div class="winner-title">${winnerName} <span style="font-size: 13px; font-weight: normal; color: #64748b;">(Composite Score: ${winnerScore}/100)</span></div>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #334155;">${explanation.summary}</p>
            </div>
          `
              : ''
          }

          ${
            ranking && ranking.length > 0
              ? `
            <div class="section">
              <div class="section-title">1. Standings & Performance Leaderboard</div>
              <table>
                <thead>
                  <tr>
                    <th style="width: 45px;">Rank</th>
                    <th>Alternative Option</th>
                    <th style="text-align: right;">Composite Score</th>
                    <th style="text-align: right;">Margin to Leader</th>
                  </tr>
                </thead>
                <tbody>
                  ${rankingRows}
                </tbody>
              </table>
            </div>
          `
              : ''
          }

          ${
            criteria && criteria.length > 0
              ? `
            <div class="section">
              <div class="section-title">2. Decision Priorities & Weight Distribution</div>
              <table>
                <thead>
                  <tr>
                    <th>Criterion</th>
                    <th>Goal Direction</th>
                    <th style="text-align: center;">Assigned Weight</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  ${criteriaRows}
                </tbody>
              </table>
            </div>
          `
              : ''
          }

          <div class="section">
            <div class="section-title">3. Winning Rationale & Priority Alignment</div>
            <p style="font-size: 11px; color: #334155; margin: 3px 0; line-height: 1.5;">${explanation.winnerRationale}</p>
          </div>

          ${
            explanation.tradeOffs.length > 0
              ? `
            <div class="section">
              <div class="section-title">4. Strategic Trade-Offs & Margins</div>
              <ul>
                ${tradeOffItems}
              </ul>
            </div>
          `
              : ''
          }

          ${
            explanation.caveats && explanation.caveats.length > 0
              ? `
            <div class="section" style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 6px;">
              <div class="section-title" style="border: none; margin-bottom: 3px; padding: 0;">5. Decision Assumptions & Sensitivity Notes</div>
              <ul style="list-style: none; margin: 0; padding: 0; font-size: 10px;">
                ${caveatItems}
              </ul>
            </div>
          `
              : ''
          }

          <div class="footer">
            OptiChoice Decision Intelligence • Deterministic Scoring Engine • AI Explanations do not alter mathematical rankings.
          </div>

          <script>
            window.onload = function() {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. ON-SCREEN INTERACTIVE WIDGET                                 */}
      {/* ============================================================== */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-sm no-print">
        {/* Header Bar */}
        <div className="flex flex-col gap-3 border-b bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground tracking-tight">AI Executive Decision Report</h3>
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Formal Document
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Comprehensive synthesis ready for presentation and archival</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDocumentModal(true)}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              View Formal Document
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMarkdown}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <Download className="h-3.5 w-3.5" />
              Download .md
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-8 gap-1.5 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </div>
        </div>

        {/* Quick Highlights Content */}
        <div className="space-y-4 p-5 sm:p-6 text-sm">
          {/* Executive Summary */}
          <div>
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Executive Summary
            </h4>
            <p className="mt-2 text-base font-medium leading-relaxed text-foreground">
              {explanation.summary}
            </p>
          </div>

          {/* Winner Callout */}
          <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Award className="h-4 w-4" /> Leading Recommendation: {winnerName}
            </h4>
            <p className="mt-1.5 leading-relaxed text-foreground/90">
              {explanation.winnerRationale}
            </p>
          </div>

          {/* Trade-offs */}
          {explanation.tradeOffs.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key Strategic Trade-Offs
              </h4>
              <ul className="mt-2 space-y-1.5">
                {explanation.tradeOffs.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-muted-foreground text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. ON-SCREEN MODAL PREVIEW (WHEN USER CLICKS "VIEW FORMAL DOC") */}
      {/* ============================================================== */}
      {showDocumentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm no-print">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-8 text-slate-900 shadow-2xl">
            {/* Modal Controls */}
            <div className="sticky top-0 -mt-4 -mr-4 mb-4 flex items-center justify-between border-b bg-white/95 pb-3 pt-2 backdrop-blur">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Formal Document Preview
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5 text-xs">
                  <Printer className="h-3.5 w-3.5" /> Print / Save as PDF
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowDocumentModal(false)} className="text-xs">
                  ✕ Close
                </Button>
              </div>
            </div>

            {/* Document Render Inside Modal */}
            <ReportDocumentContent
              decisionTitle={decisionTitle}
              decisionDescription={decisionDescription}
              formattedDate={formattedDate}
              explanation={explanation}
              winnerName={winnerName}
              winnerScore={winnerScore}
              ranking={ranking}
              criteria={criteria}
            />
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. DEDICATED PRINT CONTAINER (ACTIVE ONLY DURING WINDOW.PRINT) */}
      {/* ============================================================== */}
      <div id="printable-executive-report" className="hidden print:block">
        <ReportDocumentContent
          decisionTitle={decisionTitle}
          decisionDescription={decisionDescription}
          formattedDate={formattedDate}
          explanation={explanation}
          winnerName={winnerName}
          winnerScore={winnerScore}
          ranking={ranking}
          criteria={criteria}
        />
      </div>
    </>
  );
}

/**
 * Pure Document Layout — Styled like an executive briefing memo.
 */
function ReportDocumentContent({
  decisionTitle,
  decisionDescription,
  formattedDate,
  explanation,
  winnerName,
  winnerScore,
  ranking,
  criteria,
}: {
  decisionTitle: string;
  decisionDescription?: string | undefined;
  formattedDate: string;
  explanation: DecisionExplanation;
  winnerName?: string | undefined;
  winnerScore?: number | undefined;
  ranking?: RankingItem[] | undefined;
  criteria?: CriterionItem[] | undefined;
}) {
  return (
    <div className="mx-auto max-w-3xl font-sans text-slate-900 leading-normal">
      {/* Header */}
      <div className="border-b-2 border-slate-900 pb-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
            OptiChoice Decision Support System
          </span>
          <span className="text-xs font-semibold text-slate-500">
            {formattedDate}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {decisionTitle}
        </h1>
        {decisionDescription && (
          <p className="mt-1.5 text-sm text-slate-600 italic">
            Context: {decisionDescription}
          </p>
        )}
      </div>

      {/* Metadata Bar */}
      <div className="my-4 grid grid-cols-3 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
        <div>
          <span className="text-slate-500">Evaluation Method:</span>
          <p className="font-semibold text-slate-800">Min–Max Normalization</p>
        </div>
        <div>
          <span className="text-slate-500">Options Compared:</span>
          <p className="font-semibold text-slate-800">{ranking?.length ?? 3} Alternatives</p>
        </div>
        <div>
          <span className="text-slate-500">Evaluation Status:</span>
          <p className="font-semibold text-emerald-700 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Mathematically Final
          </p>
        </div>
      </div>

      {/* Executive Callout */}
      {winnerName && (
        <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }} className="my-5 rounded-xl border-l-4 border-slate-900 bg-slate-100 p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            Final Recommendation
          </span>
          <div className="mt-1 flex items-baseline gap-3">
            <p className="text-xl font-bold text-slate-900">{winnerName}</p>
            <span className="text-sm font-semibold text-slate-600">
              Composite Score: {winnerScore} / 100
            </span>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-700">
            {explanation.summary}
          </p>
        </div>
      )}

      {/* Standings Table */}
      {ranking && ranking.length > 0 && (
        <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }} className="my-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            1. Standings & Performance Leaderboard
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3 font-semibold w-16">Rank</th>
                <th className="py-2 px-3 font-semibold">Alternative Option</th>
                <th className="py-2 px-3 font-semibold text-right">Composite Score</th>
                <th className="py-2 px-3 font-semibold text-right">Margin to Leader</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r) => {
                const margin = winnerScore ? Math.round((winnerScore - r.score) * 100) / 100 : 0;
                return (
                  <tr key={r.rank} className={`border-b border-slate-100 ${r.rank === 1 ? "bg-slate-50/80 font-semibold" : ""}`}>
                    <td className="py-2 px-3 text-slate-600">#{r.rank}</td>
                    <td className="py-2 px-3 text-slate-900">{r.alternativeName}</td>
                    <td className="py-2 px-3 text-right tabular text-slate-900">{r.score}%</td>
                    <td className="py-2 px-3 text-right tabular text-slate-500">
                      {r.rank === 1 ? "Leader" : `-${margin}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Priorities & Weights Table */}
      {criteria && criteria.length > 0 && (
        <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }} className="my-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            2. Decision Priorities & Weight Distribution
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                <th className="py-2 px-3 font-semibold">Criterion</th>
                <th className="py-2 px-3 font-semibold">Goal Direction</th>
                <th className="py-2 px-3 font-semibold text-center">Assigned Weight</th>
                <th className="py-2 px-3 font-semibold">Unit</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="py-2 px-3 font-medium text-slate-900">{c.name}</td>
                  <td className="py-2 px-3 text-slate-600">
                    {c.type === "benefit" ? "Maximize (Higher is better)" : "Minimize (Lower is better)"}
                  </td>
                  <td className="py-2 px-3 text-center font-semibold text-slate-900">{c.weight}%</td>
                  <td className="py-2 px-3 text-slate-500">{c.unit || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Narrative Synthesis */}
      <div className="my-6 space-y-4">
        <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            3. Winning Rationale & Priority Alignment
          </h2>
          <p className="text-xs leading-relaxed text-slate-700">
            {explanation.winnerRationale}
          </p>
        </div>

        {explanation.tradeOffs.length > 0 && (
          <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              4. Strategic Trade-Offs
            </h2>
            <ul className="space-y-1 text-xs text-slate-700">
              {explanation.tradeOffs.map((t, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="font-bold text-slate-400">•</span>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {explanation.caveats && explanation.caveats.length > 0 && (
          <div style={{ breakInside: "avoid", pageBreakInside: "avoid" }} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              5. Decision Assumptions & Sensitivity Notes
            </h2>
            <ul className="space-y-1 text-[11px] text-slate-600">
              {explanation.caveats.map((c, idx) => (
                <li key={idx}>• {c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-400">
        OptiChoice Decision Intelligence • Deterministic Scoring Engine • AI Explanations do not alter mathematical rankings.
      </div>
    </div>
  );
}
