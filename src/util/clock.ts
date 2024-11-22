export default class Clock {
  private _now: () => number;
  private _baseline = 0;
  private _started?: number;
  constructor(now = () => Date.now()) {
    this._now = now;
    this.resume();
  }
  get elapsed() {
    if (!this._started) {
      return this._baseline;
    }
    return this._baseline + this._now() - this._started;
  }
  get isPaused() {
    return !this._started;
  }
  tare() {
    this._baseline = 0;
    this._started = undefined;
    return this;
  }
  pause() {
    if (!this._started) {
      return;
    }
    const now = this._now();
    // Advance the baseline value by the
    this._baseline += now - this._started;
    this._started = undefined;
  }
  resume() {
    const now = this._now();
    if (this._started) {
      this._baseline += now - this._started;
    }
    this._started = now;
  }
  async timeout(millis: number): Promise<void> {
    let elapsed = 0;
    let start = this.elapsed;
    while (elapsed < millis) {
      await new Promise((resolve) => {
        setTimeout(resolve, millis);
      });
      elapsed += this.elapsed - start;
    }
  }
}
