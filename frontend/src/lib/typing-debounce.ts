/** Debounce typing presence labels to reduce flicker. */
const typingHideTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleTypingHide(key: string, onHide: () => void, delayMs = 1200) {
  const existing = typingHideTimers.get(key);
  if (existing) clearTimeout(existing);
  typingHideTimers.set(
    key,
    setTimeout(() => {
      typingHideTimers.delete(key);
      onHide();
    }, delayMs),
  );
}

export function cancelTypingHide(key: string) {
  const t = typingHideTimers.get(key);
  if (t) clearTimeout(t);
  typingHideTimers.delete(key);
}
