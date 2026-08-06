import { removeBackground } from "./engines/rmbg_1_4.ts";
import sharp from "sharp";

async function run() {
  try {
    // Generate a valid 10x10 PNG
    const dummyImage = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 }
      }
    }).png().toBuffer();

    const res = await removeBackground(dummyImage as ArrayBuffer);
    console.log("Success:", res.byteLength);
  } catch (err) {
    console.error("Test failed:", err);
  }
}
run();
