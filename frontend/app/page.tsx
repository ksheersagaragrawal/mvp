"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { startMeeting } from "@/lib/api"

export default function Home() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [name, setName] = useState("")
  const [emails, setEmails] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")


  async function handleStart() {
    if (!title || !name) return
    setLoading(true)
    setError("")
    try {
      const emailList = emails.split(",").map(e => e.trim()).filter(Boolean)
      const meeting = await startMeeting(title, name, emailList)
      router.push(`/meeting/${meeting.id}`)
    } catch {
      setError("Failed to start meeting. Is the backend running?")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
            <span className="text-black font-bold text-xs">E</span>
          </div>
          <span className="font-semibold text-sm tracking-tight">Einstein</span>
        </div>
        <span className="text-xs text-zinc-600 bg-zinc-900 border border-zinc-800 px-3 py-1 rounded-full">
          AI Meeting Co-Pilot
        </span>
      </nav>

      {/* Hero */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="max-w-lg w-full">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <span className="text-xs text-zinc-400 border border-zinc-800 bg-zinc-900 px-4 py-1.5 rounded-full">
              Powered by Gemini Live · Nano Banana · Veo
            </span>
          </div>

          {/* Headline */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold tracking-tight mb-4 leading-tight">
              Meetings that<br />
              <span className="text-zinc-400">actually work.</span>
            </h1>
            <p className="text-zinc-500 text-base leading-relaxed max-w-sm mx-auto">
              Einstein joins your meeting as a co-pilot — answering questions anonymously, taking notes, and generating recaps. Not the leader. The partner.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Meeting Title</label>
              <input
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
                placeholder="Q2 Product Planning"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleStart()}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">Your Name</label>
              <input
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
                placeholder="Alex Chen"
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleStart()}
              />
            </div>

            <div>
              <label className="text-xs text-zinc-500 font-medium mb-1.5 block">
                Stakeholder Emails
                <span className="text-zinc-700 ml-1 font-normal">— optional, comma separated</span>
              </label>
              <input
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition"
                placeholder="cto@company.com, pm@company.com"
                value={emails}
                onChange={e => setEmails(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-950 border border-red-900 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleStart}
              disabled={loading || !title || !name}
              className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-zinc-100 active:bg-zinc-200 transition disabled:opacity-30 disabled:cursor-not-allowed text-sm mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Starting meeting...
                </span>
              ) : "Start Meeting with Einstein →"}
            </button>
          </div>

          {/* Feature strip */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            {[
              { icon: "◎", label: "Anonymous Q&A", sub: "No judgement" },
              { icon: "◈", label: "Auto Notes", sub: "Nano Banana" },
              { icon: "▶", label: "Recap Video", sub: "Powered by Veo" },
            ].map(f => (
              <div key={f.label} className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 text-center">
                <div className="text-white text-lg mb-1 font-mono">{f.icon}</div>
                <div className="text-xs text-zinc-300 font-medium">{f.label}</div>
                <div className="text-xs text-zinc-600 mt-0.5">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
