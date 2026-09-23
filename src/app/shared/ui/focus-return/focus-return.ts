export function captureFocus(): () => void {
  const previous = document.activeElement;
  return () => {
    if (previous instanceof HTMLElement && previous.isConnected) {
      previous.focus();
    }
  };
}
