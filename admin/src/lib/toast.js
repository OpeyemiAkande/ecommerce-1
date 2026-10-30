import {useSyncExternalStore} from "react";

const TOAST_DURATION = 4000;

let toasts = [];
let nextId = 1;
const listeners = new Set();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => toasts;

const dismiss = (id) => {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
};

const show = (type, message) => {
  const id = nextId++;
  toasts = [...toasts, {id, type, message}];
  emit();
  setTimeout(() => dismiss(id), TOAST_DURATION);
  return id;
};

// Callable from anywhere (components, mutation callbacks), no provider needed.
export const toast = {
  success: (message) => show("success", message),
  error: (message) => show("error", message),
  dismiss
};

export const useToasts = () => useSyncExternalStore(subscribe, getSnapshot);
