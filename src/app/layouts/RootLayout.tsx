import { Outlet, ScrollRestoration } from 'react-router'

export function RootLayout() {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>
      <Outlet />
      <ScrollRestoration />
    </>
  )
}
