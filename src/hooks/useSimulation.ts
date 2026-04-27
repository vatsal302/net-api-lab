import { useCallback, useEffect, useRef, useState } from "react";

export type ApiScenario = "success" | "delayed" | "notfound" | "server" | "timeout";
export type Bandwidth = "fast" | "medium" | "slow";
export type LogLevel = "info" | "success" | "warn" | "error";

export interface LogEntry {
  id: string;
  ts: number;
  level: LogLevel;
  method: string;
  url: string;
  message: string;
  durationMs?: number;
  status?: number | "TIMEOUT" | "ERR";
  attempt?: number;
}

export interface PendingRequest {
  id: string;
  url: string;
  startedAt: number;
  expectedMs: number;
}

export interface SimResult {
  ok: boolean;
  status: number | "TIMEOUT" | "ERR";
  durationMs: number;
  packetLost: boolean;
}

const BANDWIDTH_MULT: Record<Bandwidth, number> = {
  fast: 1,
  medium: 2.2,
  slow: 4.5,
};

const SCENARIO_LABEL: Record<ApiScenario, string> = {
  success: "200 OK",
  delayed: "200 OK (delayed)",
  notfound: "404 Not Found",
  server: "500 Internal Error",
  timeout: "TIMEOUT",
};

let _id = 0;
const uid = () => `${Date.now().toString(36)}-${(_id++).toString(36)}`;

export interface SimState {
  latency: number;
  bandwidth: Bandwidth;
  packetLoss: number;
  scenario: ApiScenario;
}

export function useSimulation() {
  const [latency, setLatency] = useState(120);
  const [bandwidth, setBandwidth] = useState<Bandwidth>("fast");
  const [packetLoss, setPacketLoss] = useState(0);
  const [scenario, setScenario] = useState<ApiScenario>("success");

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pending, setPending] = useState<PendingRequest[]>([]);
  const [tick, setTick] = useState(0);

  const stateRef = useRef<SimState>({ latency, bandwidth, packetLoss, scenario });
  useEffect(() => {
    stateRef.current = { latency, bandwidth, packetLoss, scenario };
  }, [latency, bandwidth, packetLoss, scenario]);

  // tick for pending progress bars
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(i);
  }, []);

  const log = useCallback((entry: Omit<LogEntry, "id" | "ts">) => {
    setLogs((l) => {
      const next = [{ id: uid(), ts: Date.now(), ...entry }, ...l];
      return next.slice(0, 200);
    });
  }, []);

  const computeDuration = (s: SimState) => {
    const base = s.latency * BANDWIDTH_MULT[s.bandwidth];
    const jitter = base * (Math.random() * 0.25);
    let extra = 0;
    if (s.scenario === "delayed") extra = 1500 + Math.random() * 1200;
    if (s.scenario === "timeout") extra = 5000;
    return Math.round(base + jitter + extra);
  };

  const simulateRequest = useCallback(
    (url: string, method = "GET"): Promise<SimResult> => {
      const s = stateRef.current;
      const id = uid();
      const duration = computeDuration(s);
      const expectedMs = s.scenario === "timeout" ? 5000 : duration;

      log({
        level: "info",
        method,
        url,
        message: "Request sent...",
      });

      setPending((p) => [...p, { id, url, startedAt: Date.now(), expectedMs }]);

      return new Promise((resolve) => {
        setTimeout(() => {
          setPending((p) => p.filter((r) => r.id !== id));

          const lost = Math.random() * 100 < s.packetLoss;
          if (lost) {
            log({
              level: "warn",
              method,
              url,
              status: "ERR",
              durationMs: duration,
              message: `Request failed (Packet loss)\nLoaded in ${duration} ms`,
            });
            return resolve({ ok: false, status: "ERR", durationMs: duration, packetLost: true });
          }

          if (s.scenario === "timeout") {
            log({
              level: "error",
              method,
              url,
              status: "TIMEOUT",
              durationMs: 5000,
              message: `Request failed (TIMEOUT)\nLoaded in 5000 ms`,
            });
            return resolve({ ok: false, status: "TIMEOUT", durationMs: 5000, packetLost: false });
          }
          if (s.scenario === "notfound") {
            log({
              level: "warn",
              method,
              url,
              status: 404,
              durationMs: duration,
              message: `Response received with error (404 Not Found)\nLoaded in ${duration} ms`,
            });
            return resolve({ ok: false, status: 404, durationMs: duration, packetLost: false });
          }
          if (s.scenario === "server") {
            log({
              level: "error",
              method,
              url,
              status: 500,
              durationMs: duration,
              message: `Response received with error (500 Internal Server Error)\nLoaded in ${duration} ms`,
            });
            return resolve({ ok: false, status: 500, durationMs: duration, packetLost: false });
          }

          log({
            level: "success",
            method,
            url,
            status: 200,
            durationMs: duration,
            message: `Response received successfully (200 OK)\nLoaded in ${duration} ms`,
          });
          resolve({ ok: true, status: 200, durationMs: duration, packetLost: false });
        }, expectedMs);
      });
    },
    [log],
  );

  const reset = useCallback(() => {
    setLatency(120);
    setBandwidth("fast");
    setPacketLoss(0);
    setScenario("success");
    setLogs([]);
    setPending([]);
    log({ level: "info", method: "SYS", url: "/simulator", message: "↻ simulation reset to defaults" });
  }, [log]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    // state
    latency, setLatency,
    bandwidth, setBandwidth,
    packetLoss, setPacketLoss,
    scenario, setScenario,
    logs, pending, tick,
    // actions
    simulateRequest, log, reset, clearLogs,
  };
}

export type Simulation = ReturnType<typeof useSimulation>;
