"""
FastAPI server that wraps LAM_Audio2Expression inference.
Run from backend root:
  cd backend && python -m server.api
Or in background:
  cd backend && nohup python -m server.api &
Or with uvicorn:
  cd backend && uvicorn server.api:app --host 0.0.0.0 --port 8001

Port is configurable via BACKEND_PORT (default 8001) in backend/.env or environment.
"""
import os
import sys
import tempfile
import json
import threading
from pathlib import Path


def _load_dotenv() -> None:
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key, val = key.strip(), val.strip().strip('"').strip("'")
        os.environ.setdefault(key, val)


_load_dotenv()

# LAM_Audio2Expression root (sibling of server/)
LAM_A2E_ROOT = Path(__file__).resolve().parent.parent / "LAM_Audio2Expression"
if not LAM_A2E_ROOT.is_dir():
    raise RuntimeError(f"LAM_Audio2Expression not found at {LAM_A2E_ROOT}")

sys.path.insert(0, str(LAM_A2E_ROOT))
os.chdir(LAM_A2E_ROOT)

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Lazy init infer (loaded on first request)
_infer = None
_cfg = None
_lock = threading.Lock()


def _get_infer():
    global _infer, _cfg
    with _lock:
        if _infer is not None:
            return _infer, _cfg
        from engines.defaults import default_config_parser, default_setup
        from engines.infer import INFER

        config_path = "configs/lam_audio2exp_config_streaming.py"
        if not os.path.isfile(config_path):
            raise RuntimeError(
                f"Config not found: {config_path} (cwd={os.getcwd()})"
            )
        _cfg = default_config_parser(config_path, None)
        # Disable vocal extraction for API (faster; set EX_VOL=1 to enable)
        _cfg.ex_vol = os.environ.get("EX_VOL", "0") == "1"
        _cfg = default_setup(_cfg)
        _infer = INFER.build(dict(type=_cfg.infer.type, cfg=_cfg))
        return _infer, _cfg


app = FastAPI(title="LAM Audio2Expression API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "LAM Audio2Expression API", "docs": "/docs"}


@app.post("/api/audio2expression")
async def audio2expression(audio: UploadFile = File(...)):
    """Accept an audio file, run LAM_Audio2Expression inference, return expression JSON (names + frames)."""
    if not audio.content_type and not audio.filename:
        raise HTTPException(status_code=400, detail="No audio file provided")
    suffix = Path(audio.filename or "audio").suffix or ".wav"
    if suffix.lower() not in (".wav", ".mp3", ".ogg", ".m4a", ".flac"):
        suffix = ".wav"

    try:
        infer, cfg = _get_infer()
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=503,
            detail=f"Model not loaded: {e}. Ensure LAM_Audio2Expression is set up and pretrained_models/lam_audio2exp.tar exists.",
        )

    with tempfile.TemporaryDirectory(prefix="lam_a2e_") as tmp:
        audio_path = os.path.join(tmp, "input" + suffix)
        json_path = os.path.join(tmp, "expression.json")
        with open(audio_path, "wb") as f:
            f.write(await audio.read())
        if not os.path.isfile(audio_path) or os.path.getsize(audio_path) == 0:
            raise HTTPException(status_code=400, detail="Empty or invalid audio file")

        with _lock:
            cfg.audio_input = os.path.abspath(audio_path)
            cfg.save_json_path = os.path.abspath(json_path)
            try:
                infer.infer()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

        if not os.path.isfile(json_path):
            raise HTTPException(status_code=500, detail="Inference did not produce output")
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

    # Return only names + frames for the frontend
    return {"names": data["names"], "frames": data["frames"]}


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("BACKEND_HOST", "0.0.0.0")
    port = int(os.environ.get("BACKEND_PORT", "8001"))
    uvicorn.run(app, host=host, port=port)
