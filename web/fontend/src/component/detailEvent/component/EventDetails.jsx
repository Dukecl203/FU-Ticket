import './EventDetails.css';

function EventDetails({ event }) {
  return (
    <div className="event-details">
      <h2>Giới thiệu</h2>

      <div className="video-container">
        {event.videoUrl ? (
          <iframe
            src={event.videoUrl}
            title={event.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        ) : (
          <div className="video-placeholder">
            <div className="play-button">▶</div>
            <div className="video-title">{event.title}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EventDetails;
