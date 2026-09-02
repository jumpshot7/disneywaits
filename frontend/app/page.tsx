"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

interface WaitTime {
  id: number;
  rideName: string;
  parkName: string;
  waitMinutes: number;
  isOpen: boolean;
  recordedAt: string;
}

interface ParkAttendance {
  parkId: number;
  year: number;
  attendance: number;
}

interface HourlyAverage {
  hour: number;
  avgWait: number;
  sampleCount: number;
}

interface WeekdayAverage {
  dayOfWeek: number;
  dayName: string;
  avgWait: number;
  sampleCount: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

// One accent for every mark on the page. Bars are not colored by their own value:
// length already encodes magnitude, so hue would just repeat it and burn the only
// channel left for real distinctions.
const SERIES = "#3987e5";
const GRID = "#26262b";
const AXIS_INK = "#71717a";

// A Disney day runs past midnight, so order hours from opening rather than from
// 12 AM — otherwise late-night hours, which are the END of an operating day, sort
// to the far left as if they came first.
const PARK_DAY_START = 6;

function parkDayOrder(hour: number) {
  return (hour - PARK_DAY_START + 24) % 24;
}

// Hours arrive as 0-23 in park local time.
function formatHour(hour: number) {
  if (hour === 0) {
    return "12 AM";
  }
  if (hour === 12) {
    return "12 PM";
  }
  if (hour < 12) {
    return hour + " AM";
  }
  return hour - 12 + " PM";
}

/*
 * Feed names run long enough to break any axis — "Meet Mickey Mouse and Minnie
 * Mouse at Mickey's Not-So-Scary Halloween Party" is one entry. Character meets
 * are named "<Character> at <Venue>" and the venue is noise on a chart, so drop
 * it; everything else just gets a clean tail truncation.
 */
function shortenRideName(name: string) {
  let short = name.replace(/^Meet /, "");
  const venueAt = short.indexOf(" at ");
  if (venueAt > 0) {
    short = short.slice(0, venueAt);
  }
  // 26 keeps the longest label inside the 168px axis column at 11px; 30 sat right
  // on the overflow line, which is the clipping this chart is meant to fix.
  if (short.length > 26) {
    short = short.slice(0, 25).trimEnd() + "…";
  }
  return short;
}

interface TooltipEntry {
  value?: number | string;
  payload?: { sampleCount?: number };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: readonly TooltipEntry[];
  label?: string | number;
  formatLabel?: (label: string | number) => string;
  formatValue?: (value: number | string | undefined) => string;
}

// Value leads and labels follow: the reader already knows which mark they are on
// and wants the number. Width is capped so a long ride name wraps instead of
// stretching a box across the plot.
function ChartTooltip({
  active,
  payload,
  label,
  formatLabel,
  formatValue,
}: ChartTooltipProps) {
  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }

  const entry = payload[0];
  const samples = entry.payload?.sampleCount;
  const caption = formatLabel ? formatLabel(label ?? "") : String(label ?? "");
  const value = formatValue ? formatValue(entry.value) : entry.value + " min";

  return (
    <div className="max-w-60 rounded-lg border border-[#2f2f36] bg-[#1c1c21] px-3 py-2 shadow-xl">
      <div className="text-sm font-semibold text-white">{value}</div>
      <div className="mt-0.5 text-xs leading-snug break-words text-zinc-400">
        {caption}
      </div>
      {samples !== undefined && (
        <div className="mt-1.5 text-[11px] text-zinc-500">
          {samples.toLocaleString()} observations
        </div>
      )}
    </div>
  );
}

