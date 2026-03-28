"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  meetingId: string
  liveLines?: string[]  // lines pushed from Einstein Live
}

export default function TranscriptPanel({ meetingId, liveLines = [] }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [liveLines])

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {liveLines.length > 0 ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">Live — Einstein is transcribing</span>
            </>
          ) : (
            <span className="text-xs text-zinc-600">Enable Einstein to auto-transcribe</span>
          )}
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
        {liveLines.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-zinc-700 text-xs">Transcript will appear here.</p>
            <p className="text-zinc-800 text-xs mt-0.5">Starts automatically when Einstein is enabled.</p>
          </div>
        ) : (
          liveLines.map((line, i) => (
            <div key={i} className="animate-slide-up flex gap-2 items-start">
              <span className="text-zinc-700 text-xs mt-0.5 flex-shrink-0 font-mono">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-zinc-300 text-xs leading-relaxed">{line}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {liveLines.length > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-900 pt-2">
          <span className="text-zinc-700 text-xs">{liveLines.length} segments</span>
          <span className="text-zinc-700 text-xs">{liveLines.join(" ").split(" ").length} words</span>
        </div>
      )}
    </div>
  )
}
