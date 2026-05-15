import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignAndSubmitTransaction } from '@aptos-labs/react';
import { useAccountBlobs, useShelbyClient } from '@shelby-protocol/react';
import type { BlobMetadata, ShelbyClient } from '@shelby-protocol/sdk/browser';
import {
  MARKETPLACE_MODULE,
  getMarketplaceFunction,
  isMarketplaceConfigured,
  toOctas,
} from '../config/marketplace';
import { SHELBY_EXPLORER_NETWORK } from '../config/network';
import { aptos } from '../utils/aptosClient';
import {
  findOwnedNftObjectAddress,
  getNftObjectAddress,
  removeNftObjectAddress,
  saveNftObjectAddress,
} from '../utils/nftObjects';
import { devLogger } from '../utils/logger';

type MarketListing = {
  id: string;
  blobName: string;
  owner: string;
  price: string;
  tokenObjectAddress?: string;
  listingObjectAddress?: string;
  txHash?: string;
  createdAt: string;
};

type PreviewProps = {
  accountAddress: string;
  blobName: string;
  client: ShelbyClient;
};

const MARKET_STORAGE_KEY = 'vhey-market-listings';

const getShelbyExplorerUrl = (blobName: string, accountAddress: string) => {
  return `https://explorer.shelby.xyz/${SHELBY_EXPLORER_NETWORK}/blob/${encodeURI(blobName)}?account=${accountAddress}`;
};

const getStoredMimeType = (blobName: string) => {
  const storedMimeType = localStorage.getItem(`vhey-blob-mime-${blobName}`);
  if (storedMimeType) return storedMimeType;
  if (blobName.endsWith('.png')) return 'image/png';
  if (blobName.endsWith('.webp')) return 'image/webp';
  if (blobName.endsWith('.svg')) return 'image/svg+xml';
  return 'image/jpeg';
};

const detectImageMimeType = (bytes: Uint8Array, blobName: string) => {
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (
    bytes[0] === 0x52
    && bytes[1] === 0x49
    && bytes[2] === 0x46
    && bytes[3] === 0x46
    && bytes[8] === 0x57
    && bytes[9] === 0x45
    && bytes[10] === 0x42
    && bytes[11] === 0x50
  ) return 'image/webp';
  return getStoredMimeType(blobName);
};

const isImageBlob = (blobName: string) => {
  const lowerName = blobName.toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.svg'].some((extension) => lowerName.endsWith(extension));
};

