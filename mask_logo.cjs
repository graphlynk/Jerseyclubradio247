const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function processLogo() {
    const img = await loadImage('public/jc-club-logo.png');
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');

    // Draw the image onto the canvas
    ctx.drawImage(img, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Change all black (or dark) pixels to #9d00ff
    for (let i = 0; i < data.length; i += 4) {
        // If the pixel is opaque enough and dark enough
        if (data[i + 3] > 0 && data[i] < 50 && data[i + 1] < 50 && data[i + 2] < 50) {
            data[i] = 157;   // r
            data[i + 1] = 0; // g
            data[i + 2] = 255; // b
        }
    }

    // Put the modified data back
    ctx.putImageData(imageData, 0, 0);

    // Write out the modified image
    const out = fs.createWriteStream('public/jc-club-logo-purple.png');
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on('finish', () => console.log('The purple logo was created.'));
}

processLogo();
