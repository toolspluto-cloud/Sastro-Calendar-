import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export function loadJson<T = unknown>(filename: string): T {
  const full = path.join(DATA_DIR, filename);
  return JSON.parse(fs.readFileSync(full, "utf8")) as T;
}

export type DailyPlanningRules = {
  activity_channels: string[];
  base_scores: {
    weekday_affinity: Record<string, Record<string, number>>;
    tithi_modifier: Record<string, Record<string, number>>;
    karana_modifier: Record<string, Record<string, number>>;
    yoga_modifier: {
      inauspicious_list: string[];
      inauspicious_penalty: Record<string, number>;
      highly_auspicious: string[];
      auspicious_bonus: Record<string, number>;
    };
  };
  hour_windows: { rules: Array<Record<string, unknown>> };
  worst_day_flags?: Array<{ flag: string; severity: string; message: string }>;
  remedies_on_flag?: Record<string, unknown>;
};

export type NumerologyData = {
  letter_values_az: {
    pythagorean: Record<string, number>;
    chaldean: Record<string, number>;
  };
  formulas: Record<string, unknown>;
  lucky_unlucky_popular_practice: {
    by_life_path: Array<{
      life_path: number;
      lucky: number[];
      unlucky: number[];
      theme: string;
    }>;
  };
};

export type MeetingPrepRules = {
  rule_engine: Array<{
    if?: string;
    emit?: string;
    always?: boolean;
    emit_cap?: string;
  }>;
  commercial_flags: string[];
};

export type PanchangData = {
  vara: {
    days: Array<{ weekday: string; lord: string; favor: string }>;
  };
  rahu_kaal: {
    weekday_part: Record<string, number>;
    method: string;
  };
  tithis: {
    names_shukla_or_krishna: Array<{
      num: number;
      name: string;
      class: string;
      effect_note: string;
    }>;
  };
  inauspicious_yogas_classic: string[];
};
