import { useState } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";
import { Helmet } from "react-helmet-async";
import "./EventHero.css";

function EventHero({ event }) {
  const [copied, setCopied] = useState(false);
  const isExpired = new Date(event.end_time) < new Date();
  if (!event) return null;

  const link = `https://ticketfu-font-end.vercel.app/event/${event.id}`;
  const onShare = (e, { url = link, quote }) => {
    e.preventDefault();
    const shareUrl =
      "https://www.facebook.com/sharer/sharer.php?u=" +
      encodeURIComponent(url) +
      "&quote=" +
      encodeURIComponent(quote || `Tham gia ngay sự kiện ${event.title}!`);

    const w = 650,
      h = 450;
    const left = Math.floor((window.screen.width - w) / 2);
    const top = Math.floor((window.screen.height - h) / 2);
    window.open(
      shareUrl,
      "fbshare",
      `width=${w},height=${h},left=${left},top=${top},menubar=0,toolbar=0,scrollbars=1`
    );
  };

  // 🧩 Hàm sao chép link
  const onCopyLink = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="event-hero">
      {/* 🌐 SEO + Facebook share meta tags */}
      <Helmet>
        <meta property="og:title" content={event.title} />
        <meta
          property="og:description"
          content={`Tham gia ngay sự kiện ${event.title}!`}
        />
        <meta property="og:image" content={event.image} />
        <meta property="og:url" content={link} />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="event-hero-content">
        <div className="event-info">
          <h1
            style={{
              fontWeight: "650",
              color: "#ffffff",
              letterSpacing: "1px",
              marginBottom: "20px",
              lineHeight: "1.2",
              WebkitFontSmoothing: "antialiased",
              textTransform: "uppercase",
              background: "linear-gradient(135deg, #fff 0%, #f0f0f0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {event.title}
          </h1>

          <div className="event-meta">
            <span className="event-date">
              📅 {event.start_time} → {event.end_time}
            </span>
          </div>

          <div className="location">
            <span className="location-icon">📍</span>
            <div className="location-text">
              <p>{event.location}</p>

              <div
                className="location-detail"
                style={{
                  marginTop: "10px",
                  lineHeight: "1.6",
                }}
              />
              {event.description}
            </div>
          </div>

          <div className="pricing">
            <span className="price-label">Giá từ</span>
            <span className="price">
              {event.price === 0
                ? "Miễn phí"
                : `${event.price.toLocaleString("vi-VN")} ₫`}
            </span>
            <span className="price-arrow">›</span>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {isExpired ? (
              <button className="cta-button expired" disabled>
                Đã quá hạn
              </button>
            ) : (
              <button className="cta-button">Chọn loại vé</button>
            )}

            <div className="share-buttons">
              {/* 📤 Chia sẻ Facebook */}
              <button
                onClick={(e) =>
                  onShare(e, {
                    url: link,
                    quote: `Tham gia ngay sự kiện ${event.title}!`,
                  })
                }
                className="share-button"
                title="Chia sẻ lên Facebook"
              >
                <Share2 size={18} />
              </button>

              {/* 🔗 Sao chép liên kết */}
              <button
                onClick={onCopyLink}
                className={`share-button ${copied ? "copied" : ""}`}
                title={copied ? "Đã sao chép!" : "Sao chép liên kết"}
              >
                {copied ? <Check size={18} /> : <LinkIcon size={18} />}
              </button>
            </div>
          </div>
        </div>

        <div className="event-artwork">
          <div className="artwork-container">
            <img src={event.image} alt={event.title} className="event-image" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventHero;
