import { useEffect } from 'react';

interface UseSaveShortcutOptions {
  /** Attach the global listener only while the form can be saved. */
  enabled: boolean;
  /** Guard against disabled buttons, validation readiness and duplicate requests. */
  canSave: boolean;
  onSave: () => void;
}

/** Cmd+S on macOS, Ctrl+S on Windows/Linux. Alt/Shift combinations stay untouched. */
export function useSaveShortcut({ enabled, canSave, onSave }: UseSaveShortcutOptions) {
  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      if (event.altKey || event.shiftKey) return;
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.key.toLowerCase() !== 's' && event.code !== 'KeyS') return;

      // Suppress the browser's Save Page dialog even while the save button is disabled.
      event.preventDefault();
      if (canSave) onSave();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, canSave, onSave]);
}
