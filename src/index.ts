import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import { extractFrames, Attachment } from "./llm_video-frames";
import { promises as fs } from "fs";
import { config } from "dotenv";

config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function analyzeVideoWithFrames(
  videoPath: string,
  prompt: string,
  outputDir?: string
): Promise<string> {
  const attachments = await extractFrames(videoPath, outputDir);

  // Log frames being sent to Gemini
  console.log(`🚀 Sending ${attachments.length} frames to Gemini for analysis`);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const imageParts: any[] = [];
  let totalInputTokens = 0;

  for (const attachment of attachments) {
    const imageBuffer = await fs.readFile(attachment.path);
    const base64 = imageBuffer.toString("base64");

    // Estimate tokens for image (rough approximation)
    const imageSizeKB = imageBuffer.length / 1024;
    const estimatedImageTokens = Math.ceil(imageSizeKB / 10); // ~1 token per 10KB
    totalInputTokens += estimatedImageTokens;

    imageParts.push({
      inlineData: {
        data: base64,
        mimeType: "image/jpeg",
      },
    });
  }

  // Add prompt tokens (rough estimation)
  const promptTokens = Math.ceil(prompt.length / 4); // ~4 chars per token
  totalInputTokens += promptTokens;

  // Generate content with the image parts
  const startTime = Date.now();
  const result = await model.generateContent([prompt, ...imageParts]);
  const endTime = Date.now();

  const response = await result.response;
  const text = response.text();

  // Estimate output tokens
  const outputTokens = Math.ceil(text.length / 4);

  // Calculate costs for Gemini 2.5 Flash
  const inputCostPerThousand = 0.075; // $0.075 per 1K input tokens
  const outputCostPerThousand = 0.3; // $0.30 per 1K output tokens

  const inputCost = (totalInputTokens / 1000) * inputCostPerThousand;
  const outputCost = (outputTokens / 1000) * outputCostPerThousand;
  const totalCost = inputCost + outputCost;

  // Log cost and performance information
  console.log(`\n📊 Cost Analysis:`);
  console.log(
    `   Input tokens: ${totalInputTokens.toLocaleString()} (${inputCost.toFixed(4)}$)`
  );
  console.log(
    `   Output tokens: ${outputTokens.toLocaleString()} (${outputCost.toFixed(4)}$)`
  );
  console.log(`   Total cost: ${totalCost.toFixed(4)}$`);
  console.log(`⏱️  Processing time: ${(endTime - startTime) / 1000}s`);

  return text;
}

async function main() {
  const videoPath = "video:tests/Mieszkanie.mp4?fps=1&timestamps=1";
  const prompt =
    "Describe what you see in this video. What type of location is shown? What activities or objects are visible in the frames?";

  try {
    console.log("Extracting frames from video...");
    const analysis = await analyzeVideoWithFrames(videoPath, prompt);
    console.log("Analysis result:");
    console.log(analysis);
  } catch (error) {
    console.error("Error analyzing video:", error);
  }
}

// Run main function only when this file is executed directly
if (require.main === module) {
  main();
}

export { analyzeVideoWithFrames };
