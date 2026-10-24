from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows your frontend to connect cleanly
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
