export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatPhoneDisplay(phone?: string | null): string {
  if (!phone) return '';
  return phone.startsWith('+') ? phone : `+${phone}`;
}

export function getPresenceLabel(
  typing: { userId: string; displayName?: string }[],
  recording: { userId: string; displayName?: string }[],
  currentUserId?: string,
): string | null {
  const othersRecording = recording.filter((r) => r.userId !== currentUserId);
  const othersTyping = typing.filter((t) => t.userId !== currentUserId);

  if (othersRecording.length > 0) {
    const name = othersRecording[0].displayName || 'Contact';
    if (othersRecording.length === 1) return `${name} is recording audio…`;
    return `${name} and ${othersRecording.length - 1} other${othersRecording.length > 2 ? 's' : ''} recording…`;
  }

  if (othersTyping.length > 0) {
    const name = othersTyping[0].displayName || 'Contact';
    if (othersTyping.length === 1) return `${name} is typing…`;
    return `${name} and ${othersTyping.length - 1} other${othersTyping.length > 2 ? 's' : ''} typing…`;
  }

  return null;
}
