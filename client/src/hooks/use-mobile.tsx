import * as React from "react"

const MOBILE_BREAKPOINT = 1024

export function useIsMobile() {
  // Initialize synchronously to prevent flash-of-incorrect-layout
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
    }
    return false
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