const readListings = (): MarketListing[] => {
  try {
    const stored = localStorage.getItem(MARKET_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveListings = (listings: MarketListing[]) => {
  localStorage.setItem(MARKET_STORAGE_KEY, JSON.stringify(listings));
};

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;
const fromOctas = (octas: string | number) => {
  const value = BigInt(octas || 0);
  const whole = value / 100_000_000n;
  const fraction = value % 100_000_000n;
  const fractionText = fraction.toString().padStart(8, '0').replace(/0+$/, '');
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown marketplace error.';
  }
};

const isAddressLike = (value: string) => /^0x[a-fA-F0-9]{1,64}$/.test(value.trim());

const formatBlobLabel = (blobName: string) => {
  const fileName = blobName.split('/').pop() ?? blobName;
  if (fileName.length <= 22) return fileName;
  const extensionIndex = fileName.lastIndexOf('.');
  const extension = extensionIndex > -1 ? fileName.slice(extensionIndex) : '';
  return `${fileName.slice(0, 10)}...${extension}`;
};

type MarketplaceEvent = {
  type?: string;
  data?: {
    listing?: string;
    seller?: string;
    token?: string;
    price_octas?: string;
    blob_name?: string;
    image_uri?: string;
  };
  transaction_version?: number;
};

type MarketplaceEventsResponse = {
  events: MarketplaceEvent[];
};

const extractListingObjectAddress = (events: unknown[]) => {
  const listedEvent = events.find((event): event is MarketplaceEvent => {
    const typedEvent = event as MarketplaceEvent;
    return Boolean(typedEvent.type?.endsWith('::marketplace_v2::Listed'))
      && typeof typedEvent.data?.listing === 'string';
  });

  return listedEvent?.data?.listing ?? '';
};

const getListingObjectAddressFromTx = async (txHash: string) => {
  const transaction = await aptos.waitForTransaction({
    transactionHash: txHash,
    options: {
      checkSuccess: true,
    },
  });

  if (!('events' in transaction)) return '';
  return extractListingObjectAddress(transaction.events);
};

const fetchPublicListings = async (): Promise<MarketListing[]> => {
  if (!MARKETPLACE_MODULE) return [];

  const response = await aptos.queryIndexer<MarketplaceEventsResponse>({
    query: {
      query: `
        query MarketplaceEvents($types: [String!]) {
          events(
            where: { type: { _in: $types } }
            order_by: { transaction_version: desc }
            limit: 200
          ) {
            type
            data
            transaction_version
          }
        }
      `,
      variables: {
        types: [
          `${MARKETPLACE_MODULE}::Listed`,
          `${MARKETPLACE_MODULE}::Purchased`,
          `${MARKETPLACE_MODULE}::Delisted`,
        ],
      },
    },
  });

  const inactiveListings = new Set(
    response.events
      .filter((event) => (
        event.type?.endsWith('::Purchased')
        || event.type?.endsWith('::Delisted')
      ))
      .map((event) => event.data?.listing)
      .filter((listing): listing is string => Boolean(listing)),
  );

  return response.events
    .filter((event) => event.type?.endsWith('::Listed'))
    .map((event): MarketListing | null => {
      const listingObjectAddress = event.data?.listing;
      const owner = event.data?.seller;
      const blobName = event.data?.blob_name;

      if (!listingObjectAddress || !owner || !blobName || inactiveListings.has(listingObjectAddress)) return null;

      return {
        id: listingObjectAddress,
        blobName,
        owner,
        price: fromOctas(event.data?.price_octas ?? 0),
        tokenObjectAddress: event.data?.token,
        listingObjectAddress,
        createdAt: event.transaction_version?.toString() ?? '',
      };
    })
    .filter((listing): listing is MarketListing => Boolean(listing));
};

const mergeListings = (chainListings: MarketListing[], cachedListings: MarketListing[]) => {
  const listingById = new Map<string, MarketListing>();

  chainListings.forEach((listing) => {
    listingById.set(listing.listingObjectAddress ?? listing.id, listing);
  });

  cachedListings.forEach((listing) => {
    const key = listing.listingObjectAddress ?? listing.id;
    if (!listingById.has(key)) listingById.set(key, listing);
  });

  return Array.from(listingById.values());
};

const MarketPreview = ({ accountAddress, blobName, client }: PreviewProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let isMounted = true;

    const loadBlob = async () => {
      try {
        const blob = await client.download({
          account: accountAddress,
          blobName,
        });
        const response = new Response(blob.readable);
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const imageBlob = new Blob([arrayBuffer], { type: detectImageMimeType(bytes, blobName) });
        objectUrl = URL.createObjectURL(imageBlob);

        if (isMounted) {
          setImageUrl(objectUrl);
          setHasError(false);
        }
      } catch (error) {
        devLogger.error('Marketplace preview error:', error);
        if (isMounted) setHasError(true);
      }
    };

    loadBlob();

    return () => {
      isMounted = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accountAddress, blobName, client]);

  if (hasError) {
    return <div className="market-preview-fallback">Stored</div>;
  }

  if (!imageUrl) {
    return <div className="market-preview-fallback">Loading</div>;
  }

  return <img src={imageUrl} alt={blobName} onError={() => setHasError(true)} />;
};

const MarketplaceSection = () => {
  const walletAdapter = useWallet();
  const { connected, account } = walletAdapter;
  const { mutateAsync: signAndSubmitTransactionAsync, isPending: isSubmittingMarketTx } = useSignAndSubmitTransaction();
  const shelbyClient = useShelbyClient();
  const walletAddress = account?.address?.toString() ?? '';
  const [selectedBlob, setSelectedBlob] = useState('');
  const [tokenObjectAddress, setTokenObjectAddress] = useState('');
  const [price, setPrice] = useState('');
  const [listings, setListings] = useState<MarketListing[]>(() => readListings());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [isCheckingNftObject, setIsCheckingNftObject] = useState(false);
  const [isNftObjectValid, setIsNftObjectValid] = useState(false);
  const [resolvedNftObjectAddress, setResolvedNftObjectAddress] = useState('');
  const [marketView, setMarketView] = useState<'explore' | 'mine'>('explore');

  const { data: blobs, isLoading } = useAccountBlobs({
    client: shelbyClient,
    account: walletAddress,
    enabled: connected && !!walletAddress,
  });

  const ownBlobs = useMemo(() => (
    blobs?.filter((blob) => !blob.isDeleted && isImageBlob(blob.blobNameSuffix)) ?? []
  ), [blobs]);

  const listedBlobNames = useMemo(() => (
    new Set(listings.map((listing) => `${listing.owner}:${listing.blobName}`))
  ), [listings]);

  const availableBlobs = ownBlobs.filter((blob) => (
    !listedBlobNames.has(`${walletAddress}:${blob.blobNameSuffix}`)
  ));
  const buyListings = listings.filter((listing) => listing.owner !== walletAddress);
  const myListings = listings.filter((listing) => listing.owner === walletAddress);
  const visibleListings = marketView === 'explore' ? buyListings : myListings;
  const selectedBlobHasNftObject = Boolean(resolvedNftObjectAddress);
  const canSubmitListing = !isSubmittingMarketTx
    && !isCheckingNftObject
    && Boolean(selectedBlob)
    && Number(price) > 0
    && (!isMarketplaceConfigured || (selectedBlobHasNftObject && isNftObjectValid));

  useEffect(() => {
    let isMounted = true;

    if (!selectedBlob) {
      setTokenObjectAddress('');
      setIsNftObjectValid(false);
      setResolvedNftObjectAddress('');
      return;
    }

    const storedObjectAddress = getNftObjectAddress(selectedBlob);
    setTokenObjectAddress(storedObjectAddress);
    setIsNftObjectValid(false);
    setResolvedNftObjectAddress('');

    const validateStoredObject = async () => {
      setIsCheckingNftObject(true);

      try {
        const ownedObjectAddress = await findOwnedNftObjectAddress(walletAddress, selectedBlob);

        if (!isMounted) return;

        if (ownedObjectAddress && isAddressLike(ownedObjectAddress)) {
          saveNftObjectAddress(selectedBlob, ownedObjectAddress);
          setTokenObjectAddress(ownedObjectAddress);
          setResolvedNftObjectAddress(ownedObjectAddress);
          setIsNftObjectValid(true);
          setStatusMessage(null);
        } else {
          removeNftObjectAddress(selectedBlob);
          setTokenObjectAddress('');
          setResolvedNftObjectAddress('');
          setIsNftObjectValid(false);
          setStatusMessage('No minted NFT found for this Shelby refraction yet. Mint it from Studio first.');
        }
      } catch (error) {
        devLogger.error('NFT ownership lookup error:', error);
        if (isMounted) {
          setIsNftObjectValid(false);
          setResolvedNftObjectAddress('');
          setStatusMessage('Could not verify this NFT from the ownership indexer. Try again in a moment.');
        }
      } finally {
        if (isMounted) setIsCheckingNftObject(false);
      }
    };

    void validateStoredObject();

    return () => {
      isMounted = false;
    };
  }, [selectedBlob, walletAddress]);

  useEffect(() => {
    let isMounted = true;

    if (!isMarketplaceConfigured) {
      return () => {
        isMounted = false;
      };
    }

    const loadPublicListings = async () => {
      setIsLoadingMarket(true);

      try {
        const chainListings = await fetchPublicListings();
        if (!isMounted) return;

        const nextListings = mergeListings(chainListings, readListings());
        setListings(nextListings);
        saveListings(nextListings);
      } catch (error) {
        devLogger.error('Public marketplace load error:', error);
        if (isMounted) setStatusMessage('Could not load public marketplace listings yet. Try refreshing in a moment.');
      } finally {
        if (isMounted) setIsLoadingMarket(false);
      }
    };

    void loadPublicListings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const listingsToSync = listings.filter((listing) => listing.txHash && !listing.listingObjectAddress);

    if (!isMarketplaceConfigured || listingsToSync.length === 0) {
      return () => {
        isMounted = false;
      };
    }

    const syncListings = async () => {
      const syncedEntries = await Promise.all(listingsToSync.map(async (listing) => {
        try {
          const listingObjectAddress = await getListingObjectAddressFromTx(listing.txHash ?? '');
          return listingObjectAddress ? { id: listing.id, listingObjectAddress } : null;
        } catch (error) {
          devLogger.error('Listing sync error:', error);
          return null;
        }
      }));

      if (!isMounted) return;

      const listingObjectById = new Map(
        syncedEntries
          .filter((entry): entry is { id: string; listingObjectAddress: string } => Boolean(entry))
          .map((entry) => [entry.id, entry.listingObjectAddress]),
      );

      if (listingObjectById.size === 0) return;

      const nextListings = listings.map((listing) => {
        const listingObjectAddress = listingObjectById.get(listing.id);
        return listingObjectAddress ? { ...listing, listingObjectAddress } : listing;
      });

      setListings(nextListings);
      saveListings(nextListings);
    };

    void syncListings();

    return () => {
      isMounted = false;
    };
  }, [listings]);

  const handleCreateListing = async () => {
    const normalizedPrice = Number(price);

    if (!connected || !walletAddress) {
      setStatusMessage('Connect your wallet before listing a refraction.');
      return;
    }

    if (!selectedBlob) {
      setStatusMessage('Choose one saved refraction first.');
      return;
    }

    if (!Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      setStatusMessage('Enter a valid APT price.');
      return;
    }

    let txHash: string | undefined;
    let listingTokenObjectAddress = resolvedNftObjectAddress || tokenObjectAddress.trim();
    let listingObjectAddress: string | undefined;

    if (isMarketplaceConfigured) {
      let resolvedTokenObjectAddress = resolvedNftObjectAddress;

      if (!resolvedTokenObjectAddress) {
        setStatusMessage('Resolving NFT object from your wallet...');
        resolvedTokenObjectAddress = await findOwnedNftObjectAddress(walletAddress, selectedBlob);
      }

      if (!resolvedTokenObjectAddress || !isAddressLike(resolvedTokenObjectAddress)) {
        removeNftObjectAddress(selectedBlob);
        setTokenObjectAddress('');
        setIsNftObjectValid(false);
        setStatusMessage('No minted NFT found for this Shelby refraction. Mint it from Studio first.');
        return;
      }

      saveNftObjectAddress(selectedBlob, resolvedTokenObjectAddress);
      setTokenObjectAddress(resolvedTokenObjectAddress);
      setResolvedNftObjectAddress(resolvedTokenObjectAddress);
      setIsNftObjectValid(true);
      listingTokenObjectAddress = resolvedTokenObjectAddress;

      try {
        const transaction = await signAndSubmitTransactionAsync({
          data: {
            function: getMarketplaceFunction('list') as `${string}::${string}::${string}`,
            functionArguments: [
              resolvedTokenObjectAddress,
              toOctas(price),
              selectedBlob,
              getShelbyExplorerUrl(selectedBlob, walletAddress),
            ],
          },
        });
        txHash = transaction.hash;
        listingObjectAddress = await getListingObjectAddressFromTx(transaction.hash);
      } catch (error) {
        devLogger.error('Marketplace list error:', error);
        setStatusMessage(getErrorMessage(error));
        return;
      }
    }

    const nextListings = [
      {
        id: txHash ?? `${walletAddress}-${selectedBlob}-${Date.now()}`,
        blobName: selectedBlob,
        owner: walletAddress,
        price: normalizedPrice.toString(),
        tokenObjectAddress: listingTokenObjectAddress || undefined,
        listingObjectAddress,
        txHash,
        createdAt: new Date().toISOString(),
      },
      ...listings,
    ];

    setListings(nextListings);
    saveListings(nextListings);
    setSelectedBlob('');
    setTokenObjectAddress('');
    setPrice('');
    setStatusMessage(
      txHash
        ? `On-chain listing created. Tx: ${txHash.slice(0, 10)}...`
        : 'Draft listing saved locally. Set VITE_MARKETPLACE_ADDRESS to enable on-chain escrow.',
    );
  };

  const handleDelist = async (listing: MarketListing) => {
    if (isMarketplaceConfigured && listing.listingObjectAddress) {
      try {
        const transaction = await signAndSubmitTransactionAsync({
          data: {
            function: getMarketplaceFunction('delist') as `${string}::${string}::${string}`,
            functionArguments: [listing.listingObjectAddress],
          },
        });
        setStatusMessage(`On-chain delist submitted. Tx: ${transaction.hash.slice(0, 10)}...`);
      } catch (error) {
        devLogger.error('Marketplace delist error:', error);
        setStatusMessage(error instanceof Error ? error.message : 'Failed to delist on-chain.');
        return;
      }
    }

    const listingId = listing.id;
    const nextListings = listings.filter((listing) => listing.id !== listingId);
    setListings(nextListings);
    saveListings(nextListings);
    if (!listing.listingObjectAddress) setStatusMessage('Listing removed locally.');
  };

  const handleBuy = async (listing: MarketListing) => {
    if (!isMarketplaceConfigured || !listing.listingObjectAddress) {
      setStatusMessage('Paste an on-chain listing object address before buying. The escrow contract is ready, but this listing is local only.');
      return;
    }

    try {
      const transaction = await signAndSubmitTransactionAsync({
        data: {
          function: getMarketplaceFunction('buy') as `${string}::${string}::${string}`,
          functionArguments: [listing.listingObjectAddress],
        },
      });
      setStatusMessage(`Purchase submitted. Tx: ${transaction.hash.slice(0, 10)}...`);
    } catch (error) {
      devLogger.error('Marketplace buy error:', error);
      setStatusMessage(error instanceof Error ? error.message : 'Failed to buy listing.');
    }
  };

  if (!connected) return null;

  return (
    <section id="marketplace" className="market-section">
      <div className="market-container">
        <div className="market-heading">
          <div>
            <div className="section-label">Marketplace</div>
            <h2 className="font-display market-title">List and discover refraction NFTs</h2>
          </div>
          <p>
            Escrow-ready marketplace for Vhey refractions. List minted artwork, delist it anytime, or prepare it for buying from another wallet.
          </p>
        </div>

        <div className="market-tabs" role="tablist" aria-label="Marketplace views">
          <button
            type="button"
            className={marketView === 'explore' ? 'active' : ''}
            onClick={() => setMarketView('explore')}
          >
            Explore
          <span>{buyListings.length}</span>
          </button>
          <button
            type="button"
            className={marketView === 'mine' ? 'active' : ''}
            onClick={() => setMarketView('mine')}
          >
            My Listings
            <span>{myListings.length}</span>
          </button>
        </div>

        <div className={`market-layout ${marketView === 'explore' ? 'market-layout-explore' : ''}`}>
          {marketView === 'mine' && (
          <div className="market-listing-panel glass-card">
            <div className="market-panel-head">
              <div>
                <h3>Create Listing</h3>
                <p>Turn one minted refraction into a live market item.</p>
              </div>
              <span>Seller</span>
            </div>
            <label>
              Refraction
              <select value={selectedBlob} onChange={(event) => setSelectedBlob(event.target.value)}>
                <option value="">Select saved artwork</option>
                {availableBlobs.map((blob: BlobMetadata) => (
                  <option key={blob.blobNameSuffix} value={blob.blobNameSuffix}>
                    {formatBlobLabel(blob.blobNameSuffix)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Price
              <div className="price-field">
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  placeholder="0.25"
                />
                <span>APT</span>
              </div>
            </label>
            <label>
              NFT object
              <input
                value={tokenObjectAddress}
                readOnly
                placeholder={isCheckingNftObject ? 'Checking minted NFT...' : 'Auto-filled after mint'}
              />
            </label>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateListing}
              disabled={!canSubmitListing}
            >
              {isSubmittingMarketTx
                ? 'Submitting...'
                : isCheckingNftObject
                  ? 'Checking NFT...'
                : isMarketplaceConfigured && selectedBlob && !selectedBlobHasNftObject
                  ? 'Mint NFT First'
                  : isMarketplaceConfigured && selectedBlob && !isNftObjectValid
                    ? 'Invalid NFT Object'
                  : isMarketplaceConfigured ? 'List On-Chain' : 'Save Draft Listing'}
            </button>
            {isMarketplaceConfigured && selectedBlob && !selectedBlobHasNftObject && (
              <p className="market-warning">
                This Shelby file is not linked to a minted NFT yet. Mint it from Studio first, then come back to Market.
              </p>
            )}
            {isMarketplaceConfigured && selectedBlobHasNftObject && !isCheckingNftObject && !isNftObjectValid && (
              <p className="market-warning">
                The saved object address is not owned by this wallet. Mint this refraction first so Vhey can capture the correct NFT address.
              </p>
            )}
            <p className="market-note">
              {isMarketplaceConfigured
                ? 'On-chain listing escrows the NFT object in the marketplace contract.'
                : 'Marketplace contract address is not set yet. Listings stay local until VITE_MARKETPLACE_ADDRESS is configured.'}
            </p>
            {isLoading && <p className="market-note">Loading your Shelby blobs...</p>}
            {statusMessage && <p className="market-status">{statusMessage}</p>}
          </div>
          )}

          <div className="market-items">
            {isLoadingMarket ? (
              <div className="market-empty glass-card">
                <h3>Loading listings</h3>
                <p>Reading marketplace events from Shelbynet.</p>
              </div>
            ) : visibleListings.length > 0 ? (
              visibleListings.map((listing) => {
                const isOwner = listing.owner === walletAddress;

                return (
                  <article key={listing.id} className="market-card glass-card">
                    <div className="market-img-wrapper">
                      <MarketPreview
                        accountAddress={listing.owner}
                        blobName={listing.blobName}
                        client={shelbyClient}
                      />
                      <span className="market-price-pill">{listing.price} APT</span>
                      {listing.listingObjectAddress && <span className="market-chain-pill">On-Chain</span>}
                    </div>
                    <div className="market-card-body">
                      <div>
                        <h3>{formatBlobLabel(listing.blobName)}</h3>
                        <div className="market-meta-row">
                          <span>{shortAddress(listing.owner)}</span>
                          {listing.txHash && <span>{listing.txHash.slice(0, 8)}...</span>}
                        </div>
                      </div>
                    </div>
                    <div className="market-actions">
                      <a
                        href={getShelbyExplorerUrl(listing.blobName, listing.owner)}
                        target="_blank"
                        rel="noreferrer"
                        className="explorer-link"
                      >
                        View on Shelby
                      </a>
                      {isOwner ? (
                        <button
                          type="button"
                          className="market-secondary-action"
                          onClick={() => void handleDelist(listing)}
                          disabled={isSubmittingMarketTx}
                        >
                          {listing.listingObjectAddress ? 'Delist On-Chain' : 'Remove Draft'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="market-secondary-action"
                          onClick={() => void handleBuy(listing)}
                          disabled={isSubmittingMarketTx}
                        >
                          Buy
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="market-empty glass-card">
                <h3>{marketView === 'explore' ? 'No public listings yet' : 'No active listings'}</h3>
                <p>
                  {marketView === 'explore'
                    ? 'Listings from other wallets will show here with a buy action.'
                    : 'Save a refraction to Shelby, mint it, then list it from this panel.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .market-section {
          padding: 48px 20px 88px;
          border-top: 1px solid var(--border);
        }
        .market-container {
          max-width: 1040px;
          margin: 0 auto;
        }
        .market-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
          padding: 18px 0 8px;
        }
        .market-heading p {
          max-width: 390px;
          color: var(--text-muted);
          line-height: 1.55;
          font-weight: 700;
          font-size: 14px;
        }
        .market-tabs {
          display: inline-flex;
          gap: 4px;
          padding: 5px;
          margin-bottom: 18px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.045);
        }
        .market-tabs button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 34px;
          padding: 8px 12px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--text-muted);
          font: inherit;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }
        .market-tabs button.active {
          color: #170710;
          background: linear-gradient(135deg, var(--pink-soft), var(--cyan));
        }
        .market-tabs span {
          min-width: 22px;
          padding: 2px 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.12);
          font-size: 11px;
          text-align: center;
        }
        .market-tabs button.active span {
          background: rgba(7, 9, 15, 0.18);
        }
        .market-title {
          max-width: 560px;
          font-size: 40px;
          line-height: 1.05;
        }
        .market-layout {
          display: grid;
          grid-template-columns: 318px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }
        .market-layout-explore {
          grid-template-columns: 1fr;
        }
        .market-layout-explore .market-items {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }
        .market-listing-panel {
          padding: 18px;
          display: grid;
          gap: 14px;
          position: sticky;
          top: 98px;
          background:
            linear-gradient(145deg, rgba(255, 47, 146, 0.09), rgba(83, 240, 255, 0.045)),
            rgba(18, 15, 26, 0.92);
          box-shadow: 0 22px 80px rgba(0, 0, 0, 0.34);
        }
        .market-panel-head {
          display: flex;
          justify-content: space-between;
          gap: 14px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(255, 137, 202, 0.16);
        }
        .market-listing-panel h3 {
          font-size: 20px;
        }
        .market-panel-head p {
          margin-top: 4px;
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.45;
          font-weight: 700;
        }
        .market-panel-head span {
          height: 24px;
          padding: 5px 8px;
          border: 1px solid rgba(83, 240, 255, 0.22);
          border-radius: var(--radius-sm);
          color: var(--cyan);
          background: rgba(83, 240, 255, 0.07);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
        }
        .market-listing-panel label {
          display: grid;
          gap: 8px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .market-listing-panel select,
        .market-listing-panel input {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          padding: 11px 12px;
          font: inherit;
          font-weight: 700;
          outline: none;
        }
        .market-listing-panel select {
          color-scheme: dark;
        }
        .market-listing-panel option {
          background: #120a14;
          color: var(--text);
          font-weight: 700;
        }
        .market-listing-panel select:focus,
        .market-listing-panel input:focus {
          border-color: var(--border-strong);
        }
        .price-field {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.055);
          overflow: hidden;
        }
        .price-field input {
          border: 0;
          background: transparent;
        }
        .price-field span {
          padding-right: 12px;
          color: var(--cyan);
          font-weight: 900;
        }
        .market-note,
        .market-status,
        .market-warning {
          color: var(--text-muted);
          font-size: 12px;
          line-height: 1.55;
        }
        .market-status {
          color: var(--pink-soft);
          font-weight: 800;
        }
        .market-warning {
          color: var(--yellow);
          font-weight: 800;
        }
        .market-items {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(238px, 1fr));
          gap: 18px;
        }
        .market-card {
          padding: 12px;
          min-width: 0;
          background:
            linear-gradient(160deg, rgba(255, 47, 146, 0.07), rgba(83, 240, 255, 0.035)),
            rgba(17, 19, 29, 0.86);
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .market-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255, 137, 202, 0.34);
          box-shadow: 0 24px 70px rgba(255, 47, 146, 0.12), 0 18px 70px rgba(0, 0, 0, 0.36);
        }
        .market-img-wrapper {
          position: relative;
          aspect-ratio: 1;
          border-radius: var(--radius-sm);
          background:
            radial-gradient(circle at 50% 38%, rgba(83, 240, 255, 0.11), transparent 38%),
            linear-gradient(180deg, rgba(23, 30, 43, 0.96), rgba(17, 19, 29, 0.96));
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .market-img-wrapper img {
          width: 88%;
          height: 88%;
          object-fit: contain;
          filter: drop-shadow(0 18px 18px rgba(0, 0, 0, 0.28));
        }
        .market-price-pill,
        .market-chain-pill {
          position: absolute;
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 5px 8px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 900;
          backdrop-filter: blur(14px);
        }
        .market-price-pill {
          right: 9px;
          top: 9px;
          color: #071018;
          background: linear-gradient(135deg, var(--green), var(--cyan));
        }
        .market-chain-pill {
          left: 9px;
          bottom: 9px;
          color: var(--green);
          background: rgba(32, 242, 196, 0.12);
          border: 1px solid rgba(32, 242, 196, 0.22);
        }
        .market-preview-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .market-card-body {
          margin-bottom: 12px;
        }
        .market-card-body h3 {
          font-size: 15px;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .market-meta-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--text-muted);
          font-size: 11px;
          margin-top: 6px;
          font-weight: 700;
        }
        .market-meta-row span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .market-actions {
          border-top: 1px solid var(--border);
          padding-top: 10px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
        }
        .market-actions .explorer-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 32px;
          border-radius: var(--radius-sm);
          color: var(--cyan);
          background: rgba(83, 240, 255, 0.06);
          border: 1px solid rgba(83, 240, 255, 0.14);
          font-size: 12px;
          font-weight: 900;
          text-decoration: none;
        }
        .market-secondary-action {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          min-height: 34px;
          padding: 9px 10px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }
        .market-secondary-action:hover {
          border-color: var(--border-strong);
          color: var(--pink-soft);
          background: rgba(255, 47, 146, 0.08);
        }
        .market-empty {
          padding: 32px;
          min-height: 220px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          color: var(--text-muted);
        }
        .market-empty h3 {
          color: var(--text);
          margin-bottom: 8px;
        }

        @media (max-width: 860px) {
          .market-heading {
            display: grid;
            padding-top: 0;
          }
          .market-layout {
            grid-template-columns: 1fr;
          }
          .market-listing-panel {
            position: static;
          }
          .market-title {
            font-size: 34px;
          }
        }
      `}</style>
    </section>
  );
};

export default MarketplaceSection;
