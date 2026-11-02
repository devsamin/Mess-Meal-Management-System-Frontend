"use client";

import { useEffect, useState } from "react";

/** `value`, but only after it has stopped changing for `delay` ms (keeps typing from firing a request per key). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
