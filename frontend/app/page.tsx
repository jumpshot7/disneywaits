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
  Cell,
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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

export default function Home() {
  const [waitTimes, setWaitTimes] = useState<WaitTime[]>([]);
  const [attendance, setAttendance] = useState<ParkAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    fetch(`${API_BASE_URL}/api/waittimes`)
      .then(function(res) {
        return res.json();
      })
      .then(function(data) {
        setWaitTimes(data);
        setLoading(false);
      })
      .catch(function() {
        setLoading(false);
      });

    // Magic Kingdom = park 6. Attendance is returned oldest-year-first.
    fetch(`${API_BASE_URL}/api/attendance/park?parkId=6`)
      .then(function(res) {
        return res.json();
      })
      .then(function(data) {
        setAttendance(data);
      })
      .catch(function() {
        // Attendance is optional; the dashboard still works without it.
      });
  }, []);

  const openRides = waitTimes.filter(function(ride) {
    return ride.isOpen === true;
  });

  const closedRides = waitTimes.filter(function(ride) {
    return ride.isOpen === false;
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

  const sortedRides = [...openRides].sort(function(a, b) {
    return b.waitMinutes - a.waitMinutes;
  });

  const chartData = sortedRides.slice(0, 10);

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white font-mono">

      {/* Header */}
      <div className="border-b border-white/10 px-8 py-6 flex items-center justify-between">
        <div>
          <div className="text-xs text-blue-400 tracking-[0.3em] uppercase mb-1">
            Magic Kingdom · Live Data
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            Disney<span className="text-blue-400">Waits</span>
          </h1>
        </div>
        <div className="text-xs text-white/40 text-right">
          <div>Are wait times getting worse?</div>
          <div className="text-white/20">Powered by Queue-Times.com</div>
        </div>
      </div>

      {/* Loading State */}
      {loading === true && (
        <div className="flex items-center justify-center h-96 text-white/40">
          Loading wait times...
        </div>
      )}

      {/* Main Content */}
      {loading === false && (
        <div className="px-8 py-8 space-y-8">

          {/* Stat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">
                Total Rides
              </div>
              <div className="text-4xl font-bold">{waitTimes.length}</div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">
                Rides Open
              </div>
              <div className="text-4xl font-bold text-green-400">
                {openRides.length}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">
                Avg Wait
              </div>
              <div className="text-4xl font-bold text-blue-400">
                {avgWait}
                <span className="text-lg text-white/40">m</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-2">
                Longest Wait
              </div>
              <div className="text-4xl font-bold text-orange-400">
                {longestWait !== null ? longestWait.waitMinutes : 0}
                <span className="text-lg text-white/40">m</span>
              </div>
              <div className="text-xs text-white/30 mt-1 truncate">
                {longestWait !== null ? longestWait.rideName : "—"}
              </div>
            </div>

          </div>

          {/* Bar Chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-6">
              Top 10 Longest Waits Right Now
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                />
                <XAxis
                  dataKey="rideName"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  angle={-25}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  unit="m"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "white",
                  }}
                  formatter={function(value) {
                    return [`${value} min`, "Wait Time"];
                  }}
                />
                <Bar dataKey="waitMinutes" radius={[4, 4, 0, 0]}>
                  {chartData.map(function(entry, index) {
                    let barColor = "#34d399";
                    if (entry.waitMinutes > 60) {
                      barColor = "#f97316";
                    } else if (entry.waitMinutes > 30) {
                      barColor = "#60a5fa";
                    }
                    return <Cell key={index} fill={barColor} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Attendance by Year */}
          {attendance.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="text-xs text-white/40 uppercase tracking-widest mb-1">
                Magic Kingdom Attendance by Year
              </div>
              <div className="text-xs text-white/30 mb-6">
                The long-term crowd trend — annual attendance since 2006
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={attendance}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                  />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                    tickFormatter={function(value) {
                      return Math.round(value / 1000000) + "M";
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a2e",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "white",
                    }}
                    formatter={function(value) {
                      return [Number(value).toLocaleString() + " guests", "Attendance"];
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#60a5fa"
                    strokeWidth={2}
                    dot={{ fill: "#60a5fa", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Ride List */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-6">
              All Rides
            </div>
            <div className="space-y-2">
              {[...waitTimes].sort(function(a, b) {
                return b.waitMinutes - a.waitMinutes;
              }).map(function(ride) {
                let waitColor = "text-green-400";
                if (ride.waitMinutes > 60) {
                  waitColor = "text-orange-400";
                } else if (ride.waitMinutes > 30) {
                  waitColor = "text-blue-400";
                }
                return (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between py-3 border-b border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={ride.isOpen === true
                          ? "w-2 h-2 rounded-full bg-green-400"
                          : "w-2 h-2 rounded-full bg-red-400"
                        }
                      />
                      <span className="text-sm text-white/80">
                        {ride.rideName}
                      </span>
                    </div>
                    <span className={"text-sm font-bold " + waitColor}>
                      {ride.isOpen === true
                        ? ride.waitMinutes + " min"
                        : "Closed"
                      }
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-white/20 pb-4">
            Data sourced from Queue-Times.com · Updated on pipeline run
          </div>

        </div>
      )}

    </main>
  );
}