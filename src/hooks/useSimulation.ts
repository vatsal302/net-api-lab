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
      const next = [...l, { id: uid(), ts: Date.now(), ...entry }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
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

      const getLatencyText = (l: number) => {
        if (l < 400) return `${l} ms (Good response time)`;
        if (l < 800) return `${l} ms (High delay)`;
        if (l < 1500) return `${l} ms (Very high)`;
        return `${l} ms (Extreme delay)`;
      };

      const getLossText = (l: number) => {
        if (l === 0) return `0% (Perfect)`;
        if (l <= 10) return `${l}% (Minor interruptions possible)`;
        if (l <= 20) return `${l}% (Low impact)`;
        if (l <= 40) return `${l}% (Unstable)`;
        return `${l}% (Severe data loss)`;
      };

      const getBandwidthText = (bw: string) => {
        if (bw === "fast") return "Fast (Optimal speed)";
        if (bw === "medium") return "Medium (Normal speed)";
        return "Slow (Limited speed)";
      };
      
      const getConnectionStableText = (loss: number, lat: number) => {
        if (loss === 0 && lat < 500) return "Yes";
        if (loss <= 10 && lat < 1000) return "Mostly stable";
        if (loss > 40) return "No";
        if (loss > 20 || lat > 1500) return "Unstable";
        return "Weak";
      };

      const networkStatus = `Network Status:
Latency: ${getLatencyText(s.latency)}
Bandwidth: ${getBandwidthText(s.bandwidth)}
Packet Loss: ${getLossText(s.packetLoss)}`;

      const connectionStatus = `Connection Status:
Server Reachable: Yes
Connection Stable: ${getConnectionStableText(s.packetLoss, s.latency)}`;

      const requestDetails = `Request Details:
Request Type: ${method}
Endpoint: ${url}
Payload Size: Small`;

      log({
        level: "info",
        method,
        url,
        message: `Request Started\nEstablishing connection to server...\n\n${connectionStatus}\n\n${networkStatus}\n\n${requestDetails}\n\nProcessing request...\nFetching data...`,
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
              message: `⚠ Unstable network detected\nData packets are being lost\n\n✔ Request Partially Completed\n\nStatus: Partial Success\nResponse Time: ${duration} ms\n\nData Integrity:\nOnly partial data received (approx. ${Math.max(10, 100 - s.packetLoss)}%)\n\nUser Experience:\nSome content missing or broken\n\nFinal Result:\nSome posts failed to load\nRetry recommended`,
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
              message: `⌛ Waiting for server response...\n\nResponse taking too long...\n\n✖ Request Timed Out\n\nReason:\nServer did not respond within time limit\n\nUser Experience:\nNo content loaded due to delay`,
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
              message: `✖ Request Failed\nStatus Code: 404 Not Found\n\nError Details:\nResource missing on server\n\nUser Experience:\nContent could not be found\n\nFinal Result:\nNo data available\nPlease try again\n\n[ Retry ]`,
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
              message: `✖ Request Failed\nStatus Code: 500 Server Error\n\nError Details:\nServer encountered an unexpected issue\n\nPossible Causes:\n- Server overload\n- Internal server failure\n- Poor network conditions\n\nUser Experience:\nContent could not be loaded\n\nFinal Result:\nNo data available\nPlease try again\n\n[ Retry ]`,
            });
            return resolve({ ok: false, status: 500, durationMs: duration, packetLost: false });
          }

          if (duration > 800) {
            log({
              level: "success",
              method,
              url,
              status: 200,
              durationMs: duration,
              message: `⚠ Slow network detected\nLoading may take longer than expected\n\n✔ Request Completed\nStatus Code: 200 OK\nResponse Time: ${duration} ms\n\nData Integrity:\nAll data received correctly\n\nUser Experience:\nNoticeable delay before content appears\n\nFinal Result:\nContent loaded successfully but slowly`,
            });
          } else {
            log({
              level: "success",
              method,
              url,
              status: 200,
              durationMs: duration,
              message: `✔ Request Completed Successfully\nStatus Code: 200 OK\nResponse Time: ${duration} ms\n\nData Integrity:\nAll data received correctly (100%)\n\nUser Experience:\nFast and smooth loading\nNo visible issues\n\nFinal Result:\nAll posts loaded successfully\nDisplaying latest content`,
            });
          }
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
