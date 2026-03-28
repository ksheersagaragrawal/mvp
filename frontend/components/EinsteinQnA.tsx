"use client"

import { useState } from "react"
import { askQuestion } from "@/lib/api"

interface QnAItem {
  id: string
  question: string
  answer: string
}

function speakText(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.92
  utt.pitch = 0.8
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    v.name.includes("Daniel") || v.name.includes("Google UK English Male") ||
    v.name.includes("Alex") || v.name.includes("Arthur")
  )
  if (preferred) utt.voice = preferred
  if (onEnd) utt.onend = onEnd
  window.speechSynthesis.speak(utt)
}

export default function EinsteinQnA({ meetingId }: { meetingId: string }) {
  const [question, setQuestion] = useState("")
  const [items, setItems] = useState<QnAItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [speaking, setSpeaking] = useState<string | null>(null)

  async function handleAsk() {
    if (!question.trim() || loading) return
    setLoading(true)
    const q = question.trim()
    setQuestion("")
    setError("")
    try {
      const res = await askQuestion(meetingId, q)
      const item: QnAItem = { id: res.question_id, question: q, answer: res.answer }
      setItems(prev => [item, ...prev])
      setSpeaking(res.question_id)
      speakText(res.answer, () => setSpeaking(null))
    } catch {
      setError("Einstein couldn't answer right now. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Input */}
      <div className="space-y-2">
        <textarea
          className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2.5 text-white text-xs placeholder-zinc-700 focus:outline-none focus:border-zinc-600 transition resize-none leading-relaxed"
          placeholder="Ask anything anonymously... What does this term mean? What's the timeline?"
          rows={3}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleAsk()
            }
          }}
          disabled={loading}
        />
        <button
          onClick={handleAsk}
          disabled={loading || !question.trim()}
          className="w-full bg-white text-black text-xs font-semibold py-2.5 rounded-xl hover:bg-zinc-100 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Einstein is thinking...
            </>
          ) : "Ask Einstein anonymously →"}
        </button>
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* Q&A list */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
        {items.length === 0 && (
          <div className="text-center py-6">
            <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center mx-auto mb-2">
              <span className="text-zinc-600 text-xs font-bold">E</span>
            </div>
            <p className="text-zinc-700 text-xs">No one will know who asked.</p>
            <p className="text-zinc-800 text-xs mt-0.5">Questions are fully anonymous.</p>
          </div>
        )}

        {items.map(item => (
          <div key={item.id} className="animate-slide-up space-y-2">
            {/* Question bubble */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5">
              <p className="text-zinc-500 text-xs mb-1 font-medium">Anonymous</p>
              <p className="text-white text-xs leading-relaxed">{item.question}</p>
            </div>

            {/* Answer bubble */}
            <div className="bg-black border border-zinc-800 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1.5">
                <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                  <span className="text-black font-bold" style={{ fontSize: 8 }}>E</span>
                </div>
                <span className="text-zinc-500 text-xs font-medium">Einstein</span>
                {speaking === item.id && (
                  <span className="ml-auto flex items-center gap-1 text-xs text-green-500">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    speaking
                  </span>
                )}
              </div>
              <p className="text-zinc-200 text-xs leading-relaxed">{item.answer}</p>
              <button
                onClick={() => {
                  setSpeaking(item.id)
                  speakText(item.answer, () => setSpeaking(null))
                }}
                className="mt-2 text-zinc-700 hover:text-zinc-400 text-xs transition"
              >
                ▶ replay
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
