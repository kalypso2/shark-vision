# Shark Vision

A Next.js boilerplate application with integrated live webcam access.

## Features

- ✨ Next.js 14 with App Router
- 🎥 Live webcam streaming using WebRTC
- 📸 Snapshot capture functionality
- 🎨 Modern, responsive UI with glassmorphism design
- 🔒 TypeScript for type safety
- ⚡ Fast development with Hot Module Replacement

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A device with a webcam
- Modern browser with WebRTC support

### Installation

1. Install dependencies:

```bash
npm install
```

2. Run the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

4. Grant camera permissions when prompted

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
shark-vision/
├── app/
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   └── globals.css      # Global styles
├── components/
│   └── WebcamCapture.tsx # Webcam component
├── package.json
├── tsconfig.json
├── next.config.js
└── README.md
```

## Webcam Features

The `WebcamCapture` component provides:

- **Start/Stop Controls**: Toggle webcam stream on/off
- **Snapshot Capture**: Download still images from the video feed
- **Error Handling**: Graceful handling of permission denials
- **Responsive Design**: Works on desktop and mobile devices

## Building Upon This Boilerplate

This foundation is ready for extension with:

- Object detection models (TensorFlow.js, ML5.js)
- Computer vision features
- Recording and playback
- Multiple camera support
- Real-time filters and effects
- Backend integration for processing

## Browser Compatibility

Requires a browser that supports:
- WebRTC / getUserMedia API
- ES6+ JavaScript features
- Modern CSS (flexbox, grid)

## License

MIT

