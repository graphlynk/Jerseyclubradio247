/**
 * Convert the purple club logo to pure white with transparent background.
 * Uses the canvas npm package already in the project.
 */
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
const path = require('path');

async function main() {
    const src = path.join(__dirname, '..', 'public', 'jc-club-logo-purple.png');
    const dst = path.join(__dirname, '..', 'public', 'jc-club-logo-white.png');

    const img = await loadImage(src);
    const w = img.width;
    const h = img.height;

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');

    // Draw original image
    ctx.drawImage(img, 0, 0);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, w, h);
    const d = imageData.data;

    for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]; // alpha
        if (a > 30) {
            // Non-transparent pixel → make it pure white, keep its alpha
            d[i] = 255; // R
            d[i + 1] = 255; // G
            d[i + 2] = 255; // B
            // keep alpha as-is so edges stay smooth
        } else {
            // Transparent pixel → fully transparent
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
            d[i + 3] = 0;
        }
    }

    ctx.putImageData(imageData, 0, 0);

    const buf = canvas.toBuffer('image/png');
    fs.writeFileSync(dst, buf);
    console.log(`White logo saved to: ${dst} (${buf.length} bytes)`);
}

main().catch(console.error);
