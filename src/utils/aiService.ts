const femaleSeeds = [
  'Aneka',
  'Sheba',
  'Luna',
  'Mimi',
  'Molly',
  'Sara',
  'Kiki',
  'Zoe',
];

const neutralSeeds = [
  'Felix',
  'Jasper',
  'Milo',
  'Charlie',
  'Nova',
  'Robin',
  'Sunny',
  'Pixel',
];

const hashBytes = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let hash = 2166136261;

  for (let i = 0; i < bytes.length; i += 97) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const hashText = (value: string) => {
  let hash = 2166136261;

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const prefersFemaleDoodle = (prompt: string, fileName: string) => {
  const text = `${prompt} ${fileName}`.toLowerCase();

  return [
    'cewe',
    'cewek',
    'perempuan',
    'wanita',
    'girl',
    'female',
    'woman',
    'lady',
  ].some((keyword) => text.includes(keyword));
};

export const generateDoodle = async (prompt: string, sourceFile: File) => {
  const imageHash = await hashBytes(sourceFile);
  const textHash = hashText(`${prompt}-${sourceFile.name}-${sourceFile.size}-${sourceFile.lastModified}`);
  const combinedHash = imageHash ^ textHash;
  const seeds = prefersFemaleDoodle(prompt, sourceFile.name) ? femaleSeeds : [...femaleSeeds, ...neutralSeeds];
  const seedName = seeds[combinedHash % seeds.length];
  const seed = `${seedName}-${combinedHash.toString(36)}`;
  const params = new URLSearchParams({
    seed,
    backgroundColor: '1b2230',
    radius: '0',
    scale: '84',
    translateY: '6',
  });

  return `https://api.dicebear.com/7.x/adventurer/svg?${params.toString()}`;
};
