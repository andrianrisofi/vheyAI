type RGB = {
  r: number;
  g: number;
  b: number;
};

const clamp = (value: number) => Math.max(0, Math.min(255, value));

const toRgb = ({ r, g, b }: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

const mix = (color: RGB, target: RGB, amount: number): RGB => ({
  r: clamp(color.r + ((target.r - color.r) * amount)),
  g: clamp(color.g + ((target.g - color.g) * amount)),
  b: clamp(color.b + ((target.b - color.b) * amount)),
});

const quantize = (value: number, steps = 6) => Math.round(value / (255 / steps)) * (255 / steps);

const colorMoodFromPrompt = (prompt: string): RGB => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('pink') || lowerPrompt.includes('cute') || lowerPrompt.includes('girl')) {
    return { r: 236, g: 132, b: 190 };
  }

  if (lowerPrompt.includes('blue') || lowerPrompt.includes('cyber') || lowerPrompt.includes('future')) {
    return { r: 96, g: 213, b: 228 };
  }

  if (lowerPrompt.includes('green') || lowerPrompt.includes('nature')) {
    return { r: 80, g: 214, b: 112 };
  }

  if (lowerPrompt.includes('gold') || lowerPrompt.includes('warm')) {
    return { r: 232, g: 178, b: 78 };
  }

  return { r: 176, g: 108, b: 226 };
};

const loadImageFromFile = (file: File) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();

  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Could not read uploaded image.'));
  };
  image.src = url;
});

const getCoverRect = (image: HTMLImageElement, width: number, height: number) => {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;

  return {
    x: (width - drawWidth) / 2,
    y: (height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
};

const averageColor = (data: Uint8ClampedArray): RGB => {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < data.length; i += 16) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (brightness > 24 && brightness < 244) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count += 1;
    }
  }

  if (!count) return { r: 148, g: 112, b: 178 };

  return {
    r: r / count,
    g: g / count,
    b: b / count,
  };
};

const drawDoodleBackground = (ctx: CanvasRenderingContext2D, size: number, mood: RGB, sourceAverage: RGB) => {
  ctx.fillStyle = '#101721';
  ctx.fillRect(0, 0, size, size);

  const wash = ctx.createRadialGradient(size * 0.5, size * 0.45, 80, size * 0.5, size * 0.5, size * 0.72);
  wash.addColorStop(0, `rgba(${mood.r}, ${mood.g}, ${mood.b}, 0.18)`);
  wash.addColorStop(0.68, `rgba(${sourceAverage.r}, ${sourceAverage.g}, ${sourceAverage.b}, 0.08)`);
  wash.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  ctx.lineWidth = 1;
  for (let line = 0; line < size; line += 44) {
    ctx.beginPath();
    ctx.moveTo(line, 0);
    ctx.lineTo(line, size);
    ctx.moveTo(0, line);
    ctx.lineTo(size, line);
    ctx.stroke();
  }
};

const posterizeImage = (imageData: ImageData, mood: RGB) => {
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = (r + g + b) / 3;
    const contrast = brightness < 118 ? -16 : 20;
    const saturationBoost = 1.18;
    const gray = brightness;

    data[i] = clamp(quantize(gray + ((r - gray) * saturationBoost) + contrast + (mood.r * 0.035), 7));
    data[i + 1] = clamp(quantize(gray + ((g - gray) * saturationBoost) + contrast + (mood.g * 0.03), 7));
    data[i + 2] = clamp(quantize(gray + ((b - gray) * saturationBoost) + contrast + (mood.b * 0.035), 7));
  }

  return imageData;
};

const drawEdgeLines = (
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  xOffset: number,
  yOffset: number,
  width: number,
  height: number,
) => {
  const { data } = imageData;
  ctx.save();
  ctx.strokeStyle = '#08060d';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 0.82;

  for (let y = 2; y < height - 4; y += 5) {
    for (let x = 2; x < width - 4; x += 5) {
      const index = (y * width + x) * 4;
      const rightIndex = (y * width + x + 4) * 4;
      const downIndex = ((y + 4) * width + x) * 4;
      const current = data[index] + data[index + 1] + data[index + 2];
      const right = data[rightIndex] + data[rightIndex + 1] + data[rightIndex + 2];
      const down = data[downIndex] + data[downIndex + 1] + data[downIndex + 2];
      const edge = Math.abs(current - right) + Math.abs(current - down);

      if (edge > 92) {
        ctx.beginPath();
        ctx.moveTo(xOffset + x - 3, yOffset + y);
        ctx.quadraticCurveTo(xOffset + x + 2, yOffset + y + 2, xOffset + x + 7, yOffset + y + 1);
        ctx.stroke();
      }
    }
  }

  ctx.restore();
};

const drawHandmadeFrame = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
  ctx.save();
  ctx.strokeStyle = '#07050d';
  ctx.lineWidth = 11;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 42);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x + 11, y + 11, width - 22, height - 22, 32);
  ctx.stroke();
  ctx.restore();
};

export const generateDoodle = async (prompt: string, sourceFile: File) => {
  const size = 1024;
  const artSize = 820;
  const artX = (size - artSize) / 2;
  const artY = 82;
  const image = await loadImageFromFile(sourceFile);
  const mood = colorMoodFromPrompt(prompt);
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = artSize;
  sourceCanvas.height = artSize;

  const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx) throw new Error('Canvas is not available in this browser.');

  const coverRect = getCoverRect(image, artSize, artSize);
  sourceCtx.drawImage(image, coverRect.x, coverRect.y, coverRect.width, coverRect.height);

  const sourceData = sourceCtx.getImageData(0, 0, artSize, artSize);
  const sourceAverage = averageColor(sourceData.data);
  const posterized = posterizeImage(sourceData, mood);
  sourceCtx.putImageData(posterized, 0, 0);

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  drawDoodleBackground(ctx, size, mood, sourceAverage);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(artX, artY, artSize, artSize, 40);
  ctx.clip();
  ctx.drawImage(sourceCanvas, artX, artY);

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(16, 10, 28, 0.16)';
  ctx.fillRect(artX, artY, artSize, artSize);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  drawEdgeLines(ctx, posterized, artX, artY, artSize, artSize);
  drawHandmadeFrame(ctx, artX, artY, artSize, artSize);

  ctx.save();
  ctx.fillStyle = toRgb(mix(mood, { r: 255, g: 255, b: 255 }, 0.16));
  ctx.strokeStyle = '#08060d';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.ellipse(850, 160, 32, 28, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL('image/png');
};
