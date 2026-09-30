"use client";

// A sign-in screen. Wide frames get a brand panel beside the form; narrow
// ones show the form alone, the way most auth pages collapse.

import { useId } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/choice";
import { Separator } from "../ui/data";
import { Input, Label } from "../ui/field";
import { GithubIcon, LayersIcon, MailIcon } from "../ui/icons";
import { TextLink } from "../ui/link";

export function SignInPage() {
  const id = useId();
  const field = (name: string) => `${id}-${name}`;
  return (
    <div className="@container h-full">
      <div className="grid min-h-full @4xl:grid-cols-2">
        <aside
          aria-label="About Acme"
          className="relative @4xl:flex hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground"
        >
          <span className="flex items-center gap-2 font-heading font-semibold">
            <LayersIcon className="size-5" />
            Acme
          </span>
          <figure className="relative">
            <blockquote className="text-balance font-heading text-2xl leading-snug">
              “We replaced three tools and a weekly SQL ritual. Now the whole
              team reads the same numbers.”
            </blockquote>
            {/* Full strength: primary-foreground is only proven at 4.5:1. */}
            <figcaption className="mt-4 text-sm">
              Priya Raman, Head of Growth at Lumen
            </figcaption>
          </figure>
        </aside>

        <main className="grid place-items-center p-(--tv-card-pad) py-12">
          <div className="w-full max-w-sm">
            <div className="mb-6 text-center">
              <span
                aria-hidden
                className="mx-auto mb-4 grid @4xl:hidden size-10 place-items-center rounded-[min(var(--radius),0.625rem)] bg-primary text-primary-foreground"
              >
                <LayersIcon className="size-5" />
              </span>
              <h1 className="font-semibold text-2xl tracking-tight">
                Welcome back
              </h1>
              <p className="mt-1.5 text-muted-foreground text-sm">
                Sign in to your Acme workspace
              </p>
            </div>

            <Card>
              <div className="grid gap-2">
                <Button variant="secondary">
                  <GithubIcon />
                  Continue with GitHub
                </Button>
                <Button variant="secondary">
                  <MailIcon />
                  Email me a sign-in link
                </Button>
              </div>

              <div className="my-(--tv-gap) flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-muted-foreground text-xs">or</span>
                <Separator className="flex-1" />
              </div>

              <form
                className="grid gap-(--tv-gap)"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="grid gap-2">
                  <Label htmlFor={field("email")}>Email</Label>
                  <Input
                    id={field("email")}
                    type="email"
                    autoComplete="off"
                    placeholder="you@company.com"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={field("password")}>Password</Label>
                    <TextLink href="/reset-password" className="text-xs">
                      Forgot password?
                    </TextLink>
                  </div>
                  <Input
                    id={field("password")}
                    type="password"
                    autoComplete="off"
                    defaultValue="correct horse"
                  />
                </div>
                <div className="flex items-center gap-2.5">
                  <Checkbox id={field("remember")} defaultChecked />
                  <Label htmlFor={field("remember")}>
                    Keep me signed in for 30 days
                  </Label>
                </div>
                <Button type="submit" className="w-full">
                  Sign in
                </Button>
              </form>
            </Card>

            <p className="mt-5 text-center text-muted-foreground text-sm">
              New to Acme?{" "}
              <TextLink href="/sign-up">Create an account</TextLink>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
