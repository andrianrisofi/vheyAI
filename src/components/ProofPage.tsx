import { getProof } from '../utils/proof';

const getShelbyExplorerUrl = (blobName: string, accountAddress: string) => {
  return `https://shelby.xyz/explorer/blob/${encodeURI(blobName)}?account=${accountAddress}`;
};

const ProofPage = () => {
  const proofId = window.location.pathname.split('/').filter(Boolean)[1] ?? '';
  const proof = getProof(proofId);

  return (
    <main className="proof-page">
      <section className="proof-shell glass-card">
        <a href="/app" className="proof-back">Back to Studio</a>
        <div className="section-label">Verifiable media vault</div>
        <h1 className="font-display">Proof Page</h1>

        {proof ? (
          <>
            <p className="proof-summary">
              This refraction is linked to Shelby image storage, Shelby metadata storage, and a local SHA-256 content proof.
            </p>
            <div className="proof-status-row">
              <span>Stored</span>
              <span>Metadata</span>
              <span>Hash Ready</span>
            </div>
            <dl className="proof-detail-grid">
              <div>
                <dt>Proof ID</dt>
                <dd>{proof.id}</dd>
              </div>
              <div>
                <dt>Creator</dt>
                <dd>{proof.creator}</dd>
              </div>
              <div>
                <dt>Content Hash</dt>
                <dd>{proof.contentHash}</dd>
              </div>
              <div>
                <dt>Model</dt>
                <dd>{proof.model}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{new Date(proof.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Prompt</dt>
                <dd>{proof.prompt}</dd>
              </div>
            </dl>
            <div className="proof-actions">
              <a
                href={getShelbyExplorerUrl(proof.imageBlobName, proof.creator)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                Open Image Blob
              </a>
              <a
                href={getShelbyExplorerUrl(proof.metadataBlobName, proof.creator)}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                Open Metadata Blob
              </a>
            </div>
          </>
        ) : (
          <div className="proof-empty">
            <h2 className="font-display">Proof not found</h2>
            <p>This browser does not have the local proof record for this ID yet. Save a new refraction from the Studio to generate a Proof Page.</p>
            <a href="/app" className="btn btn-primary">Open Studio</a>
          </div>
        )}
      </section>
    </main>
  );
};

export default ProofPage;
