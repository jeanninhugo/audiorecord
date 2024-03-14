import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { faMicrophone, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';

interface AudioChunk {
  url: string;
  blob: Blob;
}

const AudioButton: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleStartRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0); // Start the recording duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration((prevDuration) => {
          if (prevDuration >= 30) {
            handleStopRecording(); // Automatically stop recording after 30 seconds
            return prevDuration;
          }
          return prevDuration + 1;
        });
      }, 1000);
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      // Stop the recording duration counter
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 'type' : 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioChunks([...audioChunks, { url: audioUrl, blob: audioBlob }]);
        audioChunksRef.current = [];
      };
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  const deleteAudioChunk = (index: number) => {
    URL.revokeObjectURL(audioChunks[index].url);
    setAudioChunks(audioChunks.filter((_, i) => i !== index));
  };

  return (
    <>
      <button onClick={toggleRecording}>
        {isRecording ? <FontAwesomeIcon icon={faMicrophoneSlash} size="2x" /> : <FontAwesomeIcon icon={faMicrophone} size="2x" />}
      </button>
      {isRecording && <div><strong>Recording: {recordingDuration}s (max 30s)</strong></div>}
      {!isRecording && <div><strong>Click to record (max 30s)</strong></div>}
      <div>
        {audioChunks.map((chunk, index) => (
          <div key={index}>
            <audio controls src={chunk.url} />
            <button onClick={() => deleteAudioChunk(index)}>
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};

export default AudioButton;
