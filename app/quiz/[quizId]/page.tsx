import type { Metadata } from "next";
import { QuizExperience } from "@/components/quiz/quiz-experience";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ challenge?: string }>;
}) {
  const { quizId } = await params;
  const { challenge } = await searchParams;
  return <QuizExperience quizId={quizId} teamChallengeId={challenge} />;
}
