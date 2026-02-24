import { useState, useEffect, useMemo, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import {
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { sendVoiceCommand } from "../api/axios";
import { useTranslation } from "../context/LanguageContext";
import "./VoiceControlFAB.scss";

export const VoiceControlFAB = () => {
  const { lang, t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isWaitingForProcessing, setIsWaitingForProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [responseData, setResponseData] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  const locale = useMemo(() => (lang === "pl" ? "pl-PL" : "en-US"), [lang]);

  // Ref to always have the latest transcript value (avoids stale closures)
  const transcriptRef = useRef("");
  // Ref to track if stop was triggered manually (by button click)
  const isManualStopRef = useRef(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Auto-trigger: when the browser stops listening on its own (not manual),
  // and there's a transcript available, process it.
  useEffect(() => {
    if (
      !listening &&
      transcript.length > 0 &&
      !isProcessing &&
      !isWaitingForProcessing &&
      !feedback &&
      !isManualStopRef.current
    ) {
      processTranscript();
    }
    if (!listening) {
      isManualStopRef.current = false;
    }
  }, [listening]);

  useEffect(() => {
    if (feedback) {
      const displayTime = Math.max(15000, responseData ? 30000 : 15000);
      const timer = setTimeout(() => {
        setFeedback(null);
        setResponseData(null);
      }, displayTime);
      return () => clearTimeout(timer);
    }
  }, [feedback, responseData]);

  const handleStartListening = () => {
    if (!browserSupportsSpeechRecognition) {
      const errorMsg =
        t.voiceAssistant?.unsupported ||
        (lang === "pl"
          ? "Ta przeglądarka nie wspiera rozpoznawania mowy. Użyj przeglądarki opartej na Chromium lub Safari."
          : "Speech recognition not supported. Please use a chromium-based browser or Safari");
      setFeedback({ type: "error", msg: errorMsg });
      return;
    }
    setFeedback(null);
    setResponseData(null);
    setIsProcessing(false);
    setIsWaitingForProcessing(false);
    isManualStopRef.current = false;
    resetTranscript();
    SpeechRecognition.startListening({ language: locale, continuous: false });
  };

  const speak = (text: string) => {
    console.log("[Faraday Voice] Speaking:", text);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const summarizeResponseForSpeech = (response: any): string => {
    if (!response.success) {
      return (
        response.message ||
        (lang === "pl" ? "Wystąpił błąd." : "An error occurred.")
      );
    }

    const { actionPerformed, data } = response;

    if (
      actionPerformed === "multi_step_execution" &&
      data?.results?.inventory
    ) {
      const inventory = data.results.inventory;
      if (inventory.length === 0)
        return lang === "pl" ? "Brak produktów." : "No products found.";

      const itemsSummary = inventory
        .slice(0, 2)
        .map(
          (item: any) =>
            `${item.productName || item.name || item.ProductName}: ${item.totalQuantity || item.quantity || item.TotalQuantity}`,
        )
        .join(", ");

      const totalCount = inventory.length;
      const extra =
        totalCount > 2 ? (lang === "pl" ? " i inne." : " and more.") : ".";

      return lang === "pl"
        ? `Na stanie: ${itemsSummary}${extra}`
        : `In stock: ${itemsSummary}${extra}`;
    }

    let message = response.message || "";
    const genericPhrases = ["Check response data", "Sprawdź dane"];
    if (!message || genericPhrases.some((p) => message.includes(p))) {
      message =
        lang === "pl" ? "Zakończono pomyślnie." : "Completed successfully.";
    }

    return message;
  };

  // Called when the user manually clicks stop
  const handleStopAndSend = async () => {
    isManualStopRef.current = true;
    await SpeechRecognition.stopListening();
    await processTranscript();
  };

  const processTranscript = async () => {
    const currentTranscript = transcriptRef.current.trim();
    if (!currentTranscript) {
      resetTranscript();
      return;
    }

    setIsWaitingForProcessing(true);
    try {
      setIsProcessing(true);
      setIsWaitingForProcessing(false);

      const result = await sendVoiceCommand(currentTranscript);
      console.log("[Faraday Voice] API Result:", result);

      const spokenSummary = summarizeResponseForSpeech(result);
      if (result.success) {
        setFeedback({
          type: "success",
          msg:
            result.message ||
            t.voiceAssistant?.success ||
            (lang === "pl" ? "Sukces" : "Success"),
        });
        let dataToDisplay = null;
        if (result.data?.results) {
          const res = result.data.results;
          const arrayKey = Object.keys(res).find((k) => Array.isArray(res[k]));
          if (arrayKey) {
            dataToDisplay = res[arrayKey];
          } else {
            dataToDisplay = res;
          }
        } else if (result.data?.inventory) {
          dataToDisplay = result.data.inventory;
        } else if (Array.isArray(result.data)) {
          dataToDisplay = result.data;
        } else if (result.data && typeof result.data === "object") {
          dataToDisplay = result.data;
        }
        if (dataToDisplay) setResponseData(dataToDisplay);
        speak(spokenSummary);
        setIsExpanded(true);
      } else {
        setFeedback({
          type: "error",
          msg:
            result.message ||
            t.voiceAssistant?.failure ||
            (lang === "pl" ? "Niepowodzenie" : "Failure"),
        });
        speak(spokenSummary);
      }
    } catch (error: any) {
      console.error("[Faraday Voice] API Error:", error);
      const apiErrorMsg =
        error.response?.data?.message ||
        t.voiceAssistant?.serverError ||
        (lang === "pl" ? "Błąd serwera." : "Server error.");
      setFeedback({ type: "error", msg: apiErrorMsg });
      speak(
        t.voiceAssistant?.genericError ||
          (lang === "pl" ? "Wystąpił błąd." : "An error occurred."),
      );
    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  };

  const closeBubble = () => {
    setFeedback(null);
    setResponseData(null);
  };

  const toggleExpand = () => setIsExpanded(!isExpanded);

  const renderDataObject = (data: any) => {
    if (Array.isArray(data)) {
      return (
        <ul className="data-list">
          {data.map((item: any, i: number) => (
            <li
              key={i}
              className={`data-item ${typeof item === "string" ? "is-string" : ""}`}
            >
              {typeof item === "string" ? (
                <span className="full-text">{item}</span>
              ) : (
                <>
                  <span className="name">
                    {item.productName ||
                      item.name ||
                      item.ProductName ||
                      item.Name ||
                      Object.values(item)[0]}
                  </span>
                  <span className="value">
                    {item.totalQuantity ??
                      item.quantity ??
                      item.TotalQuantity ??
                      item.Quantity ??
                      (typeof Object.values(item)[1] === "number"
                        ? Object.values(item)[1]
                        : "")}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      );
    } else if (typeof data === "object" && data !== null) {
      return (
        <ul className="data-list stats-mode">
          {Object.entries(data).map(
            ([key, value]: [string, any], i: number) => {
              if (typeof value === "object" && value !== null) return null;
              return (
                <li key={i} className="data-item stat">
                  <span className="name">
                    {key.replace(/([A-Z])/g, " $1").toLowerCase()}
                  </span>
                  <span className="value">{value.toString()}</span>
                </li>
              );
            },
          )}
        </ul>
      );
    }
    return null;
  };

  return (
    <div id="faraday-voice-assistant" className="voice-assistant-fab">
      {(listening || feedback || isProcessing || isWaitingForProcessing) && (
        <div
          className={`voice-feedback-bubble 
                    ${listening ? "status-listening" : ""} 
                    ${feedback?.type === "success" ? "status-success" : ""} 
                    ${feedback?.type === "error" ? "status-error" : ""} 
                    ${isProcessing || isWaitingForProcessing ? "status-processing" : ""}
                    ${responseData ? "has-data" : ""}
                    ${!isExpanded ? "is-collapsed" : ""}
                `}
        >
          <div
            className="bubble-header"
            onClick={responseData ? toggleExpand : undefined}
          >
            <div className="bubble-status-icon">
              {(isProcessing || isWaitingForProcessing) && (
                <Loader2 className="animate-spin" size={16} />
              )}
              {feedback?.type === "success" && <CheckCircle2 size={16} />}
              {feedback?.type === "error" && <AlertCircle size={16} />}
              {listening && <Mic className="animate-pulse" size={16} />}
            </div>
            <span className="bubble-text">
              {isProcessing || isWaitingForProcessing
                ? t.voiceAssistant?.processing ||
                  (lang === "pl" ? "Przetwarzanie..." : "Processing...")
                : feedback
                  ? feedback.msg
                  : transcript ||
                    t.voiceAssistant?.listening ||
                    (lang === "pl" ? "Słucham..." : "Listening...")}
            </span>
            <div className="bubble-actions">
              {responseData && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand();
                  }}
                  className="action-btn"
                >
                  {isExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
                  )}
                </button>
              )}
              {feedback && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeBubble();
                  }}
                  className="action-btn close"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {responseData && isExpanded && (
            <div className="bubble-data-container">
              <div className="data-list-wrapper">
                {renderDataObject(responseData)}
              </div>
            </div>
          )}
        </div>
      )}
      <button
        id="voice-assistant-trigger"
        onClick={() =>
          listening ? handleStopAndSend() : handleStartListening()
        }
        disabled={isProcessing || isWaitingForProcessing}
        className={`fab-button ${listening ? "is-listening" : ""} ${!browserSupportsSpeechRecognition ? "is-unsupported" : ""}`}
        title={
          t.voiceAssistant?.title ||
          (lang === "pl" ? "Asystent Głosowy" : "Voice Assistant")
        }
      >
        {isProcessing || isWaitingForProcessing ? (
          <Loader2 className="animate-spin" size={28} />
        ) : listening ? (
          <MicOff size={28} />
        ) : (
          <Mic size={28} />
        )}
      </button>
    </div>
  );
};

export default VoiceControlFAB;
