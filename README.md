Einstein — Your AI Meeting Partner

  Nobody likes meetings. Nobody admits they use AI. Einstein fixes both.

  Einstein is an AI-native meeting assistant that acts as a transparent team player — not a silent ghostwriter. It joins your meeting, listens,  
  and assists in real time without replacing human thinking.
                                                                                                                                                 
  What we built:  
  - Live Q&A: Attendees ask Einstein questions anonymously mid-meeting. Einstein answers via voice using text-to-speech, removing the social
  anxiety of "dumb questions."                                                                                                                   
  - Smart Notes: Einstein captures meeting context, formalizes discussion points, and sends structured recaps to stakeholders automatically.
  - Recap Video: Missed a meeting? Einstein generates a short, watchable recap video so you never have to sit through a full recording.          
                                                                                                                                                 
  Models & APIs used:                                                                                                                            
  - Gemini Live (gemini-3.1-flash-live-preview) — real-time audio Q&A during meetings
  - Gemini Nano Banana (nano-banana-pro-preview) — low-latency note generation and transcription                                                 
  - Veo 2 (veo-2.0-generate-001) — AI-generated recap video summaries                           
  - Gemini 2.5 Flash (gemini-2.5-flash) — structured Q&A responses and stakeholder digests                                                       
  - Gemini TTS (gemini-2.5-flash-preview-tts) — Einstein's voice during live meetings                                                            
  - FastAPI backend, Next.js frontend, Supabase for persistence                                                                           
                                                                                                                                                 
  Challenges:                                                                                                                                    
  Synchronizing Live API audio streams with structured note generation introduced latency issues. We solved this by decoupling the Q&A and notes 
  pipelines with async queues.    
