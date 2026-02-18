import { CorrelationService } from "~/modules/analytics/correlation/correlation.service";

describe("CorrelationService", () => {
  const service = new CorrelationService();

  it("should return near zero when data is flat", () => {
    const score = service.compute([
      { youtubeViews: 10, webSessions: 10 },
      { youtubeViews: 10, webSessions: 10 },
      { youtubeViews: 10, webSessions: 10 }
    ]);

    expect(score).toBe(0);
  });

  it("should return positive score when correlated", () => {
    const score = service.compute([
      { youtubeViews: 100, webSessions: 80 },
      { youtubeViews: 200, webSessions: 170 },
      { youtubeViews: 300, webSessions: 260 }
    ]);

    expect(score).toBeGreaterThan(0.8);
  });
});
