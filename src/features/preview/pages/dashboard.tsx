"use client";

// An analytics dashboard: sidebar, KPIs, a chart drawn in the theme's chart
// colours, and a table. Recharts comes later (M7); these bars are plain
// elements so the Studio's initial JS stays small.

import { useId } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Avatar, Progress, Table, Td, Th } from "../ui/data";
import { Input, Label } from "../ui/field";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  BellIcon,
  ChartIcon,
  HomeIcon,
  LayersIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "../ui/icons";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
} from "../ui/overlay";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

const NAV = [
  { label: "Overview", icon: HomeIcon, active: true },
  { label: "Reports", icon: ChartIcon },
  { label: "Customers", icon: UsersIcon },
  { label: "Settings", icon: SettingsIcon },
] as const;

const KPIS = [
  { label: "Revenue", value: "$48,210", change: 12.4 },
  { label: "Active users", value: "3,942", change: 8.1 },
  { label: "Conversion", value: "4.7%", change: -0.6 },
  { label: "Churn", value: "1.9%", change: -12.0, lowerIsBetter: true },
] as const;

const SERIES = [
  { name: "Organic", token: "bg-chart-1" },
  { name: "Paid", token: "bg-chart-2" },
  { name: "Referral", token: "bg-chart-3" },
] as const;

// Weekly signups per channel.
const WEEKS = [
  [42, 18, 9],
  [48, 22, 11],
  [45, 25, 10],
  [53, 21, 14],
  [58, 27, 12],
  [55, 31, 16],
  [63, 29, 15],
  [67, 34, 19],
] as const;
const PEAK = Math.max(...WEEKS.map((week) => week[0] + week[1] + week[2]));

const CHANNELS = [
  { name: "Search", share: 46, token: "bg-chart-1" },
  { name: "Newsletter", share: 24, token: "bg-chart-2" },
  { name: "Partners", share: 18, token: "bg-chart-3" },
  { name: "Social", share: 12, token: "bg-chart-4" },
] as const;

const ORDERS = [
  {
    name: "Lena Fischer",
    initials: "LF",
    plan: "Growth",
    amount: "$49.00",
    status: "Paid",
  },
  {
    name: "Tomás Rivera",
    initials: "TR",
    plan: "Scale",
    amount: "$199.00",
    status: "Paid",
  },
  {
    name: "Mei Tanaka",
    initials: "MT",
    plan: "Growth",
    amount: "$49.00",
    status: "Pending",
  },
  {
    name: "Kwame Mensah",
    initials: "KM",
    plan: "Starter",
    amount: "$0.00",
    status: "Refunded",
  },
] as const;

const STATUS = {
  Paid: "success",
  Pending: "warning",
  Refunded: "destructive",
} as const;

function Kpi({
  label,
  value,
  change,
  lowerIsBetter,
}: (typeof KPIS)[number] & { lowerIsBetter?: boolean }) {
  const good = lowerIsBetter ? change < 0 : change > 0;
  const Arrow = change > 0 ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Card>
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="mt-1 font-heading font-semibold text-2xl tracking-tight">
        {value}
      </p>
      <Badge variant={good ? "success" : "destructive"} className="mt-2">
        <Arrow className="-mx-0.5 size-3" />
        {Math.abs(change)}%
        <span className="sr-only">
          {change > 0 ? "up" : "down"} on last month
        </span>
      </Badge>
    </Card>
  );
}

