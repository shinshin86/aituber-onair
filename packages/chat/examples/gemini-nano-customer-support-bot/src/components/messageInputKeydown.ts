export interface MessageInputKeyDownEvent {
  key: string;
  shiftKey: boolean;
  keyCode: number;
  nativeEvent: {
    isComposing: boolean;
  };
}

export const shouldSubmitMessageOnKeyDown = (
  event: MessageInputKeyDownEvent,
): boolean =>
  event.key === 'Enter' &&
  !event.shiftKey &&
  !event.nativeEvent.isComposing &&
  event.keyCode !== 229;
