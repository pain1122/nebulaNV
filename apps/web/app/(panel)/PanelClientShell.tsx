"use client"

import {useEffect} from "react"
import {usePathname} from "next/navigation"

type Props = {
  children: React.ReactNode
}
const DEFAULT_ATTRS = {
  "data-theme": "interactive",
  "data-layout": "vertical",
  "data-layout-style": "default",
  "data-layout-position": "fixed",
  "data-topbar": "light",
  "data-sidebar": "dark",
  "data-sidebar-size": "sm-hover",
  "data-layout-width": "fluid",
  "data-bs-theme": "light",
  "data-body-image": "none",
  "data-theme-colors": "default",
  "data-preloader": "disable",
} as const

declare global {
  interface Window {
    feather?: {replace: () => void}
    Waves?: {init: () => void}
    SimpleBar?: any
  }
}

export default function PanelClientShell({children}: Props) {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.documentElement

    // ---------- 1) Bootstrap defaultAttribute like original script ----------
    const storedDefault = sessionStorage.getItem("defaultAttribute")

    if (!storedDefault) {
      const attrs: Record<string, string> = {}
      Array.from(root.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-")) {
          attrs[attr.name] = attr.value
          sessionStorage.setItem(attr.name, attr.value)
        }
      })
      sessionStorage.setItem("defaultAttribute", JSON.stringify(attrs))
    }

    const defaultAttribute = storedDefault ? (JSON.parse(storedDefault) as Record<string, string>) : {}

    // ---------- 2) Apply saved values or defaults ----------
    const allKeys = Object.keys(DEFAULT_ATTRS)
    const initial: Record<string, string> = {}
    allKeys.forEach((key) => {
      const saved = sessionStorage.getItem(key)
      const fromDefaultAttr = defaultAttribute[key]
      const fallback = DEFAULT_ATTRS[key as keyof typeof DEFAULT_ATTRS]
      const value = saved ?? fromDefaultAttr ?? fallback
      initial[key] = value
      root.setAttribute(key, value)
      sessionStorage.setItem(key, value)
    })

    // ---------- 3) Light/Dark toggle (.light-dark-mode) ----------
    const htmlEl = root
    const resizeEvent = new Event("resize")

    const ldButton = document.querySelector<HTMLElement>(".light-dark-mode")
    const handleLightDarkClick = () => {
      const current = htmlEl.getAttribute("data-bs-theme") ?? "light"
      const next = current === "dark" ? "light" : "dark"
      htmlEl.setAttribute("data-bs-theme", next)
      sessionStorage.setItem("data-bs-theme", next)
      window.dispatchEvent(resizeEvent)
    }
    if (ldButton) ldButton.addEventListener("click", handleLightDarkClick)

    // ---------- 4) Vertical-hover toggle (E()) ----------
    const verticalHover = document.getElementById("vertical-hover")
    const handleVerticalHover = () => {
      const rootEl = document.documentElement
      const current = rootEl.getAttribute("data-sidebar-size")
      let next: string

      if (current === "sm-hover") {
        next = "sm-hover-active"
      } else if (current === "sm-hover-active") {
        next = "sm-hover"
      } else {
        next = "sm-hover"
      }

      rootEl.setAttribute("data-sidebar-size", next)
      sessionStorage.setItem("data-sidebar-size", next)
    }
    if (verticalHover) verticalHover.addEventListener("click", handleVerticalHover)

    // ---------- 5) Vertical overlay click ----------
    const overlays = Array.from(document.getElementsByClassName("vertical-overlay")) as HTMLElement[]
    const handleOverlayClick = () => {
      document.body.classList.remove("vertical-sidebar-enable")
      const layout = sessionStorage.getItem("data-layout")
      if (layout === "twocolumn") {
        document.body.classList.add("twocolumn-panel")
      } else {
        const size = sessionStorage.getItem("data-sidebar-size") ?? "lg"
        document.documentElement.setAttribute("data-sidebar-size", size)
      }
    }
    overlays.forEach((el) => el.addEventListener("click", handleOverlayClick))

    // ---------- 6) Hamburger (topnav-hamburger-icon) ----------
    const topnavHamburger = document.getElementById("topnav-hamburger-icon")
    const handleHamburgerClick = () => {
      const layout = document.documentElement.getAttribute("data-layout")
      const width = document.documentElement.clientWidth

      if (layout === "horizontal") {
        document.body.classList.toggle("menu")
        return
      }

      if (layout === "vertical" || layout === "semibox") {
        if (width <= 767) {
          document.body.classList.toggle("vertical-sidebar-enable")
          document.documentElement.setAttribute("data-sidebar-size", "lg")
        } else {
          const currentSize = document.documentElement.getAttribute("data-sidebar-size") ?? "lg"
          const next = currentSize === "lg" ? "sm" : "lg"
          document.documentElement.setAttribute("data-sidebar-size", next)
          sessionStorage.setItem("data-sidebar-size", next)
        }
      }

      if (layout === "twocolumn") {
        document.body.classList.toggle("twocolumn-panel")
      }
    }
    if (topnavHamburger) {
      topnavHamburger.addEventListener("click", handleHamburgerClick)
    }

    // ---------- 7) Back-to-top button ----------
    const backToTop = document.getElementById("back-to-top")
    const scrollHandler = () => {
      if (!backToTop) return
      const show = document.documentElement.scrollTop > 100 || document.body.scrollTop > 100
      backToTop.style.display = show ? "block" : "none"
    }
    if (backToTop) {
      backToTop.addEventListener("click", () => {
        document.body.scrollTop = 0
        document.documentElement.scrollTop = 0
      })
    }
    window.addEventListener("scroll", scrollHandler)
    scrollHandler()

    const ensureSidebarScrollbar = () => {
      const layout = root.getAttribute("data-layout")
      const scrollbar = document.getElementById("scrollbar")
      const navbarNav = document.getElementById("navbar-nav")

      if (!scrollbar || !navbarNav) return

      const wantsSimplebar = layout === "vertical" || layout === "semibox"

      if (wantsSimplebar) {
        scrollbar.setAttribute("data-simplebar", "")
        navbarNav.setAttribute("data-simplebar", "")
        scrollbar.classList.add("h-100")

        // If SimpleBar is loaded, ensure it's initialized for SPA navigations
        try {
          if (window.SimpleBar) {
            // If already has instance, do nothing.
            // SimpleBar stores instance on element in many builds (simplebar instance access differs by build),
            // so we just attempt init safely.
            // eslint-disable-next-line new-cap
            new window.SimpleBar(scrollbar)
          }
        } catch {
          // ignore
        }
      } else {
        scrollbar.removeAttribute("data-simplebar")
        navbarNav.removeAttribute("data-simplebar")
        scrollbar.classList.remove("h-100")
      }
    }

    // run now (first mount / after hydration)
    ensureSidebarScrollbar()

    // and run on resize (Velzon does this a lot)
    window.addEventListener("resize", ensureSidebarScrollbar)

    // ---------- 8) Topbar search: desktop (#search-options) ----------
    const searchInput = document.getElementById("search-options") as HTMLInputElement | null
    const searchDropdown = document.getElementById("search-dropdown")
    const searchClose = document.getElementById("search-close-options")

    const updateSearchVisibility = () => {
      if (!searchInput || !searchDropdown || !searchClose) return
      if (searchInput.value.length > 0) {
        searchDropdown.classList.add("show")
        searchClose.classList.remove("d-none")
      } else {
        searchDropdown.classList.remove("show")
        searchClose.classList.add("d-none")
      }
    }

    const handleSearchKeyup = () => {
      if (!searchInput || !searchDropdown || !searchClose) return

      if (searchInput.value.length === 0) {
        searchDropdown.classList.remove("show")
        searchClose.classList.add("d-none")
        return
      }

      searchDropdown.classList.add("show")
      searchClose.classList.remove("d-none")

      const query = searchInput.value.toLowerCase()
      const items = document.getElementsByClassName("notify-item")

      Array.from(items).forEach((el) => {
        const item = el as HTMLElement
        let text = ""

        const titleEl = item.querySelector("h6")
        const spanEl = item.getElementsByTagName("span")[0]

        if (titleEl) {
          const spanText = spanEl ? spanEl.innerText.toLowerCase() : ""
          const h6Text = titleEl.innerText.toLowerCase()
          text = h6Text.includes(query) ? h6Text : spanText
        } else if (spanEl) {
          text = spanEl.innerText.toLowerCase()
        }

        if (text) {
          item.style.display = text.includes(query) ? "block" : "none"
        }
      })
    }

    const handleSearchFocus = () => {
      updateSearchVisibility()
    }

    const handleSearchClear = () => {
      if (!searchInput || !searchDropdown || !searchClose) return
      searchInput.value = ""
      searchDropdown.classList.remove("show")
      searchClose.classList.add("d-none")
    }

    const handleBodyClickForSearch = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null
      if (!target) return
      if (target.id !== "search-options") {
        if (searchDropdown) searchDropdown.classList.remove("show")
        if (searchClose) searchClose.classList.add("d-none")
      }
    }

    if (searchInput && searchDropdown && searchClose) {
      searchInput.addEventListener("focus", handleSearchFocus)
      searchInput.addEventListener("keyup", handleSearchKeyup)
      searchClose.addEventListener("click", handleSearchClear)
      document.body.addEventListener("click", handleBodyClickForSearch)
    }

    // ---------- 9) Topbar search: responsive (#search-options-reponsive) ----------
    const searchInputResp = document.getElementById("search-options-reponsive") as HTMLInputElement | null
    const searchDropdownResp = document.getElementById("search-dropdown-reponsive")
    const searchCloseResp = document.getElementById("search-close-options")

    const updateRespSearchVisibility = () => {
      if (!searchInputResp || !searchDropdownResp || !searchCloseResp) return
      if (searchInputResp.value.length > 0) {
        searchDropdownResp.classList.add("show")
        searchCloseResp.classList.remove("d-none")
      } else {
        searchDropdownResp.classList.remove("show")
        searchCloseResp.classList.add("d-none")
      }
    }

    const handleRespKeyup = () => {
      updateRespSearchVisibility()
    }

    const handleRespFocus = () => {
      updateRespSearchVisibility()
    }

    const handleRespClear = () => {
      if (!searchInputResp || !searchDropdownResp || !searchCloseResp) return
      searchInputResp.value = ""
      searchDropdownResp.classList.remove("show")
      searchCloseResp.classList.add("d-none")
    }

    const handleBodyClickForRespSearch = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null
      if (!target) return
      if (target.id !== "search-options-reponsive") {
        if (searchDropdownResp) searchDropdownResp.classList.remove("show")
        if (searchCloseResp) searchCloseResp.classList.add("d-none")
      }
    }

    if (searchInputResp && searchDropdownResp && searchCloseResp) {
      searchInputResp.addEventListener("focus", handleRespFocus)
      searchInputResp.addEventListener("keyup", handleRespKeyup)
      searchCloseResp.addEventListener("click", handleRespClear)
      document.body.addEventListener("click", handleBodyClickForRespSearch)
    }

    // ---------- 10) Preloader ----------
    const preloaderMode = sessionStorage.getItem("data-preloader") ?? initial["data-preloader"]
    if (preloaderMode === "enable") {
      const preloader = document.getElementById("preloader")
      if (preloader) {
        window.addEventListener("load", () => {
          preloader.style.opacity = "0"
          preloader.style.visibility = "hidden"
        })
      }
    } else {
      const preloader = document.getElementById("preloader")
      if (preloader) {
        preloader.style.opacity = "0"
        preloader.style.visibility = "hidden"
      }
    }

    // ---------- 11) Feather & Waves ----------
    // @ts-ignore
    if (window.feather) {
      // @ts-ignore
      window.feather.replace()
    }
    // @ts-ignore
    if (window.Waves) {
      // @ts-ignore
      window.Waves.init()
    }

    // ---------- CLEANUP ----------
    return () => {
      if (ldButton) ldButton.removeEventListener("click", handleLightDarkClick)
      if (verticalHover) verticalHover.removeEventListener("click", handleVerticalHover)
      overlays.forEach((el) => el.removeEventListener("click", handleOverlayClick))
      if (topnavHamburger) topnavHamburger.removeEventListener("click", handleHamburgerClick)
      window.removeEventListener("scroll", scrollHandler)
      window.removeEventListener("resize", ensureSidebarScrollbar)

      if (searchInput && searchDropdown && searchClose) {
        searchInput.removeEventListener("focus", handleSearchFocus)
        searchInput.removeEventListener("keyup", handleSearchKeyup)
        searchClose.removeEventListener("click", handleSearchClear)
        document.body.removeEventListener("click", handleBodyClickForSearch)
      }

      if (searchInputResp && searchDropdownResp && searchCloseResp) {
        searchInputResp.removeEventListener("focus", handleRespFocus)
        searchInputResp.removeEventListener("keyup", handleRespKeyup)
        searchCloseResp.removeEventListener("click", handleRespClear)
        document.body.removeEventListener("click", handleBodyClickForRespSearch)
      }
    }
  }, [pathname])

  return <>{children}</>
}
