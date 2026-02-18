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

  it("should detect lag when web follows youtube", () => {
    const result = service.findBestLag([
      { youtubeViews: 100, webSessions: 10 },
      { youtubeViews: 200, webSessions: 20 },
      { youtubeViews: 300, webSessions: 100 },
      { youtubeViews: 400, webSessions: 200 },
      { youtubeViews: 500, webSessions: 300 }
    ], 3);

    expect(result.lagDays).toBe(2);
    expect(result.score).toBeGreaterThan(0.95);
  });

  it("should produce a readable insight", () => {
    const insight = service.buildInsight(0.76, 2);
    expect(insight).toContain("YouTube");
    expect(insight).toContain("2");
  });
});
