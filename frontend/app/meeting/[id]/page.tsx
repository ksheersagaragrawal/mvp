"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import EinsteinQnA from "@/components/EinsteinQnA"
import TranscriptPanel from "@/components/TranscriptPanel"
import { endMeeting, getMeetingStatus } from "@/lib/api"

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/^http/, "ws")

export default function MeetingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [meeting, setMeeting] = useState<any>(null)
  const [tab, setTab] = useState<"qna" | "transcript">("qna")
  const [ending, setEnding] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [elapsed, setElapsed] = useState(0)

  // Live voice
  const [liveStatus, setLiveStatus] = useState<"off" | "connecting" | "on">("off")
  const [liveLabel, setLiveLabel] = useState("")
  const [transcriptLines, setTranscriptLines] = useState<string[]>([])

  // Screen share
  const [screenActive, setScreenActive] = useState(false)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const screenIntervalRef = useRef<ReturnType<typeof setInterval>>()
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null)

  async function toggleScreen() {
    if (screenActive) {
      clearInterval(screenIntervalRef.current)
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
      setScreenActive(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      screenStreamRef.current = stream
      const video = document.createElement("video")
      video.srcObject = stream
      await video.play()

      if (!screenCanvasRef.current) screenCanvasRef.current = document.createElement("canvas")
      const canvas = screenCanvasRef.current

      screenIntervalRef.current = setInterval(() => {
        if (!wsLiveRef.current || wsLiveRef.current.readyState !== WebSocket.OPEN) return
        canvas.width = 640
        canvas.height = Math.round(640 * video.videoHeight / video.videoWidth)
        const ctx = canvas.getContext("2d")!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          if (!blob) return
          blob.arrayBuffer().then(buf => {
            const bytes = new Uint8Array(buf)
            let bin = ""
            for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
            wsLiveRef.current?.send(JSON.stringify({ type: "video", data: btoa(bin) }))
          })
        }, "image/jpeg", 0.7)
      }, 1000) // 1 frame per second

      stream.getVideoTracks()[0].onended = () => {
        clearInterval(screenIntervalRef.current)
        setScreenActive(false)
      }
      setScreenActive(true)
    } catch {
      // user cancelled
    }
  }

  const wsLiveRef = useRef<WebSocket | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const nextPlayRef = useRef(0)
  const speakingRef = useRef(false)

  useEffect(() => {
    getMeetingStatus(id).then(m => {
      setMeeting(m)
      // Auto-start Einstein Live as soon as meeting loads
      toggleLive()
    }).catch(() => router.push("/"))
  }, [id])

  // Meeting timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0")
  const secs = String(elapsed % 60).padStart(2, "0")

  async function handleEnd() {
    stopLive()
    setEnding(true)
    try {
      await endMeeting(id)
      router.push(`/recap/${id}`)
    } catch {
      setEnding(false)
    }
  }

  function stopLive() {
    processorRef.current?.disconnect()
    micStreamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(screenIntervalRef.current)
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current = null
    setScreenActive(false)
    wsLiveRef.current?.close()
    wsLiveRef.current = null
    setLiveStatus("off")
    setLiveLabel("")
    speakingRef.current = false
  }

  async function toggleLive() {
    if (liveStatus === "on" || liveStatus === "connecting") {
      stopLive()
      return
    }

    setLiveStatus("connecting")
    setLiveLabel("Connecting...")

    const ws = new WebSocket(`${WS_BASE}/ws/meetings/${id}/live`)
    wsLiveRef.current = ws

    ws.onmessage = async (e) => {
      const data = JSON.parse(e.data)
      if (data.type === "status") {
        if (data.text.includes("listening")) setLiveStatus("on")
        setLiveLabel(data.text)
      } else if (data.type === "audio") {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContext({ sampleRate: 24000 })
          nextPlayRef.current = 0
        }
        const ctx = audioCtxRef.current
        if (ctx.state === "suspended") ctx.resume()
        if (!speakingRef.current) {
          speakingRef.current = true
          setLiveLabel("Einstein is speaking...")
        }
        const raw = atob(data.data)
        const int16 = new Int16Array(raw.length / 2)
        for (let i = 0; i < int16.length; i++)
          int16[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8)
        const buf = ctx.createBuffer(1, int16.length, 24000)
        const ch = buf.getChannelData(0)
        for (let i = 0; i < int16.length; i++) ch[i] = int16[i] / 32768
        const src = ctx.createBufferSource()
        src.buffer = buf
        src.connect(ctx.destination)
        const startAt = Math.max(ctx.currentTime, nextPlayRef.current)
        src.start(startAt)
        nextPlayRef.current = startAt + buf.duration
        src.onended = () => {
          if (nextPlayRef.current <= ctx.currentTime) {
            speakingRef.current = false
            setLiveLabel("Einstein is listening.")
          }
        }
      } else if (data.type === "transcript") {
        setTranscriptLines(prev => [...prev, data.text])
      } else if (data.type === "error") {
        setLiveLabel("Error: " + data.message)
        setLiveStatus("off")
      }
    }

    ws.onerror = () => { setLiveStatus("off"); setLiveLabel("Connection failed") }
    ws.onclose = () => { if (liveStatus !== "off") { setLiveStatus("off"); setLiveLabel("") } }

    // Wait for WS to open then start mic
    ws.onopen = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        micStreamRef.current = stream
        const ctx = new AudioContext({ sampleRate: 16000 })
        const source = ctx.createMediaStreamSource(stream)
        const processor = ctx.createScriptProcessor(4096, 1, 1)
        processorRef.current = processor
        processor.onaudioprocess = (e) => {
          if (!wsLiveRef.current || wsLiveRef.current.readyState !== WebSocket.OPEN) return
          const f32 = e.inputBuffer.getChannelData(0)
          const i16 = new Int16Array(f32.length)
          for (let i = 0; i < f32.length; i++) i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768))
          const bytes = new Uint8Array(i16.buffer)
          let bin = ""
          for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
          wsLiveRef.current.send(JSON.stringify({ type: "audio", data: btoa(bin) }))
        }
        source.connect(processor)
        processor.connect(ctx.destination)
      } catch {
        setLiveLabel("Mic permission denied")
        setLiveStatus("off")
      }
    }
  }

  useEffect(() => () => stopLive(), [])

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-900 bg-black/90 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
              <span className="text-black font-bold text-xs">E</span>
            </div>
            <span className="font-semibold text-sm">Einstein</span>
          </div>

          <div className="h-4 w-px bg-zinc-800" />

          <span className="text-sm text-zinc-300 font-medium truncate max-w-48">
            {meeting?.title || "Loading..."}
          </span>

          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-400 font-mono">{mins}:{secs}</span>
          </div>
        </div>

        <button
          onClick={handleEnd}
          disabled={ending}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
        >
          {ending ? (
            <>
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Ending...
            </>
          ) : (
            <> ■ End Meeting </>
          )}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Video */}
        <div className="flex-1 p-3">
          {meeting?.join_url ? (
            <iframe
              src={meeting.join_url}
              className="w-full h-full rounded-xl"
              allow="camera *; microphone *; fullscreen *; speaker *; display-capture *; compute-pressure *"
              allowFullScreen
              style={{ border: "none", background: "#0a0a0a" }}
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-zinc-950 border border-zinc-900 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-white rounded-full animate-spin mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">Loading meeting room...</p>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-[340px] border-l border-zinc-900 flex flex-col bg-zinc-950">
          {/* Einstein intro card */}
          {!dismissed && (
            <div className="m-3 mb-0 bg-black border border-zinc-800 rounded-xl p-3 animate-slide-up">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-black text-xs font-bold">E</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    I'm Einstein — your meeting co-pilot. Ask me anything anonymously, I'll take notes, and stay out of the way. <span className="text-zinc-500">You're in charge.</span>
                  </p>
                </div>
                <button onClick={() => setDismissed(true)} className="text-zinc-700 hover:text-zinc-400 text-xs ml-1 flex-shrink-0">✕</button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex mx-3 mt-3 bg-black border border-zinc-900 rounded-xl p-1">
            {(["qna", "transcript"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
                  tab === t ? "bg-zinc-800 text-white" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {t === "qna" ? "Ask Einstein" : "Transcript"}
              </button>
            ))}
          </div>

          {/* Panel */}
          <div className="flex-1 overflow-hidden p-3 pt-2">
            {tab === "qna" && <EinsteinQnA meetingId={id} />}
            {tab === "transcript" && <TranscriptPanel meetingId={id} liveLines={transcriptLines} />}
          </div>

          {/* Live bar */}
          <div className="border-t border-zinc-900 p-3 space-y-2">
            <button
              onClick={toggleLive}
              className={`w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl text-xs font-semibold transition border ${
                liveStatus === "on"
                  ? "bg-green-950 border-green-800 text-green-400 hover:bg-green-900"
                  : liveStatus === "connecting"
                  ? "bg-zinc-900 border-zinc-700 text-zinc-400 cursor-wait"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {liveStatus === "on" ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  {liveLabel || "Einstein is listening — tap to stop"}
                </>
              ) : liveStatus === "connecting" ? (
                <>
                  <span className="w-3 h-3 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                  {liveLabel}
                </>
              ) : (
                <>
                  <span>🎙</span>
                  Resume Einstein
                </>
              )}
            </button>

            {liveStatus === "on" && (
              <button
                onClick={toggleScreen}
                className={`w-full flex items-center justify-center gap-2.5 py-2 rounded-xl text-xs font-medium transition border ${
                  screenActive
                    ? "bg-blue-950 border-blue-800 text-blue-400 hover:bg-blue-900"
                    : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                }`}
              >
                {screenActive ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    Einstein sees your screen — tap to stop
                  </>
                ) : (
                  <>
                    <span>⬡</span>
                    Share screen with Einstein
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
