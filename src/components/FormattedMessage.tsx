import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

function cleanMathText(text: string): string {
  return text
    .replace(/\$\$([^$]+)\$\$/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\\times/g, '×')
    .replace(/\\div/g, '÷')
    .replace(/\\cdot/g, '·')
    .replace(/\\le/g, '≤')
    .replace(/\\ge/g, '≥')
    .replace(/\\neq/g, '≠');
}

function renderInline(text: string): React.ReactNode[] {
  const normalized = cleanMathText(text);
  const tokens = normalized.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\))/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith('**') && tok.endsWith('**') && tok.length > 4) {
      return (
        <strong key={i} className="font-semibold text-slate-900 dark:text-white">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) {
      return (
        <em key={i} className="italic text-slate-500 dark:text-slate-400">
          {tok.slice(1, -1)}
        </em>
      );
    }
    if (tok.startsWith('`') && tok.endsWith('`') && tok.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono text-[11px]"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = tok.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-cyan-400 underline hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return tok;
  });
}

export const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  const [copiedBlock, setCopiedBlock] = useState<number | null>(null);
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-xs leading-relaxed">
      {parts.map((part, idx) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const inner = part.slice(3, -3);
          const firstNewline = inner.indexOf('\n');
          const lang = firstNewline > -1 ? inner.slice(0, firstNewline).trim() : '';
          const code = firstNewline > -1 ? inner.slice(firstNewline + 1) : inner;

          return (
            <div
              key={idx}
              className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 text-slate-100 my-2"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400">
                <span className="uppercase tracking-wider font-mono">{lang || 'code'}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(code);
                    setCopiedBlock(idx);
                    setTimeout(() => setCopiedBlock(null), 1500);
                  }}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedBlock === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[11px] font-mono leading-relaxed">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const lines = part.split('\n');
        return (
          <div key={idx} className="space-y-1.5">
            {lines.map((line, lIdx) => {
              const trimmed = line.trim();
              if (!trimmed) return <div key={lIdx} className="h-1" />;
              if (trimmed === '---' || trimmed === '***') {
                return <hr key={lIdx} className="border-slate-200 dark:border-slate-800 my-2" />;
              }
              if (trimmed.startsWith('### ') || trimmed.startsWith('#### ')) {
                const headingText = trimmed.replace(/^#{3,4}\s+/, '');
                return (
                  <h4 key={lIdx} className="text-xs font-bold text-slate-900 dark:text-white pt-1">
                    {renderInline(headingText)}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
                const headingText = trimmed.replace(/^#{1,2}\s+/, '');
                return (
                  <h3 key={lIdx} className="text-sm font-bold text-slate-900 dark:text-white pt-1">
                    {renderInline(headingText)}
                  </h3>
                );
              }
              if (/^[-*•]\s+/.test(trimmed)) {
                return (
                  <div key={lIdx} className="flex items-start gap-2 pl-1">
                    <span className="text-indigo-500 dark:text-indigo-400 font-bold mt-0.5">•</span>
                    <span className="flex-1">{renderInline(trimmed.replace(/^[-*•]\s+/, ''))}</span>
                  </div>
                );
              }
              return <p key={lIdx}>{renderInline(trimmed)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
};
