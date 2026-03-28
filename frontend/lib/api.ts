const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export async function startMeeting(title: string, organizerName: string, emails: string[]) {
  const res = await fetch(`${API_BASE}/api/meetings/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, organizer_name: organizerName, stakeholder_emails: emails }),
  })
  if (!res.ok) throw new Error("Failed to start meeting")
  return res.json()
}

export async function endMeeting(meetingId: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/end`, { method: "POST" })
  if (!res.ok) throw new Error("Failed to end meeting")
  return res.json()
}

export async function askQuestion(meetingId: string, question: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question }),
  })
  if (!res.ok) throw new Error("Failed to ask question")
  return res.json()
}

export async function getAnswers(meetingId: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/answers`)
  if (!res.ok) throw new Error("Failed to fetch answers")
  return res.json()
}

export async function getMeetingNotes(meetingId: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/notes`)
  if (!res.ok) throw new Error("Notes not ready")
  return res.json()
}

export async function appendTranscript(meetingId: string, text: string, speakerLabel = "Speaker") {
  await fetch(`${API_BASE}/api/meetings/${meetingId}/transcript`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speaker_label: speakerLabel }),
  })
}

export async function getMeetingStatus(meetingId: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/status`)
  if (!res.ok) throw new Error("Meeting not found")
  return res.json()
}

export async function generateRecapVideo(meetingId: string) {
  const res = await fetch(`${API_BASE}/api/meetings/${meetingId}/recap-video`, { method: "POST" })
  if (!res.ok) throw new Error("Video generation failed")
  return res.json()
}
