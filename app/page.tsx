"use client";

import React, { useEffect, useMemo, useState } from "react";

type Level = "beginner" | "intermediate" | "advanced";
type Style = "control" | "balanced" | "power";
type Swing = "compact" | "medium" | "long";
type Feel = "soft" | "neutral" | "hard";
type OffCenter = "never" | "sometimes" | "often";
type Gender = "woman" | "man" | "kid";
type WeightCat = "unknown" | "330-345" | "346-360" | "361-375" | "376+";
type Budget = "no_limit" | "under_120" | "120_180" | "180_250" | "250_plus";

type Racket = {
  id: string;
  brand: string;
  model: string;

  shape: "round" | "teardrop" | "diamond" | string;
  balance: "low" | "medium" | "high" | string;
  weight_g: number;
  price_eur?: number;

  core: "soft" | "medium" | "hard" | string;
  sweet_spot: "large" | "medium" | "small" | string;

  vibration_damping: "low" | "medium" | "high" | string;
  maneuverability: "low" | "medium" | "high" | string;

  power: number;
  control: number;
  forgiveness: number;

  recommended_level: Level | string;

  image_url?: string;
  buy_url?: string;
};

type Answers = {
  gender: Gender;
  level: Level;
  style: Style;
  swing: Swing;
  strength: "low" | "medium" | "high";
  frequency: "1x" | "2-3x" | "4x+";
  armPain: boolean;
  feel: Feel;
  weightCat: WeightCat;
  sweetSpotPref: "large" | "normal" | "small";
  offCenter: OffCenter;
  budget: Budget;
};

const DEFAULT: Answers = {
  gender: "woman",
  level: "beginner",
  style: "balanced",
  swing: "medium",
  strength: "medium",
  frequency: "2-3x",
  armPain: false,
  feel: "neutral",
  weightCat: "unknown",
  sweetSpotPref: "large",
  offCenter: "sometimes",
  budget: "no_limit",
};

function levelRank(l: string) {
  return l === "beginner" ? 0 : l === "intermediate" ? 1 : 2;
}

function weightCatRange(cat: WeightCat): { min?: number; max?: number } {
  switch (cat) {
    case "330-345":
      return { min: 330, max: 345 };
    case "346-360":
      return { min: 346, max: 360 };
    case "361-375":
      return { min: 361, max: 375 };
    case "376+":
      return { min: 376, max: undefined };
    default:
      return {};
  }
}
function budgetMax(b: Budget): number | undefined {
  switch (b) {
    case "under_120":
      return 120;
    case "120_180":
      return 180;
    case "180_250":
      return 250;
    case "250_plus":
      return undefined; // basically no max
    case "no_limit":
    default:
      return undefined;
  }
}
function inRange(w: number, min?: number, max?: number) {
  if (!Number.isFinite(w)) return false;
  if (min != null && w < min) return false;
  if (max != null && w > max) return false;
  return true;
}

