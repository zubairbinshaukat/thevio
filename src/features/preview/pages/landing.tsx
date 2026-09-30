"use client";

// A product landing page. Layout follows the preview frame's width through
// container queries, so the Studio's device sizes reflow it like a real site.

import { useId } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardDescription, CardTitle } from "../ui/card";
import { Separator } from "../ui/data";
import { Input, Label } from "../ui/field";
import {
  ArrowRightIcon,
  ChartIcon,
  CheckIcon,
  LayersIcon,
  ShieldIcon,
  ZapIcon,
} from "../ui/icons";
import { NavLink, TextLink } from "../ui/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const FEATURES = [
  {
    icon: ZapIcon,
    title: "Live in minutes",
    body: "Drop in one script tag. Events stream in before your coffee cools.",
  },
  {
    icon: ChartIcon,
    title: "Reports anyone can read",
    body: "Funnels, retention and revenue in plain language, not query syntax.",
  },
  {
    icon: ShieldIcon,
    title: "Private by default",
    body: "No cookies, no fingerprinting. EU hosting and a signed DPA.",
  },
] as const;

const PLANS = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    note: "Up to 10k events a month",
    perks: ["3 dashboards", "7-day history", "Community support"],
  },
  {
    name: "Growth",
    monthly: 49,
    yearly: 39,
    note: "Up to 1M events a month",
    perks: ["Unlimited dashboards", "2-year history", "Funnels & cohorts"],
    featured: true,
  },
  {
    name: "Scale",
    monthly: 199,
    yearly: 159,
    note: "Up to 20M events a month",
    perks: ["Everything in Growth", "SSO & audit log", "Priority support"],
  },
] as const;

function Mark() {
  return (
    <span
      aria-hidden
      className="grid size-7 place-items-center rounded-[min(var(--radius),0.5rem)] bg-primary text-primary-foreground"
    >
      <LayersIcon className="size-4" />
    </span>
  );
}

function Pricing({ billing }: { billing: "monthly" | "yearly" }) {
  return (
    <div className="grid @3xl:grid-cols-3 gap-(--tv-gap)">
      {PLANS.map((plan) => {
        const featured = "featured" in plan && plan.featured;
        return (
          <Card
            key={plan.name}
            // An outline, not a ring: box-shadow belongs to the surface style.
            className={featured ? "outline-2 outline-primary" : undefined}
          >
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{plan.name}</CardTitle>
              {featured && <Badge variant="primary">Popular</Badge>}
            </div>
            <p className="mt-3 flex items-baseline gap-1">
              <span className="font-heading font-semibold text-3xl tracking-tight">
                ${plan[billing]}
              </span>
              <span className="text-muted-foreground text-sm">/ month</span>
            </p>
            <CardDescription className="mt-1">{plan.note}</CardDescription>
            <ul className="mt-(--tv-gap) grid gap-2 text-sm">
              {plan.perks.map((perk) => (
                <li key={perk} className="flex items-center gap-2">
                  <CheckIcon className="size-4 shrink-0 text-primary-text" />
                  {perk}
                </li>
              ))}
            </ul>
            <Button
              variant={featured ? "primary" : "secondary"}
              className="mt-(--tv-card-pad) w-full"
            >
              {plan.monthly === 0 ? "Start free" : `Choose ${plan.name}`}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

export function LandingPage() {
  const email = useId();
  return (
    <div className="@container">
      <header className="flex items-center gap-4 border-border border-b px-(--tv-card-pad) py-3">
        <span className="flex items-center gap-2 font-heading font-semibold">
          <Mark />
          Acme
        </span>
        <nav aria-label="Main" className="@2xl:flex hidden items-center gap-1">
          <NavLink href="/product">Product</NavLink>
          <NavLink href="/pricing">Pricing</NavLink>
          <NavLink href="/docs">Docs</NavLink>
          <NavLink href="/changelog">Changelog</NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {/* A variant only: plain `hidden` would lose to the button's own
              `inline-flex`. */}
          <Button variant="ghost" size="sm" className="@max-md:hidden">
            Sign in
          </Button>
          <Button size="sm">Get started</Button>
        </div>
      </header>

      <section className="mx-auto flex max-w-3xl flex-col items-center px-(--tv-card-pad) @3xl:pt-20 pt-12 pb-10 text-center">
        <Badge variant="secondary">
          <span className="size-1.5 rounded-full bg-success" aria-hidden />
          New: revenue attribution
        </Badge>
        <h1 className="mt-5 text-balance font-semibold @3xl:text-5xl @xl:text-4xl text-3xl leading-[1.1] tracking-tight">
          Product analytics your whole team can read
        </h1>
        <p className="mt-4 max-w-xl text-pretty @3xl:text-lg text-base text-muted-foreground">
          Acme turns raw events into answers: who signed up, what they tried,
          and why they stayed. No SQL, no sampling.
        </p>
        <form
          className="mt-7 flex w-full max-w-md @md:flex-row flex-col gap-2"
          onSubmit={(event) => event.preventDefault()}
        >
          <Label htmlFor={email} className="sr-only">
            Work email
          </Label>
          <Input id={email} type="email" placeholder="you@company.com" />
          <Button type="submit" className="shrink-0">
            Start free
            <ArrowRightIcon />
          </Button>
        </form>
        <p className="mt-3 text-muted-foreground text-xs">
          Free up to 10k events. No card needed.
        </p>
      </section>

      <section
        aria-label="Features"
        className="grid @3xl:grid-cols-3 gap-(--tv-gap) px-(--tv-card-pad) pb-12"
      >
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <span className="grid size-9 place-items-center rounded-[min(var(--tv-btn-radius),calc(var(--radius)*1.2))] bg-soft text-soft-foreground">
              <Icon className="size-4.5" />
            </span>
            <CardTitle className="mt-4">{title}</CardTitle>
            <CardDescription className="mt-1.5">{body}</CardDescription>
          </Card>
        ))}
      </section>

      <section className="border-border border-t bg-muted/40 px-(--tv-card-pad) py-12">
        <Tabs defaultValue="monthly">
          <div className="mb-(--tv-card-pad) flex flex-col items-center gap-4 text-center">
            <h2 className="font-semibold @3xl:text-3xl text-2xl tracking-tight">
              Simple, usage-based pricing
            </h2>
            <TabsList aria-label="Billing period">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly · save 20%</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="monthly">
            <Pricing billing="monthly" />
          </TabsContent>
          <TabsContent value="yearly">
            <Pricing billing="yearly" />
          </TabsContent>
        </Tabs>
      </section>

      <footer className="px-(--tv-card-pad) py-6">
        <Separator className="mb-6" />
        <div className="flex @2xl:flex-row flex-col @2xl:items-center @2xl:justify-between gap-3 text-muted-foreground text-sm">
          <p>© 2026 Acme Analytics GmbH</p>
          <p className="flex gap-4">
            <TextLink href="/privacy">Privacy</TextLink>
            <TextLink href="/terms">Terms</TextLink>
            <TextLink href="/status">Status</TextLink>
          </p>
        </div>
      </footer>
    </div>
  );
}
