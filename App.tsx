import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Dimensions, Button, Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

// Replace with your Flask server URL

export default function App() {
  const [recording, setRecording] = useState<Audio.Recording>();
  const [recordings, setRecordings] = useState<{
    sound: Audio.Sound,
    duration: string,
    file: string | undefined,
    transcription?: string
  }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  async function startRecording() {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (perm.status === "granted") {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true
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

 
 
 // Update the Flask server URL with your IP address
const FLASK_SERVER_URL = 'https://af01-105-67-4-146.ngrok-free.app/transcribe';

async function uploadAudioToServer(uri) {
  setIsUploading(true);
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
    return result.data?.transcription?.full_text || 'No transcription available';
  } catch (error) {
    console.error('Upload Error:', error);
    Alert.alert('Upload Failed', error.message);
    throw error;
  } finally {
    setIsUploading(false);
  }
}
  async function stopRecording() {
    if (!recording) return;
    
    try {
      setRecording(undefined);
      await recording.stopAndUnloadAsync();
      
      const { sound, status } = await recording.createNewLoadedSoundAsync();
      const uri = recording.getURI();
    
      if (uri) {
        try {
          // Upload to server and get transcription
          const transcription = await uploadAudioToServer(uri);
          
          const newRecording = {
            sound: sound,
            duration: getDurationFormatted(status.durationMillis),
            file: uri,
            transcription: transcription
          };
    
          setRecordings([...recordings, newRecording]);
        } catch (err) {
          Alert.alert('Error', 'Failed to upload and transcribe recording');
          console.error('Error processing audio file:', err);
        }
      }
    } catch (err) {
      console.error('Error stopping recording:', err);
      Alert.alert('Error', 'Failed to stop recording');
    }
  }

  function getDurationFormatted(milliseconds: number) {
    const minutes = milliseconds / 1000 / 60;
    const seconds = Math.round((minutes - Math.floor(minutes)) * 60);
    return seconds < 10 
      ? `${Math.floor(minutes)}:0${seconds}` 
      : `${Math.floor(minutes)}:${seconds}`;
  }

  function getRecordingLines() {
    return recordings.map((recordingLine, index) => (
      <View key={index} style={styles.recordingContainer}>
        <View style={styles.row}>
          <Text style={styles.fill}>
            Recording #{index + 1} | {recordingLine.duration}
          </Text>
          <Button 
            onPress={() => recordingLine.sound.replayAsync()} 
            title="Play" 
          />
        </View>
        {recordingLine.transcription && (
          <View style={styles.transcriptionContainer}>
            <Text style={styles.transcriptionText}>
              Transcription: {recordingLine.transcription}
            </Text>
          </View>
        )}
      </View>
    ));
  }

  function clearRecordings() {
    recordings.forEach(recording => recording.sound.unloadAsync());
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
        
        <View style={styles.recordingsList}>
          {getRecordingLines()}
        </View>
        
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
    justifyContent: 'center',
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
});