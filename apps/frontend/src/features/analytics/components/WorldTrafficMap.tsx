import type { Ga4Country } from "@/lib/api/analytics";

interface CountryShape {
  code: string;
  name: string;
  points: string;
}

const COUNTRY_SHAPES: CountryShape[] = [
  { code: "CA", name: "Canada", points: "118,70 196,70 212,106 122,106" },
  { code: "US", name: "United States", points: "122,110 210,110 224,156 128,162" },
  { code: "MX", name: "Mexico", points: "162,166 205,166 222,196 178,200" },
  { code: "BR", name: "Brazil", points: "242,216 302,216 314,286 250,300" },
  { code: "AR", name: "Argentina", points: "264,306 298,306 304,356 270,362" },
  { code: "GB", name: "United Kingdom", points: "398,112 412,112 416,136 400,138" },
  { code: "IE", name: "Ireland", points: "388,116 396,116 398,132 390,132" },
  { code: "FR", name: "France", points: "414,142 440,142 444,170 416,172" },
  { code: "ES", name: "Spain", points: "404,172 432,172 436,194 406,194" },
  { code: "DE", name: "Germany", points: "444,132 466,132 470,158 446,160" },
  { code: "IT", name: "Italy", points: "454,168 474,168 478,206 460,208" },
  { code: "NL", name: "Netherlands", points: "438,122 448,122 450,136 440,136" },
  { code: "PL", name: "Poland", points: "474,134 496,134 500,158 476,160" },
  { code: "SE", name: "Sweden", points: "452,92 476,92 480,128 456,128" },
  { code: "NO", name: "Norway", points: "430,88 450,88 452,124 432,124" },
  { code: "TR", name: "Turkey", points: "500,174 542,174 546,196 502,198" },
  { code: "RU", name: "Russia", points: "500,92 680,92 686,154 506,160" },
  { code: "MA", name: "Morocco", points: "424,200 442,200 444,218 426,220" },
  { code: "NG", name: "Nigeria", points: "456,232 478,232 482,262 460,264" },
  { code: "ZA", name: "South Africa", points: "470,324 510,324 514,356 472,360" },
  { code: "IN", name: "India", points: "572,206 618,206 622,250 578,254" },
  { code: "PK", name: "Pakistan", points: "550,194 570,194 572,224 552,224" },
  { code: "CN", name: "China", points: "618,170 688,170 694,232 624,236" },
  { code: "JP", name: "Japan", points: "708,178 724,178 726,224 710,226" },
  { code: "KR", name: "South Korea", points: "698,190 708,190 710,214 700,214" },
  { code: "ID", name: "Indonesia", points: "642,270 704,270 708,294 646,296" },
  { code: "AU", name: "Australia", points: "676,306 748,306 754,358 682,362" },
  { code: "NZ", name: "New Zealand", points: "760,338 772,338 774,362 762,362" }
];

interface WorldTrafficMapProps {
  countries: Ga4Country[];
}

function getIntensityColor(intensity: number): string {
  if (intensity <= 0) {
    return "rgba(124,58,237,0.08)";
  }

  const alpha = Math.min(0.95, 0.22 + intensity * 0.73);
  return `rgba(124,58,237,${alpha.toFixed(2)})`;
}

export function WorldTrafficMap({ countries }: WorldTrafficMapProps): JSX.Element {
  const countryByCode = new Map(countries.map((country) => [country.countryCode, country]));
  const maxSessions = Math.max(1, ...countries.map((country) => country.sessions));

  const unmappedCountries = countries
    .filter((country) => !COUNTRY_SHAPES.some((shape) => shape.code === country.countryCode))
    .slice(0, 6);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-4 font-syne text-xl font-bold text-text">Carte monde (sessions)</h2>
      <div className="overflow-x-auto">
        <svg viewBox="0 0 820 410" className="min-w-[760px] rounded-lg border border-border bg-surface2 p-2">
          <rect x="0" y="0" width="820" height="410" fill="transparent" />
          {COUNTRY_SHAPES.map((shape) => {
            const data = countryByCode.get(shape.code);
            const intensity = data ? data.sessions / maxSessions : 0;
            const fill = getIntensityColor(intensity);

            return (
              <polygon
                key={shape.code}
                points={shape.points}
                fill={fill}
                stroke="rgba(124,58,237,0.45)"
                strokeWidth={1}
                className="transition-opacity duration-150 hover:opacity-80"
              >
                <title>
                  {data
                    ? `${shape.name}: ${data.sessions} sessions`
                    : `${shape.name}: 0 session`}
                </title>
              </polygon>
            );
          })}
        </svg>
      </div>

      {unmappedCountries.length > 0 ? (
        <div className="mt-3 rounded-lg border border-border bg-surface2 p-3">
          <p className="mb-2 text-xs uppercase tracking-[0.08em] text-textMuted">Autres pays</p>
          <div className="grid gap-1 text-xs text-text2 sm:grid-cols-2">
            {unmappedCountries.map((country) => (
              <p key={`${country.countryCode}-${country.country}`}>{country.country} · {country.sessions} sessions</p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
