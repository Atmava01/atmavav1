export function buildJitsiRoomName(sessionId: string): string {
  return `atmava-session-${sessionId}`;
}

export function buildSessionMeetLink(sessionId: string): string {
  return `https://meet.jit.si/${buildJitsiRoomName(sessionId)}`;
}

export function buildSessionRoomPath(sessionId: string): string {
  return `/session/${sessionId}`;
}

export function resolveSessionLaunchUrl(sessionId: string, meetLink?: string | null): string {
  const trimmedMeetLink = meetLink?.trim();
  return trimmedMeetLink || buildSessionMeetLink(sessionId);
}

export function openSessionLaunch(sessionId: string, meetLink?: string | null): void {
  if (typeof window === "undefined") return;
  window.location.assign(resolveSessionLaunchUrl(sessionId, meetLink));
}
