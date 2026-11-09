import * as lamejs from "@breezystack/lamejs";

export async function convertWavToMp3(wavBlob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function () {
      const arrayBuffer = this.result;

      // Create a WAV decoder
      // @ts-expect-error - No idea
      const wavDecoder = lamejs.WavHeader.readHeader(new DataView(arrayBuffer));

      // Get the WAV audio data as an array of samples
      const wavSamples = new Int16Array(arrayBuffer as ArrayBuffer, wavDecoder.dataOffset, wavDecoder.dataLen / 2);

      // Create an MP3 encoder
      const mp3Encoder = new lamejs.Mp3Encoder(wavDecoder.channels, wavDecoder.sampleRate, 128);

      // Encode the WAV samples to MP3
      const mp3Buffer = mp3Encoder.encodeBuffer(wavSamples);

      // Finalize the MP3 encoding
      const mp3Data = mp3Encoder.flush();

      // Combine the MP3 header and data into a new ArrayBuffer
      const mp3BufferWithHeader = new Uint8Array(mp3Buffer.length + mp3Data.length);
      mp3BufferWithHeader.set(mp3Buffer, 0);
      mp3BufferWithHeader.set(mp3Data, mp3Buffer.length);

      // Create a Blob from the ArrayBuffer
      const mp3Blob = new Blob([mp3BufferWithHeader], { type: "audio/mpeg" });

      resolve(mp3Blob);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    // Read the input blob as an ArrayBuffer
    reader.readAsArrayBuffer(wavBlob);
  });
}

// Limite da Meta para imagem na API oficial
const WHATSAPP_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
// Lado maior: acima disso o WhatsApp reduz de qualquer forma e o arquivo só fica mais pesado
const WHATSAPP_IMAGE_MAX_SIDE = 4096;
const WHATSAPP_IMAGE_QUALITIES = [0.85, 0.75, 0.65, 0.5];

/**
 * Converte a imagem para o que a Meta aceita: JPEG estático, sRGB, 8 bits por canal e até 5 MB (sem isso ela recusa
 * com o code 131053). O canvas resolve CMYK, PNG de 16 bits e animação (fica o primeiro quadro) e aplica a rotação
 * do EXIF; a transparência vira fundo branco. Falha se o navegador não souber abrir o arquivo (HEIC fora do Safari).
 */
export async function convertImageForWhatsapp(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não foi possível abrir a imagem. Envie um arquivo JPG ou PNG.");
  }

  const scale = Math.min(1, WHATSAPP_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a imagem para envio.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const name = `${file.name.replace(/\.[^.]+$/, "") || "imagem"}.jpg`;

  for (const quality of WHATSAPP_IMAGE_QUALITIES) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Não foi possível preparar a imagem para envio.");

    if (blob.size <= WHATSAPP_IMAGE_MAX_BYTES) return new File([blob], name, { type: "image/jpeg" });
  }

  throw new Error("A imagem ficou maior que 5 MB mesmo comprimida. Envie uma imagem menor.");
}
