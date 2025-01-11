import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Button,
  Container,
  Paper,
  Typography,
  Box
} from '@mui/material';
import {
  Mic,
  Stop,
  Cancel,
  TextFields
} from '@mui/icons-material';

const AudioRecorder = ({onStopRecord}) => {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const navigate = useNavigate();
  const [title, setTitle] = useState('Untitled Transcript');
  const MAX_RECORDING_TIME = 30 * 60 * 1000; // 30 minutes in milliseconds
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Cleanup timeout when the component unmounts or when recording stops
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleTranscribeNavigate = () => {
    if (!audioBlob) {
      console.error('No recording available');
      return;
    }
    // Navigate to /transcript/:id and pass the file as state
    const audioFile = new File([audioBlob], 'audio_recording.webm', { type: 'audio/webm' });
    navigate(`/transcript/new`, { state: { audioFile, title } });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true)
      isRecordingRef.current = true;

      // Set timeout to stop recording after 40 minutes
      timeoutRef.current = setTimeout(() => {
        //console.log("timed out, isRecordingRef:", isRecordingRef.current)
        stopRecording();
        onStopRecord('Recording stopped automatically after 30 minutes.')
      }, MAX_RECORDING_TIME);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    //console.log("stopRecording() called");
    //console.log("mediaRecorderRef.current:", mediaRecorderRef.current);
    //console.log("isRecording:", isRecording);
    if (mediaRecorderRef.current && isRecordingRef.current) {
      //console.log("stopping recording")
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
    
  };

  const cancelRecording = () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      isRecordingRef.current = false
    }
    setAudioBlob(null);
    chunksRef.current = [];
  };

  return (
    <Container maxWidth="m">
      <Paper 
        elevation={3} 
        sx={{
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          Audio Recorder
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center', fontSize: '1.5rem' }}>
          {!isRecording && !audioBlob && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<Mic />}
              onClick={startRecording}
              disabled={isRecording}
              sx={{
                fontSize: '1.5rem',
                background: 'linear-gradient(to right, #550583 0%, #a848bb 100%)', // Gradient as background
                '&:hover': {
                  background: 'linear-gradient(to right, #6c0d8c 0%, #c15bc2 100%)', // Optional hover gradient
                },
              }}
            >
              Start Recording
            </Button>
          )}

          {isRecording && (
            <div>
              <Button
                variant="contained"
                color="error"
                startIcon={<Stop />}
                onClick={stopRecording}
                disabled={!isRecording}
                sx={{fontSize: 'inherit'}}
              >
                Stop Recording
              </Button>
              <Typography sx={{ 
                fontStyle: 'italic',
                fontSize: '1.2rem',
                textAlign: 'center',
                pt: 1
                }}
                color="gray"
              >
                currently recording...
              </Typography>
            </div>

          )}

          {!isRecording && audioBlob && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={cancelRecording}
              disabled={!isRecording && !audioBlob}
              sx={{fontSize: 'inherit'}}
            >
              Cancel
            </Button>
          )}

          {!isRecording && audioBlob && (
            <Button
              variant="contained"
              color="success"
              startIcon={<TextFields />}
              onClick={handleTranscribeNavigate}
              disabled={!audioBlob}
              sx={{fontSize: 'inherit'}}
            >
              Transcribe
            </Button>
          )}
        </Box>

        {audioBlob && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <audio 
              src={URL.createObjectURL(audioBlob)} 
              controls
              style={{ width: '100%' }}
            />
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default AudioRecorder;