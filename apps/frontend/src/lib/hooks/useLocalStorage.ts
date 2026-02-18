"use client";

import { useEffect, useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);

  useEffect(() => {
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return;
    }

    try {
      setValue(JSON.parse(stored) as T);
    } catch {
      setValue(initialValue);
    }
  }, [initialValue, key]);

  const setStoredValue = (nextValue: T): void => {
    setValue(nextValue);
    window.localStorage.setItem(key, JSON.stringify(nextValue));
  };

  return [value, setStoredValue];
}
