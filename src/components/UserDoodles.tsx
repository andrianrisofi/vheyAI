import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignAndSubmitTransaction } from '@aptos-labs/react';
import { useAccountBlobs, useDeleteBlobs, useShelbyClient } from '@shelby-protocol/react';
import type { BlobMetadata, ShelbyClient } from '@shelby-protocol/sdk/browser';
import { SHELBY_EXPLORER_NETWORK } from '../config/network';
import { devLogger } from '../utils/logger';

const SHELBY_DEPLOYER = '0x85fdb9a176ab8ef1d9d9c1b60d60b3924f0800ac1de1cc2085fb0b8bb4988e6a';
const EXPIRES_SOON_MS = 12 * 60 * 60 * 1000;
const RENEWAL_OPTIONS = [
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '48h', hours: 48 },
];
const KEEPER_PLAN_OPTIONS = [
  { label: '7d', days: 7 },
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
];
const KEEPER_PLAN_PREFIX = 'vhey-keeper-plans-';

type KeeperPlan = {
  blobName: string;
  targetUntilMs: number;
  nextRenewalMs: number;
  createdAtMs: number;
};

const getShelbyExplorerUrl = (blobName: string, accountAddress: string) => {
  return `https://explorer.shelby.xyz/${SHELBY_EXPLORER_NETWORK}/blob/${encodeURI(blobName)}?account=${accountAddress}`;
};

