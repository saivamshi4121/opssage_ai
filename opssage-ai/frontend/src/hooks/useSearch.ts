import { useMemo, useState } from "react";

export function useSearch<T>(items: T[], toSearchText: (item: T) => string) {
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(
    () => items.filter((item) => toSearchText(item).toLowerCase().includes(query.toLowerCase())),
    [items, query, toSearchText],
  );

  return { query, setQuery, filteredItems };
}
