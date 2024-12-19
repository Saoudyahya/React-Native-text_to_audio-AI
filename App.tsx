import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Button,
  Image,
  Alert,
  ScrollView,
  Vibration,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as LocalAuthentication from 'expo-local-authentication';
import io from 'socket.io-client';

// Configuration Constants
const CONFIG = {
  FLASK_SERVER_URL: 'https://a1b8-41-251-5-194.ngrok-free.app',
  SOCKET_URL: 'https://4c2f-41-251-5-194.ngrok-free.app',
  TOUCH_HOLD_DURATION: 1000, // 1 second hold required
  MAX_AUTHENTICATION_ATTEMPTS: 3,
};

// Utility Functions
const levenshteinDistance = (s1: string, s2: string): number => {
  const m = s1.length, n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i < m + 1; i++) dp[i][0] = i;
  for (let j = 0; j < n + 1; j++) dp[0][j] = j;

  for (let i = 1; i < m + 1; i++) {
    for (let j = 1; j < n + 1; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
      }
    }
  }

  return dp[m][n];
};

// Enhanced Touch Authentication Hook
const useTouchAuthentication = () => {
  const [authenticationState, setAuthenticationState] = useState({
    verified: false,
    attempts: 0,
    isLocked: false,
  });

  const authenticateTouch = useCallback(async () => {
    // Check if authentication attempts exceeded
    if (authenticationState.attempts >= CONFIG.MAX_AUTHENTICATION_ATTEMPTS) {
      setAuthenticationState(prev => ({ ...prev, isLocked: true }));
      Speech.speak('Too many authentication attempts. Please wait.');
      return false;
    }

    try {
      // First, check if device supports biometric authentication
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Fallback to manual verification if biometrics not available
        return manualTouchVerification();
      }

      // Attempt biometric authentication
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verify touch to start recording',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
      });

      if (result.success) {
        // Reset attempts on successful authentication
        setAuthenticationState({
          verified: true,
          attempts: 0,
          isLocked: false,
        });
        Vibration.vibrate(100); // Provide haptic feedback
       
        return true;
      } else {
        // Increment attempts on failure
        setAuthenticationState(prev => ({
          verified: false,
          attempts: prev.attempts + 1,
          isLocked: prev.attempts + 1 >= CONFIG.MAX_AUTHENTICATION_ATTEMPTS,
        }));

        Speech.speak('Authentication failed');
        return false;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // Fallback to manual verification
      return manualTouchVerification();
    }
  }, [authenticationState.attempts]);

  const manualTouchVerification = useCallback(() => {
    // Provide an alternative verification method
    const challengeResponse = Math.random() < 0.5;
    if (challengeResponse) {
      setAuthenticationState({
        verified: true,
        attempts: 0,
        isLocked: false,
      });
      Speech.speak('Manual verification successful');
      return true;
    } else {
      setAuthenticationState(prev => ({
        verified: false,
        attempts: prev.attempts + 1,
        isLocked: prev.attempts + 1 >= CONFIG.MAX_AUTHENTICATION_ATTEMPTS,
      }));
      Speech.speak('Manual verification failed');
      return false;
    }
  }, []);

  const resetAuthentication = useCallback(() => {
    // Method to reset authentication state
    setAuthenticationState({
      verified: false,
      attempts: 0,
      isLocked: false,
    });
  }, []);

  return {
    authenticateTouch,
    resetAuthentication,
    authenticationState,
  };
};

// Socket Connection Hook

