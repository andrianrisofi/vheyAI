export const generateDoodle = async (prompt: string) => {
  const enhancedPrompt = encodeURIComponent(`${prompt}, doodle character, cute, pastel`);
  
  // We provide the Pollinations URL, but we'll also return a fallback seed
  // to be used if the image fails to load.
  return `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1024&height=1024&nologo=true&seed=${Date.now()}`;
};
