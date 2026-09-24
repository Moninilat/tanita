import { describe, expect, it } from "vitest";
import {
  calculateBmi,
  calculateBodyFatMass,
  calculateWaistToHipRatio,
  summarizeMetricHistory,
} from "../lib/metrics";

describe("body fat mass", () => {
  it("calculates body fat mass without rounding", () => {
    expect(calculateBodyFatMass(53.8, 25.6)).toBe(13.7728);
  });

  it("returns null when an input is missing", () => {
    expect(calculateBodyFatMass(null, 25.6)).toBeNull();
    expect(calculateBodyFatMass(53.8, null)).toBeNull();
  });
});

describe("waist-to-hip ratio", () => {
  it("calculates the ratio", () => {
    expect(calculateWaistToHipRatio(66, 93.5)).toBeCloseTo(0.705882);
  });

  it("returns null for missing or invalid inputs", () => {
    expect(calculateWaistToHipRatio(null, 93.5)).toBeNull();
    expect(calculateWaistToHipRatio(66, null)).toBeNull();
    expect(calculateWaistToHipRatio(66, 0)).toBeNull();
  });
});

describe("BMI", () => {
  it("calculates BMI from kilograms and centimeters", () => {
    expect(calculateBmi(53.8, 165)).toBeCloseTo(19.7612);
  });

  it("returns null for missing or invalid inputs", () => {
    expect(calculateBmi(null, 165)).toBeNull();
    expect(calculateBmi(53.8, null)).toBeNull();
    expect(calculateBmi(53.8, 0)).toBeNull();
  });
});

describe("metric history", () => {
  it("summarizes the reference weight history", () => {
    expect(summarizeMetricHistory([55.05, 53.8])).toEqual({
      current: 53.8,
      first: 55.05,
      previous: 55.05,
      changeFromFirst: -1.25,
      changeFromPrevious: -1.25,
    });
  });

  it("skips null values", () => {
    expect(summarizeMetricHistory([60, null, 58])).toEqual({
      current: 58,
      first: 60,
      previous: 60,
      changeFromFirst: -2,
      changeFromPrevious: -2,
    });
  });

  it("summarizes multiple values", () => {
    expect(summarizeMetricHistory([65, 60, 58])).toEqual({
      current: 58,
      first: 65,
      previous: 60,
      changeFromFirst: -7,
      changeFromPrevious: -2,
    });
  });

  it("handles one value and no values", () => {
    expect(summarizeMetricHistory([53.8])).toEqual({
      current: 53.8,
      first: 53.8,
      previous: null,
      changeFromFirst: 0,
      changeFromPrevious: null,
    });
    expect(summarizeMetricHistory([])).toEqual({
      current: null,
      first: null,
      previous: null,
      changeFromFirst: null,
      changeFromPrevious: null,
    });
    expect(summarizeMetricHistory([null, null])).toEqual({
      current: null,
      first: null,
      previous: null,
      changeFromFirst: null,
      changeFromPrevious: null,
    });
  });

  it("uses measured_at and id to order timestamped history", () => {
    expect(
      summarizeMetricHistory([
        { value: 58, measured_at: "2026-03-01", id: "b" },
        { value: 60, measured_at: "2026-01-01", id: "a" },
        { value: 59, measured_at: "2026-01-01", id: "b" },
      ]),
    ).toEqual({
      current: 58,
      first: 60,
      previous: 59,
      changeFromFirst: -2,
      changeFromPrevious: -1,
    });
  });

  it("uses raw percentage-point arithmetic", () => {
    expect(summarizeMetricHistory([30, 25])).toMatchObject({
      changeFromFirst: -5,
      changeFromPrevious: -5,
    });
  });
});