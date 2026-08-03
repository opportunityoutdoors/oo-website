"use client";

import FormField from "@/components/forms/FormField";
import { INTEREST_GROUPS } from "@/lib/constants/interests";
import {
  EXPECTATIONS_QUESTION,
  followupQuestions,
  FAVORITE_PART_QUESTION,
  FOLLOW_UP_OPTIONS,
  INTERESTS_QUESTION,
  MET_EXPECTATIONS_QUESTION,
  RECOMMEND_QUESTION,
  SCALE_MAX,
  SCALE_MIN,
  scaleQuestions,
  type EventKind,
  type SurveyAnswers,
  type SurveyKind,
} from "@/lib/surveys/questions";

// One component for both surveys, so a pre answer and a post answer are collected with
// identical wording and scales. If these drifted apart the deltas would be measuring the
// question change rather than the participant.

export { EMPTY_ANSWERS } from "@/lib/surveys/questions";

const SCALE_VALUES = Array.from(
  { length: SCALE_MAX - SCALE_MIN + 1 },
  (_, i) => SCALE_MIN + i
);

function Scale({
  name,
  label,
  lowLabel,
  highLabel,
  value,
  onChange,
  required = true,
}: {
  name: string;
  label: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (v: number) => void;
  required?: boolean;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 block text-sm font-semibold text-near-black">
        {label} {required && <span className="text-red-500">*</span>}
      </legend>
      <div className="flex flex-wrap gap-1.5">
        {SCALE_VALUES.map((n) => {
          const selected = value === n;
          return (
            <label
              key={n}
              className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded border text-sm font-semibold transition-colors ${
                selected
                  ? "border-dark-green bg-dark-green text-white"
                  : "border-near-black/20 bg-white text-near-black/70 hover:border-dark-green/50"
              }`}
            >
              {/* Real radio inputs, visually hidden, so keyboard and screen reader users
                  get normal radio-group behavior instead of a grid of divs. */}
              <input
                type="radio"
                name={name}
                value={n}
                checked={selected}
                onChange={() => onChange(n)}
                className="sr-only"
                required={required}
              />
              {n}
            </label>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-near-black/50">
        <span>
          {SCALE_MIN} = {lowLabel}
        </span>
        <span>
          {SCALE_MAX} = {highLabel}
        </span>
      </div>
    </fieldset>
  );
}

export default function SurveyQuestions({
  kind,
  eventKind,
  namePrefix,
  value,
  onChange,
}: {
  kind: SurveyKind;
  /** Drives hunting / fishing / outdoors wording. Same event on both sides of a pair. */
  eventKind: EventKind;
  /** Keeps radio groups distinct when the form renders more than one participant. */
  namePrefix: string;
  value: SurveyAnswers;
  onChange: (next: SurveyAnswers) => void;
}) {
  const set = <K extends keyof SurveyAnswers>(key: K, v: SurveyAnswers[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      {scaleQuestions(eventKind).map((q) => (
        <Scale
          key={q.key}
          name={`${namePrefix}-${q.key}`}
          label={q.label}
          lowLabel={q.lowLabel}
          highLabel={q.highLabel}
          value={value[q.key]}
          onChange={(v) => set(q.key, v)}
        />
      ))}

      <div>
        <span className="mb-1 block text-sm font-semibold text-near-black">
          {INTERESTS_QUESTION.label}
        </span>
        <p className="mb-3 text-xs text-near-black/50">
          {INTERESTS_QUESTION.hint}
        </p>
        <div className="space-y-3">
          {INTEREST_GROUPS.map((group) => (
            <div key={group.title}>
              <span className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/40">
                {group.title}
              </span>
              <FormField
                type="checkbox-group"
                label=""
                name={`${namePrefix}-interests-${group.title.toLowerCase()}`}
                value={value.interests}
                onChange={(v) => set("interests", v)}
                options={group.options}
              />
            </div>
          ))}
        </div>
      </div>

      {kind === "pre" && (
        <FormField
          type="textarea"
          label={EXPECTATIONS_QUESTION.label}
          name={`${namePrefix}-expectations`}
          value={value.expectations ?? ""}
          onChange={(v) => set("expectations", v)}
        />
      )}

      {kind === "followup" && (
        <>
          {(() => {
            const q = followupQuestions(eventKind);
            return (
              <>
                <FormField
                  type="radio"
                  label={q.wentOut.label}
                  name={`${namePrefix}-wentOut`}
                  required
                  value={value.wentOut ?? ""}
                  onChange={(v) => set("wentOut", v)}
                  options={q.wentOut.options}
                />
                <FormField
                  type="radio"
                  label={q.tookSomeoneOut.label}
                  name={`${namePrefix}-tookSomeoneOut`}
                  required
                  value={value.tookSomeoneOut ?? ""}
                  onChange={(v) => set("tookSomeoneOut", v)}
                  options={q.tookSomeoneOut.options}
                />
                <FormField
                  type="radio"
                  label={q.boughtLicense.label}
                  name={`${namePrefix}-boughtLicense`}
                  value={value.boughtLicense ?? ""}
                  onChange={(v) => set("boughtLicense", v)}
                  options={q.boughtLicense.options}
                />
                <FormField
                  type="radio"
                  label={q.wouldMentor.label}
                  name={`${namePrefix}-wouldMentor`}
                  value={value.wouldMentor ?? ""}
                  onChange={(v) => set("wouldMentor", v)}
                  options={q.wouldMentor.options}
                />
                <FormField
                  type="textarea"
                  label={q.whatWouldHelp.label}
                  name={`${namePrefix}-whatWouldHelp`}
                  value={value.whatWouldHelp ?? ""}
                  onChange={(v) => set("whatWouldHelp", v)}
                />
              </>
            );
          })()}
        </>
      )}

      {kind === "post" && (
        <>
          <Scale
            name={`${namePrefix}-metExpectations`}
            label={MET_EXPECTATIONS_QUESTION.label}
            lowLabel={MET_EXPECTATIONS_QUESTION.lowLabel}
            highLabel={MET_EXPECTATIONS_QUESTION.highLabel}
            value={value.metExpectations ?? 0}
            onChange={(v) => set("metExpectations", v)}
          />

          <FormField
            type="textarea"
            label={FAVORITE_PART_QUESTION.label}
            name={`${namePrefix}-favoritePart`}
            value={value.favoritePart ?? ""}
            onChange={(v) => set("favoritePart", v)}
          />

          <Scale
            name={`${namePrefix}-recommend`}
            label={RECOMMEND_QUESTION.label}
            lowLabel={RECOMMEND_QUESTION.lowLabel}
            highLabel={RECOMMEND_QUESTION.highLabel}
            value={value.recommend ?? 0}
            onChange={(v) => set("recommend", v)}
          />

          <div>
            <span className="mb-2 block text-sm font-semibold text-near-black">
              What&apos;s next for you?
            </span>
            <FormField
              type="checkbox-group"
              label=""
              name={`${namePrefix}-followUp`}
              value={value.followUp ?? []}
              onChange={(v) => set("followUp", v)}
              options={FOLLOW_UP_OPTIONS}
            />
          </div>
        </>
      )}
    </div>
  );
}
