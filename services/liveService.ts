
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';

export interface LiveSessionCallbacks {
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (text: string, isInput: boolean) => void;
  onError?: (err: any) => void;
  onInterrupted?: () => void;
}

export class LiveAudioManager {
  private inputAudioContext?: AudioContext;
  private outputAudioContext?: AudioContext;
  private outputNode?: GainNode;
  private nextStartTime: number = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private stream?: MediaStream;
  private sessionPromise?: Promise<any>;

  constructor(private systemInstruction: string) {}

  async start(callbacks: LiveSessionCallbacks) {
    const ai = new GoogleGenAI({ apiKey: (process.env as any).API_KEY });
    
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    this.outputNode = this.outputAudioContext.createGain();
    this.outputNode.connect(this.outputAudioContext.destination);

    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    this.sessionPromise = ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-12-2025',
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          // 'Puck' is a clear masculine voice. 
          // Other options: 'Fenrir' (Deep), 'Charon' (Senior). 
          // Puck is often best for standard adult male personas.
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
        systemInstruction: this.systemInstruction,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
      callbacks: {
        onopen: () => {
          const source = this.inputAudioContext!.createMediaStreamSource(this.stream!);
          const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
          
          scriptProcessor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmBlob = this.createBlob(inputData);
            this.sessionPromise?.then((session) => {
              session.sendRealtimeInput({ media: pcmBlob });
            });
          };
          
          source.connect(scriptProcessor);
          scriptProcessor.connect(this.inputAudioContext!.destination);
          callbacks.onOpen?.();
        },
        onmessage: async (message: LiveServerMessage) => {
          if (message.serverContent?.inputTranscription) {
            callbacks.onMessage?.(message.serverContent.inputTranscription.text, true);
          }
          if (message.serverContent?.outputTranscription) {
            callbacks.onMessage?.(message.serverContent.outputTranscription.text, false);
          }

          const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
          if (base64Audio && this.outputAudioContext) {
            this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
            const audioBuffer = await this.decodeAudioData(this.decodeBase64(base64Audio), this.outputAudioContext, 24000, 1);
            const source = this.outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode!);
            source.addEventListener('ended', () => this.sources.delete(source));
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
            this.sources.add(source);
          }

          if (message.serverContent?.interrupted) {
            this.stopAllAudio();
            callbacks.onInterrupted?.();
          }
        },
        onclose: () => callbacks.onClose?.(),
        onerror: (e) => callbacks.onError?.(e),
      },
    });
  }

  private stopAllAudio() {
    this.sources.forEach(s => { try { s.stop(); } catch(e) {} });
    this.sources.clear();
    this.nextStartTime = 0;
  }

  stop() {
    this.stopAllAudio();
    this.stream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sessionPromise?.then(s => s.close());
  }

  private createBlob(data: Float32Array): Blob {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) int16[i] = data[i] * 32768;
    return {
      data: this.encodeBase64(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  private decodeBase64(base64: string) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  private encodeBase64(bytes: Uint8Array) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  private async decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  }
}
