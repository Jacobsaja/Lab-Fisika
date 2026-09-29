import { useState, useEffect, useCallback } from "react";
import { PracticumState, PracticumStep } from "@/types/practicum";

const STORAGE_PREFIX = "vlab_practicum_v1_";

const DEFAULT_STATE: PracticumState = {
  currentStep: "INTRO",
  elapsedMs: 0,
  recordedData: [],
  answers: {},
  isCompleted: false,
};

export function usePracticumSession(practicumId: string) {
  const storageKey = `${STORAGE_PREFIX}${practicumId}`;
  
  // Try to load from localStorage, otherwise default
  const [state, setState] = useState<PracticumState>(() => {
    if (typeof window === "undefined") return DEFAULT_STATE;
    const stored = window.localStorage.getItem(storageKey);
    if (stored) {
      try {
        return JSON.parse(stored) as PracticumState;
      } catch (err) {
        console.error("Failed to parse practicum state:", err);
      }
    }
    return DEFAULT_STATE;
  });

  // Whenever state changes, persist to localStorage
  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [state, storageKey]);

  const setStep = useCallback((step: PracticumStep) => {
    setState((prev) => ({ ...prev, currentStep: step }));
  }, []);

  const updateElapsedMs = useCallback((deltaMs: number) => {
    setState((prev) => ({ ...prev, elapsedMs: prev.elapsedMs + deltaMs }));
  }, []);

  const addDataRow = useCallback((row: Record<string, string | number>) => {
    setState((prev) => ({ ...prev, recordedData: [...prev.recordedData, row] }));
  }, []);

  const setRecordedData = useCallback((rows: Record<string, string | number>[]) => {
    setState((prev) => ({ ...prev, recordedData: rows }));
  }, []);

  const setAnswer = useCallback((questionId: string, answer: string) => {
    setState((prev) => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer }
    }));
  }, []);

  const completePracticum = useCallback(() => {
    setState((prev) => ({ ...prev, isCompleted: true, currentStep: "REVIEW" }));
  }, []);

  const resetSession = useCallback(() => {
    setState(DEFAULT_STATE);
  }, []);

  return {
    state,
    setStep,
    updateElapsedMs,
    addDataRow,
    setRecordedData,
    setAnswer,
    completePracticum,
    resetSession,
  };
}
