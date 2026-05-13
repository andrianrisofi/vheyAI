import { useRef, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useSignAndSubmitTransaction } from '@aptos-labs/react';
import type { Signer } from '@shelby-protocol/react';
import { useUploadBlobs, useShelbyClient } from '@shelby-protocol/react';
import { generateDoodle } from '../utils/aiService';
import { devLogger } from '../utils/logger';
import { SparkIcon, UploadIcon } from './Icons';

type Notice = {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : 'Unknown error';
};

const getShelbyExplorerUrl = (blobName: string, accountAddress: string) => {
  return `https://shelby.xyz/explorer/blob/${encodeURI(blobName)}?account=${accountAddress}`;
};

const getImageExtension = (contentType: string) => {
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('jpeg')) return 'jpg';
  if (contentType.includes('jpg')) return 'jpg';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('svg')) return 'svg';
  return 'jpg';
};

const getImageMimeType = (contentType: string, extension: string) => {
  if (contentType.startsWith('image/')) return contentType.split(';')[0];
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'svg') return 'image/svg+xml';
  return 'image/jpeg';
};

const NFT_COLLECTION_NAME = 'Vhey AI Refractions';
const NFT_COLLECTION_DESCRIPTION = 'AI doodle refractions stored with Shelby Protocol.';
const NFT_COLLECTION_URI = 'https://vhey.ai/refractions';
const MAX_U64 = '18446744073709551615';

