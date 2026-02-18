export const QUEUES = {
  ANALYTICS: "analytics-ingestion",
  REPORTS: "report-generation",
  DIGEST: "ai-digest"
} as const;

export const JOBS = {
  INGEST_USER: "ingest:user",
  GENERATE_REPORT: "report:generate",
  SEND_REPORT: "report:send-email",
  GENERATE_DIGEST: "digest:generate"
} as const;
