# 🎤 Smart Glasses Audio Recording App

<div align="center">
  
  ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
  ![Expo](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
  ![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io&badgeColor=010101)
  
  **An intelligent voice-controlled smart glasses companion app with biometric authentication**
  
  Made with ❤️ by Saoud Yahya and Ilyass Otmani
  
</div>

## 🌟 Features

- **🔒 Biometric Authentication**: Touch/fingerprint verification for secure recording
- **🎙️ Voice Commands**: Control smart glasses with voice commands
- **📡 Real-time Socket Connection**: Live communication with backend services
- **🔊 Text-to-Speech Feedback**: Audio feedback for all interactions
- **📱 Cross-platform**: Works on iOS and Android
- **🎯 Smart Recognition**: Fuzzy matching for voice command recognition
- **📸 Image Scanning**: Process and analyze images with voice guidance

## 🏗️ Architecture

```mermaid
graph TB
    A[Mobile App] --> B[Authentication Layer]
    B --> C[Audio Recording]
    C --> D[Speech Recognition]
    D --> E[Command Processing]
    E --> F[Socket Connection]
    F --> G[Flask Server]
    G --> H[Image Processing]
    H --> I[Smart Glasses]
    
    A --> J[Biometric Auth]
    J --> K[LocalAuthentication]
    
    D --> L[Voice Commands]
    L --> M[Turn On/Off]
    L --> N[Scan Command]
    
    style A fill:#e1f5fe
    style G fill:#f3e5f5
    style I fill:#e8f5e8
```

## 📱 App Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant Auth as Biometric Auth
    participant S as Server
    participant G as Smart Glasses
    
    U->>A: Press and Hold
    A->>Auth: Authenticate Touch
    Auth-->>A: Authentication Result
    
    alt Authentication Success
        A->>A: Start Recording
        A->>U: Audio Feedback
        U->>A: Voice Command
        A->>A: Stop Recording
        A->>S: Upload Audio
        S-->>A: Transcription + Segments
        A->>A: Process Commands
        
        alt Turn On Command
            A->>G: Activate Socket
            G-->>A: Status Updates
        else Scan Command
            A->>S: Process Images
            S-->>A: Guidance
            A->>U: Speak Guidance
        end
    else Authentication Failed
        A->>U: "Authentication Failed"
    end
```

## 🔧 Voice Commands

| Command | Variations | Action |
|---------|------------|--------|
| **Turn On** | "turn on", "turnon", "turon", "turnningon" | Activates smart glasses |
| **Turn Off** | "turn off", "turnoff", "turonoff", "turnningoff" | Deactivates smart glasses |
| **Scan** | "scan", "scun", "skan", "scarn", "scanning" | Initiates image scanning |

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator
- Physical device for biometric testing

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd MyReactNativeApp2
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment**
   ```javascript
   // Update CONFIG in App.tsx
   const CONFIG = {
     FLASK_SERVER_URL: 'your-flask-server-url',
     SOCKET_URL: 'your-socket-server-url',
     TOUCH_HOLD_DURATION: 1000,
     MAX_AUTHENTICATION_ATTEMPTS: 3,
   };
   ```

4. **Start the development server**
   ```bash
   expo start
   ```

## 🛠️ Tech Stack

### Frontend
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe development
- **Expo** - Development platform and toolchain

### Core Libraries
- **expo-av** - Audio recording and playback
- **expo-speech** - Text-to-speech functionality
- **expo-local-authentication** - Biometric authentication
- **socket.io-client** - Real-time communication

### Backend Integration
- **Flask Server** - Audio processing and transcription
- **Socket.io Server** - Real-time status updates

## 📋 Component Structure

```mermaid
graph TD
    A[AudioRecorderApp] --> B[useTouchAuthentication]
    A --> C[useVoiceCommands]
    A --> D[useSocketConnection]
    
    B --> E[LocalAuthentication]
    B --> F[Biometric Verification]
    
    C --> G[Command Recognition]
    C --> H[Levenshtein Distance]
    C --> I[Speech Processing]
    
    D --> J[Socket.io Client]
    D --> K[Real-time Updates]
    
    style A fill:#ffeb3b
    style B fill:#4caf50
    style C fill:#2196f3
    style D fill:#ff9800
```

## 🔐 Security Features

- **Biometric Authentication**: Fingerprint/Face ID verification
- **Attempt Limiting**: Maximum 3 authentication attempts
- **Auto-lock**: Temporary lockout after failed attempts
- **Secure Audio Transmission**: Encrypted server communication

## 🎨 UI/UX Features

- **Adaptive Design**: Responsive to different screen sizes
- **Visual Feedback**: Recording status indicators
- **Haptic Feedback**: Vibration on successful authentication
- **Accessibility**: Voice guidance for visually impaired users

## 📊 Data Flow

```mermaid
flowchart LR
    A[User Voice] --> B[Audio Recording]
    B --> C[Server Upload]
    C --> D[Speech-to-Text]
    D --> E[Segment Analysis]
    E --> F[Command Recognition]
    F --> G[Action Execution]
    
    G --> H[Socket Activation]
    G --> I[Image Scanning]
    G --> J[TTS Feedback]
    
    style A fill:#e3f2fd
    style D fill:#f3e5f5
    style G fill:#e8f5e8
```

## 🔧 Configuration

### Audio Settings
```javascript
const audioConfig = {
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  quality: Audio.RecordingOptionsPresets.HIGH_QUALITY
};
```

### Authentication Settings
```javascript
const authConfig = {
  promptMessage: 'Verify touch to start recording',
  fallbackLabel: 'Use passcode',
  cancelLabel: 'Cancel'
};
```

## 🧪 Testing

### Unit Testing
- Authentication flow testing
- Voice command recognition accuracy
- Socket connection reliability

### Integration Testing  
- End-to-end recording workflow
- Server communication testing
- Biometric authentication scenarios

## 📱 Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| **iOS** | ✅ | Full biometric support |
| **Android** | ✅ | Fingerprint authentication |
| **Web** | ⚠️ | Limited functionality |

## 🚀 Deployment

### Production Build
```bash
# iOS
expo build:ios

# Android  
expo build:android
```

### Distribution
- **App Store** (iOS)
- **Google Play Store** (Android)
- **Enterprise Distribution**

## 🔍 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Ensure device has biometric setup
   - Check permissions in device settings

2. **Recording Not Starting**
   - Verify microphone permissions
   - Check audio mode configuration

3. **Socket Connection Issues**
   - Verify server URLs in CONFIG
   - Check network connectivity

## 📈 Performance Optimization

- **Memory Management**: Automatic audio cleanup
- **Battery Optimization**: Efficient socket connections
- **Network Efficiency**: Compressed audio uploads

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the 0BSD License - see the LICENSE file for details.

## 👥 Authors

- **Saoud Yahya** - *Lead Developer*
- **Ilyass Otmani** - *Co-Developer*


---
