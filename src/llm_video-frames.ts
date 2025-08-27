import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { spawn, ChildProcess } from "child_process";
import ffmpegPath from "ffmpeg-static";

interface Attachment {
  path: string;
}

interface VideoOptions {
  fps: number;
  timestamps: boolean;
}

function parseVideoPath(videoPath: string): {
  path: string;
  options: VideoOptions;
} {
  const [pathPart, queryPart] = videoPath.replace("video:", "").split("?");
  const params = new URLSearchParams(queryPart || "");
  const fps = parseInt(params.get("fps") || "1");
  const timestamps = params.get("timestamps") === "1";
  return { path: pathPart, options: { fps, timestamps } };
}

async function extractFrames(
  videoPath: string,
  outputDir?: string
): Promise<Attachment[]> {
  const { path: videoFilePath, options } = parseVideoPath(videoPath);

  // Create output directory
  const tempDir =
    outputDir || (await fs.mkdtemp(join(tmpdir(), "video-frames-")));
  if (!outputDir) {
    // Create temp directory if no output dir specified
    await fs.mkdir(tempDir, { recursive: true });
  } else {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
  }

  const outputPattern = join(tempDir, "frame_%04d.jpg");

  let vfFilter = `fps=${options.fps}`;

  if (options.timestamps) {
    // Get video filename without path
    const videoFilename = videoFilePath.split("/").pop() || "video";

    // Add timestamp overlay
    vfFilter = `fps=${options.fps},drawtext=text='%{pts\\:hms}':x=W-tw-10:y=H-th-10:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5,drawtext=text='${videoFilename}':x=W-tw-10:y=H-th-40:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.5`;
  }

  const ffmpegArgs = [
    "-i",
    videoFilePath,
    "-vf",
    vfFilter,
    "-q:v",
    "2", // High quality
    outputPattern,
  ];

  console.log("Video file path:", videoFilePath);
  console.log("FFmpeg args:", ffmpegArgs);

  return new Promise((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("FFmpeg not found"));
      return;
    }

    const ffmpeg = spawn(ffmpegPath, ffmpegArgs, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    ffmpeg.on("close", async (code: number | null) => {
      if (code !== 0) {
        reject(new Error(`FFmpeg process exited with code ${code}`));
        return;
      }

      // List all generated frame files
      const files = await fs.readdir(tempDir);
      const attachments = files
        .filter((file) => file.startsWith("frame_") && file.endsWith(".jpg"))
        .sort()
        .map((file) => ({ path: join(tempDir, file) }));

      console.log(`📸 Extracted ${attachments.length} frames from video`);
      resolve(attachments);
    });

    ffmpeg.on("error", reject);
  });
}

export { extractFrames, Attachment };
