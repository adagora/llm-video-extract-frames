import { Command } from "commander";
import { analyzeVideoWithFrames } from "./index";
import { extractFrames } from "./llm_video-frames";
import { config } from "dotenv";
import { promises as fs } from "fs";
import { join } from "path";
import crypto from "crypto";

config();

// Cache and report utilities
async function getVideoHash(videoPath: string): Promise<string> {
  const actualPath = videoPath.replace("video:", "").split("?")[0];
  const stats = await fs.stat(actualPath);
  const hash = crypto.createHash("md5");
  hash.update(`${actualPath}:${stats.mtime.getTime()}:${stats.size}`);
  return hash.digest("hex");
}

async function isVideoProcessed(
  videoPath: string,
  cacheDir: string = ".video_cache"
): Promise<boolean> {
  try {
    await fs.access(cacheDir);
    const hash = await getVideoHash(videoPath);
    await fs.access(join(cacheDir, `${hash}.processed`));
    return true;
  } catch {
    return false;
  }
}

async function markVideoProcessed(
  videoPath: string,
  cacheDir: string = ".video_cache"
): Promise<void> {
  await fs.mkdir(cacheDir, { recursive: true });
  const hash = await getVideoHash(videoPath);
  await fs.writeFile(
    join(cacheDir, `${hash}.processed`),
    new Date().toISOString()
  );
}

async function saveReport(
  videoPath: string,
  analysis: string,
  outputDir?: string
): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const actualPath = videoPath.replace("video:", "").split("?")[0];
  const videoName =
    actualPath
      .split("/")
      .pop()
      ?.replace(/\.[^/.]+$/, "") || "video";
  const reportDir = outputDir || ".";
  const reportPath = join(reportDir, `${videoName}_analysis_${timestamp}.txt`);

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, analysis);
  return reportPath;
}

const program = new Command();

program
  .name("video-frames")
  .description("Extract frames from video and analyze with Gemini AI")
  .version("1.0.0")
  .argument(
    "<video-path>",
    "Path to video file with optional parameters (e.g., video.mp4?fps=2&timestamps=1)"
  )
  .argument(
    "[prompt]",
    "Analysis prompt (if provided, will analyze with Gemini)"
  )
  .option("-m, --model <model>", "Gemini model to use", "gemini-1.5-flash")
  .option(
    "-o, --output <directory>",
    "Output directory for frames (default: temp directory)"
  )
  .option("-s, --save-report", "Save analysis report to file")
  .option("--no-cache", "Skip cache check (always process video)")
  .action(
    async (videoPath: string, prompt: string | undefined, options: any) => {
      try {
        if (!videoPath.startsWith("video:")) {
          videoPath = `video:${videoPath}`;
        }

        // Check cache if enabled
        if (prompt && options.cache !== false) {
          const isProcessed = await isVideoProcessed(videoPath);
          if (isProcessed) {
            console.log(
              "🔄 Video already processed (use --no-cache to force reprocessing)"
            );
            return;
          }
        }

        if (prompt) {
          // Analyze with Gemini
          console.log("🎬 Starting video analysis with Gemini...");
          const analysis = await analyzeVideoWithFrames(
            videoPath,
            prompt,
            options.output
          );

          // Mark as processed in cache
          if (options.cache !== false) {
            await markVideoProcessed(videoPath);
          }

          // Save report if requested
          if (options.saveReport) {
            const reportPath = await saveReport(
              videoPath,
              analysis,
              options.output
            );
            console.log(`\n💾 Report saved to: ${reportPath}`);
          }

          console.log("\n📝 Analysis Result:");
          console.log(analysis);
        } else {
          // Just extract frames
          console.log("🎬 Extracting frames from video...");
          const frames = await extractFrames(videoPath, options.output);
          console.log(`\n📊 Extraction Summary:`);
          console.log(`   Total frames: ${frames.length}`);
          console.log(
            `   Output directory: ${frames[0]?.path.split("/").slice(0, -1).join("/") || "N/A"}`
          );
          console.log(`\n📁 Frame files:`);
          frames.forEach((frame, index) => {
            console.log(`   ${index + 1}: ${frame.path.split("/").pop()}`);
          });
        }
      } catch (error) {
        console.error("Error:", error);
        process.exit(1);
      }
    }
  );

program.parse();
