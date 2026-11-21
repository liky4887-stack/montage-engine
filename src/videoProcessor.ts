import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
const execAsync = promisify(exec);

export async function transcribeVideo(inputPath: string): Promise<string> {
  const whisperPath = `${process.env.HOME}/whisper.cpp/build/bin/whisper-cli`;
  const modelPath = `${process.env.HOME}/whisper.cpp/models/ggml-tiny.en.bin`;
  
  // Create a temporary wav file path
  const wavPath = inputPath.replace(/\.[^/.]+$/, "") + "_temp.wav";

  // 1. Extract audio to 16kHz mono WAV using ffmpeg
  await execAsync(`ffmpeg -y -i "${inputPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavPath}"`);

  // 2. Transcribe the WAV file
  const { stdout } = await execAsync(`${whisperPath} -m ${modelPath} -f "${wavPath}" -oj`);
  
  // 3. Clean up the temp wav file
  if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);

  return stdout;
}

export async function trimVideo(inputPath: string, outputPath: string, start: string, duration: string): Promise<void> {
  await execAsync(`ffmpeg -y -i "${inputPath}" -ss ${start} -t ${duration} -c copy "${outputPath}"`);
}
