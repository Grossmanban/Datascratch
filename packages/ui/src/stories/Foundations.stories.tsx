import type { Story } from "@ladle/react";
import { tokens } from "@datascratch/design-tokens";
import { Backdrop, backdropNames, tintNames, type TintName } from "..";

const Swatch = ({ name, varName }: { name: string; varName: string }) => (
  <div className="flex items-center gap-3">
    <span className="size-10 rounded-md border border-hairline shadow-card" style={{ background: `var(${varName})` }} />
    <span className="text-footnote">
      <span className="block font-medium text-fg">{name}</span>
      <span className="font-mono text-caption text-fg-tertiary">{varName}</span>
    </span>
  </div>
);

export const Colors: Story = () => (
  <div className="flex flex-col gap-10">
    <section>
      <h2 className="mb-4 font-display text-h2">Семантические цвета</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {Object.keys(tokens.color).map((k) => (
          <Swatch key={k} name={k} varName={`--ds-${k.replace(".", "-")}`} />
        ))}
      </div>
    </section>
    <section>
      <h2 className="mb-4 font-display text-h2">Чернила и маркеры</h2>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {Object.keys(tokens.ink).map((k) => (
          <Swatch key={k} name={`ink.${k}`} varName={`--ds-ink-${k}`} />
        ))}
        {Object.keys(tokens.highlight).map((k) => (
          <Swatch key={k} name={`highlight.${k}`} varName={`--ds-highlight-${k}`} />
        ))}
      </div>
      <p className="mt-6 max-w-doc-normal text-body">
        Рукопись на хорошей бумаге:{" "}
        {Object.keys(tokens.highlight).map((k) => (
          <mark key={k} className="mx-0.5 rounded-[3px] px-0.5 text-fg" style={{ background: `var(--ds-highlight-${k})` }}>
            маркер {k}
          </mark>
        ))}
      </p>
    </section>
    <section>
      <h2 className="mb-4 font-display text-h2">Оттенки папок и тегов</h2>
      <div className="flex flex-wrap gap-2">
        {tintNames.map((t: TintName) => (
          <span key={t} className="rounded-full px-3 py-1 text-footnote font-medium" style={{ color: `var(--ds-tint-${t}-fg)`, background: `var(--ds-tint-${t}-bg)` }}>
            {t}
          </span>
        ))}
      </div>
    </section>
  </div>
);

export const Typography: Story = () => (
  <div className="flex max-w-doc-normal flex-col gap-4">
    {Object.entries(tokens.type).map(([k, v]) => (
      <div key={k} className="flex items-baseline gap-6 border-b border-hairline pb-3">
        <span className="w-20 shrink-0 font-mono text-caption text-fg-tertiary">
          {k} {v.size}
        </span>
        <span className={v.font === "display" ? "font-display" : "font-text"} style={{ fontSize: v.size, fontWeight: v.weight, lineHeight: v.lineHeight, letterSpacing: `${v.tracking / v.size}em` }}>
          Тихая бумага — Quiet paper
        </span>
      </div>
    ))}
    <p className="font-mono text-callout text-fg-secondary">const ink = tokens.ink.blue; // JetBrains Mono</p>
  </div>
);

export const Backdrops: Story = () => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
    {backdropNames.map((b) => (
      <div key={b} className="relative h-44 overflow-hidden rounded-xl border border-hairline shadow-card">
        <Backdrop name={b} />
        <span className="glass absolute bottom-3 left-3 rounded-full px-3 py-1 text-footnote font-medium">backdrop.{b}</span>
      </div>
    ))}
  </div>
);

export const Elevation: Story = () => (
  <div className="flex gap-8">
    {(["card", "popover"] as const).map((s) => (
      <div key={s} className="grid h-32 w-48 place-items-center rounded-lg bg-surface text-footnote text-fg-secondary" style={{ boxShadow: `var(--ds-shadow-${s})` }}>
        shadow.{s}
      </div>
    ))}
    {(["sm", "md", "lg", "xl"] as const).map((r) => (
      <div key={r} className="grid size-32 place-items-center border border-hairline bg-surface text-footnote text-fg-secondary" style={{ borderRadius: `var(--ds-radius-${r})` }}>
        radius.{r}
      </div>
    ))}
  </div>
);