export function DashboardPage() {
  const search = useId();
  return (
    <div className="@container h-full">
      <div className="flex min-h-full">
        <aside
          aria-label="Workspace"
          className="@4xl:flex hidden w-52 shrink-0 flex-col gap-1 border-sidebar-border border-r bg-sidebar p-3 text-sidebar-foreground"
        >
          <span className="mb-3 flex items-center gap-2 px-2 pt-1 font-heading font-semibold">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-[min(var(--radius),0.5rem)] bg-sidebar-primary text-sidebar-primary-foreground"
            >
              <LayersIcon className="size-4" />
            </span>
            Acme
          </span>
          {NAV.map(({ label, icon: Icon, ...item }) => {
            const active = "active" in item && item.active;
            return (
              <button
                key={label}
                type="button"
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "tv-focus flex h-(--tv-control-h) items-center gap-2.5 rounded-[min(var(--tv-btn-radius),var(--radius))] bg-sidebar-accent px-2.5 font-medium text-sidebar-accent-foreground text-sm"
                    : "tv-focus flex h-(--tv-control-h) cursor-pointer items-center gap-2.5 rounded-[min(var(--tv-btn-radius),var(--radius))] px-2.5 text-sm hover:bg-sidebar-accent"
                }
              >
                <Icon className="size-4" />
                {label}
              </button>
            );
          })}
          <Card className="mt-auto p-3">
            <p className="font-medium text-sm">Event quota</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              720k of 1M this month
            </p>
            <Progress
              value={72}
              aria-label="Event quota used"
              className="mt-2.5"
            />
          </Card>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center gap-3 border-border border-b px-(--tv-card-pad) py-3">
            <div className="relative max-w-72 flex-1">
              <Label htmlFor={search} className="sr-only">
                Search
              </Label>
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={search}
                type="search"
                placeholder="Search reports"
                className="pl-8"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" aria-label="Notifications">
                <BellIcon />
              </Button>
              <Menu>
                <MenuTrigger
                  className="tv-focus cursor-pointer rounded-full"
                  aria-label="Account"
                >
                  <Avatar initials="LF" />
                </MenuTrigger>
                <MenuContent align="end">
                  <MenuItem>Profile</MenuItem>
                  <MenuItem>Billing</MenuItem>
                  <MenuSeparator />
                  <MenuItem>Sign out</MenuItem>
                </MenuContent>
              </Menu>
            </div>
          </header>

          <main className="flex flex-col gap-(--tv-gap) p-(--tv-card-pad)">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="font-semibold text-xl tracking-tight">
                  Overview
                </h1>
                <p className="text-muted-foreground text-sm">
                  Acme Analytics · all projects
                </p>
              </div>
              <Tabs defaultValue="30d">
                <TabsList aria-label="Date range">
                  <TabsTrigger value="7d">7 days</TabsTrigger>
                  <TabsTrigger value="30d">30 days</TabsTrigger>
                  <TabsTrigger value="90d">90 days</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid @4xl:grid-cols-4 grid-cols-2 gap-(--tv-gap)">
              {KPIS.map((kpi) => (
                <Kpi key={kpi.label} {...kpi} />
              ))}
            </div>

            <div className="grid @4xl:grid-cols-[2fr_1fr] gap-(--tv-gap)">
              <Card>
                <CardHeader>
                  <CardTitle>Signups by channel</CardTitle>
                  <CardDescription>Last 8 weeks</CardDescription>
                </CardHeader>
                <figure>
                  <div
                    role="img"
                    aria-label="Stacked bar chart of weekly signups by channel; signups grow from 69 to 120 a week."
                    className="flex h-44 items-end gap-2 border-border border-b"
                  >
                    {WEEKS.map((week, i) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: fixed data
                        key={i}
                        className="flex flex-1 flex-col-reverse overflow-hidden rounded-t-[min(var(--radius),0.375rem)]"
                        style={{
                          height: `${((week[0] + week[1] + week[2]) / PEAK) * 100}%`,
                        }}
                      >
                        {SERIES.map((series, s) => (
                          <div
                            key={series.name}
                            className={series.token}
                            style={{ flexGrow: week[s] }}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                  <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-xs">
                    {SERIES.map((series) => (
                      <span
                        key={series.name}
                        className="flex items-center gap-1.5"
                      >
                        <span
                          aria-hidden
                          className={`size-2.5 rounded-[2px] ${series.token}`}
                        />
                        {series.name}
                      </span>
                    ))}
                  </figcaption>
                </figure>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top channels</CardTitle>
                  <CardDescription>Share of signups</CardDescription>
                </CardHeader>
                <ul className="grid gap-3.5">
                  {CHANNELS.map((channel) => (
                    <li key={channel.name}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span>{channel.name}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {channel.share}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${channel.token}`}
                          style={{ width: `${channel.share}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <Card>
              <div className="mb-(--tv-gap) flex items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle>Recent orders</CardTitle>
                  <CardDescription>4 in the last hour</CardDescription>
                </div>
                <Button variant="secondary" size="sm">
                  Export
                </Button>
              </div>
              <div className="-mx-1 overflow-x-auto px-1">
                <Table className="min-w-md">
                  <thead>
                    <tr>
                      <Th>Customer</Th>
                      <Th>Plan</Th>
                      <Th>Status</Th>
                      <Th className="text-right">Amount</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {ORDERS.map((order) => (
                      <tr key={order.name}>
                        <Td>
                          <span className="flex items-center gap-2">
                            <Avatar
                              initials={order.initials}
                              className="size-6 text-[0.625rem]"
                            />
                            {order.name}
                          </span>
                        </Td>
                        <Td className="text-muted-foreground">{order.plan}</Td>
                        <Td>
                          <Badge variant={STATUS[order.status]}>
                            {order.status}
                          </Badge>
                        </Td>
                        <Td className="text-right tabular-nums">
                          {order.amount}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