function Card({
  title,
  caption,
  action,
  children,
}: {
  title: string;
  caption?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#26262b] bg-[#16161a] p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-100">{title}</h2>
          {caption && (
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              {caption}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function Home() {
  const [waitTimes, setWaitTimes] = useState<WaitTime[]>([]);
  const [attendance, setAttendance] = useState<ParkAttendance[]>([]);
  const [byHour, setByHour] = useState<HourlyAverage[]>([]);
  const [byWeekday, setByWeekday] = useState<WeekdayAverage[]>([]);
  const [rides, setRides] = useState<string[]>([]);
  // "" means every queueable ride combined.
  const [selectedRide, setSelectedRide] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    fetch(`${API_BASE_URL}/api/waittimes/latest`)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setWaitTimes(data);
        setLoading(false);
      })
      .catch(function () {
        setLoading(false);
      });

    // Magic Kingdom = park 6. Attendance is returned oldest-year-first.
    fetch(`${API_BASE_URL}/api/attendance/park?parkId=6`)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setAttendance(data);
      })
      .catch(function () {
        // Attendance is optional; the dashboard still works without it.
      });

    // Rides that actually post a wait, busiest first — populates the picker.
    fetch(`${API_BASE_URL}/api/waittimes/rides`)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setRides(data);
      })
      .catch(function () {
        // Picker just stays on "all rides" if this fails.
      });

    fetch(`${API_BASE_URL}/api/waittimes/by-weekday`)
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        setByWeekday(data);
      })
      .catch(function () {
        // Optional; the live sections still render without it.
      });
  }, []);

  // Refetches whenever the picker changes; "" asks the API for every queueable ride.
  useEffect(
    function () {
      const query =
        selectedRide === "" ? "" : `?ride=${encodeURIComponent(selectedRide)}`;

      fetch(`${API_BASE_URL}/api/waittimes/by-hour${query}`)
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          setByHour(data);
        })
        .catch(function () {
          setByHour([]);
        });
    },
    [selectedRide]
  );

  const openRides = waitTimes.filter(function (ride) {
    return ride.isOpen === true;
  });

  let totalWaitMinutes = 0;
  for (const ride of openRides) {
    totalWaitMinutes = totalWaitMinutes + ride.waitMinutes;
  }

  let avgWait = 0;
  if (openRides.length > 0) {
    avgWait = Math.round(totalWaitMinutes / openRides.length);
  }

  let longestWait = null;
  if (openRides.length > 0) {
    longestWait = openRides[0];
    for (const ride of openRides) {
      if (ride.waitMinutes > longestWait.waitMinutes) {
        longestWait = ride;
      }
    }
  }

  const topTen = [...openRides]
    .sort(function (a, b) {
      return b.waitMinutes - a.waitMinutes;
    })
    .slice(0, 10);

  const hourChartData = [...byHour].sort(function (a, b) {
    return parkDayOrder(a.hour) - parkDayOrder(b.hour);
  });

  let capturedAt = "";
  if (waitTimes.length > 0) {
    capturedAt = new Date(waitTimes[0].recordedAt + "Z").toLocaleString(
      undefined,
      { dateStyle: "medium", timeStyle: "short" }
    );
  }

  const stats = [
    { label: "Attractions tracked", value: String(waitTimes.length) },
    { label: "Currently open", value: String(openRides.length) },
    { label: "Average wait", value: avgWait + " min" },
    {
      label: "Longest wait",
      value: longestWait !== null ? longestWait.waitMinutes + " min" : "—",
      detail: longestWait !== null ? shortenRideName(longestWait.rideName) : "",
    },
  ];

  return (
    <main className="min-h-screen bg-[#0b0b0e] text-zinc-100">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b border-[#26262b] pb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Disney<span className="text-[#3987e5]">Waits</span>
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Magic Kingdom wait times, and whether they are getting worse.
            </p>
          </div>
          {capturedAt !== "" && (
            <div className="text-xs text-zinc-500">
              Snapshot captured {capturedAt}
            </div>
          )}
        </header>

        {loading === true && (
          <div className="flex h-96 items-center justify-center text-sm text-zinc-500">
            Loading wait times…
          </div>
        )}

        {loading === false && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {stats.map(function (stat) {
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-[#26262b] bg-[#16161a] p-5"
                  >
                    <div className="text-xs text-zinc-500">{stat.label}</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-white">
                      {stat.value}
                    </div>
                    {stat.detail !== undefined && stat.detail !== "" && (
                      <div className="mt-1 truncate text-xs text-zinc-500">
                        {stat.detail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/*
              Horizontal bars: ride names are far too long to sit under a vertical
              axis, where they were rotating and clipping mid-word.
            */}
            {topTen.length > 0 && (
              <Card
                title="Longest waits right now"
                caption="Open attractions, current snapshot"
              >
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={topTen}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid horizontal={false} stroke={GRID} />
                    <XAxis
                      type="number"
                      unit="m"
                      tick={{ fill: AXIS_INK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="rideName"
                      width={168}
                      tickFormatter={shortenRideName}
                      tick={{ fill: AXIS_INK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      content={<ChartTooltip />}
                    />
                    <Bar
                      dataKey="waitMinutes"
                      fill={SERIES}
                      barSize={14}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {(rides.length > 0 || byHour.length > 0) && (
              <Card
                title="Average wait by hour of day"
                caption={
                  selectedRide === ""
                    ? "Every snapshot collected so far, park local time. Attractions that never queue are excluded."
                    : "Every snapshot collected so far, park local time."
                }
                action={
                  <select
                    value={selectedRide}
                    onChange={function (e) {
                      setSelectedRide(e.target.value);
                    }}
                    className="max-w-56 rounded-lg border border-[#2f2f36] bg-[#1c1c21] px-2.5 py-1.5 text-xs text-zinc-300 focus:border-[#3987e5] focus:outline-none"
                  >
                    <option value="">All rides combined</option>
                    {rides.map(function (ride) {
                      return (
                        <option key={ride} value={ride}>
                          {shortenRideName(ride)}
                        </option>
                      );
                    })}
                  </select>
                }
              >
                {hourChartData.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-xs text-zinc-500">
                    Not enough data collected for this ride yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={288}>
                    <LineChart
                      data={hourChartData}
                      margin={{ top: 4, right: 12, bottom: 4, left: -12 }}
                    >
                      <CartesianGrid vertical={false} stroke={GRID} />
                      <XAxis
                        dataKey="hour"
                        tickFormatter={formatHour}
                        tick={{ fill: AXIS_INK, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                        minTickGap={16}
                      />
                      <YAxis
                        unit="m"
                        tick={{ fill: AXIS_INK, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: GRID }}
                        content={
                          <ChartTooltip
                            formatLabel={function (label) {
                              return formatHour(Number(label));
                            }}
                          />
                        }
                      />
                      <Line
                        type="monotone"
                        dataKey="avgWait"
                        stroke={SERIES}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: SERIES }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

            {byWeekday.length > 0 && (
              <Card
                title="Average wait by day of week"
                caption="Which days actually run busier"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={byWeekday}
                    margin={{ top: 4, right: 12, bottom: 4, left: -12 }}
                  >
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="dayName"
                      tickFormatter={function (dayName) {
                        return String(dayName).slice(0, 3);
                      }}
                      tick={{ fill: AXIS_INK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      unit="m"
                      tick={{ fill: AXIS_INK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                      content={<ChartTooltip />}
                    />
                    <Bar
                      dataKey="avgWait"
                      fill={SERIES}
                      barSize={28}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {attendance.length > 0 && (
              <Card
                title="Magic Kingdom attendance by year"
                caption="The long-term crowd trend, from published annual attendance"
              >
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={attendance}
                    margin={{ top: 4, right: 12, bottom: 4, left: -4 }}
                  >
                    <CartesianGrid vertical={false} stroke={GRID} />
                    <XAxis
                      dataKey="year"
                      tick={{ fill: AXIS_INK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={16}
                    />
                    <YAxis
                      tick={{ fill: AXIS_INK, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={function (value) {
                        return Math.round(Number(value) / 1000000) + "M";
                      }}
                    />
                    <Tooltip
                      cursor={{ stroke: GRID }}
                      content={
                        <ChartTooltip
                          formatValue={function (value) {
                            return Number(value).toLocaleString() + " guests";
                          }}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="attendance"
                      stroke={SERIES}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4, fill: SERIES }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* The table view: every value above stays reachable without hovering. */}
            <Card title="All attractions" caption="Current snapshot">
              <div className="-mx-1">
                {[...waitTimes]
                  .sort(function (a, b) {
                    return b.waitMinutes - a.waitMinutes;
                  })
                  .map(function (ride) {
                    return (
                      <div
                        key={ride.id}
                        className="flex items-center justify-between gap-4 border-b border-[#26262b] px-1 py-2.5 last:border-b-0"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={
                              ride.isOpen === true
                                ? "size-1.5 shrink-0 rounded-full bg-[#3987e5]"
                                : "size-1.5 shrink-0 rounded-full bg-zinc-700"
                            }
                          />
                          <span className="truncate text-sm text-zinc-300">
                            {ride.rideName}
                          </span>
                        </div>
                        <span
                          className={
                            ride.isOpen === true
                              ? "shrink-0 text-sm text-zinc-100 tabular-nums"
                              : "shrink-0 text-sm text-zinc-600"
                          }
                        >
                          {ride.isOpen === true
                            ? ride.waitMinutes + " min"
                            : "Closed"}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </Card>

            <footer className="pt-2 pb-6 text-center text-xs text-zinc-600">
              Data from{" "}
              <a
                href="https://queue-times.com"
                className="text-zinc-500 underline underline-offset-2 hover:text-zinc-400"
              >
                Queue-Times.com
              </a>
            </footer>
          </div>
        )}
      </div>
    </main>
  );
}
