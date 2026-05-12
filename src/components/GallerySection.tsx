const GallerySection = () => {
  const items = [
    { id: 1, img: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', name: 'Cool Felix' },
    { id: 2, img: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka', name: 'Smart Aneka' },
    { id: 3, img: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sheba', name: 'Brave Sheba' },
    { id: 4, img: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jasper', name: 'Fun Jasper' },
    { id: 5, img: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Luna', name: 'Dreamy Luna' },
    { id: 6, img: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Milo', name: 'Playful Milo' },
  ];

  return (
    <section id="gallery" className="gallery-section">
      <div className="section-header">
        <h2 className="font-display section-title">Community <span className="gradient-text">Gallery</span></h2>
        <p className="section-description">See how others have refracted themselves.</p>
      </div>

      <div className="gallery-grid">
        {items.map((item) => (
          <div key={item.id} className="gallery-item glass-card slide-up">
            <div className="item-image">
              <img src={item.img} alt={item.name} />
            </div>
            <div className="item-info">
              <span className="item-name">{item.name}</span>
              <span className="on-chain-tag">On-Chain</span>
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .gallery-section {
          padding: 80px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .gallery-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 30px;
        }
        .gallery-item {
          padding: 20px;
          transition: all 0.3s;
          cursor: pointer;
        }
        .gallery-item:hover {
          transform: translateY(-10px) rotate(2deg);
          border-color: var(--border-strong);
        }
        .item-image {
          background: rgba(255,255,255,0.03);
          border-radius: var(--radius-sm);
          padding: 20px;
          margin-bottom: 15px;
          display: flex;
          justify-content: center;
        }
        .item-image img {
          width: 100%;
          height: auto;
          border-radius: var(--radius-sm);
        }
        .item-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .item-name {
          font-weight: 800;
          color: var(--text);
        }
        .on-chain-tag {
          font-size: 12px;
          background: rgba(52, 211, 153, 0.1);
          color: var(--green);
          padding: 4px 8px;
          border-radius: 10px;
          font-weight: 700;
        }
      `}</style>
    </section>
  );
};

export default GallerySection;
