/**
 * Synchronized 60fps Canvas + Master WebAudio Bus `.webm` Music Video Exporter.
 */
export class VideoExporter {
  private recorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private active = false;

  isRecording(): boolean {
    return this.active;
  }

  start(canvas: HTMLCanvasElement, audioStream: MediaStream | null): boolean {
    if (this.active || typeof MediaRecorder === 'undefined') return false;

    const canvasStream = canvas.captureStream(60);
    const combinedTracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];
    if (audioStream) {
      combinedTracks.push(...audioStream.getAudioTracks());
    }
    const mixedStream = new MediaStream(combinedTracks);

    const mimeCandidates = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ];
    const mimeType =
      mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? '';

    this.chunks = [];
    this.recorder = new MediaRecorder(mixedStream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 12_000_000,
      audioBitsPerSecond: 256_000,
    });

    this.recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        this.chunks.push(ev.data);
      }
    };

    this.recorder.onstop = () => {
      const blob = new Blob(this.chunks, { type: mimeType || 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `sonobjet-capture-${stamp}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    this.recorder.start(250);
    this.active = true;
    return true;
  }

  stop(): void {
    if (!this.active || !this.recorder) return;
    this.active = false;
    if (this.recorder.state !== 'inactive') {
      this.recorder.stop();
    }
    this.recorder = null;
  }
}
