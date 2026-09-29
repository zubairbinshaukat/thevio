"use client";

// The fixed page used to judge style presets (plan §D.4): the same markup
// must read as three different products under shadcn, Soft and Crisp.
// Every preview component appears at least once.

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Checkbox, RadioGroup, RadioItem, Switch } from "./ui/choice";
import { Avatar, Progress, Separator, Table, Td, Th } from "./ui/data";
import { Input, Label, Textarea } from "./ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

const MEMBERS = [
  { name: "Ayesha Khan", initials: "AK", role: "Owner", tone: "primary" },
  { name: "Omar Farooq", initials: "OF", role: "Admin", tone: "secondary" },
  { name: "Sara Malik", initials: "SM", role: "Invited", tone: "warning" },
] as const;

/** `id` keeps form ids unique when several copies share a page. */
export function SamplePage({ id }: { id: string }) {
  const field = (name: string) => `${id}-${name}`;
  return (
    <div className="flex flex-col gap-(--tv-gap) p-[calc(var(--tv-card-pad)*0.75)]">
      <header className="flex items-center gap-3">
        <Avatar initials="AL" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">Acme Labs</p>
          <p className="truncate text-muted-foreground text-xs">
            Workspace settings
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Help">
              ?
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings apply to everyone</TooltipContent>
        </Tooltip>
        <Menu>
          <MenuTrigger asChild>
            <Button size="sm">Invite</Button>
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem>Invite by email</MenuItem>
            <MenuItem>Copy invite link</MenuItem>
            <MenuSeparator />
            <MenuItem disabled>Import from CSV</MenuItem>
          </MenuContent>
        </Menu>
      </header>

      <Tabs defaultValue="general">
        <TabsList aria-label="Settings">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>How your team sees this space.</CardDescription>
            </CardHeader>
            <div className="grid gap-(--tv-gap)">
              <div className="grid gap-2">
                <Label htmlFor={field("name")}>Name</Label>
                <Input id={field("name")} defaultValue="Acme Labs" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={field("region")}>Region</Label>
                <Select defaultValue="fra">
                  <SelectTrigger id={field("region")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fra">Frankfurt</SelectItem>
                    <SelectItem value="iad">Washington</SelectItem>
                    <SelectItem value="sin">Singapore</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={field("about")}>About</Label>
                <Textarea
                  id={field("about")}
                  placeholder="What does this workspace do?"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={field("public")}>Public dashboard</Label>
                <Switch id={field("public")} defaultChecked />
              </div>
              <div className="flex items-center gap-2.5">
                <Checkbox id={field("digest")} defaultChecked />
                <Label htmlFor={field("digest")}>Weekly email digest</Label>
              </div>
            </div>
            <Separator className="my-(--tv-gap)" />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary">Cancel</Button>
              <Button>Save changes</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>7 of 10 seats used.</CardDescription>
            </CardHeader>
            <Progress value={70} aria-label="Seats used" />
            <Table className="mt-(--tv-gap)">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th className="text-right">Role</Th>
                </tr>
              </thead>
              <tbody>
                {MEMBERS.map((member) => (
                  <tr key={member.name}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Avatar
                          initials={member.initials}
                          className="size-6 text-[0.625rem]"
                        />
                        {member.name}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <Badge variant={member.tone}>{member.role}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
              <CardDescription>
                Billed monthly. Cancel any time.
              </CardDescription>
            </CardHeader>
            <RadioGroup defaultValue="pro" aria-label="Plan">
              {["Starter", "Pro", "Team"].map((plan) => (
                <div key={plan} className="flex items-center gap-2.5">
                  <RadioItem value={plan.toLowerCase()} id={field(plan)} />
                  <Label htmlFor={field(plan)}>{plan}</Label>
                  {plan === "Pro" && <Badge variant="success">Current</Badge>}
                </div>
              ))}
            </RadioGroup>
            <Button className="mt-(--tv-gap) w-full">Upgrade</Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* A static overlay, so the floating style shows without opening one. */}
      <div className="tv-overlay flex items-start gap-3 p-3.5">
        <Badge variant="success">Sent</Badge>
        <p className="text-sm">
          Invite sent to <span className="font-medium">sara@acme.dev</span>
        </p>
      </div>

      <Card className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm">Delete workspace</p>
          <p className="text-muted-foreground text-xs">
            Removes every project.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>Delete Acme Labs?</DialogTitle>
            <DialogDescription>
              This removes 12 projects and can't be undone.
            </DialogDescription>
            <div className="mt-(--tv-card-pad) flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="secondary">Keep it</Button>
              </DialogClose>
              <Button variant="destructive">Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
      </Card>
    </div>
  );
}
