"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = "numeric" | "text" | "multiple-choice" | "short-calculation";

interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  /** Hint shown after wrong answer (never reveals full solution) */
  feedbackHint?: string;
}

export interface NumericQuestion extends BaseQuestion {
  type: "numeric";
  expectedValue: number;
  tolerance: number; // absolute or relative
  toleranceType: "absolute" | "relative";
  unit: string;
}

export interface TextQuestion extends BaseQuestion {
  type: "text";
  /** Keywords that must appear (case-insensitive) */
  keywords: string[];
  minLength?: number;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: "multiple-choice";
  options: string[];
  correctIndex: number;
}

export interface ShortCalculationQuestion extends BaseQuestion {
  type: "short-calculation";
  expectedValue: number;
  tolerance: number;
  toleranceType: "absolute" | "relative";
  unit: string;
  /** Show intermediate steps scaffold */
  steps?: string[];
}

export type Question =
  | NumericQuestion
  | TextQuestion
  | MultipleChoiceQuestion
  | ShortCalculationQuestion;

export type AnswerResult = "correct" | "incorrect" | "unanswered";

// ─── Pure checking functions (exportable for unit tests) ──────────────────────

export function checkNumeric(
  userValue: number,
  expected: number,
  tolerance: number,
  toleranceType: "absolute" | "relative"
): boolean {
  if (toleranceType === "absolute") {
    return Math.abs(userValue - expected) <= tolerance;
  }
  // relative: tolerance is a fraction (e.g., 0.05 = 5%)
  return Math.abs((userValue - expected) / expected) <= tolerance;
}

export function checkText(answer: string, keywords: string[], minLength = 0): boolean {
  if (answer.trim().length < minLength) return false;
  const lower = answer.toLowerCase();
  return keywords.every((kw) => lower.includes(kw.toLowerCase()));
}

export function checkMultipleChoice(selectedIndex: number, correctIndex: number): boolean {
  return selectedIndex === correctIndex;
}

// ─── QuestionCard component ────────────────────────────────────────────────────

interface QuestionCardProps {
  question: Question;
  questionNumber?: number;
  onAnswerChange?: (questionId: string, result: AnswerResult) => void;
  disabled?: boolean;
  className?: string;
}

