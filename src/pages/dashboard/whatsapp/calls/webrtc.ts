// A Meta responde direto a partir dos próprios servidores (ICE lite); o STUN só ajuda o navegador a achar o IP público
const ICE_SERVERS: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

// A Meta não aceita candidatos enviados depois: a oferta ou resposta vai com todos eles, ou com os que deu tempo
const ICE_GATHERING_TIMEOUT_MS = 3000;

export class MicrophoneError extends Error {}

/** Microfone do atendente; falha com uma mensagem que dá para mostrar. */
export async function getMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) throw new MicrophoneError("Este navegador não permite ligações");

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
  } catch {
    throw new MicrophoneError("Libere o microfone no navegador para fazer e atender ligações");
  }
}

export function createPeerConnection(stream: MediaStream, onRemoteStream: (stream: MediaStream) => void) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

  stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
  pc.ontrack = (event) => onRemoteStream(event.streams[0] ?? new MediaStream([event.track]));

  return pc;
}

/** Espera os candidatos de rede, para mandar o SDP completo de uma vez. */
export function waitIceGathering(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return Promise.resolve();

  return new Promise<void>((resolve) => {
    const timer = window.setTimeout(done, ICE_GATHERING_TIMEOUT_MS);

    function done() {
      window.clearTimeout(timer);
      pc.removeEventListener("icegatheringstatechange", onChange);
      resolve();
    }

    function onChange() {
      if (pc.iceGatheringState === "complete") done();
    }

    pc.addEventListener("icegatheringstatechange", onChange);
  });
}

/** Resposta de áudio para a oferta da Meta (ligação recebida). */
export async function createAnswer(pc: RTCPeerConnection, sdpOffer: string) {
  await pc.setRemoteDescription({ type: "offer", sdp: sdpOffer });
  await pc.setLocalDescription(await pc.createAnswer());
  await waitIceGathering(pc);

  return pc.localDescription!.sdp;
}

/** Oferta de áudio para ligar para o contato. */
export async function createOffer(pc: RTCPeerConnection) {
  await pc.setLocalDescription(await pc.createOffer({ offerToReceiveAudio: true }));
  await waitIceGathering(pc);

  return pc.localDescription!.sdp;
}
