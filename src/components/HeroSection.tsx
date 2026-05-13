import heroArt from '../assets/hero.png';
import { SparkIcon } from './Icons';

const HeroSection = () => {
  return (
    <section id="hero" className="hero-section">
      <div className="hero-content slide-up">
        <div className="hero-kicker">Shelbynet creative storage</div>
        <h1 className="font-display hero-title">
          Turn portraits into collectible refractions.
        </h1>
        <p className="hero-subtitle">
          Generate a stylized character, store the artwork as a Shelby blob, and mint the result from the same Aptos wallet.
        </p>
        <div className="hero-cta">
          <a href="/app" className="btn btn-primary btn-lg">
            <SparkIcon className="icon" />
            Open App
          </a>
          <a href="#gallery" className="btn btn-secondary btn-lg">View Gallery</a>
        </div>
      </div>

      <div className="hero-visual" aria-label="Vhey portrait refraction artwork">
        <div className="hero-panel">
          <img src={heroArt} alt="" className="hero-art" />
        </div>
      </div>

      <style>{`
        .hero-section {
          padding: 92px 20px 76px;
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
          align-items: center;
          gap: 54px;
          max-width: 1200px;
          margin: 0 auto;
          min-height: 76vh;
        }
        .hero-kicker {
          display: inline-flex;
          margin-bottom: 18px;
          padding: 8px 10px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--green);
          background: rgba(82, 224, 179, 0.08);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .hero-title {
          max-width: 760px;
          font-size: 72px;
          line-height: 0.98;
          margin-bottom: 24px;
          color: var(--text);
        }
        .hero-subtitle {
          font-size: 18px;
          color: var(--text-muted);
          max-width: 570px;
          line-height: 1.7;
          margin-bottom: 34px;
        }
        .hero-cta {
          display: flex;
          gap: 14px;
          flex-wrap: wrap;
        }
        .btn-lg {
          padding: 14px 22px;
          font-size: 15px;
        }
        .hero-visual {
          position: relative;
          min-height: 430px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .hero-panel {
          width: min(430px, 100%);
          min-height: 430px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 18px;
          background: rgba(15, 23, 34, 0.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 28px 90px rgba(0,0,0,0.36);
          overflow: hidden;
        }
        .hero-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.08), transparent 42%),
            radial-gradient(circle at 72% 22%, rgba(82, 224, 179, 0.18), transparent 34%);
          pointer-events: none;
          z-index: 1;
        }
        .hero-art {
          width: 100%;
          height: 100%;
          min-height: 430px;
          object-fit: cover;
          object-position: center;
          filter: saturate(1.04) contrast(1.02);
        }

        @media (max-width: 968px) {
          .hero-section {
            grid-template-columns: 1fr;
            padding-top: 58px;
          }
          .hero-title {
            font-size: 48px;
          }
          .hero-visual {
            min-height: 360px;
          }
          .hero-panel {
            min-height: 360px;
          }
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
