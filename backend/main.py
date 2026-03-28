from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import meetings, qna, live

app = FastAPI(title="Einstein API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Length", "Content-Range", "Accept-Ranges"],
)

app.include_router(meetings.router)
app.include_router(qna.router)
app.include_router(live.router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Einstein API"}
