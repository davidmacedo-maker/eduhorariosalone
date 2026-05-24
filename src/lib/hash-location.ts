import { useState, useEffect, useCallback } from "react";

function getHash(): string {
  return window.location.hash.replace(/^#/, "") || "/";
}

export function useHashLocation(): [string, (to: string) => void] {
  const [loc, setLoc] = useState<string>(getHash);

  useEffect(() => {
    // Only set the initial hash if none exists (blank URL, no fragment)
    if (!window.location.hash || window.location.hash === "#") {
      window.location.hash = "/";
    }

    const onHashChange = () => setLoc(getHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const navigate = useCallback((to: string) => {
    window.location.hash = to;
  }, []);

  return [loc, navigate];
}
