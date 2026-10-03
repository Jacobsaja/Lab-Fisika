import { Question } from "@/components/practicum/QuestionCard";

export interface ColumnDef {
  key: string;
  label: string;
  unit: string;
}

export interface PracticumConfig {
  id: string;
  title: string;
  category: string;
  recommendedDurationSec: number;
  introduction: string;
  objectives: string[];
  instructions: string[];
  columns: ColumnDef[];
  questions: Question[];
  simulationType: string;
}

export type PracticumStep = 
  | "INTRO" // 1 Baca tujuan
  | "SETUP" // 2 Atur percobaan
  | "SIMULATION" // 3 Jalankan simulasi & Catat data
  | "QUESTIONS" // 4 Jawab pertanyaan
  | "REVIEW"; // 5 Tinjau hasil

export interface PracticumState {
  currentStep: PracticumStep;
  elapsedMs: number;
  recordedData: Record<string, string | number>[];
  answers: Record<string, string>;
  isCompleted: boolean;
}
