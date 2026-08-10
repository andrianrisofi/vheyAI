import { ChainIcon, SparkIcon, UploadIcon } from './Icons';

const HowItWorks = () => {
  const steps = [
    {
      icon: <UploadIcon className="icon" />,
      step: '01',
      title: 'Bring an image',
      desc: 'Upload a portrait and add a short direction for the style you want.',
    },
    {
      icon: <SparkIcon className="icon" />,
      step: '02',
      title: 'Generate the refraction',
      desc: 'Create the character artwork and preview the result before touching the chain.',
    },
    {
      icon: <ChainIcon className="icon" />,
      step: '03',
      title: 'Store and mint',
      desc: 'Save the artwork to Shelby, then mint from your Aptos wallet on shelbynet.',
    },
  ];

  return (
    <section className="how-section">
      <div className="how-container">
        <div className="section-label">Workflow</div>
        <h2 className="font-display how-title">A cleaner path from image to asset</h2>

        <div className="steps-grid">
          {steps.map((s) => (
            <div key={s.step} className="step-card glass-card">
              <div className="step-topline">
                <div className="step-icon">{s.icon}</div>
                <div className="step-number">{s.step}</div>
              </div>
              <h3 className="step-title">{s.title}</h3>
              <p className="step-desc">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-num font-display">Shelby</span>
            <span className="stat-label">Blob storage layer</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num font-display">Aptos</span>
            <span className="stat-label">Wallet and NFT transaction</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <span className="stat-num font-display">Geomi</span>
            <span className="stat-label">Aptos developer tooling</span>
          </div>
        </div>
      </div>

      <style>{`
        .how-section {
          padding: 72px 20px;
        }
        .how-container {
          max-width: 1200px;
          margin: 0 auto;
          text-align: center;
        }
        .section-label {
          color: var(--green);
        }
        .how-title {
          max-width: 780px;
          margin: 0 auto 44px;
          font-size: 44px;
          line-height: 1.05;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
          margin-bottom: 52px;
        }
        .step-card {
          padding: 24px;
          text-align: left;
          transition: transform 0.25s, border-color 0.25s;
        }
        .step-card:hover {
          transform: translateY(-4px);
          border-color: var(--border-strong);
        }
        .step-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }
        .step-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border: 1px solid var(--border-strong);
          border-radius: var(--radius-sm);
          color: var(--pink-soft);
          background: linear-gradient(135deg, rgba(255, 47, 146, 0.1), rgba(83, 240, 255, 0.05));
        }
        .step-number {
          color: rgba(238, 246, 251, 0.24);
          font-family: var(--font-display);
          font-size: 28px;
        }
        .step-title {
          font-size: 18px;
          font-weight: 800;
          margin-bottom: 10px;
          color: var(--text);
        }
        .step-desc {
          color: var(--text-muted);
          line-height: 1.65;
          font-size: 14px;
        }
        .stats-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 44px;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 26px;
          background: rgba(255,255,255,0.025);
        }
        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .stat-num {
          font-size: 24px;
          color: var(--text);
        }
        .stat-label {
          color: var(--text-muted);
          font-weight: 600;
          font-size: 13px;
        }
        .stat-divider {
          width: 1px;
          height: 44px;
          background: var(--border);
        }

        @media (max-width: 768px) {
          .steps-grid {
            grid-template-columns: 1fr;
          }
          .stats-row {
            flex-direction: column;
            gap: 22px;
          }
          .stat-divider {
            width: 60px;
            height: 1px;
          }
          .how-title {
            font-size: 34px;
          }
        }
      `}</style>
    </section>
  );
};

export default HowItWorks;
