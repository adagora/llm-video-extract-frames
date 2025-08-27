# Video Frames Analyzer

Extract frames from videos and analyze them with Gemini AI. Track costs, save results, and avoid duplicate processing.

## Quick Start

```bash
# Install dependencies
npm install

# Set your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# Build the project
npm run build

# Analyze a video
npm run cli -- "video.mp4" "describe what happens in this video"
```

## Features

- 🎬 **Frame Extraction**: Extract frames at custom FPS with timestamps
- 🤖 **AI Analysis**: Analyze frames with Gemini 2.5 Flash
- 💰 **Cost Tracking**: Real-time cost calculation and display
- 💾 **Save Results**: Save frames and reports to custom directories
- 🔄 **Smart Caching**: Skip already processed videos
- ⚡ **Fast Processing**: Optimized for performance

## CLI Usage

```bash
# Basic analysis
video-frames "video.mp4" "describe the video content"

# Extract frames with timestamps
video-frames "video.mp4?fps=2&timestamps=1" "key moments with timestamps"

# Save frames and reports
video-frames "video.mp4" "analyze this video" -o ./output -s

# Skip cache (force reprocessing)
video-frames "video.mp4" "analyze" --no-cache

# Extract frames only (no AI analysis)
video-frames "video.mp4?fps=1"
```

### CLI Options

- `-o, --output <dir>` - Save frames to custom directory
- `-s, --save-report` - Save analysis report to file
- `--no-cache` - Skip cache check
- `-m, --model <model>` - Gemini model (default: gemini-1.5-flash)

## Cost Tracking

The tool shows real-time cost analysis:

```
📊 Cost Analysis:
   Input tokens: 455 (0.0341$)
   Output tokens: 370 (0.1110$)
   Total cost: 0.1451$
⏱️  Processing time: 5.272s
```

## Programmatic Usage

```typescript
import { extractFrames, analyzeVideoWithFrames } from "./dist/index.js";

// Extract frames
const frames = await extractFrames("video:path.mp4?fps=2&timestamps=1");

// Analyze with AI
const analysis = await analyzeVideoWithFrames(
  "video.mp4",
  "Describe this video",
  "./output" // optional output directory
);
```

## Requirements

- Node.js 16+
- Gemini API key
- ffmpeg (bundled automatically)
