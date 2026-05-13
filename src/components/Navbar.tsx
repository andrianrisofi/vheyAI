import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useState } from 'react';
import { useNameFromAddress } from '@aptos-labs/react';
import { VheyMarkIcon, WalletIcon } from './Icons';

type NavbarProps = {
  page: 'landing' | 'app';
};

const Navbar = ({ page }: NavbarProps) => {
  const { connected, disconnect, account, wallets, connect } = useWallet();
  const [showModal, setShowModal] = useState(false);
  const isAppPage = page === 'app';
  const walletAddress = account?.address?.toString();
  const { data: ansName } = useNameFromAddress({
    address: isAppPage ? walletAddress : undefined,
    enabled: isAppPage && connected && !!walletAddress,
    retry: 1,
  });

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <>
      <nav className="navbar glass-card">
        <div className="navbar-container">
          <div className="logo font-display">
            <span className="logo-mark">
              <VheyMarkIcon className="logo-mark-icon" />
            </span>
            Vhey
          </div>

          <div className="nav-links">
            {isAppPage ? (
              <>
                <a href="/app#generator">Studio</a>
                {connected && <a href="/app#my-doodles">My Refractions</a>}
              </>
            ) : (
              <>
                <a href="#hero">Home</a>
                <a href="#gallery">Gallery</a>
                <a href="#faq">FAQ</a>
              </>
            )}
          </div>

          <div className="wallet-actions">
            {!isAppPage ? (
              <a className="btn btn-primary" href="/app">
                Open App
              </a>
            ) : connected ? (
              <div className="connected-wallet">
                <span className="wallet-dot" />
                <span className="address-pill">
                  {ansName ? ansName.toString() : (account?.address ? truncateAddress(String(account.address)) : 'Connected')}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => disconnect()}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <WalletIcon className="icon" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      {showModal && (
        <div className="wallet-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="wallet-modal glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-display">Select Wallet</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>x</button>
            </div>
            <div className="wallet-list">
              {wallets && wallets.length > 0 ? (
                wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    className="wallet-item"
                    onClick={() => {
                      connect(wallet.name);
                      setShowModal(false);
                    }}
                  >
                    {wallet.icon && (
                      <img src={wallet.icon} alt={wallet.name} className="wallet-icon" />
                    )}
                    <span>{wallet.name}</span>
                    <span className="wallet-arrow">-&gt;</span>
                  </button>
                ))
              ) : (
                <div className="no-wallets">
                  <p>No wallets detected.</p>
                  <a href="https://petra.app/" target="_blank" rel="noreferrer" className="btn btn-primary">
                    Install Petra Wallet
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .navbar {
          position: sticky;
          top: 14px;
          margin: 0 20px;
          padding: 10px 18px;
          z-index: 1000;
          border-radius: var(--radius);
        }
        .navbar-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 22px;
          color: var(--text);
          cursor: pointer;
        }
        .logo-mark {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #0a0c13;
          box-shadow: 0 0 0 1px rgba(255,255,255,0.08), 0 10px 24px rgba(255, 47, 146, 0.24);
          overflow: hidden;
        }
        .logo-mark-icon {
          width: 32px;
          height: 32px;
          display: block;
        }
        .nav-links {
          display: flex;
          gap: 30px;
        }
        .nav-links a {
          color: var(--text-muted);
          text-decoration: none;
          font-weight: 600;
          transition: color 0.3s;
        }
        .nav-links a:hover {
          color: var(--pink-soft);
        }
        .wallet-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .connected-wallet {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .wallet-dot {
          width: 8px;
          height: 8px;
          background: var(--green);
          border-radius: 50%;
          box-shadow: 0 0 8px var(--green);
        }
        .address-pill {
          background: rgba(83, 240, 255, 0.08);
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          font-size: 14px;
          font-weight: 700;
          border: 1px solid var(--border);
          font-family: monospace;
          letter-spacing: 0;
        }
        .btn-sm {
          padding: 6px 15px;
          font-size: 13px;
        }

        /* Wallet Modal */
        .wallet-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .wallet-modal {
          width: 420px;
          padding: 24px;
          animation: bounce-in 0.3s ease;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }
        .modal-header h3 {
          font-size: 22px;
          color: var(--text);
        }
        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 20px;
          cursor: pointer;
          transition: color 0.2s;
          padding: 4px 8px;
          border-radius: 8px;
        }
        .close-btn:hover {
          color: var(--text);
          background: rgba(255,255,255,0.1);
        }
        .wallet-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .wallet-item {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          cursor: pointer;
          color: var(--text);
          font-family: var(--font-body);
          font-weight: 700;
          font-size: 15px;
          transition: all 0.25s;
        }
        .wallet-item:hover {
          background: rgba(255, 47, 146, 0.08);
          border-color: var(--border-strong);
        }
        .wallet-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
        }
        .wallet-arrow {
          margin-left: auto;
          color: var(--cyan);
        }
        .no-wallets {
          text-align: center;
          padding: 30px;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
        }
        @media (max-width: 760px) {
          .navbar {
            margin: 8px 12px;
            padding: 8px 10px;
          }
          .navbar-container {
            gap: 10px;
          }
          .nav-links {
            display: none;
          }
          .logo {
            font-size: 20px;
          }
          .logo-mark {
            width: 28px;
            height: 28px;
          }
          .wallet-actions .btn {
            padding: 10px 12px;
            font-size: 13px;
          }
          .connected-wallet {
            gap: 6px;
          }
          .address-pill {
            max-width: 116px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .wallet-modal {
            width: calc(100vw - 32px);
          }
        }
      `}</style>
    </>
  );
};

export default Navbar;
