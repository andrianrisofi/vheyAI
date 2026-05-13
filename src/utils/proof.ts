export type StoredProof = {
  id: string;
  imageBlobName: string;
  metadataBlobName: string;
  contentHash: string;
  creator: string;
  prompt: string;
  model: string;
  createdAt: string;
};

const STORAGE_PREFIX = 'vhey-proof-';

export const getProofIdFromBlobName = (blobName: string) => {
  const fileName = blobName.split('/').pop() ?? blobName;
  return fileName.split('.')[0] || fileName;
};

export const saveProof = (proof: StoredProof) => {
  localStorage.setItem(`${STORAGE_PREFIX}${proof.id}`, JSON.stringify(proof));
};

export const getProof = (id: string) => {
  const rawProof = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
  if (!rawProof) return null;

  try {
    return JSON.parse(rawProof) as StoredProof;
  } catch {
    return null;
  }
};
