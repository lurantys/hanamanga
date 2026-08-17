"use client";

import { useMemo, useState } from "react";

type ExpandableDescriptionProps = {
  text: string;
  limit?: number;
  className?: string;
};

const SAFE_TAGS = new Set([
  "P",
  "DIV",
  "BR",
  "B",
  "I",
  "EM",
  "STRONG",
  "U",
  "S",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "A",
  "CODE",
  "SPAN",
  "SUP",
  "SUB",
  "HR",
]);

function sanitize(html: string): string {
  if (typeof document === "undefined") return html;
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc
    .querySelectorAll(
      "script,style,iframe,object,embed,form,input,button,select,textarea,meta,link,base,svg,math",
    )
    .forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim().toLowerCase();
      if (
        name.startsWith("on") ||
        ((name === "href" || name === "src") && value.startsWith("javascript:"))
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });
  doc.querySelectorAll("*").forEach((el) => {
    if (!SAFE_TAGS.has(el.tagName)) {
      el.replaceWith(...Array.from(el.childNodes));
    }
  });
  return doc.body.innerHTML;
}

function plainText(html: string): string {
  if (typeof document === "undefined") {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script,style").forEach((el) => el.remove());
  return (doc.body.innerText || "").replace(/\n{3,}/g, "\n\n");
}

function truncated(text: string, limit: number): string {
  const sliced = text.slice(0, limit);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > limit * 0.7 ? lastSpace : limit;
  return `${sliced.slice(0, cut).trimEnd()}…`;
}

export function ExpandableDescription({
  text,
  limit = 280,
  className = "",
}: ExpandableDescriptionProps) {
  const [expanded, setExpanded] = useState(false);

  const safeHtml = useMemo(() => sanitize(text), [text]);
  const plain = useMemo(() => plainText(text), [text]);

  const needsTruncation = plain.length > limit;
  const shown = needsTruncation && !expanded ? truncated(plain, limit) : plain;

  return (
    <div className={className}>
      {expanded ? (
        <div
          dangerouslySetInnerHTML={{ __html: safeHtml }}
          className="[&_a]:font-semibold [&_a]:text-red-400 [&_a]:underline [&_a]:underline-offset-2"
        />
      ) : (
        <p className="whitespace-pre-line">{shown}</p>
      )}
      {needsTruncation && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="mt-1.5 text-sm font-bold text-red-400 transition-colors hover:text-red-300"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}