type RGB = {
  r: number;
  g: number;
  b: number;
};

const clamp = (value: number) => Math.max(0, Math.min(255, value));

const toColor = ({ r, g, b }: RGB) => `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;

const mix = (color: RGB, target: RGB, amount: number): RGB => ({
  r: clamp(color.r + ((target.r - color.r) * amount)),
  g: clamp(color.g + ((target.g - color.g) * amount)),
  b: clamp(color.b + ((target.b - color.b) * amount)),
});

const hashText = (text: string) => {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createRandom = (seed: number) => {
  let state = seed || 1;

  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) / 4294967296);
  };
};

const colorMoodFromPrompt = (prompt: string) => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('pink') || lowerPrompt.includes('cute') || lowerPrompt.includes('girl')) {
    return { r: 239, g: 130, b: 190 };
  }

  if (lowerPrompt.includes('blue') || lowerPrompt.includes('cyber') || lowerPrompt.includes('future')) {
    return { r: 100, g: 213, b: 224 };
  }

  if (lowerPrompt.includes('green') || lowerPrompt.includes('nature')) {
    return { r: 72, g: 212, b: 68 };
  }

  if (lowerPrompt.includes('gold') || lowerPrompt.includes('warm')) {
    return { r: 217, g: 176, b: 82 };
  }

  return { r: 176, g: 107, b: 224 };
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

const getImagePalette = (image: HTMLImageElement) => {
  const sampleSize = 96;
  const canvas = document.createElement('canvas');
  canvas.width = sampleSize;
  canvas.height = sampleSize;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  const scale = Math.max(sampleSize / image.naturalWidth, sampleSize / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(image, (sampleSize - width) / 2, (sampleSize - height) / 2, width, height);

  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const skinPixels: RGB[] = [];
  const hairPixels: RGB[] = [];
  const accentPixels: RGB[] = [];

  for (let y = 0; y < sampleSize; y += 1) {
    for (let x = 0; x < sampleSize; x += 1) {
      const index = (y * sampleSize + x) * 4;
      const pixel = { r: data[index], g: data[index + 1], b: data[index + 2] };
      const brightness = (pixel.r + pixel.g + pixel.b) / 3;
      const saturation = Math.max(pixel.r, pixel.g, pixel.b) - Math.min(pixel.r, pixel.g, pixel.b);
      const isWarm = pixel.r > pixel.b * 1.04 && pixel.g > pixel.b * 0.72;

      if (brightness > 55 && brightness < 235 && isWarm) {
        skinPixels.push(pixel);
      }

      if (y < sampleSize * 0.68 && brightness > 18 && brightness < 142) {
        hairPixels.push(pixel);
      }

      if (saturation > 38 && brightness > 45 && brightness < 230) {
        accentPixels.push(pixel);
      }
    }
  }

  const average = (pixels: RGB[], fallback: RGB) => {
    if (!pixels.length) return fallback;

    const sum = pixels.reduce<RGB>((acc, pixel) => ({
      r: acc.r + pixel.r,
      g: acc.g + pixel.g,
      b: acc.b + pixel.b,
    }), { r: 0, g: 0, b: 0 });

    return {
      r: sum.r / pixels.length,
      g: sum.g / pixels.length,
      b: sum.b / pixels.length,
    };
  };

  return {
    skin: mix(average(skinPixels, { r: 226, g: 168, b: 118 }), { r: 248, g: 192, b: 143 }, 0.25),
    hair: mix(average(hairPixels, { r: 95, g: 55, b: 32 }), { r: 42, g: 25, b: 18 }, 0.18),
    accent: average(accentPixels, { r: 190, g: 112, b: 215 }),
  };
};

const drawEllipse = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
  color: string,
  stroke = '#08060d',
  lineWidth = 11,
) => {
  ctx.fillStyle = color;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
};

const drawHair = (
  ctx: CanvasRenderingContext2D,
  hairColor: string,
  variant: number,
  mood: RGB,
) => {
  ctx.fillStyle = hairColor;
  ctx.strokeStyle = '#08060d';
  ctx.lineWidth = 12;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  if (variant === 0) {
    ctx.beginPath();
    ctx.moveTo(246, 414);
    ctx.bezierCurveTo(270, 250, 410, 176, 584, 210);
    ctx.bezierCurveTo(742, 238, 820, 352, 792, 512);
    ctx.bezierCurveTo(746, 440, 690, 424, 620, 406);
    ctx.bezierCurveTo(528, 382, 430, 378, 322, 470);
    ctx.bezierCurveTo(318, 432, 294, 416, 246, 414);
    ctx.fill();
    ctx.stroke();
  } else if (variant === 1) {
    ctx.beginPath();
    ctx.moveTo(254, 484);
    ctx.bezierCurveTo(222, 308, 364, 168, 544, 186);
    ctx.bezierCurveTo(732, 204, 836, 348, 792, 536);
    ctx.bezierCurveTo(728, 428, 616, 406, 500, 406);
    ctx.bezierCurveTo(378, 406, 318, 440, 254, 484);
    ctx.fill();
    ctx.stroke();

    for (let i = 0; i < 7; i += 1) {
      ctx.beginPath();
      ctx.moveTo(330 + (i * 58), 292 + ((i % 2) * 20));
      ctx.quadraticCurveTo(360 + (i * 48), 374, 306 + (i * 64), 420);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(288, 402);
    ctx.bezierCurveTo(300, 248, 448, 166, 606, 214);
    ctx.bezierCurveTo(736, 254, 796, 352, 778, 494);
    ctx.bezierCurveTo(696, 372, 570, 348, 450, 374);
    ctx.bezierCurveTo(388, 388, 342, 426, 288, 402);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = toColor(mix(mood, { r: 255, g: 255, b: 255 }, 0.12));
    ctx.beginPath();
    ctx.moveTo(322, 320);
    ctx.bezierCurveTo(422, 254, 540, 250, 654, 304);
    ctx.bezierCurveTo(558, 286, 456, 300, 356, 362);
    ctx.fill();
  }
};

const drawEyes = (ctx: CanvasRenderingContext2D, variant: number) => {
  const eyeY = 500 + (variant === 1 ? 18 : 0);
  const leftX = 418;
  const rightX = 604;
  const eyeHeight = variant === 2 ? 42 : 62;

  drawEllipse(ctx, leftX, eyeY, 58, eyeHeight, '#f8f7ee', '#08060d', 9);
  drawEllipse(ctx, rightX, eyeY, 58, eyeHeight, '#f8f7ee', '#08060d', 9);

  const pupilOffset = variant === 0 ? 12 : variant === 1 ? -10 : 0;
  drawEllipse(ctx, leftX + pupilOffset, eyeY + 6, 18, 24, '#08060d', '#08060d', 3);
  drawEllipse(ctx, rightX + pupilOffset, eyeY + 6, 18, 24, '#08060d', '#08060d', 3);

  if (variant === 2) {
    ctx.strokeStyle = '#08060d';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(342, 438);
    ctx.quadraticCurveTo(408, 420, 470, 438);
    ctx.moveTo(548, 438);
    ctx.quadraticCurveTo(612, 420, 680, 438);
    ctx.stroke();
  }
};

const drawMouth = (ctx: CanvasRenderingContext2D, variant: number, mood: RGB) => {
  ctx.strokeStyle = '#08060d';
  ctx.lineWidth = 10;
  ctx.lineJoin = 'round';

  if (variant === 0) {
    ctx.fillStyle = '#381221';
    ctx.beginPath();
    ctx.moveTo(462, 646);
    ctx.quadraticCurveTo(522, 710, 596, 634);
    ctx.quadraticCurveTo(526, 650, 462, 646);
    ctx.fill();
    ctx.stroke();
  } else if (variant === 1) {
    ctx.fillStyle = toColor(mix(mood, { r: 255, g: 94, b: 124 }, 0.45));
    ctx.beginPath();
    ctx.ellipse(526, 640, 38, 54, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(460, 648);
    ctx.quadraticCurveTo(526, 612, 604, 650);
    ctx.stroke();

    ctx.fillStyle = '#f08aa9';
    ctx.beginPath();
    ctx.moveTo(566, 648);
    ctx.quadraticCurveTo(610, 648, 620, 612);
    ctx.quadraticCurveTo(586, 632, 566, 648);
    ctx.fill();
    ctx.stroke();
  }
};

const drawNose = (ctx: CanvasRenderingContext2D) => {
  ctx.strokeStyle = '#08060d';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(520, 536);
  ctx.quadraticCurveTo(498, 594, 540, 590);
  ctx.stroke();
};

const drawBackground = (ctx: CanvasRenderingContext2D, size: number) => {
  ctx.fillStyle = '#111822';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.025)';
  ctx.lineWidth = 1;
  for (let i = 0; i < size; i += 42) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
};

export const generateDoodle = async (prompt: string, sourceFile: File) => {
  const size = 1024;
  const image = await loadImageFromFile(sourceFile);
  const palette = getImagePalette(image);
  const mood = colorMoodFromPrompt(prompt);
  const seed = hashText(`${prompt}-${sourceFile.name}-${sourceFile.size}-${sourceFile.lastModified}`);
  const random = createRandom(seed);
  const variant = Math.floor(random() * 3);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  drawBackground(ctx, size);

  const skin = toColor(mix(palette.skin, { r: 255, g: 214, b: 168 }, 0.18));
  const hairBase = random() > 0.34 ? palette.hair : mix(palette.accent, mood, 0.42);
  const hair = toColor(mix(hairBase, mood, 0.12));

  ctx.save();
  ctx.translate((random() - 0.5) * 26, (random() - 0.5) * 18);
  ctx.rotate((random() - 0.5) * 0.08);

  drawHair(ctx, hair, variant, mood);
  drawEllipse(ctx, 286, 552, 58, 80, skin, '#08060d', 10);
  drawEllipse(ctx, 746, 548, 62, 84, skin, '#08060d', 10);
  drawEllipse(ctx, 512, 530, 260, 286, skin, '#08060d', 12);

  ctx.fillStyle = 'rgba(80, 43, 28, 0.11)';
  ctx.beginPath();
  ctx.ellipse(608, 606, 102, 132, -0.28, 0, Math.PI * 2);
  ctx.fill();

  drawHair(ctx, hair, variant, mood);
  drawEyes(ctx, variant);
  drawNose(ctx);
  drawMouth(ctx, Math.floor(random() * 3), mood);

  ctx.restore();

  ctx.strokeStyle = 'rgba(126, 93, 166, 0.45)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(56, 56, 912, 912, 32);
  ctx.stroke();

  return canvas.toDataURL('image/png');
};
