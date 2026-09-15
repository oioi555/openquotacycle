// Tokenizer for the lightweight GitHub-release markdown renderer.

export type MarkdownToken =
  | { type: "text"; content: string }
  | { type: "link"; content: string; url: string }
  | { type: "bold"; content: string }
  | { type: "italic"; content: string }
  | { type: "pr"; content: string }
  | { type: "user"; content: string }
  | { type: "commit"; content: string };

const PATTERNS: Array<{ type: string; regex: RegExp }> = [
  // Markdown links: [label](url)
  { type: "link", regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g },
  // Plain URLs: https://...
  { type: "url", regex: /(https?:\/\/[^\s<>]*[^\s<>.,:;!'")\]])/g },
  // Bolds: **text** or __text__
  { type: "bold", regex: /(\*\*|__)(.*?)\1/g },
  // Italics: *text* or _text_
  { type: "italic", regex: /(\*|_)(.*?)\1/g },
  // PR/Issue numbers: #123
  { type: "pr", regex: /(#\d+)/g },
  // Usernames: @user
  { type: "user", regex: /(@[\w-]+)/g },
  // Commit hashes: 7 chars hex
  { type: "commit", regex: /\b([a-f0-9]{7})\b/g },
];

export function tokenizeMarkdown(text: string): MarkdownToken[] {
  let parts: MarkdownToken[] = [{ type: "text", content: text }];

  for (const pattern of PATTERNS) {
    const newParts: MarkdownToken[] = [];
    for (const part of parts) {
      if (part.type !== "text") {
        newParts.push(part);
        continue;
      }

      let lastIndex = 0;
      let match: RegExpExecArray | null;
      const regex = new RegExp(pattern.regex);

      while ((match = regex.exec(part.content)) !== null) {
        if (match.index > lastIndex) {
          newParts.push({ type: "text", content: part.content.slice(lastIndex, match.index) });
        }

        if (pattern.type === "link") {
          newParts.push({ type: "link", content: match[1], url: match[2] });
        } else if (pattern.type === "bold") {
          newParts.push({ type: "bold", content: match[2] });
        } else if (pattern.type === "italic") {
          newParts.push({ type: "italic", content: match[2] });
        } else if (pattern.type === "pr") {
          newParts.push({ type: "pr", content: match[1] });
        } else if (pattern.type === "user") {
          newParts.push({ type: "user", content: match[1] });
        } else if (pattern.type === "commit") {
          const isHex = /^[a-f0-9]+$/.test(match[1]);
          if (isHex && match[1].length === 7) {
            newParts.push({ type: "commit", content: match[1] });
          } else {
            newParts.push({ type: "text", content: match[1] });
          }
        } else if (pattern.type === "url") {
          newParts.push({ type: "link", content: match[1], url: match[1] });
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < part.content.length) {
        newParts.push({ type: "text", content: part.content.slice(lastIndex) });
      }
    }
    parts = newParts;
  }

  return parts;
}
