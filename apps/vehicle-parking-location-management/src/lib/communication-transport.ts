export interface VoiceTransmissionPacket {
  id: string;
  senderId: string;
  senderName: string;
  targetId: string;
  targetName: string;
  targetType: 'User' | 'Group' | 'All Online';
  audioUrl: string;
  durationSeconds: number;
  sentAt: string;
  emergency: boolean;
}

export interface CommunicationTransport {
  connect(userId: string): Promise<void>;
  sendVoice(packet: VoiceTransmissionPacket): Promise<void>;
  subscribe(handler: (packet: VoiceTransmissionPacket) => void): () => void;
  disconnect(): Promise<void>;
}

class UnavailableCommunicationTransport implements CommunicationTransport {
  async connect(_userId: string): Promise<void> {
    return Promise.resolve();
  }

  async sendVoice(_packet: VoiceTransmissionPacket): Promise<void> {
    throw new Error('Realtime communication is not configured.');
  }

  subscribe(_handler: (packet: VoiceTransmissionPacket) => void): () => void {
    return () => undefined;
  }

  async disconnect(): Promise<void> {
    return Promise.resolve();
  }
}

export const communicationTransport: CommunicationTransport = new UnavailableCommunicationTransport();