function scoreRacket(r: Racket, a: Answers) {
  let score = 0;
  const reasons: string[] = [];
  const cautions: string[] = [];

  const W_LEVEL = 12;
  const W_STYLE = 16;
  const W_ARM = 18;
  const W_SWING = 10;
  const W_FEEL = 8;
  const W_WEIGHT = 10;
  const W_FORGIVENESS = 12;
  const W_SWEETSPOT_PREF = 6;
  const W_GENDER = 6;

  // Gender: gentle hint (kid => lighter recommended)
  if (a.gender === "kid") {
    if (r.weight_g && r.weight_g <= 350) {
      score += W_GENDER;
      reasons.push("Lighter weight suits a kid better.");
    } else {
      cautions.push("Might be heavy for a kid.");
    }
  } else {
    if (r.weight_g && r.weight_g >= 345 && r.weight_g <= 375) score += W_GENDER * 0.25;
  }

  // Level fit
  const diff = levelRank(String(r.recommended_level)) - levelRank(a.level);
  if (diff <= 0) score += W_LEVEL;
  else if (diff === 1) {
    score += W_LEVEL * 0.35;
    cautions.push("May feel demanding for your current level.");
  } else {
    score -= W_LEVEL * 0.8;
    cautions.push("Likely too demanding right now.");
  }

  // Style
  if (a.style === "control") {
    score += W_STYLE * (r.control / 10);
    if (r.shape === "round") reasons.push("Round shape supports control and defense.");
    if (r.balance === "low") reasons.push("Lower balance improves handling and placement.");
  } else if (a.style === "power") {
    score += W_STYLE * (r.power / 10);
    if (r.shape === "diamond") reasons.push("Diamond shape favors power on overheads.");
    if (r.balance === "high") reasons.push("Higher balance helps generate punch.");
  } else {
    score += W_STYLE * ((r.power + r.control) / 20);
    if (r.shape === "teardrop") reasons.push("Teardrop shape is often a balanced all-rounder.");
  }

  // Arm pain
  if (a.armPain) {
    const damping =
      r.vibration_damping === "high" ? 1 : r.vibration_damping === "medium" ? 0.6 : 0.15;
    const corePenalty = r.core === "hard" ? 1 : r.core === "medium" ? 0.4 : 0;

    score += W_ARM * damping;
    score -= W_ARM * 0.9 * corePenalty;

    if (r.vibration_damping === "high") reasons.push("High damping is kinder to the arm.");
    if (r.core === "hard") cautions.push("Hard core can aggravate tennis elbow.");
  }

  // Swing
  if (a.swing === "compact") {
    const m = r.maneuverability === "high" ? 1 : r.maneuverability === "medium" ? 0.6 : 0.2;
    score += W_SWING * m;
    if (r.maneuverability === "high") reasons.push("High maneuverability suits fast exchanges.");
    if (r.balance === "high") cautions.push("High balance can feel sluggish in defense.");
  } else if (a.swing === "long") {
    score += W_SWING * (r.power / 10);
    if (r.power >= 8) reasons.push("Higher power rewards a longer, faster swing.");
  } else {
    score += W_SWING * ((r.power + r.control) / 20);
  }

  // Feel
  const feelMatch =
    (a.feel === "soft" && r.core === "soft") ||
    (a.feel === "neutral" && r.core === "medium") ||
    (a.feel === "hard" && r.core === "hard");
  score += feelMatch ? W_FEEL : W_FEEL * 0.25;
  if (feelMatch) reasons.push("Core feel matches your preference.");

  // Weight category
  if (a.weightCat !== "unknown") {
    const { min, max } = weightCatRange(a.weightCat);
    if (inRange(r.weight_g, min, max)) {
      score += W_WEIGHT;
      reasons.push("Weight fits your chosen range.");
    } else {
      score -= W_WEIGHT * 0.35;
      cautions.push("Weight is outside your chosen range.");
    }
  }

  // Forgiveness
  const forgivenessNeed =
    a.level === "beginner" || a.offCenter === "often"
      ? 1
      : a.offCenter === "sometimes"
      ? 0.6
      : 0.2;

  score += W_FORGIVENESS * forgivenessNeed * (r.forgiveness / 10);
  if ((a.level === "beginner" || a.offCenter !== "never") && r.sweet_spot === "large") {
    reasons.push("Large sweet spot helps on off-center hits.");
  }

  // Sweet spot preference
  const pref =
    a.sweetSpotPref === "large"
      ? r.sweet_spot === "large"
      : a.sweetSpotPref === "small"
      ? r.sweet_spot === "small"
      : r.sweet_spot !== "small";
  score += pref ? W_SWEETSPOT_PREF : 0;
  if (pref) reasons.push("Sweet spot size matches what you want.");

  // Strength hint
  if (a.strength === "low" && r.balance === "high") cautions.push("High balance may feel heavy.");

  return {
    score,
    reasons: Array.from(new Set(reasons)).slice(0, 4),
    cautions: Array.from(new Set(cautions)).slice(0, 3),
  };
}

type Step = {
  id: string;
  title: string;
  subtitle?: string;
  render: (a: Answers, setA: (next: Answers) => void, next: () => void) => React.ReactNode;
};

