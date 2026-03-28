import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Einstein — AI Meeting Co-Pilot",
  description: "Your AI meeting partner. Not the leader, the partner.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-black antialiased`}>{children}</body>
    </html>
  )
}
