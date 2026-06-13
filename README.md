# LAM_Audio2Expression_WebGL

**Lightweight WebGL Renderer** — A real-time 3D Gaussian Splatting rendering engine used in **LAM** and **LAM_Audio2Expression** pipelines for interactive avatar animation.

The renderer is also available as an NPM package:

👉 https://www.npmjs.com/package/gaussian-splat-renderer-for-lam

------------------------------------------------------------------------

## 📁 Project Structure

The project is split into two independent parts:

```
LAM_Audio2Expression_WebGL/
├── backend/          # FastAPI + LAM_Audio2Expression inference (port 8001)
│   ├── server/
│   └── LAM_Audio2Expression/
└── frontend/         # Vite WebGL avatar UI (port 8080)
    ├── src/
    ├── asset/
    └── package.json
```

| Part | Folder | Port | Description |
|------|--------|------|-------------|
| **Backend** | `backend/` | 8001 | Audio → ARKit blendshapes API |
| **Frontend** | `frontend/` | 8080 | 3D avatar renderer + audio upload |

------------------------------------------------------------------------

## 🚀 Quick Start

### 1. Backend

```bash
cd backend

# First-time setup (inside backend/LAM_Audio2Expression):
cd LAM_Audio2Expression
bash ./scripts/install/install_cu118.sh
huggingface-cli download 3DAIGC/LAM_audio2exp --local-dir ./
tar -xzvf LAM_audio2exp_assets.tar
tar -xzvf LAM_audio2exp_streaming.tar
cd ..

pip install -r server/requirements.txt
python -m server.api
```

Run in background (like before):

```bash
cd backend
nohup python -m server.api > nohup.out 2>&1 &
```

- API: http://localhost:8001 (default)
- Docs: http://localhost:8001/docs

#### Backend port configuration

Copy `backend/.env.example` to `backend/.env` and change the port:

```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8001
```

If you change the backend port, also update `frontend/.env`:

```env
VITE_BACKEND_PORT=8001
```

Or set the full API URL:

```env
VITE_AUDIO2EXPRESSION_API=http://localhost:8001
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

- UI: http://localhost:8080

In development, Vite proxies `/api` requests to the backend (port from `VITE_BACKEND_PORT`).

For production builds, set the backend URL in `frontend/.env`:

```env
VITE_AUDIO2EXPRESSION_API=http://your-server:8001
```

Or use `VITE_BACKEND_PORT` if only the port differs from 8001.

------------------------------------------------------------------------

## 🎤 Workflow

1. Start **backend** on port 8001.
2. Start **frontend** on port 8080.
3. User uploads an audio file in the UI.
4. Frontend sends audio to `POST /api/audio2expression`.
5. Backend runs LAM_Audio2Expression inference.
6. Avatar animates with generated ARKit blendshapes in real time.

------------------------------------------------------------------------

## 📦 Core Features

- Real-time avatar rendering
- ARKit blendshape animation
- Gaussian splatting renderer
- NPM package integration
- Low-latency interaction

------------------------------------------------------------------------

## 📦 NPM Package Usage

### Installation

```bash
npm install gaussian-splat-renderer-for-lam
```

### Basic Usage

```javascript
import * as GaussianSplats3D from 'gaussian-splat-renderer-for-lam';

const div = document.getElementById('GaussianRenderer');
const assetPath = './asset/arkit/p2-1.zip';

const render = await GaussianSplats3D.GaussianSplatRenderer
    .getInstance(div, assetPath);
```

> **Advanced Features**
>
> * Facial animations: Load `frontend/asset/test_expression_1s.json` for expression control
> * Custom avatars: Generate new models via [LAM](https://github.com/aigc3d/LAM.git) and replace ZIP files

------------------------------------------------------------------------

## 🔗 Related Projects

| Feature               | Repository                                                                    |
| --------------------- | ----------------------------------------------------------------------------- |
| Chat integration      | [OpenAvatarChat](https://github.com/HumanAIGC-Engineering/OpenAvatarChat.git) |
| Avatar generation     | [LAM](https://github.com/aigc3d/LAM.git)                                      |
| Expression generation | [LAM\_Audio2Expression](https://github.com/aigc3d/LAM_Audio2Expression.git)   |

------------------------------------------------------------------------

## 🧪 Example Files

* Avatar model: `frontend/asset/arkit/p2-1.zip`
* Expression data: `frontend/asset/test_expression_1s.json`

------------------------------------------------------------------------

## 📜 License

This project is licensed under the MIT License.
