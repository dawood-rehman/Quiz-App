"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { Logo } from "@/components/logo";
import { useToast } from "@/components/toast-provider";
import { authenticatedFetch } from "@/lib/client/authenticated-fetch";

type Quiz = {
  id: string;
  title: string;
  description?: string | null;
  topic: string;
  difficulty: string;
  questions: Array<{
    id: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
  }>;
};

type AttemptResult = {
  score: number;
  total: number;
  feedback?: { summary: string; suggestions: string[] };
  progress?: { currentStreak: number; longestStreak: number };
  review: Array<{
    questionId: string;
    selected: string;
    correct: string;
    isCorrect: boolean;
    explanation: string;
  }>;
};

export function QuizExperience({ quizId, teamChallengeId }: { quizId: string; teamChallengeId?: string }) {
  const { toast } = useToast();
  const startedAt = useRef(Date.now());
  const [quiz, setQuiz] = useState<Quiz>();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AttemptResult>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reviewByQuestion = useMemo(
    () => new Map(result?.review.map((entry) => [entry.questionId, entry])),
    [result],
  );

  const answeredCount = Object.keys(answers).length;
  const totalQuestions = quiz?.questions.length ?? 0;
  const progressPercent = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  useEffect(() => {
    authenticatedFetch(`/api/quizzes/${quizId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { quiz?: Quiz; error?: { message?: string } };
        if (!response.ok || !payload.quiz) throw new Error(payload.error?.message ?? "Quiz could not be loaded.");
        setQuiz(payload.quiz);
      })
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "Quiz could not be loaded.";
        setError(message);
        toast({ message, tone: "error" });
      });
  }, [quizId, toast]);

  async function submitQuiz(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quiz) return;
    if (Object.keys(answers).length !== quiz.questions.length) {
      toast({ message: "Answer every question before submitting your quiz.", tone: "warning" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await authenticatedFetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          teamChallengeId,
          durationSeconds: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          answers: quiz.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })),
        }),
      });
      const payload = await response.json().catch(() => ({})) as AttemptResult & { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? "Your answers could not be submitted.");
      setResult(payload);
      toast({ message: `Quiz complete. You scored ${payload.score} out of ${payload.total}.`, tone: "success" });
      window.scrollTo({ behavior: "smooth", top: 0 });
    } catch (caught) {
      toast({ message: caught instanceof Error ? caught.message : "Your answers could not be submitted.", tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  function retakeQuiz() {
    startedAt.current = Date.now();
    setAnswers({});
    setResult(undefined);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  if (error) {
    return (
      <main className="quiz-page" id="main-content">
        <div className="quiz-topbar"><Logo /><Link href={teamChallengeId ? "/teams" : "/dashboard"}>Back to dashboard</Link></div>
        <section className="page-state-card quiz-error"><span className="feature-icon"><Icon name="activity" /></span><h1>Quiz unavailable</h1><p>{error}</p><Link className="button button-primary" href="/dashboard#library">Return to library</Link></section>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="quiz-page" id="main-content">
        <div className="quiz-topbar"><Logo /><Link href={teamChallengeId ? "/teams" : "/dashboard"}>Back to dashboard</Link></div>
        <section aria-label="Loading quiz" className="quiz-shell">
          <span className="skeleton state-line state-line-short" />
          <span className="skeleton state-line state-line-title" />
          {[0, 1, 2].map((item) => <span className="quiz-loading-card skeleton" key={item} />)}
        </section>
      </main>
    );
  }

  return (
    <main className="quiz-page" id="main-content">
      <div className="quiz-topbar"><Logo /><Link href={teamChallengeId ? "/teams" : "/dashboard#library"}><Icon name="arrow" /> {teamChallengeId ? "Back to teams" : "Back to library"}</Link></div>
      <section className="quiz-shell">
        <header className="quiz-hero">
          <div><p className="eyebrow"><Icon name="sparkles" /> {quiz.topic}</p><h1>{quiz.title}</h1><p>{quiz.description}</p></div>
          <div className="quiz-meta"><span>{quiz.questions.length} questions</span><span>{quiz.difficulty.toLowerCase()}</span></div>
        </header>

        <div className="quiz-progress" aria-hidden={false}>
          <div className="quiz-progress-info"><strong>{answeredCount}/{totalQuestions}</strong><small>answered</small></div>
          <div className="quiz-progress-bar" aria-hidden="true"><div className="quiz-progress-fill" style={{ width: `${progressPercent}%` }} /></div>
        </div>

        {result && <section className="quiz-result" aria-live="polite"><span className="feature-icon"><Icon name="target" /></span><div><p className="eyebrow">Quiz complete</p><h2>{result.score} / {result.total}</h2><p>Review the explanations below, then retake the quiz or return to your library.</p></div></section>}
        {result?.feedback && <section className="quiz-feedback"><p className="eyebrow"><Icon name="sparkles" /> Learning feedback</p><h3>{result.feedback.summary}</h3><ul>{result.feedback.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul></section>}

        <form className="quiz-form" onSubmit={submitQuiz}>
          {quiz.questions.map((question, questionIndex) => {
            const review = reviewByQuestion.get(question.id);
            return (
              <fieldset className="quiz-question" disabled={Boolean(result) || submitting} key={question.id}>
                <legend><span>{String(questionIndex + 1).padStart(2, "0")}</span>{question.prompt}</legend>
                <div className="quiz-options">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.id;
                    const className = [
                      "quiz-option",
                      selected ? "selected" : "",
                      review?.correct === option.label ? "correct" : "",
                      review && review.selected === option.label && !review.isCorrect ? "incorrect" : "",
                    ].filter(Boolean).join(" ");
                    return <label className={className} key={option.id}><input checked={selected} name={question.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} type="radio" value={option.id} /><span>{option.label}</span></label>;
                  })}
                </div>
                {review && <div className={`quiz-explanation ${review.isCorrect ? "correct" : "incorrect"}`}><strong>{review.isCorrect ? "Correct" : `Correct answer: ${review.correct}`}</strong><p>{review.explanation}</p></div>}
              </fieldset>
            );
          })}
          <div className="quiz-submit-row">
            {result ? <><button className="button button-primary" onClick={retakeQuiz} type="button">Retake quiz <Icon name="arrow" /></button><Link className="button button-quiet" href={teamChallengeId ? "/teams" : "/dashboard#library"}>{teamChallengeId ? "Return to teams" : "Return to library"}</Link></> : <button className="button button-primary" disabled={submitting} type="submit">{submitting ? "Checking answers..." : "Submit answers"} <Icon name="arrow" /></button>}
          </div>
        </form>
      </section>
    </main>
  );
}
