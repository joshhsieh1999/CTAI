import clsx from 'clsx'
import { Inter, Lexend } from 'next/font/google'

import ToastProvider from '@/app/provider/toastProvider'
import '@/app/ui/globals.css'
import { type Metadata } from 'next'
import { NextAuthProvider } from './provider/nextauthProvider'
import { TanstackProvider } from './provider/tanstackProvider'
import { WrappedNextUIProvider } from './provider/wrappedNextUIProvider'

export const metadata: Metadata = {
  title: {
    template: '%s - Click Then AI',
    default: 'Click Then AI - Made AI simple',
  },
  description: 'Click Then AI is a simple and easy-to-use AI platform for everyone.',
  icons: {
    icon: "/favicon.ico",
  },
}

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={clsx(
        'h-full scroll-smooth bg-white antialiased',
        inter.variable,
        lexend.variable,
      )}
    >
      <body className="flex h-full flex-col">
        <TanstackProvider>
          <NextAuthProvider>
            <ToastProvider>
              <WrappedNextUIProvider>
                {children}
              </WrappedNextUIProvider>
            </ToastProvider>
          </NextAuthProvider>
        </TanstackProvider>
      </body>
    </html>
  )
}
export const dynamic = "force-dynamic"
