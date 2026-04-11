"use client";

import { isValidElement, useMemo, useState, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content: string;
  className?: string;
  tone?: "dark" | "light";
};

type DisclosureSections = {
  leading: string;
  rubric: string | null;
  reference: string | null;
};

const SUPPORTED_HIGHLIGHT_LANGUAGES = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "javascript",
  "typescript",
  "json",
  "bash",
  "sh",
]);

const TOKEN_REGEX =
  /(\/\/.*$|\/\*[\s\S]*?\*\/|"(?:\\.|[^"])*"|'(?:\\.|[^'])*'|`(?:\\.|[^`])*`|\b(?:const|let|var|if|else|for|while|return|class|new|async|await|try|catch|finally|throw|function|constructor|this|extends|super|import|from|export|default|switch|case|break|continue|Promise|setTimeout|queueMicrotask|typeof|null|true|false)\b|\b\d+(?:\.\d+)?\b)/gm;

function detectLanguage(className?: string): string | null {
  const match = /language-([\w-]+)/.exec(className ?? "");
  return match?.[1] ?? null;
}

function splitDisclosureSections(content: string): DisclosureSections {
  const normalized = content.trim();
  if (!normalized) {
    return { leading: "", rubric: null, reference: null };
  }

  const rubricMatch = /^##\s+(?:Reveal Rubric|Hidden Rubric)\s*$/m.exec(normalized);
  if (!rubricMatch || rubricMatch.index === undefined) {
    return { leading: normalized, rubric: null, reference: null };
  }

  const leading = normalized.slice(0, rubricMatch.index).trim();
  const rubricBody = normalized.slice(rubricMatch.index + rubricMatch[0].length).trim();
  const referenceMatch = /^###\s+Reference Implementation\s*$/m.exec(rubricBody);

  if (!referenceMatch || referenceMatch.index === undefined) {
    return { leading, rubric: rubricBody, reference: null };
  }

  return {
    leading,
    rubric: rubricBody.slice(0, referenceMatch.index).trim(),
    reference: rubricBody.slice(referenceMatch.index + referenceMatch[0].length).trim(),
  };
}

function tokenClass(token: string): string {
  if (/^(\/\/|\/\*)/.test(token)) return "token-comment";
  if (/^["'`]/.test(token)) return "token-string";
  if (/^\d/.test(token)) return "token-number";
  return "token-keyword";
}

function highlightCode(code: string, language: string | null): ReactNode {
  if (!language || !SUPPORTED_HIGHLIGHT_LANGUAGES.has(language.toLowerCase())) {
    return code;
  }

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_REGEX.lastIndex = 0;
  while ((match = TOKEN_REGEX.exec(code)) !== null) {
    if (match.index > lastIndex) {
      parts.push(code.slice(lastIndex, match.index));
    }
    parts.push(
      <span key={`${match.index}-${match[0]}`} className={tokenClass(match[0])}>
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    parts.push(code.slice(lastIndex));
  }

  return parts;
}

function CodeBlock({ code, language }: { code: string; language: string | null }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="markdown-code-block">
      <div className="markdown-code-toolbar">
        <span className="markdown-code-language">{language?.toUpperCase() ?? "CODE"}</span>
        <button type="button" onClick={() => void handleCopy()} className="markdown-copy-button">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre>
        <code>{highlightCode(code, language)}</code>
      </pre>
    </div>
  );
}

function MarkdownChunk({ content }: { content: string }) {
  const components = useMemo<Components>(
    () => ({
      pre({ children }) {
        const firstChild = Array.isArray(children) ? children[0] : children;
        if (isValidElement(firstChild)) {
          const props = firstChild.props as { className?: string; children?: ReactNode };
          const language = detectLanguage(props.className);
          const code = String(props.children ?? "").replace(/\n$/, "");
          return <CodeBlock code={code} language={language} />;
        }
        return <pre>{children}</pre>;
      },
      code({ className, children }) {
        if (detectLanguage(className)) {
          return <code>{children}</code>;
        }
        return <code className={className}>{children}</code>;
      },
    }),
    []
  );

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content || "_No notes yet._"}
    </ReactMarkdown>
  );
}

export function MarkdownRenderer({ content, className, tone = "dark" }: MarkdownRendererProps) {
  const sections = useMemo(() => splitDisclosureSections(content), [content]);

  return (
    <div className={["markdown-body", tone === "light" ? "markdown-body-light" : "", className ?? ""].join(" ").trim()}>
      {sections.leading ? <MarkdownChunk content={sections.leading} /> : !sections.rubric ? <MarkdownChunk content="" /> : null}

      {sections.rubric ? (
        <details className="markdown-disclosure">
          <summary>Reveal Rubric</summary>
          <div className="markdown-disclosure-body">
            <MarkdownChunk content={sections.rubric} />

            {sections.reference ? (
              <details className="markdown-disclosure markdown-disclosure-nested">
                <summary>Reference Implementation</summary>
                <div className="markdown-disclosure-body">
                  <MarkdownChunk content={sections.reference} />
                </div>
              </details>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  );
}
