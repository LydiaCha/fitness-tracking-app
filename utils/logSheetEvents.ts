type Handler = () => void;
let _handler: Handler | null = null;

export const logSheetEvents = {
  subscribe:   (h: Handler) => { _handler = h; },
  unsubscribe: ()           => { _handler = null; },
  open:        ()           => { _handler?.(); },
};
