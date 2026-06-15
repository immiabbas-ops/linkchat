'use client';

const EMOJIS = [
  '😀', '😂', '😍', '🥰', '😊', '😭', '😘', '😎', '🤔', '😅',
  '👍', '👎', '🙏', '👏', '💪', '❤️', '🔥', '✨', '🎉', '💯',
  '😢', '😡', '🤣', '🥺', '😴', '🤗', '😇', '🙄', '💀', '👀',
];

interface EmojiPickerProps {
  open: boolean;
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ open, onSelect }: EmojiPickerProps) {
  if (!open) return null;

  return (
    <div className="mb-2 rounded-xl border border-black/[0.06] bg-white p-2 shadow-md">
      <div className="grid grid-cols-8 gap-1">
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSelect(emoji)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-[#f0f2f5]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
