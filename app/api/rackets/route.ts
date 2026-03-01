import Papa from "papaparse";

export const runtime = "nodejs";
export const revalidate = 300;

function pick(row: any, key: string) {
  return row?.[key] ?? "";
}
function lower(s: any) {
  return String(s || "").trim().toLowerCase();
}
function num(v: any) {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  const url =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFgT6206hx8BdSHGb4uojKm2wWzh8hcWhA7jFRoXBbK91qb64oyDxeuutiSsrus4LUsXbjfU20SYaV/pub?output=csv&single=true";

  const res = await fetch(url);
  const csv = await res.text();

  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  const rows = (parsed.data as any[]) || [];

  // ✅ Convert your sheet columns → clean fields your app can use
  const rackets = rows.map((r) => ({
    id: String(pick(r, "id") || "").trim(),
    brand: String(pick(r, "brand") || "").trim(),
    model: String(pick(r, "model") || "").trim(),

    shape: lower(pick(r, "shape (round/teardrop/diamond)")), // round/teardrop/diamond
    balance: lower(pick(r, "balance (low/medium/high)")),     // low/medium/high
    weight_g: num(pick(r, "weight_g")),
    core: lower(pick(r, "core (soft/medium/hard)")),          // soft/medium/hard
    sweet_spot: lower(pick(r, "sweet_spot (large/medium/small)")),
    vibration_damping: lower(pick(r, "vibration_damping (low/medium/high)")),
    maneuverability: lower(pick(r, "maneuverability (low/medium/high)")),

    power: num(pick(r, "power (1-10)")),
    control: num(pick(r, "control (1-10)")),
    forgiveness: num(pick(r, "forgiveness (1-10)")),

    recommended_level: lower(
      pick(r, "recommended_level (beginner/intermediate/advanced)")
    ),

    image_url: String(pick(r, "image_url (optional)") || "").trim() || undefined,
    buy_url: String(pick(r, "buy_url (option)") || "").trim() || undefined,
  }));

  // (optional) filter out empty rows
  const cleaned = rackets.filter((x) => x.id && x.brand && x.model);

  return Response.json({ rackets: cleaned });
}