const formatDate = (micros: number) => {
  return new Date(micros / 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const getBlobFileName = (blobName: string) => blobName.split('/').pop() ?? blobName;

const getExpirationState = (expirationMicros: number) => {
  const expiresAtMs = expirationMicros / 1000;
  const remainingMs = expiresAtMs - Date.now();

  if (remainingMs <= 0) {
    return {
      label: 'Expired',
      tone: 'expired',
      canRenew: false,
    };
  }

  const totalHours = Math.ceil(remainingMs / (60 * 60 * 1000));
  const label = totalHours >= 24
    ? `Expires in ${Math.floor(totalHours / 24)}d ${totalHours % 24}h`
    : `Expires in ${totalHours}h`;

  return {
    label,
    tone: remainingMs <= EXPIRES_SOON_MS ? 'soon' : 'active',
    canRenew: true,
  };
};

const getRenewalExpirationMicros = (currentExpirationMicros: number, renewalHours: number) => {
  const currentExpirationMs = Math.floor(currentExpirationMicros / 1000);
  const baseExpirationMs = Math.max(Date.now(), currentExpirationMs);
  const renewalWindowMs = renewalHours * 60 * 60 * 1000;
  return (BigInt(baseExpirationMs + renewalWindowMs) * 1000n).toString();
};

const getKeeperPlanStorageKey = (walletAddress: string) => `${KEEPER_PLAN_PREFIX}${walletAddress}`;

const readKeeperPlans = (walletAddress: string): KeeperPlan[] => {
  if (!walletAddress) return [];

  try {
    const storedPlans = localStorage.getItem(getKeeperPlanStorageKey(walletAddress));
    if (!storedPlans) return [];
    const parsedPlans = JSON.parse(storedPlans);
    return Array.isArray(parsedPlans) ? parsedPlans : [];
  } catch {
    return [];
  }
};

const saveKeeperPlans = (walletAddress: string, plans: KeeperPlan[]) => {
  if (!walletAddress) return;
  localStorage.setItem(getKeeperPlanStorageKey(walletAddress), JSON.stringify(plans));
};

const getNextRenewalMs = (expirationMicros: number) => {
  const expiresAtMs = Math.floor(expirationMicros / 1000);
  return Math.max(Date.now(), expiresAtMs - EXPIRES_SOON_MS);
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
  const { mutateAsync: signAndSubmitTransactionAsync, isPending: isRenewingBlob } = useSignAndSubmitTransaction();
  const [pendingDeleteBlob, setPendingDeleteBlob] = useState<string | null>(null);
  const [renewingBlobName, setRenewingBlobName] = useState<string | null>(null);
  const [renewalHours, setRenewalHours] = useState(24);
  const [keeperPlanDays, setKeeperPlanDays] = useState(7);
  const [keeperPlans, setKeeperPlans] = useState<KeeperPlan[]>([]);
  const [selectedBlobNames, setSelectedBlobNames] = useState<Set<string>>(() => new Set());
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

  const visibleBlobs = blobs?.filter((blob) => (
    !blob.isDeleted
    && !deletedBlobNames.has(blob.blobNameSuffix)
    && isImageBlob(blob.blobNameSuffix)
  )) ?? [];
  const renewableBlobs = useMemo(() => (
    visibleBlobs.filter((blob) => getExpirationState(blob.expirationMicros).canRenew)
  ), [visibleBlobs]);
  const expiringSoonBlobs = useMemo(() => (
    renewableBlobs.filter((blob) => getExpirationState(blob.expirationMicros).tone === 'soon')
  ), [renewableBlobs]);
  const selectedRenewableBlobs = renewableBlobs.filter((blob) => selectedBlobNames.has(blob.blobNameSuffix));
  const totalStorageBytes = visibleBlobs.reduce((total, blob) => total + blob.size, 0);
  const visibleBlobNames = useMemo(() => new Set(visibleBlobs.map((blob) => blob.blobNameSuffix)), [visibleBlobs]);
  const activeKeeperPlans = keeperPlans.filter((plan) => (
    visibleBlobNames.has(plan.blobName) && plan.targetUntilMs > Date.now()
  ));
  const dueKeeperPlans = activeKeeperPlans.filter((plan) => plan.nextRenewalMs <= Date.now());
  useEffect(() => {
    setKeeperPlans(readKeeperPlans(walletAddress));
  }, [walletAddress]);

  useEffect(() => {
    setSelectedBlobNames((current) => {
      const nextSelected = new Set([...current].filter((blobName) => visibleBlobNames.has(blobName)));
      return nextSelected.size === current.size ? current : nextSelected;
    });
  }, [visibleBlobNames]);

  useEffect(() => {
    if (!walletAddress || keeperPlans.length === 0) return;
    const nextPlans = keeperPlans.filter((plan) => (
      visibleBlobNames.has(plan.blobName) && plan.targetUntilMs > Date.now()
    ));
    if (nextPlans.length !== keeperPlans.length) {
      setKeeperPlans(nextPlans);
      saveKeeperPlans(walletAddress, nextPlans);
    }
  }, [keeperPlans, visibleBlobNames, walletAddress]);

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

  const handleRenewBlobs = async (targetBlobs: BlobMetadata[]) => {
    if (!connected || !account?.address) {
      setStatusMessage('Connect your Aptos wallet before renewing Shelby storage.');
      return;
    }

    const blobsToRenew = targetBlobs.filter((blob) => getExpirationState(blob.expirationMicros).canRenew);
    if (blobsToRenew.length === 0) {
      setStatusMessage('Select at least one active refraction to renew.');
      return;
    }

    let completedCount = 0;

    try {
      for (const blob of blobsToRenew) {
        const blobName = blob.blobNameSuffix;
        const newExpirationMicros = getRenewalExpirationMicros(blob.expirationMicros, renewalHours);
        setRenewingBlobName(blobName);
        setStatusMessage(`Renewing ${completedCount + 1}/${blobsToRenew.length}: ${getBlobFileName(blobName)} for ${renewalHours}h...`);

        const transaction = await signAndSubmitTransactionAsync({
          data: {
            function: `${SHELBY_DEPLOYER}::blob_metadata::increase_expiration_time`,
            functionArguments: [
              blobName,
              newExpirationMicros,
            ],
          },
        });

        completedCount += 1;
        setStatusMessage(`Renewed ${completedCount}/${blobsToRenew.length}. Last tx: ${transaction.hash.slice(0, 10)}...`);
      }

      setSelectedBlobNames(new Set());
      await refetch();
    } catch (error) {
      devLogger.error('Renew blob error:', error);
      const message = error instanceof Error ? error.message : 'Failed to renew Shelby storage.';
      setStatusMessage(completedCount > 0
        ? `Renewed ${completedCount}/${blobsToRenew.length}, then stopped: ${message}`
        : message);
    } finally {
      setRenewingBlobName(null);
    }
  };

  const handleRenewBlob = async (blob: BlobMetadata) => {
    await handleRenewBlobs([blob]);
  };

  const handleCreateKeeperPlans = () => {
    if (selectedRenewableBlobs.length === 0) {
      setStatusMessage('Select at least one refraction before creating a keeper plan.');
      return;
    }

    const nowMs = Date.now();
    const targetUntilMs = nowMs + keeperPlanDays * 24 * 60 * 60 * 1000;
    const nextPlanByBlob = new Map(keeperPlans.map((plan) => [plan.blobName, plan]));

    selectedRenewableBlobs.forEach((blob) => {
      nextPlanByBlob.set(blob.blobNameSuffix, {
        blobName: blob.blobNameSuffix,
        targetUntilMs,
        nextRenewalMs: getNextRenewalMs(blob.expirationMicros),
        createdAtMs: nowMs,
      });
    });

    const nextPlans = Array.from(nextPlanByBlob.values());
    setKeeperPlans(nextPlans);
    saveKeeperPlans(walletAddress, nextPlans);
    setStatusMessage(`Keeper plan created for ${selectedRenewableBlobs.length} refraction${selectedRenewableBlobs.length > 1 ? 's' : ''}.`);
  };

  const handleRunDueKeeperPlans = async () => {
    const dueBlobs = visibleBlobs.filter((blob) => (
      dueKeeperPlans.some((plan) => plan.blobName === blob.blobNameSuffix)
    ));

    if (dueBlobs.length === 0) {
      setStatusMessage('No keeper renewals are due yet.');
      return;
    }

    await handleRenewBlobs(dueBlobs);

    const renewedBlobNames = new Set(dueBlobs.map((blob) => blob.blobNameSuffix));
    const nextPlans = keeperPlans.map((plan) => {
      const renewedBlob = dueBlobs.find((blob) => blob.blobNameSuffix === plan.blobName);
      if (!renewedBlobNames.has(plan.blobName) || !renewedBlob) return plan;

      const newExpirationMicros = Number(getRenewalExpirationMicros(renewedBlob.expirationMicros, renewalHours));
      return {
        ...plan,
        nextRenewalMs: getNextRenewalMs(newExpirationMicros),
      };
    });

    setKeeperPlans(nextPlans);
    saveKeeperPlans(walletAddress, nextPlans);
  };

  const handleStopKeeperPlan = (blobName: string) => {
    const nextPlans = keeperPlans.filter((plan) => plan.blobName !== blobName);
    setKeeperPlans(nextPlans);
    saveKeeperPlans(walletAddress, nextPlans);
    setStatusMessage(`Keeper plan stopped for ${getBlobFileName(blobName)}.`);
  };

  const toggleSelectedBlob = (blobName: string) => {
    setSelectedBlobNames((current) => {
      const nextSelected = new Set(current);
      if (nextSelected.has(blobName)) {
        nextSelected.delete(blobName);
      } else {
        nextSelected.add(blobName);
      }
      return nextSelected;
    });
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
          <>
          <div className="blob-keeper glass-card">
            <div className="keeper-copy">
              <span className="keeper-kicker">Blob Keeper</span>
              <h3>Renew selected refractions before they expire.</h3>
              <p>
                Shelby testnet allows up to 48 hours per renewal call. Selected blobs are renewed one transaction at a time.
              </p>
            </div>
            <div className="keeper-stats">
              <div>
                <span>{visibleBlobs.length}</span>
                <p>Stored</p>
              </div>
              <div>
                <span>{expiringSoonBlobs.length}</span>
                <p>Expiring soon</p>
              </div>
              <div>
                <span>{selectedRenewableBlobs.length}</span>
                <p>Selected</p>
              </div>
              <div>
                <span>{activeKeeperPlans.length}</span>
                <p>Scheduled</p>
              </div>
              <div>
                <span>{dueKeeperPlans.length}</span>
                <p>Due now</p>
              </div>
              <div>
                <span>{(totalStorageBytes / 1024).toFixed(1)} KB</span>
                <p>Storage</p>
              </div>
            </div>
            <div className="keeper-actions">
              <div className="renewal-options" role="group" aria-label="Renewal duration">
                {RENEWAL_OPTIONS.map((option) => (
                  <button
                    key={option.hours}
                    type="button"
                    className={renewalHours === option.hours ? 'active' : ''}
                    onClick={() => setRenewalHours(option.hours)}
                    disabled={isRenewingBlob}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="plan-options" role="group" aria-label="Keeper plan length">
                {KEEPER_PLAN_OPTIONS.map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    className={keeperPlanDays === option.days ? 'active' : ''}
                    onClick={() => setKeeperPlanDays(option.days)}
                    disabled={isRenewingBlob}
                  >
                    Plan {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="keeper-action"
                onClick={() => setSelectedBlobNames(new Set(renewableBlobs.map((blob) => blob.blobNameSuffix)))}
                disabled={renewableBlobs.length === 0 || isRenewingBlob}
              >
                Select All
              </button>
              <button
                type="button"
                className="keeper-action"
                onClick={() => setSelectedBlobNames(new Set(expiringSoonBlobs.map((blob) => blob.blobNameSuffix)))}
                disabled={expiringSoonBlobs.length === 0 || isRenewingBlob}
              >
                Select Expiring
              </button>
              <button
                type="button"
                className="keeper-action"
                onClick={() => setSelectedBlobNames(new Set())}
                disabled={selectedBlobNames.size === 0 || isRenewingBlob}
              >
                Clear
              </button>
              <button
                type="button"
                className="keeper-action"
                onClick={handleCreateKeeperPlans}
                disabled={selectedRenewableBlobs.length === 0 || isRenewingBlob}
              >
                Schedule Selected
              </button>
              <button
                type="button"
                className="keeper-action"
                onClick={() => void handleRunDueKeeperPlans()}
                disabled={dueKeeperPlans.length === 0 || isRenewingBlob || deleteBlobs.isPending}
              >
                Run Due ({dueKeeperPlans.length})
              </button>
              <button
                type="button"
                className="keeper-renew"
                onClick={() => void handleRenewBlobs(selectedRenewableBlobs)}
                disabled={selectedRenewableBlobs.length === 0 || isRenewingBlob || deleteBlobs.isPending}
              >
                {isRenewingBlob ? 'Renewing...' : `Renew Selected +${renewalHours}h (${selectedRenewableBlobs.length})`}
              </button>
            </div>
          </div>

          <div className="doodles-grid">
            {visibleBlobs.map((blob: BlobMetadata) => {
              const blobName = blob.blobNameSuffix;
              const isConfirmingDelete = pendingDeleteBlob === blobName;
              const isDeleting = deleteBlobs.isPending && isConfirmingDelete;
              const expirationState = getExpirationState(blob.expirationMicros);
              const isRenewingThisBlob = isRenewingBlob && renewingBlobName === blobName;
              const isSelected = selectedBlobNames.has(blobName);
              const keeperPlan = activeKeeperPlans.find((plan) => plan.blobName === blobName);

              return (
                <div key={`${blob.owner.toString()}-${blobName}`} className={`doodle-card glass-card ${isSelected ? 'selected' : ''}`}>
                  <label className="keeper-select">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelectedBlob(blobName)}
                      disabled={!expirationState.canRenew || isRenewingBlob || deleteBlobs.isPending}
                    />
                    <span>{isSelected ? 'Selected' : 'Keep'}</span>
                  </label>
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
                  <div className={`expiry-pill ${expirationState.tone}`}>
                    {expirationState.label}
                  </div>
                  {keeperPlan && (
                    <div className={`keeper-plan-pill ${keeperPlan.nextRenewalMs <= Date.now() ? 'due' : ''}`}>
                      <span>
                        {keeperPlan.nextRenewalMs <= Date.now()
                          ? 'Keeper due now'
                          : `Keeper until ${formatDate(keeperPlan.targetUntilMs * 1000)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStopKeeperPlan(blobName)}
                        disabled={isRenewingBlob}
                      >
                        Stop
                      </button>
                    </div>
                  )}
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
                      className="renew-blob-button"
                      onClick={() => void handleRenewBlob(blob)}
                      disabled={!expirationState.canRenew || isRenewingBlob || deleteBlobs.isPending}
                    >
                      {isRenewingThisBlob ? 'Renewing...' : `Renew +${renewalHours}h`}
                    </button>
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
          </>
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
        .blob-keeper {
          margin: 0 auto 28px;
          padding: 18px;
          display: grid;
          grid-template-columns: minmax(260px, 1fr) auto;
          gap: 18px 24px;
          align-items: center;
          text-align: left;
          background:
            linear-gradient(135deg, rgba(83, 240, 255, 0.06), rgba(255, 47, 146, 0.08)),
            rgba(17, 19, 29, 0.84);
        }
        .keeper-kicker {
          display: inline-flex;
          margin-bottom: 8px;
          color: var(--cyan);
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .keeper-copy h3 {
          font-size: 22px;
          margin-bottom: 6px;
        }
        .keeper-copy p {
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.55;
          max-width: 560px;
        }
        .keeper-stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(86px, 1fr));
          gap: 8px;
          grid-column: 1 / -1;
        }
        .keeper-stats div {
          padding: 12px;
          border: 1px solid rgba(255, 137, 202, 0.14);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.035);
        }
        .keeper-stats span {
          display: block;
          color: var(--text);
          font-weight: 900;
          font-size: 17px;
          margin-bottom: 3px;
        }
        .keeper-stats p {
          color: var(--text-muted);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .keeper-actions {
          grid-column: 1 / -1;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .renewal-options,
        .plan-options {
          display: inline-flex;
          gap: 4px;
          padding: 4px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.045);
        }
        .plan-options {
          border-color: rgba(255, 209, 102, 0.16);
        }
        .renewal-options button,
        .plan-options button {
          min-width: 48px;
          min-height: 28px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--text-muted);
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }
        .plan-options button {
          min-width: 72px;
        }
        .renewal-options button.active,
        .plan-options button.active {
          color: #071018;
          background: linear-gradient(135deg, var(--pink-soft), var(--cyan));
        }
        .plan-options button.active {
          background: linear-gradient(135deg, var(--yellow), var(--pink-soft));
        }
        .renewal-options button:disabled,
        .plan-options button:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }
        .keeper-action,
        .keeper-renew {
          min-height: 36px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 9px 12px;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s, color 0.2s;
        }
        .keeper-action {
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.045);
        }
        .keeper-action:hover:not(:disabled) {
          color: var(--text);
          border-color: var(--border-strong);
        }
        .keeper-renew {
          margin-left: auto;
          color: #071018;
          border-color: transparent;
          background: linear-gradient(135deg, var(--pink-soft), var(--cyan));
        }
        .keeper-action:disabled,
        .keeper-renew:disabled {
          cursor: not-allowed;
          opacity: 0.58;
        }
        .doodles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 25px;
        }
        .doodle-card {
          position: relative;
          padding: 15px;
          transition: transform 0.3s ease;
        }
        .doodle-card.selected {
          border-color: rgba(83, 240, 255, 0.48);
          box-shadow: 0 18px 70px rgba(83, 240, 255, 0.1), 0 18px 70px rgba(0, 0, 0, 0.28);
        }
        .doodle-card:hover {
          transform: translateY(-5px);
        }
        .keeper-select {
          position: absolute;
          top: 24px;
          left: 24px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 30px;
          padding: 6px 9px;
          border: 1px solid rgba(83, 240, 255, 0.2);
          border-radius: var(--radius-sm);
          background: rgba(7, 9, 15, 0.72);
          color: var(--text);
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
          backdrop-filter: blur(12px);
        }
        .keeper-select input {
          accent-color: var(--cyan);
        }
        .keeper-select input:disabled {
          cursor: not-allowed;
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
        .expiry-pill {
          margin-top: 12px;
          display: inline-flex;
          width: 100%;
          min-height: 30px;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(32, 242, 196, 0.2);
          background: rgba(32, 242, 196, 0.08);
          color: var(--green);
          font-size: 12px;
          font-weight: 900;
        }
        .expiry-pill.soon {
          border-color: rgba(255, 209, 102, 0.32);
          background: rgba(255, 209, 102, 0.08);
          color: var(--yellow);
        }
        .expiry-pill.expired {
          border-color: rgba(255, 91, 119, 0.36);
          background: rgba(255, 91, 119, 0.1);
          color: #ffd2dc;
        }
        .keeper-plan-pill {
          margin-top: 8px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          min-height: 32px;
          padding: 6px 7px 6px 10px;
          border-radius: var(--radius-sm);
          border: 1px solid rgba(255, 209, 102, 0.24);
          background: rgba(255, 209, 102, 0.08);
          color: var(--yellow);
          font-size: 11px;
          font-weight: 900;
        }
        .keeper-plan-pill.due {
          border-color: rgba(83, 240, 255, 0.34);
          background: rgba(83, 240, 255, 0.09);
          color: var(--cyan);
        }
        .keeper-plan-pill span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .keeper-plan-pill button {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 6px;
          padding: 4px 7px;
          background: rgba(255, 255, 255, 0.06);
          color: var(--text);
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
        }
        .keeper-plan-pill button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
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
          color: var(--cyan);
          text-decoration: none;
          font-weight: 700;
          transition: opacity 0.2s;
        }
        .explorer-link:hover {
          opacity: 0.7;
        }
        .renew-blob-button,
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
        .renew-blob-button {
          color: var(--cyan);
          background: rgba(83, 240, 255, 0.06);
          border-color: rgba(83, 240, 255, 0.18);
        }
        .renew-blob-button:hover:not(:disabled) {
          border-color: rgba(83, 240, 255, 0.48);
          color: var(--text);
          background: rgba(83, 240, 255, 0.1);
        }
        .delete-blob-button:hover:not(:disabled) {
          border-color: rgba(255, 91, 119, 0.65);
          color: #ffd2dc;
          background: rgba(255, 91, 119, 0.1);
        }
        .delete-blob-button.confirming {
          border-color: rgba(255, 91, 119, 0.75);
          color: #ffd2dc;
          background: rgba(255, 91, 119, 0.14);
        }
        .renew-blob-button:disabled,
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
          border: 4px solid rgba(255, 47, 146, 0.12);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin-slow 1s linear infinite;
          margin-bottom: 20px;
        }
        @media (max-width: 760px) {
          .blob-keeper {
            grid-template-columns: 1fr;
          }
          .keeper-stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .keeper-renew {
            margin-left: 0;
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
};

export default UserDoodles;
