type FooterProps = {
  page: 'landing' | 'app';
};

const Footer = ({ page }: FooterProps) => {
  const isAppPage = page === 'app';

  return (
    <footer className="footer glass-card">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <div className="logo font-display">Vhey</div>
            <p>Creative storage and minting for Shelbynet refractions.</p>
          </div>
          <div className="footer-links">
            <div className="link-group">
              <h4>Product</h4>
              <a href="/">Landing</a>
              <a href="/app">Studio</a>
              {!isAppPage && <a href="#gallery">Gallery</a>}
            </div>
            <div className="link-group">
              <h4>Technology</h4>
              <a href="https://aptos.dev" target="_blank" rel="noreferrer">Aptos</a>
              <a href="https://shelby.xyz" target="_blank" rel="noreferrer">Shelby Protocol</a>
              <a href="https://geomi.dev" target="_blank" rel="noreferrer">Geomi</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 Vhey. Built on Aptos and Shelby.</p>
          <div className="social-links">
            <a href="https://x.com/shelbyserves" target="_blank" rel="noreferrer">Twitter</a>
            <a href="https://discord.gg/shelbyserves" target="_blank" rel="noreferrer">Discord</a>
            <a href="https://github.com/andrianrisofi/vheyAI" target="_blank" rel="noreferrer">Github</a>
          </div>
        </div>
      </div>

      <style>{`
        .footer {
          margin: 40px 20px 20px;
          padding: 60px 40px 30px;
          border-radius: var(--radius);
        }
        .footer-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .footer-main {
          display: flex;
          justify-content: space-between;
          margin-bottom: 60px;
          flex-wrap: wrap;
          gap: 40px;
        }
        .footer-brand p {
          color: var(--text-muted);
          margin-top: 10px;
          max-width: 250px;
        }
        .footer-links {
          display: flex;
          gap: 80px;
          flex-wrap: wrap;
        }
        .link-group h4 {
          margin-bottom: 20px;
          font-family: var(--font-display);
          font-size: 18px;
          color: var(--pink-soft);
        }
        .link-group a {
          display: block;
          color: var(--text-muted);
          text-decoration: none;
          margin-bottom: 12px;
          font-weight: 600;
          transition: color 0.3s;
        }
        .link-group a:hover {
          color: var(--text);
        }
        .footer-bottom {
          border-top: 1px solid var(--border);
          padding-top: 30px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          color: var(--text-muted);
          font-size: 14px;
        }
        .social-links {
          display: flex;
          gap: 20px;
        }
        .social-links a {
          color: var(--text-muted);
          text-decoration: none;
          cursor: pointer;
          transition: color 0.3s;
        }
        .social-links a:hover {
          color: var(--cyan);
        }
      `}</style>
    </footer>
  );
};

export default Footer;
