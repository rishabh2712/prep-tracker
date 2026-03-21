import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content: string;
  className?: string;
  tone?: "dark" | "light";
};

export function MarkdownRenderer({ content, className, tone = "dark" }: MarkdownRendererProps) {
  return (
    <div className={["markdown-body", tone === "light" ? "markdown-body-light" : "", className ?? ""].join(" ").trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content || "_No notes yet._"}</ReactMarkdown>
    </div>
  );
}
