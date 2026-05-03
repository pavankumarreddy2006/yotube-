import { useEffect, useState } from "react";

function normalizePath(pathname, allowedPaths) {
  const path = pathname === "/" ? "/dashboard" : pathname;
  return allowedPaths.includes(path) ? path : "/dashboard";
}

export function useNavigation(allowedPaths) {
  const [pathname, setPathname] = useState(() => normalizePath(window.location.pathname, allowedPaths));

  useEffect(() => {
    const handlePopState = () => {
      setPathname(normalizePath(window.location.pathname, allowedPaths));
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [allowedPaths]);

  function navigate(nextPath) {
    const target = normalizePath(nextPath, allowedPaths);
    if (target === pathname) {
      return;
    }
    window.history.pushState({}, "", target);
    setPathname(target);
  }

  return { pathname, navigate };
}
