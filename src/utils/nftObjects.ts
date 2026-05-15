import { aptos } from './aptosClient';

const NFT_OBJECT_PREFIX = 'vhey-nft-object-';

export const getNftObjectAddress = (blobName: string) => {
  return localStorage.getItem(`${NFT_OBJECT_PREFIX}${blobName}`) ?? '';
};

export const saveNftObjectAddress = (blobName: string, objectAddress: string) => {
  localStorage.setItem(`${NFT_OBJECT_PREFIX}${blobName}`, objectAddress);
};

export const removeNftObjectAddress = (blobName: string) => {
  localStorage.removeItem(`${NFT_OBJECT_PREFIX}${blobName}`);
};

type OwnedToken = {
  token_data_id: string;
  storage_id: string;
  owner_address: string;
  amount?: number | string;
  current_token_data?: {
    token_name: string;
    token_uri: string;
  } | null;
};

const normalizeAddress = (address: string) => address.toLowerCase().replace(/^0x/, '');
const sleep = (durationMs: number) => new Promise((resolve) => window.setTimeout(resolve, durationMs));

const tokenMatchesBlob = (token: OwnedToken, blobName: string) => {
  const fileName = blobName.split('/').pop() ?? blobName;
  const tokenName = token.current_token_data?.token_name ?? '';
  const tokenUri = token.current_token_data?.token_uri ?? '';

  return tokenName === blobName
    || tokenName === fileName
    || tokenUri.includes(blobName)
    || tokenUri.includes(fileName)
    || tokenUri.includes(encodeURIComponent(blobName))
    || tokenUri.includes(encodeURIComponent(fileName));
};

const hasObjectCoreResource = async (objectAddress: string) => {
  try {
    await aptos.getAccountResource({
      accountAddress: objectAddress,
      resourceType: '0x1::object::ObjectCore',
    });
    return true;
  } catch {
    return false;
  }
};

const getTokenObjectCandidates = (token: OwnedToken) => {
  return [token.storage_id, token.token_data_id].filter(Boolean);
};

export const findOwnedNftObjectAddress = async (ownerAddress: string, blobName: string) => {
  const ownedTokens = await aptos.getAccountOwnedTokens({
    accountAddress: ownerAddress,
    options: {
      tokenStandard: 'v2',
      limit: 100,
    },
  }) as OwnedToken[];

  const matchingToken = ownedTokens.find((token) => {
    const amount = Number(token.amount ?? 1);
    return amount > 0 && tokenMatchesBlob(token, blobName);
  });

  if (!matchingToken) return '';

  const candidates = getTokenObjectCandidates(matchingToken);
  for (const candidate of candidates) {
    if (await hasObjectCoreResource(candidate)) return candidate;
  }

  return '';
};

export const waitForOwnedNftObjectAddress = async (
  ownerAddress: string,
  blobName: string,
  attempts = 8,
  intervalMs = 1200,
) => {
  for (let index = 0; index < attempts; index += 1) {
    const objectAddress = await findOwnedNftObjectAddress(ownerAddress, blobName);
    if (objectAddress) return objectAddress;
    await sleep(intervalMs);
  }

  return '';
};

export const isOwnedNftObject = async (ownerAddress: string, tokenObjectAddress: string) => {
  const ownedTokens = await aptos.getAccountOwnedTokens({
    accountAddress: ownerAddress,
    options: {
      tokenStandard: 'v2',
      limit: 100,
    },
  }) as OwnedToken[];

  const normalizedTokenAddress = normalizeAddress(tokenObjectAddress);
  const isOwned = ownedTokens.some((token) => (
    getTokenObjectCandidates(token).some((candidate) => normalizeAddress(candidate) === normalizedTokenAddress)
  ));

  return isOwned && await hasObjectCoreResource(tokenObjectAddress);
};

type WriteResourceChange = {
  type: string;
  address: string;
  data?: {
    type?: string;
    data?: {
      name?: string;
      uri?: string;
    };
  };
};

const isWriteResourceChange = (change: unknown): change is WriteResourceChange => {
  return typeof change === 'object'
    && change !== null
    && (change as WriteResourceChange).type === 'write_resource'
    && typeof (change as WriteResourceChange).address === 'string';
};

export const extractMintedNftObjectAddress = (changes: unknown[], blobName: string) => {
  const matchingTokenResource = changes.find((change) => (
    isWriteResourceChange(change)
    && change.data?.type === '0x4::token::Token'
    && (
      change.data.data?.name === blobName
      || change.data.data?.uri?.includes(encodeURIComponent(blobName))
      || change.data.data?.uri?.includes(blobName)
    )
  ));

  if (isWriteResourceChange(matchingTokenResource)) return matchingTokenResource.address;
  return '';
};
