import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { useAptBalance } from '@aptos-labs/react';
import { useAccountBlobs, useShelbyClient } from '@shelby-protocol/react';
import { BoxIcon, CheckIcon, WalletIcon } from './Icons';

const UserStats = () => {
  const { connected, account } = useWallet();
  const shelbyClient = useShelbyClient();

  const walletAddress = account?.address?.toString() ?? '';
  const { data: balanceOctas, isLoading: isBalanceLoading } = useAptBalance({
    address: walletAddress,
    enabled: connected && !!walletAddress,
    refetchInterval: 10000,
  });

  const { data: blobs } = useAccountBlobs({
    client: shelbyClient,
    account: walletAddress,
    enabled: connected && !!walletAddress,
  });

  if (!connected) return null;

  const balance = balanceOctas ? Number(balanceOctas) / 100_000_000 : null;

  return (
    <div className="user-stats-bar glass-card">
      <div className="stat-pill">
        <span className="stat-icon"><WalletIcon className="icon" /></span>
        <span className="stat-value">{balance !== null ? balance.toFixed(3) : isBalanceLoading ? '...' : '0.000'} APT</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-pill">
        <span className="stat-icon"><BoxIcon className="icon" /></span>
        <span className="stat-value">{blobs?.length || 0} Blobs Stored</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-pill">
        <span className="stat-icon"><CheckIcon className="icon" /></span>
        <span className="stat-value">Testnet Verified</span>
      </div>

      <style>{`
        .user-stats-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          padding: 12px 25px;
          margin: 20px auto;
          max-width: fit-content;
          border-radius: var(--radius);
          border: 1px solid rgba(255, 137, 202, 0.22);
          animation: slide-down 0.5s ease-out;
        }
        .stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          font-size: 14px;
        }
        .stat-icon {
          color: var(--cyan);
          display: inline-flex;
        }
        .stat-value {
          color: var(--text);
        }
        .stat-divider {
          width: 1px;
          height: 20px;
          background: var(--border);
        }
        @keyframes slide-down {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default UserStats;
