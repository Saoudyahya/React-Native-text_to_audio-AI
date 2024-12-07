import React, { useState } from 'react';
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
} from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

const { width, height } = Dimensions.get('window');

// Replace with your Flask server URL
const FLASK_SERVER_URL = 'https://88bc-105-67-135-93.ngrok-free.app/transcribe';

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [recordings, setRecordings] = useState<
    {
      sound: Audio.Sound;
      duration: string;
      file: string | undefined;
      transcription?: string;
      keywords?: string[];
      segments?: { start: number; end: number; text: string }[];
    }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const [glassesState, setGlassesState] = useState(false); // Track glasses state

  // Enhanced keyword checking and action handling
  function isSimilarToScan(text: string): boolean {
    // Convert to lowercase for case-insensitive matching
    const cleanedText = text.toLowerCase().replace(/[^a-z]/g, '');
    
    // Define a list of possible scan-like variations
    const scanVariations = [
      'scan',
      'scun',
      'skan',
      'scarn',
      'scane',
      'scann',
      'scaning',
      'scanning'
    ];

    // Check if the cleaned text contains any scan-like substring
    return scanVariations.some(variation => 
      cleanedText.includes(variation) || 
      levenshteinDistance(cleanedText, variation) <= 2
    );
  }

  // Levenshtein Distance algorithm for string similarity
  function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => 
      Array(n + 1).fill(0)
    );

    // Initialize first row and column
    for (let i = 0; i < m + 1; i++) dp[i][0] = i;
    for (let j = 0; j < n + 1; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i < m + 1; i++) {
      for (let j = 1; j < n + 1; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // deletion
            dp[i][j - 1] + 1,     // insertion
            dp[i - 1][j - 1] + 1  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  // Enhanced keyword checking and action handling
  function isSimilarToTurnOnOff(text, commandType) {
    // Convert text to lowercase for uniformity
    const cleanedText = text.toLowerCase().replace(/[^a-z]/g, '');
  
    // Define variations for "turn on" and "turn off"
    const turnOnVariations = [
      'turnon',
      'turn on',
      'turon',
      'turon',
      'turnningon',
      'turingon',
      'tronon'
    ];
  
    const turnOffVariations = [
      'turnoff',
      'turn off',
      'turonoff',
      'trnoff',
      'turnningoff',
      'turingoff',
      'tronoff'
    ];
  
    const variations =
      commandType === 'on' ? turnOnVariations : turnOffVariations;
  
    // Check if cleaned text matches or is similar to any variations
    return variations.some(
      (variation) =>
        cleanedText.includes(variation) ||
        levenshteinDistance(cleanedText, variation) <= 2
    );
  }
  
  // Update the keyword actions function
 // Enhanced keyword actions function
function handleKeywordActions(segments) {
  segments.forEach((segment) => {
    const text = segment.text.toLowerCase();

    // Enhanced detection for turning on
    if (isSimilarToTurnOnOff(segment.text, 'on')) {
      if (!glassesState) {
        setGlassesState(true);
        Speech.speak('Glasses are now on');
      }
    }

    // Enhanced detection for turning off
    if (isSimilarToTurnOnOff(segment.text, 'off')) {
      if (glassesState) {
        setGlassesState(false);
        Speech.speak('Glasses are now off');
      }
    }

    // Enhanced scan detection
    if (isSimilarToScan(segment.text)) {
      Speech.speak('Scanning initiated');
      processImageScan(); // Trigger the image processing function
    }
  });
}
const FLASK_SERVER_URL = 'https://88bc-105-67-135-93.ngrok-free.app/transcribe';


// Function to process image scan
async function processImageScan() {
  try {
    const response = await fetch('https://88bc-105-67-135-93.ngrok-free.app/process_images', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'scan' }), // Adjust the body as per API requirements
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Assuming "guidance" is the key in the response
    const guidance = result.guidance || 'No guidance provided';
    Speech.speak(guidance); // Speak the guidance
  } catch (error) {
    console.error('Error during scan processing:', error);
    Speech.speak('Failed to retrieve guidance from the server');
  }
}


  // Start recording
  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === 'granted') {
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
      Alert.alert('Error', 'Failed to start recording');
    }
  }

  // Simulate scanning with speech
  async function simulateScanning() {
    return new Promise((resolve) => {
      Speech.speak('Your audio is transmitting  ', { rate: 1 });
      setTimeout(() => {
        resolve(null);
      }, 5000);
    });
  }

  // Upload audio and get transcription
  async function uploadAudioToServer(uri: string) {
    setIsUploading(true);
    await simulateScanning(); // Call scanning simulation before transcription begins
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      });

      const response = await fetch(FLASK_SERVER_URL, {
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
      Alert.alert('Upload Failed', error.message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  // Stop recording
  async function stopRecording() {
    if (!recording) return;

    try {
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const uri = recording.getURI();

      if (uri) {
        try {
          const data = await uploadAudioToServer(uri);

          const transcription = data.transcription?.full_text || '';

          const newRecording = {
            sound,
            duration: getDurationFormatted(status.durationMillis),
            file: uri,
            transcription,
            segments: data.segments,
          };

          // If segments exist, handle keyword actions
          if (data.segments) {
            handleKeywordActions(data.segments);
          }

          setRecordings([...recordings, newRecording]);
        } catch (err) {
          Alert.alert('Error', 'Failed to upload and process recording');
          console.error('Error processing audio file:', err);
        }
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
      Alert.alert('Error', 'Failed to stop recording');
    }
  }

  // Format duration
  function getDurationFormatted(milliseconds: number) {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10
      ? `${Math.floor(minutes)}:0${seconds}`
      : `${Math.floor(minutes)}:${seconds}`;
  }

  // Render recordings
  function getRecordingLines() {
    return recordings.map((recordingLine, index) => (
      <View key={index} style={styles.recordingContainer}>
        {recordingLine.transcription && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionText}>
              Transcription: {recordingLine.transcription}
            </Text>
            {recordingLine.keywords?.length > 0 && (
              <Text style={styles.keywordText}>
                Detected Keywords: {recordingLine.keywords.join(', ')}
              </Text>
            )}
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
  }

  // Clear recordings
  function clearRecordings() {
    recordings.forEach((recording) => recording.sound.unloadAsync());
    setRecordings([]);
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={recording ? stopRecording : startRecording}
      activeOpacity={0.7}
      disabled={isUploading}
    >
      <Image
        source={require('./assets/1.jpeg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlayContainer}>
        <Text style={styles.recordingText}>
          {isUploading
            ? 'Uploading and Transcribing...'
            : recording
            ? 'Tap to Stop Recording'
            : 'Tap to Start Recording'}
        </Text>
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
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingText: {
    color: 'white',
    fontSize: 18,
    marginBottom: 20,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
  },
  fill: {
    flex: 1,
    margin: 5,
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
  keywordText: {
    fontSize: 14,
    color: 'green',
    fontWeight: 'bold',
    marginTop: 5,
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
