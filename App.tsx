import React, { useState } from 'react';
import { View, Button, Alert, StyleSheet, Text } from 'react-native';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import * as ImagePicker from 'expo-image-picker';

const App = () => {
  const [guidance, setGuidance] = useState('');

  const sendImageToServer = async () => {
    try {
      // Load the image from the app's assets
      const imageAsset = Asset.fromModule(require('./assets/imagetest.jpg'));
      
      // Wait for the image to load and get the local URI
      await imageAsset.downloadAsync();
      const imageUri = imageAsset.localUri;

      if (imageUri) {
        processImage(imageUri);
      } else {
        Alert.alert('Error', 'Failed to load the image.');
      }
    } catch (error) {
      console.error('Error loading image:', error);
      Alert.alert('Error', 'There was an issue with loading the image.');
    }
  };

  const processImage = async (imageUri) => {
    const formData = new FormData();
    formData.append('images', {
      uri: imageUri,
      type: 'image/jpeg', // Adjust the type based on the actual image format
      name: 'imagetest.jpg',
    });

    try {
      const response = await fetch('https://81bd-41-248-69-9.ngrok-free.app/process_images', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      // Check for server response
      if (data && data.length > 0 && data[0].guidance) {
        setGuidance(data[0].guidance);
        speakText(data[0].guidance);
      } else {
        Alert.alert('Error', 'No guidance received from the server.');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Something went wrong while processing the image.');
    }
  };

  const speakText = (text) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.75,
    });
  };

  return (
    <View style={styles.container}>
      <Button title="Send Image to Server" onPress={sendImageToServer} />
      {guidance && (
        <View style={styles.guidanceContainer}>
          <Text>{guidance}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  guidanceContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
});

export default App;
