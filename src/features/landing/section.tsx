import type { ReactNode } from "react";
import { Reveal } from "@/components/reveal";

type SectionProps = {
  id: string;
  step: string;
  name: string;
  title: ReactNode;
  lead: ReactNode;
  children: ReactNode;
};

/** A landing section: eyebrow, title and lead, then its live content. */
export function Section({
  id,
  step,
  name,
  title,
  lead,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-16 py-18 md:py-28 lg:py-36"
    >
      <div className="page">
        <Reveal className="max-w-2xl">
          <p data-rise className="flex items-center gap-2 text-eyebrow">
            <span
              aria-hidden
              className="size-1.5 rounded-full bg-brand transition-colors duration-500"
            />
            <span>{step}</span>
            <span className="text-muted-foreground">{name}</span>
          </p>
          <h2 data-rise id={`${id}-title`} className="mt-4 text-title">
            {title}
          </h2>
          <p data-rise className="mt-5 text-lead text-muted-foreground">
            {lead}
          </p>
        </Reveal>
        <Reveal className="mt-10 md:mt-14">{children}</Reveal>
      </div>
    </section>
  );
}
