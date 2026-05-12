const clamp = (value: number) => Math.max(0, Math.min(255, value));

const colorMoodFromPrompt = (prompt: string) => {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes('pink') || lowerPrompt.includes('cute') || lowerPrompt.includes('girl')) {
    return { r: 255, g: 118, b: 188 };
  }

  if (lowerPrompt.includes('blue') || lowerPrompt.includes('cyber') || lowerPrompt.includes('future')) {
    return { r: 74, g: 224, b: 255 };
  }

  if (lowerPrompt.includes('green') || lowerPrompt.includes('nature')) {
    return { r: 69, g: 230, b: 164 };
  }

  if (lowerPrompt.includes('gold') || lowerPrompt.includes('warm')) {
    return { r: 255, g: 188, b: 64 };
  }

  return { r: 183, g: 96, b: 255 };
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

const getCoverRect = (image: HTMLImageElement, size: number) => {
  const scale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;

  return {
    x: (size - width) / 2,
    y: (size - height) / 2,
    width,
    height,
  };
};

const drawSparkles = (ctx: CanvasRenderingContext2D, size: number, mood: ReturnType<typeof colorMoodFromPrompt>) => {
  ctx.save();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = `rgb(${mood.r}, ${mood.g}, ${mood.b})`;

  for (let i = 0; i < 42; i += 1) {
    const x = (Math.sin(i * 37.2) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * 18.8) * 0.5 + 0.5) * size;
    const radius = 1 + ((i * 7) % 4);

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

export const generateDoodle = async (prompt: string, sourceFile: File) => {
  const size = 1024;
  const image = await loadImageFromFile(sourceFile);
  const mood = colorMoodFromPrompt(prompt);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas is not available in this browser.');

  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#090719');
  gradient.addColorStop(0.55, '#17102d');
  gradient.addColorStop(1, '#071820');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  drawSparkles(ctx, size, mood);

  const portraitSize = 760;
  const portraitX = (size - portraitSize) / 2;
  const portraitY = 88;
  const coverRect = getCoverRect(image, portraitSize);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(portraitX, portraitY, portraitSize, portraitSize, 78);
  ctx.clip();
  ctx.drawImage(image, portraitX + coverRect.x, portraitY + coverRect.y, coverRect.width, coverRect.height);

  const frame = ctx.getImageData(portraitX, portraitY, portraitSize, portraitSize);
  const data = frame.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = (r * 0.299) + (g * 0.587) + (b * 0.114);
    const band = Math.round(gray / 42) * 42;
    const inkBoost = gray < 58 ? -42 : 16;

    data[i] = clamp((band * 0.78) + (r * 0.34) + (mood.r * 0.13) + inkBoost);
    data[i + 1] = clamp((band * 0.72) + (g * 0.36) + (mood.g * 0.11) + inkBoost);
    data[i + 2] = clamp((band * 0.68) + (b * 0.4) + (mood.b * 0.14) + inkBoost);
  }

  ctx.putImageData(frame, portraitX, portraitY);

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = 'rgba(24, 9, 42, 0.22)';
  ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();

  const edgeFrame = ctx.getImageData(portraitX, portraitY, portraitSize, portraitSize);
  const edgeData = edgeFrame.data;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(portraitX, portraitY, portraitSize, portraitSize, 78);
  ctx.clip();
  ctx.strokeStyle = '#07040f';
  ctx.lineWidth = 3.5;
  ctx.globalAlpha = 0.9;

  for (let y = 2; y < portraitSize - 2; y += 4) {
    for (let x = 2; x < portraitSize - 2; x += 4) {
      const index = (y * portraitSize + x) * 4;
      const nextIndex = (y * portraitSize + x + 4) * 4;
      const lowerIndex = ((y + 4) * portraitSize + x) * 4;
      const current = edgeData[index] + edgeData[index + 1] + edgeData[index + 2];
      const next = edgeData[nextIndex] + edgeData[nextIndex + 1] + edgeData[nextIndex + 2];
      const lower = edgeData[lowerIndex] + edgeData[lowerIndex + 1] + edgeData[lowerIndex + 2];

      if (Math.abs(current - next) + Math.abs(current - lower) > 155) {
        ctx.beginPath();
        ctx.moveTo(portraitX + x - 3, portraitY + y);
        ctx.quadraticCurveTo(portraitX + x, portraitY + y + 2, portraitX + x + 5, portraitY + y + 1);
        ctx.stroke();
      }
    }
  }

  ctx.restore();

  ctx.save();
  ctx.shadowColor = `rgba(${mood.r}, ${mood.g}, ${mood.b}, 0.75)`;
  ctx.shadowBlur = 34;
  ctx.strokeStyle = `rgba(${mood.r}, ${mood.g}, ${mood.b}, 0.96)`;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(portraitX - 10, portraitY - 10, portraitSize + 20, portraitSize + 20, 88);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(188, 140);
  ctx.lineTo(846, 72);
  ctx.lineTo(768, 260);
  ctx.lineTo(228, 336);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.font = '700 42px Inter, Arial, sans-serif';
  ctx.fillStyle = '#f7f0ff';
  ctx.textAlign = 'center';
  ctx.fillText('Vhey Refraction', size / 2, 938);
  ctx.font = '600 24px Inter, Arial, sans-serif';
  ctx.fillStyle = `rgb(${mood.r}, ${mood.g}, ${mood.b})`;
  ctx.fillText(prompt.slice(0, 58), size / 2, 978);

  return canvas.toDataURL('image/png');
};
