import { GaussianAvatar, type ExpressionDataSet } from './gaussianAvatar';

const AVATAR_CONTAINER_ID = 'avatar-container';
const ASSET_PATH = './asset/arkit/image.zip';

/** Base URL for Audio2Expression API (e.g. http://localhost:8001 when running backend separately). */
const getApiBase = (): string => {
  return (import.meta as unknown as { env?: { VITE_AUDIO2EXPRESSION_API?: string } }).env?.VITE_AUDIO2EXPRESSION_API ?? '';
};

const setStatus = (message: string, type: 'idle' | 'error' | 'success' = 'idle') => {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = message;
  el.className = 'status' + (type !== 'idle' ? ` ${type}` : '');
};

async function audioToExpression(audioFile: File): Promise<ExpressionDataSet> {
  const base = getApiBase();
  const url = base ? `${base.replace(/\/$/, '')}/api/audio2expression` : '/api/audio2expression';
  const form = new FormData();
  form.append('audio', audioFile);

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    headers: base ? {} : {}, // same-origin can omit; cross-origin may need CORS only
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Server error: ${res.status}`);
  }

  const json = await res.json();
  if (!json?.names?.length || !json?.frames?.length) {
    throw new Error('Invalid server response format.');
  }
  return json as ExpressionDataSet;
}

function main() {
  const container = document.getElementById(AVATAR_CONTAINER_ID);
  if (!container) {
    throw new Error(`Container #${AVATAR_CONTAINER_ID} not found`);
  }

  const gaussianAvatar = new GaussianAvatar(container as HTMLDivElement, ASSET_PATH);
  gaussianAvatar.start();

  const btnUpload = document.getElementById('btn-upload');
  const audioInput = document.getElementById('audio-input') as HTMLInputElement;

  if (btnUpload && audioInput) {
    btnUpload.addEventListener('click', () => audioInput.click());

    audioInput.addEventListener('change', async () => {
      const file = audioInput.files?.[0];
      if (!file) return;

      btnUpload.setAttribute('disabled', 'true');
      setStatus('Converting audio to expression...');

      try {
        const expressionData = await audioToExpression(file);
        gaussianAvatar.setExpressionData(expressionData);

        const audioUrl = URL.createObjectURL(file);
        const audioEl = new Audio(audioUrl);
        audioEl.onended = () => URL.revokeObjectURL(audioUrl);
        audioEl.play().catch((e) => console.warn('Audio play:', e));

        setStatus(`Expression loaded: ${expressionData.frames.length} frames.`, 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error connecting to server';
        setStatus(msg, 'error');
      } finally {
        btnUpload.removeAttribute('disabled');
        audioInput.value = '';
      }
    });
  }
}

main();
