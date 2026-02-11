declare module 'react-speech-recognition' {
    export interface SpeechRecognitionOptions {
        autoStart?: boolean;
        continuous?: boolean;
        language?: string;
    }

    export interface SpeechRecognition {
        startListening(options?: SpeechRecognitionOptions): Promise<void>;
        stopListening(): Promise<void>;
        abortListening(): Promise<void>;
    }

    export interface useSpeechRecognitionOptions {
        transcripts?: any;
        commands?: any;
    }

    export function useSpeechRecognition(options?: useSpeechRecognitionOptions): {
        transcript: string;
        interimTranscript: string;
        finalTranscript: string;
        listening: boolean;
        resetTranscript: () => void;
        browserSupportsSpeechRecognition: boolean;
        isMicrophoneAvailable: boolean;
    };

    const SpeechRecognition: SpeechRecognition;
    export default SpeechRecognition;
}