const GeneratorSection = () => {
  const walletAdapter = useWallet();
  const { connected, account } = walletAdapter;
  const shelbyClient = useShelbyClient();
  const {
    signAndSubmitTransactionAsync,
    isPending: isSubmittingMint,
  } = useSignAndSubmitTransaction();

  const uploadBlobsMutation = useUploadBlobs({
    client: shelbyClient,
    onError: (err) => {
      devLogger.error('Upload error:', err);
      showNotice({
        tone: 'error',
        title: 'Save failed',
        message: err.message,
      });
    },
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [savedBlobName, setSavedBlobName] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isMinted, setIsMinted] = useState(false);
  const [createdCollectionKey, setCreatedCollectionKey] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [notice, setNotice] = useState<Notice | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const walletAddress = account?.address?.toString() ?? '';
  const collectionStorageKey = walletAddress ? `vhey-collection-ready-${walletAddress}` : '';
  const isCollectionReady = Boolean(
    collectionStorageKey
    && (createdCollectionKey === collectionStorageKey || localStorage.getItem(collectionStorageKey) === 'true'),
  );

  const showNotice = (nextNotice: Notice) => {
    setNotice(nextNotice);
    window.setTimeout(() => {
      setNotice((currentNotice) => currentNotice === nextNotice ? null : currentNotice);
    }, 5000);
  };

  const resetArtwork = () => {
    setGeneratedResult(null);
    setFile(null);
    setPreview(null);
    setIsSaved(false);
    setIsMinted(false);
    setSavedBlobName(null);
    setLastTxHash(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setGeneratedResult(null);
      setIsSaved(false);
      setIsMinted(false);
      setSavedBlobName(null);
      setLastTxHash(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile);
      setPreview(URL.createObjectURL(droppedFile));
      setGeneratedResult(null);
      setIsSaved(false);
      setIsMinted(false);
      setSavedBlobName(null);
      setLastTxHash(null);
    }
  };

  const handleGenerate = async () => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      showNotice({
        tone: 'info',
        title: 'Prompt needed',
        message: 'Add a short description before generating your doodle.',
      });
      return;
    }

    if (!file) {
      showNotice({
        tone: 'info',
        title: 'Image needed',
        message: 'Upload a photo first so Vhey has something to refract.',
      });
      return;
    }

    setIsGenerating(true);
    setIsSaved(false);
    setIsMinted(false);
    setSavedBlobName(null);
    setLastTxHash(null);

    try {
      const resultUrl = await generateDoodle(cleanPrompt, file);
      setGeneratedResult(resultUrl);
    } catch (err) {
      showNotice({
        tone: 'error',
        title: 'Generation failed',
        message: getErrorMessage(err),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveOnChain = async () => {
    if (!generatedResult) return;

    if (!connected || !account?.address) {
      showNotice({
        tone: 'info',
        title: 'Wallet required',
        message: 'Connect your Aptos wallet before saving to Shelby.',
      });
      return;
    }

    try {
      const response = await fetch(generatedResult);
      if (!response.ok) throw new Error('Could not download generated image for saving.');

      const contentType = response.headers.get('content-type') ?? '';
      const arrayBuffer = await response.arrayBuffer();
      const blobData = new Uint8Array(arrayBuffer);
      const extension = getImageExtension(contentType);
      const mimeType = getImageMimeType(contentType, extension);
      const blobName = `vhey/refractions/${Date.now()}.${extension}`;
      const expirationMicros = (Date.now() + 30 * 24 * 60 * 60 * 1000) * 1000;
      const signer: Signer = {
        account: account.address.toString(),
        signAndSubmitTransaction: walletAdapter.signAndSubmitTransaction,
      };

      uploadBlobsMutation.mutate(
        {
          signer,
          blobs: [{ blobName, blobData }],
          expirationMicros,
        },
        {
          onSuccess: () => {
            setIsSaved(true);
            setSavedBlobName(blobName);
            localStorage.setItem(`vhey-blob-mime-${blobName}`, mimeType);
            showNotice({
              tone: 'success',
              title: 'Saved to Shelby',
              message: 'Your doodle is now stored as a Shelby blob.',
            });
          },
        },
      );
    } catch (err) {
      devLogger.error('Prepare upload error:', err);
      showNotice({
        tone: 'error',
        title: 'Save failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleMintNFT = async () => {
    if (!connected || !account?.address || !generatedResult) return;

    if (isMinted) {
      showNotice({
        tone: 'info',
        title: 'Already minted',
        message: 'Create a new refraction before minting another NFT.',
      });
      return;
    }

    if (!savedBlobName) {
      showNotice({
        tone: 'info',
        title: 'Save first',
        message: 'Save this artwork to Shelby before minting it as an NFT.',
      });
      return;
    }

    if (!isCollectionReady) {
      showNotice({
        tone: 'info',
        title: 'Collection needed',
        message: 'Create your Vhey NFT collection before minting this artwork.',
      });
      return;
    }

    try {
      const shelbyUri = getShelbyExplorerUrl(savedBlobName, account.address.toString());

      const transaction = await signAndSubmitTransactionAsync({
        data: {
          function: '0x4::aptos_token::mint',
          functionArguments: [
            NFT_COLLECTION_NAME,
            'A unique doodle refraction by Vhey AI',
            savedBlobName,
            shelbyUri,
            [],
            [],
            [],
          ],
        },
      });

      setLastTxHash(transaction.hash);
      setIsMinted(true);
      showNotice({
        tone: 'success',
        title: 'NFT minted',
        message: 'Your Aptos NFT transaction was submitted successfully.',
      });
    } catch (err) {
      devLogger.error('Mint error:', err);
      showNotice({
        tone: 'error',
        title: 'Mint failed',
        message: getErrorMessage(err),
      });
    }
  };

  const handleCreateCollection = async () => {
    if (!connected || !account?.address) {
      showNotice({
        tone: 'info',
        title: 'Wallet required',
        message: 'Connect your Aptos wallet before creating the NFT collection.',
      });
      return;
    }

    try {
      const transaction = await signAndSubmitTransactionAsync({
        data: {
          function: '0x4::aptos_token::create_collection',
          functionArguments: [
            NFT_COLLECTION_DESCRIPTION,
            MAX_U64,
            NFT_COLLECTION_NAME,
            NFT_COLLECTION_URI,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            0,
            1,
          ],
        },
      });

      setLastTxHash(transaction.hash);
      setCreatedCollectionKey(collectionStorageKey);
      if (collectionStorageKey) localStorage.setItem(collectionStorageKey, 'true');
      showNotice({
        tone: 'success',
        title: 'Collection created',
        message: 'You can now mint Vhey refractions as Aptos NFTs.',
      });
    } catch (err) {
      const message = getErrorMessage(err);
      devLogger.error('Create collection error:', err);

      if (message.toLowerCase().includes('already') || message.toLowerCase().includes('exist')) {
        setCreatedCollectionKey(collectionStorageKey);
        if (collectionStorageKey) localStorage.setItem(collectionStorageKey, 'true');
        showNotice({
          tone: 'info',
          title: 'Collection found',
          message: 'The Vhey collection appears to already exist. You can try minting now.',
        });
        return;
      }

      showNotice({
        tone: 'error',
        title: 'Collection failed',
        message,
      });
    }
  };

  const isUploading = uploadBlobsMutation.isPending;
  const isMinting = isSubmittingMint;

  return (
    <section id="generator" className="generator-section">
      {notice && (
        <div className={`app-toast app-toast-${notice.tone}`} role="status" aria-live="polite">
          <div>
            <p className="toast-title">{notice.title}</p>
            <p className="toast-message">{notice.message}</p>
          </div>
          <button className="toast-close" onClick={() => setNotice(null)} aria-label="Close notification">
            x
          </button>
        </div>
      )}

      <div className="section-header">
        <h2 className="font-display section-title">Refraction <span className="gradient-text">Studio</span></h2>
        <p className="section-description">Upload, generate, store, and mint from one focused workspace.</p>
      </div>

      <div className="generator-container glass-card">
        {!generatedResult ? (
          <div className="upload-box">
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="image-preview" />
                <button
                  className="btn btn-secondary btn-sm remove-btn"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                <div className="upload-icon"><UploadIcon className="icon" /></div>
                <p className="upload-title">Drop your photo here</p>
                <p className="upload-sub">or click to browse</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  hidden
                />
              </div>
            )}

            <div className="prompt-input-container">
              <input
                type="text"
                className="prompt-input glass-card"
                placeholder="Describe the refraction, e.g. chrome pilot in soft light"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <button
              className="btn btn-primary btn-lg generate-btn"
              disabled={!file || isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? (
                <><span className="spinner"></span> Refracting your photo...</>
              ) : <><SparkIcon className="icon" /> Generate Refraction</>}
            </button>
          </div>
        ) : (
          <div className="result-box slide-up">
            <div className="result-header">
              <span className="result-badge">Your Refraction is Ready</span>
            </div>
            <div className="result-box animate-scale">
              <img
                src={generatedResult}
                alt="Generated Doodle"
                className="result-image"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.includes('dicebear')) {
                    const fallbackUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(prompt)}`;
                    target.src = fallbackUrl;
                    setGeneratedResult(fallbackUrl);
                  }
                }}
              />
              <div className="result-actions">
                {!isSaved ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveOnChain}
                    disabled={!connected || isUploading}
                  >
                    {isUploading ? 'Saving to Shelby...' : connected ? 'Save On-Chain (Shelby)' : 'Connect Wallet to Save'}
                  </button>
                ) : (
                  <div className="success-actions">
                    <p className="success-msg">Saved to Shelby Protocol</p>
                    {savedBlobName && account?.address && (
                      <a
                        href={getShelbyExplorerUrl(savedBlobName, account.address.toString())}
                        target="_blank"
                        rel="noreferrer"
                        className="tx-link"
                      >
                        View blob on Shelby Explorer
                      </a>
                    )}
                    {!isCollectionReady ? (
                      <button
                        className="btn btn-accent"
                        onClick={handleCreateCollection}
                        disabled={isMinting}
                      >
                        {isMinting ? 'Creating Collection...' : 'Create NFT Collection'}
                      </button>
                    ) : (
                      <button
                        className="btn btn-accent"
                        onClick={handleMintNFT}
                        disabled={isMinting || isMinted}
                      >
                        {isMinted ? 'NFT Minted' : isMinting ? 'Minting NFT...' : 'Mint as Aptos NFT'}
                      </button>
                    )}
                    {lastTxHash && (
                      <a
                        href={`https://explorer.aptoslabs.com/txn/${lastTxHash}?network=shelbynet`}
                        target="_blank"
                        rel="noreferrer"
                        className="tx-link"
                      >
                        View transaction on Aptos Explorer
                      </a>
                    )}
                  </div>
                )}
                <button className="btn btn-secondary" onClick={resetArtwork}>
                  New Refract
                </button>
              </div>
            </div>
            {!connected && (
              <p className="wallet-hint">Connect your wallet to save your art permanently on Aptos.</p>
            )}
          </div>
        )}
      </div>

      <style>{`
        .app-toast {
          position: fixed;
          right: 24px;
          bottom: 24px;
          z-index: 10000;
          display: flex;
          align-items: flex-start;
          gap: 18px;
          width: min(420px, calc(100vw - 32px));
          padding: 16px 18px;
          border-radius: var(--radius-sm);
          background: linear-gradient(135deg, rgba(255, 47, 146, 0.08), rgba(17, 19, 29, 0.94));
          border: 1px solid var(--border);
          box-shadow: 0 20px 60px rgba(0,0,0,0.35);
          backdrop-filter: blur(18px);
          animation: slide-up 0.25s ease forwards;
        }
        .app-toast-success {
          border-color: rgba(32, 242, 196, 0.45);
        }
        .app-toast-error {
          border-color: rgba(255, 91, 119, 0.55);
        }
        .app-toast-info {
          border-color: rgba(83, 240, 255, 0.45);
        }
        .toast-title {
          margin-bottom: 4px;
          color: var(--text);
          font-weight: 900;
          font-size: 15px;
        }
        .toast-message {
          color: var(--text-muted);
          font-size: 14px;
          line-height: 1.45;
        }
        .toast-close {
          margin-left: auto;
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.06);
          color: var(--text);
          cursor: pointer;
          font-weight: 900;
        }
        .generator-section {
          padding: 80px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .section-header {
          text-align: center;
          margin-bottom: 50px;
        }
        .section-title {
          font-size: 52px;
          margin-bottom: 15px;
        }
        .prompt-input-container {
          margin: 20px 0;
          width: 100%;
        }
        .prompt-input {
          width: 100%;
          padding: 15px 20px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          color: var(--text);
          font-size: 16px;
          outline: none;
          transition: border-color 0.3s;
        }
        .prompt-input:focus {
          border-color: var(--pink);
        }
        .success-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }
        .success-msg {
          color: var(--green);
          font-weight: 700;
          font-size: 14px;
          margin-bottom: 5px;
        }
        .tx-link {
          font-size: 12px;
          color: var(--cyan);
          text-decoration: none;
          font-weight: 700;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .tx-link:hover {
          opacity: 1;
          text-decoration: underline;
        }
        .btn-accent {
          background: linear-gradient(135deg, var(--yellow), var(--orange), var(--pink));
          color: #071018;
        }
        .btn-accent:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(245, 196, 81, 0.24);
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .generator-container {
          max-width: 700px;
          margin: 0 auto;
          padding: 40px;
          min-height: 450px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .upload-box {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .drop-zone {
          border: 1px dashed var(--border-strong);
          border-radius: var(--radius);
          padding: 60px 40px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s;
        }
        .drop-zone:hover {
          border-color: var(--pink);
          background: rgba(255, 47, 146, 0.06);
        }
        .upload-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm);
          margin-bottom: 15px;
          color: var(--cyan);
          background: linear-gradient(135deg, rgba(255, 47, 146, 0.1), rgba(83, 240, 255, 0.08));
        }
        .upload-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .upload-sub {
          color: var(--text-muted);
          font-size: 14px;
        }
        .preview-container {
          position: relative;
          width: 100%;
          border-radius: var(--radius);
          overflow: hidden;
          max-height: 400px;
        }
        .image-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: var(--radius);
        }
        .remove-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          padding: 6px 12px;
        }
        .generate-btn {
          width: 100%;
          justify-content: center;
        }
        .result-box {
          text-align: center;
        }
        .result-badge {
          background: linear-gradient(135deg, var(--pink), var(--cyan), var(--green));
          color: #071018;
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 800;
          display: inline-block;
          margin-bottom: 25px;
        }
        .result-image {
          width: 100%;
          max-width: 420px;
          border-radius: var(--radius);
          margin-bottom: 25px;
        }
        .result-actions {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .wallet-hint {
          margin-top: 20px;
          font-size: 14px;
          color: var(--yellow);
          font-weight: 700;
        }
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin-slow 0.8s linear infinite;
          flex-shrink: 0;
        }
      `}</style>
    </section>
  );
};

export default GeneratorSection;
