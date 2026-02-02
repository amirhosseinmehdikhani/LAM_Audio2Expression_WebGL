import * as GaussianSplats3D from "gaussian-splat-renderer-for-lam";

export interface ExpressionDataSet {
  names: string[];
  frames: { weights: number[] }[];
}

/** ARKit 52 blend shape names (same order as LAM_Audio2Expression). */
const ARKIT_BLENDSHAPE_NAMES = [
  "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
  "cheekPuff", "cheekSquintLeft", "cheekSquintRight", "eyeBlinkLeft", "eyeBlinkRight",
  "eyeLookDownLeft", "eyeLookDownRight", "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight",
  "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight", "eyeWideLeft", "eyeWideRight",
  "jawForward", "jawLeft", "jawOpen", "jawRight", "mouthClose", "mouthDimpleLeft", "mouthDimpleRight",
  "mouthFrownLeft", "mouthFrownRight", "mouthFunnel", "mouthLeft", "mouthLowerDownLeft", "mouthLowerDownRight",
  "mouthPressLeft", "mouthPressRight", "mouthPucker", "mouthRight", "mouthRollLower", "mouthRollUpper",
  "mouthShrugLower", "mouthShrugUpper", "mouthSmileLeft", "mouthSmileRight", "mouthStretchLeft", "mouthStretchRight",
  "mouthUpperUpLeft", "mouthUpperUpRight", "noseSneerLeft", "noseSneerRight", "tongueOut",
];

/** Default: single neutral frame (all zeros) so avatar does not move. */
const DEFAULT_STATIC_EXPRESSION: ExpressionDataSet = {
  names: ARKIT_BLENDSHAPE_NAMES,
  frames: [{ weights: ARKIT_BLENDSHAPE_NAMES.map(() => 0) }],
};

export class GaussianAvatar {
  private static readonly FRAME_INTERVAL = 1 / 30;
  private static readonly STATE_DELAYS = { listening: 5, thinking: 6, responding: 10 } as const;

  private _avatarDivEle: HTMLDivElement;
  private _assetsPath = "";
  public curState = "Idle";
  private _renderer: GaussianSplats3D.GaussianSplatRenderer;
  private expressionData: Record<string, number> = {};
  private startTime = 0;
  private _expressionDataSet: ExpressionDataSet = DEFAULT_STATIC_EXPRESSION;

  constructor(container: HTMLDivElement, assetsPath: string) {
    this._avatarDivEle = container;
    this._assetsPath = assetsPath;
    this._init();
  }

  private _init() {
    if (!this._avatarDivEle || !this._assetsPath) {
      throw new Error("Lack of necessary initialization parameters");
    }
  }

  /** Set expression data (e.g. from LAM_Audio2Expression API). Resets animation to start. */
  public setExpressionData(data: ExpressionDataSet) {
    if (!data?.names?.length || !data?.frames?.length) return;
    this._expressionDataSet = data;
    this.startTime = performance.now() / 1000;
  }

  public start() {
    this.render();
  }

  public async render() {
    this._renderer = await GaussianSplats3D.GaussianSplatRenderer.getInstance(
      this._avatarDivEle,
      this._assetsPath,
      {
        getChatState: this.getChatState.bind(this),
        getExpressionData: this.getArkitFaceFrame.bind(this),
        backgroundColor: "0xff0000",
        alpha: 0.2
      },
    );
    this.startTime = performance.now() / 1000;
    const sec = (s: number) => s * 1000;
    setTimeout(() => { this.curState = "Listening"; }, sec(GaussianAvatar.STATE_DELAYS.listening));
    setTimeout(() => { this.curState = "Thinking"; }, sec(GaussianAvatar.STATE_DELAYS.thinking));
    setTimeout(() => { this.curState = "Responding"; }, sec(GaussianAvatar.STATE_DELAYS.responding));
  }

  public getChatState() {
    return this.curState;
  }

  public getArkitFaceFrame(): Record<string, number> {
    const data = this._expressionDataSet;
    const frames = data.frames;
    const length = frames.length;
    if (length === 0) return this.expressionData;

    const currentTime = performance.now() / 1000;
    const elapsed = currentTime - this.startTime;
    const cycleDuration = length * GaussianAvatar.FRAME_INTERVAL;

    // When animation (from API) has played once, revert to default static
    if (length > 1 && elapsed >= cycleDuration) {
      this._expressionDataSet = DEFAULT_STATIC_EXPRESSION;
    }

    const dataNow = this._expressionDataSet;
    const framesNow = dataNow.frames;
    const lenNow = framesNow.length;
    const cycleDurationNow = lenNow * GaussianAvatar.FRAME_INTERVAL;
    const calcDelta = (currentTime - this.startTime) % cycleDurationNow;
    const frameIndex = Math.min(
      Math.floor(calcDelta / GaussianAvatar.FRAME_INTERVAL),
      lenNow - 1
    );

    dataNow.names.forEach((name: string, index: number) => {
      this.expressionData[name] = framesNow[frameIndex].weights[index];
    });
    return this.expressionData;
  }
}