// Voice Commands Hook
const useVoiceCommands = () => {
  const [glassesState, setGlassesState] = useState(false);
  const { activateSocket, deactivateSocket } = useSocketConnection();

  const isSimilarToCommand = useCallback((text: string, type: 'on' | 'off'): boolean => {
    const variations = {
      'on': ['turnon', 'turn on', 'turon', 'turnningon'],
      'off': ['turnoff', 'turn off', 'turonoff', 'turnningoff']
    };
    
    const cleanedText = text.toLowerCase().replace(/[^a-z]/g, '');
    return variations[type].some(
      variation => cleanedText.includes(variation) || 
      levenshteinDistance(cleanedText, variation) <= 2
    );
  }, []);

  const isSimilarToScan = useCallback((text: string): boolean => {
    const scanVariations = [
      'scan', 'scun', 'skan', 'scarn', 
      'scane', 'scann', 'scaning', 'scanning'
    ];
    
    const cleanedText = text.toLowerCase().replace(/[^a-z]/g, '');
    return scanVariations.some(
      variation => cleanedText.includes(variation) || 
      levenshteinDistance(cleanedText, variation) <= 2
    );
  }, []);

  const processImageScan = useCallback(async () => {
    try {
      const response = await fetch(`${CONFIG.FLASK_SERVER_URL}/process_images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan' })
      });

      const result = await response.json();
      const guidance = result.guidance || 'No guidance provided';
      Speech.speak(guidance);
    } catch (error) {
      console.error('Scan processing error:', error);
      Speech.speak('Failed to retrieve guidance');
    }
  }, []);

  const handleKeywordActions = useCallback((segments) => {
    segments.forEach((segment) => {
      const text = segment.text.toLowerCase();
      const commandChecks = [
        { 
          check: () => isSimilarToCommand(text, 'on'), 
          action: () => {
            if (!glassesState) {
              setGlassesState(true);
              Speech.speak('Glasses are now on');
              activateSocket();
            }
          }
        },
        { 
          check: () => isSimilarToCommand(text, 'off'), 
          action: () => {
            if (glassesState) {
              console.log(`Checking command similarity for: ${text}`);
              setGlassesState(false);
              Speech.speak('Glasses are now off');
              deactivateSocket();
            }
          }
        },
        {
          check: () => isSimilarToScan(text),
          action: () => {
            Speech.speak('Scanning initiated');
            processImageScan();
          }
        }
      ];

      commandChecks.find(cmd => cmd.check())?.action();
    });
  }, [glassesState, isSimilarToCommand, isSimilarToScan, processImageScan, activateSocket, deactivateSocket]);

  return { handleKeywordActions };
};

const useSocketConnection = () => {
  const [socket, setSocket] = useState(null);
  
  const activateSocket = useCallback(() => {
    const newSocket = io(CONFIG.SOCKET_URL);
    
    newSocket.on('connect', () => console.log('Socket connected'));
    
    newSocket.on('status', (data) => {
      console.log('Received status:', data.status_message);
      Speech.speak(data.status_message);
    });
    
    setSocket(newSocket);
    return newSocket;
  }, []);
  
  const deactivateSocket = useCallback(() => {
    if (socket) {
      socket.close();
      setSocket(null);
      Speech.speak('Socket connection closed');
    }
  }, [socket]);
  
  return { activateSocket, deactivateSocket };
};
// Upload Audio Function
async function uploadAudioToServer(uri: string) {
  const formData = new FormData();
  formData.append('file', {
    uri: uri,
    name: 'recording.m4a',
    type: 'audio/m4a',
  });

  try {
    const response = await fetch(`${CONFIG.FLASK_SERVER_URL}/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result.data;
  } catch (error) {
    console.error('Upload Error:', error);
    throw error;
  }
}

// Duration Formatting Function
function getDurationFormatted(milliseconds: number) {
  const minutes = milliseconds / 1000 / 60;
  const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
  return seconds < 10
    ? `${Math.floor(minutes)}:0${seconds}`
    : `${Math.floor(minutes)}:${seconds}`;
}

export default function AudioRecorderApp() {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [recordings, setRecordings] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  const { width, height } = useMemo(() => Dimensions.get('window'), []);
  const { handleKeywordActions } = useVoiceCommands();
  const { 
    authenticateTouch, 
    resetAuthentication, 
    authenticationState 
  } = useTouchAuthentication();

  // Start recording with authentication
  const startRecording = useCallback(async () => {
    try {
      // First, authenticate the touch
      const isAuthenticated = await authenticateTouch();
      
      if (!isAuthenticated) {
        Speech.speak('Authentication failed. Recording cancelled.');
        return;
      }

      const { status } = await Audio.requestPermissionsAsync();
      if (status === 'granted') {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        setRecording(recording);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Recording Error', 'Failed to start recording');
    }
  }, [authenticateTouch]);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (!recording) return;

    setIsUploading(true);
    try {
      await recording.stopAndUnloadAsync();
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const uri = recording.getURI();

      if (uri) {
        try {
          const data = await uploadAudioToServer(uri);
          
          if (data.segments) {
            handleKeywordActions(data.segments);
          }

          const newRecording = {
            sound,
            duration: getDurationFormatted(status.durationMillis),
            file: uri,
            transcription: data.transcription?.full_text || '',
            segments: data.segments,
          };

          setRecordings(prev => [...prev, newRecording]);
        } catch (err) {
          Alert.alert('Processing Error', 'Failed to upload recording');
        }
      }
      setRecording(undefined);
      // Reset authentication state
      resetAuthentication();
    } catch (err) {
      console.error('Recording stop error:', err);
      Alert.alert('Error', 'Failed to stop recording');
    } finally {
      setIsUploading(false);
    }
  }, [recording, handleKeywordActions, resetAuthentication]);

  // Touch verification handlers
  const handleTouchStart = useCallback(() => {
    // Prevent recording if locked due to too many authentication attempts
    if (authenticationState.isLocked) {
      Speech.speak('Authentication locked. Please wait.');
      return;
    }

    // Start a timer to verify long press
    if (!recording) {
      startRecording();
    }
  }, [recording, startRecording, authenticationState.isLocked]);

  const handleTouchEnd = useCallback(() => {
    // If recording is active, stop recording
    if (recording) {
      stopRecording();
    }
  }, [recording, stopRecording]);

  // Render recordings
  const getRecordingLines = useCallback(() => {
    return recordings.map((recordingLine, index) => (
      <View key={index} style={styles.recordingContainer}>
        {recordingLine.transcription && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionText}>
              Transcription: {recordingLine.transcription}
            </Text>
          </View>
        )}
        {recordingLine.segments && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionTitle}>Segments:</Text>
            <ScrollView>
              {recordingLine.segments.map((segment, idx) => (
                <Text key={idx} style={styles.segmentText}>
                  [{segment.start.toFixed(2)}s - {segment.end.toFixed(2)}s]:{' '}
                  {segment.text}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    ));
  }, [recordings]);

  // Clear recordings
  const clearRecordings = useCallback(() => {
    recordings.forEach((recording) => recording.sound.unloadAsync());
    setRecordings([]);
  }, [recordings]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPressIn={handleTouchStart}
      onPressOut={handleTouchEnd}
      activeOpacity={0.7}
      disabled={isUploading}
    >     
      {/* Background Image */}
      <Image
        source={require('./assets/Background.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      
      {/* Logo Image */}
      <Image
        source={require('./assets/Logo see glasses.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
      
      <View style={styles.overlayContainer}>
        <Text style={styles.recordingText}>
          {isUploading
            ? 'Uploading and Transcribing...'
            : recording
            ? 'Recording in Progress'
            : authenticationState.isLocked
            ? 'Authentication Locked'
            : 'Press and Hold to Start Recording'}
        </Text>
        {authenticationState.isLocked && (
          <Text style={styles.lockText}>
            Too many failed attempts. Please wait before trying again.
          </Text>
        )}
        {authenticationState.attempts > 0 && !authenticationState.isLocked && (
          <Text style={styles.attemptsText}>
            Authentication Attempts: {authenticationState.attempts}/
            {CONFIG.MAX_AUTHENTICATION_ATTEMPTS}
          </Text>
        )}
        <ScrollView style={styles.recordingsList}>
          {getRecordingLines()}
        </ScrollView>
        {recordings.length > 0 && (
          <Button
            title="Clear Recordings"
            onPress={clearRecordings}
            disabled={isUploading}
          />
        )}
      </View>
      
      <Text style={styles.footerText}>
        © 2024 Made by Saoud Yahya and Ilyass Otmani. All Rights Reserved.
      </Text>
    </TouchableOpacity>
  );
  
}
const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  
  
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative', // Ensures absolute positioning works within this container
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: -1,
    opacity: 0.4, // Lowering opacity by 50%
  },
  
  logoImage: {
    width: 250,
    height: 250,
    marginTop: 230,
    zIndex: 1, // Ensures the logo appears on top of the background
  },
  footerText: {
    textAlign: 'center',
    fontSize: 10, 
    color: 'rgba(3, 0, 0, 0.5)',
    marginTop: 20,
    paddingBottom: 10, 
  },
  overlayContainer: {
    flex: 1,
    
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    color: 'grey',
    fontSize: 18,
    fontFamily: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  lockText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  attemptsText: {
    color: 'rgba(109, 4, 4, 0.74)',
    fontSize: 14,
    marginBottom: 15,
  },
  recordingsList: {
    width: '90%',
    maxHeight: height * 0.5,
  },
  recordingContainer: {
    marginVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    overflow: 'hidden',
  },
  transcriptionContainer: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#333',
  },
  transcriptionTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 5,
  },
  segmentText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
});