function OptionCards({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; hint?: string }[];
}) {
  return (
    <div className="grid gap-3">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={[
              "text-left rounded-2xl border px-4 py-4 transition transform duration-200",
              active
                ? "border-black bg-black text-white shadow-lg scale-[1.02]"
                : "border-gray-200 hover:border-black hover:scale-[1.01]",
            ].join(" ")}
          >
            <div className="font-semibold">{o.label}</div>
            {o.hint ? (
              <div className={["text-sm mt-1", active ? "text-white/80" : "text-gray-600"].join(" ")}>
                {o.hint}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

export default function Page() {
  const [a, setA] = useState<Answers>(DEFAULT);
  const [stepIndex, setStepIndex] = useState(0);
  const [rackets, setRackets] = useState<Racket[]>([]);
  const [loading, setLoading] = useState(true);

  const goNext = () => setStepIndex((s) => s + 1);
  const goBack = () => setStepIndex((s) => Math.max(0, s - 1));

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/rackets");
      const json = await res.json();
      setRackets(json.rackets ?? []);
      setLoading(false);
    })();
  }, []);

  const steps: Step[] = [
    {
      id: "gender",
      title: "Who is the racket for?",
      subtitle: "This helps us tune weight and comfort.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.gender}
          onChange={(v) => {
            setA({ ...a, gender: v as Gender });
            next();
          }}
          options={[
            { value: "woman", label: "Woman" },
            { value: "man", label: "Man" },
            { value: "kid", label: "Kid", hint: "We’ll prefer lighter rackets." },
          ]}
        />
      ),
    },
    {
      id: "level",
      title: "What’s your level?",
      subtitle: "Be honest—this has the biggest impact.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.level}
          onChange={(v) => {
            setA({ ...a, level: v as Level });
            next();
          }}
          options={[
            { value: "beginner", label: "Beginner", hint: "Learning technique, want forgiveness." },
            { value: "intermediate", label: "Intermediate", hint: "More consistency, starting tactics." },
            { value: "advanced", label: "Advanced", hint: "Fast pace, confident in overheads." },
          ]}
        />
      ),
    },
    {
      id: "style",
      title: "What’s your play style?",
      subtitle: "Choose what you enjoy most.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.style}
          onChange={(v) => {
            setA({ ...a, style: v as Style });
            next();
          }}
          options={[
            { value: "control", label: "Mostly control", hint: "Placement, defense, consistency." },
            { value: "balanced", label: "Balanced", hint: "A bit of everything." },
            { value: "power", label: "Mostly power", hint: "Aggressive overheads and finishes." },
          ]}
        />
      ),
    },
    {
      id: "swing",
      title: "How long is your swing?",
      subtitle: "This affects maneuverability vs power.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.swing}
          onChange={(v) => {
            setA({ ...a, swing: v as Swing });
            next();
          }}
          options={[
            { value: "compact", label: "Compact / short", hint: "Quick reactions, short take-back." },
            { value: "medium", label: "Medium", hint: "Normal swing length." },
            { value: "long", label: "Long / full", hint: "Bigger swing, more acceleration." },
          ]}
        />
      ),
    },
    {
      id: "strength",
      title: "How would you rate your strength?",
      subtitle: "Helps match balance and handling.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.strength}
          onChange={(v) => {
            setA({ ...a, strength: v as any });
            next();
          }}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
        />
      ),
    },
    {
      id: "frequency",
      title: "How often do you play?",
      subtitle: "More play = comfort matters more.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.frequency}
          onChange={(v) => {
            setA({ ...a, frequency: v as any });
            next();
          }}
          options={[
            { value: "1x", label: "1× per week" },
            { value: "2-3x", label: "2–3× per week" },
            { value: "4x+", label: "4×+ per week" },
          ]}
        />
      ),
    },
    {
      id: "armPain",
      title: "Any arm discomfort?",
      subtitle: "Tennis elbow / shoulder pain changes the recommendation a lot.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.armPain ? "yes" : "no"}
          onChange={(v) => {
            setA({ ...a, armPain: v === "yes" });
            next();
          }}
          options={[
            { value: "no", label: "No" },
            { value: "yes", label: "Yes", hint: "We’ll prefer damping + softer feel." },
          ]}
        />
      ),
    },
    {
      id: "feel",
      title: "What feel do you like?",
      subtitle: "Soft = comfort, hard = crisp response.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.feel}
          onChange={(v) => {
            setA({ ...a, feel: v as Feel });
            next();
          }}
          options={[
            { value: "soft", label: "Soft / comfort" },
            { value: "neutral", label: "Neutral" },
            { value: "hard", label: "Hard / crisp" },
          ]}
        />
      ),
    },
    {
      id: "weightCat",
      title: "Preferred weight range (grams)?",
      subtitle: "If you’re unsure, choose “I don’t know”.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.weightCat}
          onChange={(v) => {
            setA({ ...a, weightCat: v as WeightCat });
            next();
          }}
          options={[
            { value: "unknown", label: "I don’t know" },
            { value: "330-345", label: "330–345g", hint: "Very light" },
            { value: "346-360", label: "346–360g", hint: "Light / medium" },
            { value: "361-375", label: "361–375g", hint: "Medium / heavy" },
            { value: "376+", label: "376g+", hint: "Heavy" },
          ]}
        />
      ),
    },
    {
  id: "budget",
  title: "What’s your budget?",
  subtitle: "We’ll filter out rackets above your budget.",
  render: (a, setA, next) => (
    <OptionCards
      value={a.budget}
      onChange={(v) => {
        setA({ ...a, budget: v as Budget });
        next();
      }}
      options={[
        { value: "no_limit", label: "No limit" },
        { value: "under_120", label: "Under €120" },
        { value: "120_180", label: "€120 – €180" },
        { value: "180_250", label: "€180 – €250" },
        { value: "250_plus", label: "€250+" },
      ]}
    />
  ),
},
    {
      id: "sweetSpotPref",
      title: "Sweet spot preference?",
      subtitle: "Bigger sweet spot = more forgiving.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.sweetSpotPref}
          onChange={(v) => {
            setA({ ...a, sweetSpotPref: v as any });
            next();
          }}
          options={[
            { value: "large", label: "Large (forgiving)" },
            { value: "normal", label: "Normal" },
            { value: "small", label: "Small (precision)" },
          ]}
        />
      ),
    },
    {
      id: "offCenter",
      title: "Do you miss off-center hits?",
      subtitle: "This helps us prioritize forgiveness.",
      render: (a, setA, next) => (
        <OptionCards
          value={a.offCenter}
          onChange={(v) => {
            setA({ ...a, offCenter: v as OffCenter });
            next();
          }}
          options={[
            { value: "never", label: "Never" },
            { value: "sometimes", label: "Sometimes" },
            { value: "often", label: "Often" },
          ]}
        />
      ),
    },
  ];

  const isResults = stepIndex >= steps.length;
  const progress = Math.round((Math.min(stepIndex, steps.length) / steps.length) * 100);

  const results = useMemo(() => {
  const max = budgetMax(a.budget);

const filtered = max
  ? rackets.filter((r) => (r.price_eur ?? Infinity) <= max)
  : rackets;

const scored = filtered.map((r) => ({ r, ...scoreRacket(r, a) }));
    scored.sort((x, y) => y.score - x.score);
    return scored.slice(0, 5);
  }, [rackets, a]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Padel Racket Finder</h1>
            <p className="mt-2 text-gray-600">
              Answer a few quick questions. We’ll recommend rackets and explain why.
            </p>
          </div>

          <div className="hidden md:flex flex-wrap gap-2 justify-end">
            <Pill label="Level" value={a.level} />
            <Pill label="Style" value={a.style} />
            <Pill label="Feel" value={a.feel} />
          </div>
        </div>

        {/* Progress */}
        <div className="mt-8">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>{isResults ? "Results" : `Question ${stepIndex + 1} of ${steps.length}`}</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 w-full rounded-full bg-gray-200 overflow-hidden">
            <div className="h-2 rounded-full bg-black transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-5">
          {/* Main card */}
          <div className="md:col-span-3 rounded-3xl border border-gray-200 bg-white p-6 shadow-xl transition-all duration-300">
            {!isResults ? (
              <div key={stepIndex} className="animate-slide">
                <div className="mb-5">
                  <div className="text-sm font-semibold text-gray-500">Question</div>
                  <h2 className="mt-1 text-2xl font-bold">{steps[stepIndex].title}</h2>
                  {steps[stepIndex].subtitle ? (
                    <p className="mt-2 text-gray-600">{steps[stepIndex].subtitle}</p>
                  ) : null}
                </div>

                {steps[stepIndex].render(a, setA, goNext)}

                <div className="mt-8 flex justify-start">
                  <button
                    type="button"
                    onClick={goBack}
                    disabled={stepIndex === 0}
                    className={[
                      "rounded-2xl px-4 py-2 font-semibold border transition",
                      stepIndex === 0
                        ? "border-gray-200 text-gray-400 cursor-not-allowed"
                        : "border-gray-300 hover:border-black hover:bg-black hover:text-white",
                    ].join(" ")}
                  >
                    Back
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Your top matches</h2>
                    <p className="mt-2 text-gray-600">
                      We ranked rackets based on your answers and explain the fit below.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStepIndex(0)}
                    className="rounded-2xl px-4 py-2 font-semibold border border-gray-200 hover:border-gray-300"
                  >
                    Edit answers
                  </button>
                </div>

                <div className="mt-6">
                  {loading ? (
                    <div className="text-gray-600">Loading rackets…</div>
                  ) : results.length === 0 ? (
                    <div className="text-gray-600">No rackets found. Add rows to your Google Sheet.</div>
                  ) : (
                    <div className="grid gap-4">
                      {results.map(({ r, score, reasons, cautions }) => (
                        <div key={r.id} className="rounded-2xl border border-gray-200 p-4 hover:shadow-md transition">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="font-bold text-lg">
                                {r.brand} — {r.model}
                              </div>
                              <div className="mt-1 text-sm text-gray-600">
                                {r.shape} · {r.balance} balance · {r.weight_g}g · {r.core} core · {r.sweet_spot} sweet spot
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-gray-500">Score</div>
                              <div className="text-xl font-bold">{Math.round(score)}</div>
                            </div>
                          </div>

                          {reasons.length > 0 && (
                            <>
                              <div className="mt-4 text-sm font-semibold">Why it fits</div>
                              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                                {reasons.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </>
                          )}

                          {cautions.length > 0 && (
                            <>
                              <div className="mt-4 text-sm font-semibold">Watch-outs</div>
                              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                                {cautions.map((x) => (
                                  <li key={x}>{x}</li>
                                ))}
                              </ul>
                            </>
                          )}

                          {r.buy_url ? (
                            <div className="mt-4">
                              <a
                                className="inline-flex items-center justify-center rounded-2xl bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                                href={r.buy_url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                View / Buy
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Side card */}
          <div className="md:col-span-2 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-gray-500">Your answers</div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill label="Gender" value={a.gender} />
              <Pill label="Level" value={a.level} />
              <Pill label="Style" value={a.style} />
              <Pill label="Swing" value={a.swing} />
              <Pill label="Strength" value={a.strength} />
              <Pill label="Freq" value={a.frequency} />
              <Pill label="Arm" value={a.armPain ? "yes" : "no"} />
              <Pill label="Feel" value={a.feel} />
              <Pill label="Weight" value={a.weightCat} />
              <Pill label="Sweet" value={a.sweetSpotPref} />
              <Pill label="Off-center" value={a.offCenter} />
            </div>

            <div className="mt-6 border-t border-gray-200 pt-5">
              <div className="text-sm font-semibold text-gray-500">Preview</div>
              <div className="mt-2 text-sm text-gray-700">
                {isResults ? (
                  <span>Showing your recommendations.</span>
                ) : (
                  <span>
                    Next up:{" "}
                    <span className="font-semibold">
                      {steps[Math.min(stepIndex + 1, steps.length - 1)]?.title}
                    </span>
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-black text-white p-4">
              <div className="text-sm font-semibold opacity-80">Pro tip</div>
              <div className="mt-2 text-sm opacity-90">
                For beginners, “round + soft/medium + large sweet spot” usually feels easiest.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-gray-500">
          Built with your Google Sheet as the racket database.
        </div>
      </div>
    </div>
  );
}