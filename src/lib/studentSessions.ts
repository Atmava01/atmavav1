import type { Enrollment, Session } from "@/types";

function normalizeBatch(batch?: string | null): string {
  return (batch ?? "").trim().toLowerCase();
}

export function sessionMatchesEnrollmentBatch(
  sessionBatch: string | null | undefined,
  enrollmentBatch: string | null | undefined
): boolean {
  const normalizedEnrollmentBatch = normalizeBatch(enrollmentBatch);
  const normalizedSessionBatch = normalizeBatch(sessionBatch);

  if (!normalizedEnrollmentBatch) return true;
  if (!normalizedSessionBatch) return true;

  return normalizedEnrollmentBatch === normalizedSessionBatch;
}

export function filterSessionsForEnrollment(
  sessions: Session[],
  enrollment: Pick<Enrollment, "batch">
): Session[] {
  return sessions.filter((session) =>
    sessionMatchesEnrollmentBatch(session.batch, enrollment.batch)
  );
}

export function getEnrollmentBatchLabel(
  enrollment: Pick<Enrollment, "batch">,
  sessions: Session[] = []
): string {
  const batch = enrollment.batch?.trim();
  if (batch) return batch;

  const fallbackBatch = sessions.find((session) => session.batch?.trim())?.batch?.trim();
  return fallbackBatch || "Assigned";
}
