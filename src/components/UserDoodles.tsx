import { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAccountBlobs, useDeleteBlobs, useShelbyClient } from '@shelby-protocol/react';
import type { BlobMetadata, ShelbyClient } from '@shelby-protocol/sdk/browser';
import { devLogger } from '../utils/logger';

const getShelbyExplorerUrl = (blobName: string, accountAddress: string) => {
  return `https://shelby.xyz/explorer/blob/${encodeURI(blobName)}?account=${accountAddress}`;
};

const formatDate = (micros: number) => {
  return new Date(micros / 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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

type BlobPreviewProps = {
  accountAddress: string;
  blobName: string;
  client: ShelbyClient;
};

const BlobPreview = ({ accountAddress, blobName, client }: BlobPreviewProps) => {
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
        devLogger.error('Blob preview error:', error);
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
    return (
      <div className="doodle-fallback">
        <span>Stored</span>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="doodle-fallback">
        <span>Loading</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={blobName}
      onError={() => setHasError(true)}
    />
  );
};

const UserDoodles = () => {
  const walletAdapter = useWallet();
  const { connected, account } = walletAdapter;
  const shelbyClient = useShelbyClient();
  const [pendingDeleteBlob, setPendingDeleteBlob] = useState<string | null>(null);
  const [deletedBlobNames, setDeletedBlobNames] = useState<Set<string>>(() => new Set());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const walletAddress = account?.address?.toString() ?? '';

  const { data: blobs, isLoading, refetch } = useAccountBlobs({
    client: shelbyClient,
    account: walletAddress,
    enabled: connected && !!walletAddress,
  });
  const deleteBlobs = useDeleteBlobs({
    client: shelbyClient,
    onError: (error) => {
      devLogger.error('Delete blob error:', error);
      setStatusMessage(error.message);
      setPendingDeleteBlob(null);
    },
    onSuccess: ({ hash }) => {
      if (pendingDeleteBlob) {
        setDeletedBlobNames((current) => new Set(current).add(pendingDeleteBlob));
        localStorage.removeItem(`vhey-blob-mime-${pendingDeleteBlob}`);
      }

      setStatusMessage(`Deleted from Shelby. Tx: ${hash.slice(0, 10)}...`);
      setPendingDeleteBlob(null);
      void refetch();
    },
  });

  const visibleBlobs = blobs?.filter((blob) => !blob.isDeleted && !deletedBlobNames.has(blob.blobNameSuffix)) ?? [];

  const handleDeleteBlob = (blobName: string) => {
    if (!connected || !account?.address) {
      setStatusMessage('Connect your Aptos wallet before deleting from Shelby.');
      return;
    }

    if (pendingDeleteBlob === blobName) {
      setStatusMessage(null);
      deleteBlobs.mutate({
        signer: {
          account: account.address.toString(),
          signAndSubmitTransaction: walletAdapter.signAndSubmitTransaction,
        },
        blobNames: [blobName],
      });
      return;
    }

    setPendingDeleteBlob(blobName);
    setStatusMessage('Confirm delete on the selected card. Shelby deletes are permanent.');
  };

  if (!connected) return null;

  return (
    <section id="my-doodles" className="user-doodles-section">
      <div className="section-container">
        <h2 className="font-display section-title">My <span className="gradient-text">Refractions</span></h2>
        {statusMessage && <p className="delete-status">{statusMessage}</p>}

        {isLoading ? (
          <div className="loading-state">
            <span className="spinner"></span>
            <p>Scanning the blockchain for your art...</p>
          </div>
        ) : visibleBlobs.length > 0 ? (
          <div className="doodles-grid">
            {visibleBlobs.map((blob: BlobMetadata) => {
              const blobName = blob.blobNameSuffix;
              const isConfirmingDelete = pendingDeleteBlob === blobName;
              const isDeleting = deleteBlobs.isPending && isConfirmingDelete;

              return (
                <div key={`${blob.owner.toString()}-${blobName}`} className="doodle-card glass-card">
                  <div className="doodle-img-wrapper">
                    <BlobPreview
                      accountAddress={walletAddress}
                      blobName={blobName}
                      client={shelbyClient}
                    />
                  </div>
                  <div className="doodle-meta">
                    <span className="doodle-name">{blobName.split('/').pop() ?? blobName}</span>
                    <span className="doodle-date">{formatDate(blob.creationMicros)}</span>
                  </div>
                  <div className="doodle-actions">
                    <a
                      href={getShelbyExplorerUrl(blobName, walletAddress)}
                      target="_blank"
                      rel="noreferrer"
                      className="explorer-link"
                    >
                      View on Shelby Explorer
                    </a>
                    <button
                      type="button"
                      className={`delete-blob-button ${isConfirmingDelete ? 'confirming' : ''}`}
                      onClick={() => handleDeleteBlob(blobName)}
                      disabled={deleteBlobs.isPending}
                    >
                      {isDeleting ? 'Deleting...' : isConfirmingDelete ? 'Confirm Delete' : 'Delete'}
                    </button>
                    {isConfirmingDelete && !deleteBlobs.isPending && (
                      <button
                        type="button"
                        className="cancel-delete-button"
                        onClick={() => {
                          setPendingDeleteBlob(null);
                          setStatusMessage(null);
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't generated any doodles yet. Go to the Studio to start.</p>
            <a href="#generator" className="btn btn-outline">Go to Studio</a>
          </div>
        )}
      </div>

      <style>{`
        .user-doodles-section {
          padding: 80px 20px;
          border-top: 1px solid var(--border);
        }
        .section-container {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .section-title {
          font-size: 42px;
          margin-bottom: 14px;
        }
        .delete-status {
          color: var(--text-muted);
          font-weight: 700;
          margin: 0 auto 28px;
          max-width: 560px;
        }
        .loading-state, .empty-state {
          padding: 60px;
          color: var(--text-muted);
        }
        .doodles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 25px;
        }
        .doodle-card {
          padding: 15px;
          transition: transform 0.3s ease;
        }
        .doodle-card:hover {
          transform: translateY(-5px);
        }
        .doodle-img-wrapper {
          background: rgba(255, 255, 255, 0.05);
          border-radius: var(--radius-sm);
          aspect-ratio: 1;
          margin-bottom: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .doodle-img-wrapper img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .doodle-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .doodle-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 14px;
        }
        .doodle-actions {
          margin-top: 15px;
          border-top: 1px solid var(--border);
          padding-top: 12px;
          display: grid;
          gap: 8px;
        }
        .explorer-link {
          font-size: 12px;
          color: var(--blue);
          text-decoration: none;
          font-weight: 700;
          transition: opacity 0.2s;
        }
        .explorer-link:hover {
          opacity: 0.7;
        }
        .delete-blob-button,
        .cancel-delete-button {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 9px 10px;
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .delete-blob-button:hover:not(:disabled) {
          border-color: rgba(248, 113, 113, 0.65);
          color: #fecaca;
          background: rgba(248, 113, 113, 0.1);
        }
        .delete-blob-button.confirming {
          border-color: rgba(248, 113, 113, 0.75);
          color: #fecaca;
          background: rgba(248, 113, 113, 0.14);
        }
        .delete-blob-button:disabled,
        .cancel-delete-button:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }
        .cancel-delete-button:hover {
          border-color: var(--border-strong);
          color: var(--text);
        }
        .doodle-name {
          font-weight: 800;
          color: var(--text);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .doodle-date {
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(168, 85, 247, 0.1);
          border-top-color: var(--blue);
          border-radius: 50%;
          animation: spin-slow 1s linear infinite;
          margin-bottom: 20px;
        }
      `}</style>
    </section>
  );
};

export default UserDoodles;
