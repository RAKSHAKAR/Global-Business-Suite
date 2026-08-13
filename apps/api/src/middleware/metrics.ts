import { Request, Response, NextFunction } from "express";

interface MetricsStorage {
  totalRequests: number;
  totalErrors: number;
  statusCodes: Record<string, number>;
  routes: Record<string, { requests: number; avgLatencyMs: number; totalDurationMs: number }>;
}

const metricsStore: MetricsStorage = {
  totalRequests: 0,
  totalErrors: 0,
  statusCodes: {},
  routes: {},
};

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode.toString();
    const routePath = req.route ? `${req.method} ${req.baseUrl}${req.route.path}` : `${req.method} ${req.path}`;

    metricsStore.totalRequests++;
    if (res.statusCode >= 400) {
      metricsStore.totalErrors++;
    }

    metricsStore.statusCodes[statusCode] = (metricsStore.statusCodes[statusCode] || 0) + 1;

    if (!metricsStore.routes[routePath]) {
      metricsStore.routes[routePath] = { requests: 0, avgLatencyMs: 0, totalDurationMs: 0 };
    }

    const routeStats = metricsStore.routes[routePath];
    routeStats.requests++;
    routeStats.totalDurationMs += duration;
    routeStats.avgLatencyMs = Math.round(routeStats.totalDurationMs / routeStats.requests);
  });

  next();
};

export const getMetricsData = () => {
  const memoryUsage = process.memoryUsage();
  return {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    throughput: {
      totalRequests: metricsStore.totalRequests,
      totalErrors: metricsStore.totalErrors,
      errorRate: metricsStore.totalRequests > 0 ? (metricsStore.totalErrors / metricsStore.totalRequests).toFixed(4) : "0",
    },
    statusCodes: metricsStore.statusCodes,
    routePerformance: metricsStore.routes,
    systemMemory: {
      heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
    },
  };
};

export const metricsEndpoint = (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(getMetricsData());
};
