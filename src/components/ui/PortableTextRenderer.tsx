"use client";

import { PortableText } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";

interface PortableTextRendererProps {
  value: PortableTextBlock[];
}

const components = {
  block: {
    h2: ({ children }: any) => (
      <h2 className="mb-4 mt-10 text-3xl font-extrabold text-near-black">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="mb-3 mt-8 text-2xl font-extrabold text-near-black">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="mb-2 mt-6 text-xl font-extrabold text-near-black">
        {children}
      </h4>
    ),
    normal: ({ children }: any) => (
      <p className="mb-5 text-[17px] leading-relaxed text-near-black/75">
        {children}
      </p>
    ),
    blockquote: ({ children }: any) => (
      <blockquote className="my-6 border-l-4 border-gold pl-6 italic text-near-black/60">
        {children}
      </blockquote>
    ),
  },
  marks: {
    strong: ({ children }: any) => (
      <strong className="font-bold text-near-black">{children}</strong>
    ),
    em: ({ children }: any) => <em>{children}</em>,
    link: ({ children, value }: any) => (
      <a
        href={value?.href}
        target={value?.href?.startsWith("http") ? "_blank" : undefined}
        rel={value?.href?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="font-semibold text-dark-green underline hover:text-dark-green/80"
      >
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: any) => (
      <ul className="mb-5 ml-6 list-disc space-y-2 text-[17px] text-near-black/75">
        {children}
      </ul>
    ),
    number: ({ children }: any) => (
      <ol className="mb-5 ml-6 list-decimal space-y-2 text-[17px] text-near-black/75">
        {children}
      </ol>
    ),
  },
};

export default function PortableTextRenderer({ value }: PortableTextRendererProps) {
  if (!value || value.length === 0) {
    return null;
  }

  return <PortableText value={value} components={components} />;
}
