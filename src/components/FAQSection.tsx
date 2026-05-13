const FAQSection = () => {
  const faqs = [
    {
      q: "What is Vhey?",
      a: "Vhey is a creative dapp for turning portraits into stylized refractions, storing the artwork with Shelby, and minting through Aptos."
    },
    {
      q: "How does the on-chain storage work?",
      a: "We use the Shelby Protocol to securely store your generated artwork as on-chain blobs. This ensures your creations are permanent, decentralized, and truly yours."
    },
    {
      q: "Which wallets are supported?",
      a: "We support major Aptos wallets including Petra, Martian, Pontem, and Nightly via the official Aptos Wallet Adapter."
    },
    {
      q: "Is there a fee for generating doodles?",
      a: "Generation is currently free for the community. Saving your artwork on-chain requires a small amount of gas to interact with the Aptos network."
    }
  ];

  return (
    <section id="faq" className="faq-section">
      <div className="faq-container">
        <h2 className="font-display faq-title">Common <span className="gradient-text">Questions</span></h2>
        <div className="faq-list">
          {faqs.map((faq, i) => (
            <div key={i} className="faq-item glass-card">
              <h3 className="faq-question">{faq.q}</h3>
              <p className="faq-answer">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .faq-section {
          padding: 100px 20px;
          background: linear-gradient(180deg, rgba(255, 47, 146, 0.04), rgba(83, 240, 255, 0.025));
        }
        .faq-container {
          max-width: 900px;
          margin: 0 auto;
          text-align: center;
        }
        .faq-title {
          font-size: 48px;
          margin-bottom: 50px;
        }
        .faq-list {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          text-align: left;
        }
        .faq-item {
          padding: 30px;
          border: 1px solid var(--border);
          transition: all 0.3s ease;
        }
        .faq-item:hover {
          border-color: var(--border-strong);
          transform: translateY(-5px);
        }
        .faq-question {
          font-family: var(--font-display);
          font-size: 20px;
          color: var(--pink-soft);
          margin-bottom: 15px;
        }
        .faq-answer {
          color: var(--text-muted);
          line-height: 1.6;
          font-size: 16px;
        }
        @media (max-width: 768px) {
          .faq-list {
            grid-template-columns: 1fr;
          }
          .faq-title {
            font-size: 36px;
          }
        }
      `}</style>
    </section>
  );
};

export default FAQSection;