export function QuestionCard({
  question,
  questionNumber,
  onAnswerChange,
  disabled = false,
  className = "",
}: QuestionCardProps) {
  const [result, setResult] = useState<AnswerResult>("unanswered");
  const [submitted, setSubmitted] = useState(false);

  // Numeric / short-calculation
  const [numericInput, setNumericInput] = useState("");
  // Text
  const [textInput, setTextInput] = useState("");
  // Multiple choice
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleSubmit = () => {
    let correct = false;

    if (question.type === "numeric" || question.type === "short-calculation") {
      const q = question as NumericQuestion | ShortCalculationQuestion;
      const val = parseFloat(numericInput);
      if (isNaN(val)) return;
      correct = checkNumeric(val, q.expectedValue, q.tolerance, q.toleranceType);
    } else if (question.type === "text") {
      const q = question as TextQuestion;
      correct = checkText(textInput, q.keywords, q.minLength);
    } else if (question.type === "multiple-choice") {
      const q = question as MultipleChoiceQuestion;
      if (selectedOption === null) return;
      correct = checkMultipleChoice(selectedOption, q.correctIndex);
    }

    const newResult: AnswerResult = correct ? "correct" : "incorrect";
    setResult(newResult);
    setSubmitted(true);
    onAnswerChange?.(question.id, newResult);
  };

  const handleReset = () => {
    setResult("unanswered");
    setSubmitted(false);
    setNumericInput("");
    setTextInput("");
    setSelectedOption(null);
    onAnswerChange?.(question.id, "unanswered");
  };

  const borderColor =
    result === "correct"
      ? "var(--color-success)"
      : result === "incorrect"
      ? "var(--color-error)"
      : "var(--color-border)";

  return (
    <div
      className={className}
      style={{
        background: "var(--color-surface)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        transition: "border-color 300ms ease",
      }}
      aria-label={`Pertanyaan ${questionNumber ?? ""}`}
    >
      {/* Question header */}
      <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
        {questionNumber !== undefined && (
          <span
            style={{
              flexShrink: 0,
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "var(--color-primary-dim)",
              border: "1px solid var(--color-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: "var(--color-primary)",
            }}
            aria-hidden="true"
          >
            {questionNumber}
          </span>
        )}
        <p
          style={{
            margin: 0,
            fontSize: "0.9375rem",
            fontWeight: 500,
            color: "var(--color-text)",
            lineHeight: 1.6,
            flex: 1,
          }}
        >
          {question.prompt}
        </p>
      </div>

      {/* Answer area */}
      {!submitted ? (
        <AnswerInput
          question={question}
          numericInput={numericInput}
          setNumericInput={setNumericInput}
          textInput={textInput}
          setTextInput={setTextInput}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
          disabled={disabled}
        />
      ) : (
        <FeedbackArea result={result} question={question} />
      )}

      {/* Action buttons */}
      {!disabled && (
        <div style={{ display: "flex", gap: "8px" }}>
          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="btn-primary"
              style={{ fontSize: "0.875rem", padding: "10px 18px" }}
              aria-label="Periksa jawaban"
            >
              Periksa Jawaban
            </button>
          ) : (
            result === "incorrect" && (
              <button
                onClick={handleReset}
                className="btn-ghost"
                style={{ fontSize: "0.875rem", padding: "10px 18px" }}
                aria-label="Coba lagi"
              >
                Coba Lagi
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AnswerInputProps {
  question: Question;
  numericInput: string;
  setNumericInput: (v: string) => void;
  textInput: string;
  setTextInput: (v: string) => void;
  selectedOption: number | null;
  setSelectedOption: (v: number) => void;
  disabled: boolean;
}

function AnswerInput({
  question,
  numericInput,
  setNumericInput,
  textInput,
  setTextInput,
  selectedOption,
  setSelectedOption,
  disabled,
}: AnswerInputProps) {
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    background: "var(--color-surface-2)",
    border: "1px solid var(--color-border)",
    borderRadius: "var(--radius-sm)",
    color: "var(--color-text)",
    fontSize: "0.9375rem",
    outline: "none",
    fontFamily:
      question.type === "numeric" || question.type === "short-calculation"
        ? "'JetBrains Mono', monospace"
        : "inherit",
  };

  if (question.type === "numeric" || question.type === "short-calculation") {
    const q = question as NumericQuestion | ShortCalculationQuestion;
    return (
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="number"
          value={numericInput}
          onChange={(e) => setNumericInput(e.target.value)}
          placeholder="Masukkan nilai..."
          disabled={disabled}
          style={inputStyle}
          aria-label={`Jawaban dalam ${q.unit}`}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.9375rem",
            color: "var(--color-text-2)",
            whiteSpace: "nowrap",
          }}
        >
          {q.unit}
        </span>
      </div>
    );
  }

  if (question.type === "text") {
    return (
      <textarea
        value={textInput}
        onChange={(e) => setTextInput(e.target.value)}
        placeholder="Tulis jawabanmu di sini..."
        disabled={disabled}
        rows={4}
        style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
        aria-label="Jawaban teks"
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-primary)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
      />
    );
  }

  if (question.type === "multiple-choice") {
    const q = question as MultipleChoiceQuestion;
    return (
      <div
        role="radiogroup"
        aria-label="Pilihan jawaban"
        style={{ display: "flex", flexDirection: "column", gap: "8px" }}
      >
        {q.options.map((option, idx) => {
          const isSelected = selectedOption === idx;
          return (
            <label
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "10px 14px",
                background: isSelected ? "var(--color-primary-dim)" : "var(--color-surface-2)",
                border: `1px solid ${isSelected ? "var(--color-primary)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-sm)",
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "background var(--transition), border-color var(--transition)",
                userSelect: "none",
              }}
            >
              <input
                type="radio"
                name={`mcq-${question.id}`}
                value={idx}
                checked={isSelected}
                onChange={() => setSelectedOption(idx)}
                disabled={disabled}
                style={{ accentColor: "var(--color-primary)" }}
                aria-label={option}
              />
              <span style={{ fontSize: "0.9375rem", color: "var(--color-text)" }}>{option}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return null;
}

interface FeedbackAreaProps {
  result: AnswerResult;
  question: Question;
}

function FeedbackArea({ result, question }: FeedbackAreaProps) {
  const isCorrect = result === "correct";

  return (
    <div
      role="status"
      className="animate-fade-in"
      style={{
        padding: "12px 16px",
        borderRadius: "var(--radius-sm)",
        background: isCorrect
          ? "rgba(74, 222, 128, 0.1)"
          : "rgba(251, 113, 133, 0.1)",
        border: `1px solid ${isCorrect ? "rgba(74, 222, 128, 0.3)" : "rgba(251, 113, 133, 0.3)"}`,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: 600,
          fontSize: "0.9375rem",
          color: isCorrect ? "var(--color-success)" : "var(--color-error)",
        }}
      >
        <span aria-hidden="true">
          {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
        </span>
        {isCorrect ? "Jawaban Benar!" : "Jawaban Kurang Tepat"}
      </div>
      {!isCorrect && question.feedbackHint && (
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--color-text-2)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--color-text)" }}>Petunjuk: </strong>
          {question.feedbackHint}
        </p>
      )}
    </div>
  );
}
