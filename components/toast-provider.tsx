"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons";

export type ToastTone = "success" | "error" | "warning" | "info";

type ToastAction = {
  href: string;
  label: string;
};

type ToastInput = {
  action?: ToastAction;
  duration?: number;
  message: string;
  title?: string;
  tone?: ToastTone;
};

type Toast = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  dismiss: (id: string) => void;
  toast: (input: ToastInput) => string;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const defaultTitles: Record<ToastTone, string> = {
  error: "Something went wrong",
  info: "Quick update",
  success: "All set",
  warning: "Please check this",
};

const toneIcons: Record<ToastTone, "activity" | "check" | "sparkles"> = {
  error: "activity",
  info: "sparkles",
  success: "check",
  warning: "activity",
};

function ToastItem({ dismiss, item }: { dismiss: (id: string) => void; item: Toast }) {
  useEffect(() => {
    const timeout = window.setTimeout(() => dismiss(item.id), item.duration ?? (item.action ? 12000 : 5500));
    return () => window.clearTimeout(timeout);
  }, [dismiss, item.action, item.duration, item.id]);

  return (
    <article aria-atomic="true" className={`toast toast-${item.tone}`} role={item.tone === "error" ? "alert" : "status"}>
      <span className="toast-icon"><Icon name={toneIcons[item.tone]} /></span>
      <div className="toast-copy">
        <strong>{item.title ?? defaultTitles[item.tone]}</strong>
        <p>{item.message}</p>
        {item.action && <a href={item.action.href}>{item.action.label}</a>}
      </div>
      <button aria-label="Dismiss notification" className="toast-dismiss" onClick={() => dismiss(item.id)} type="button">
        <Icon name="close" />
      </button>
    </article>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);
  const toast = useCallback((input: ToastInput) => {
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const item = { ...input, id, tone: input.tone ?? "info" };
    setToasts((current) => {
      const duplicate = current.some((existing) => existing.message === item.message && existing.tone === item.tone);
      return duplicate ? current : [...current.slice(-3), item];
    });
    return id;
  }, []);
  const value = useMemo(() => ({ dismiss, toast }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <section aria-label="Notifications" className="toast-region">
        {toasts.map((item) => <ToastItem dismiss={dismiss} item={item} key={item.id} />)}
      </section>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}
