import React, { useRef, useEffect, useState, useCallback } from 'react';
import PropTypes from 'prop-types';

export function VideoPlayer({
  url,
  onComplete,
  title,
  onProgress,
  onError,
  autoplay = false,
  playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2],
  nextVideo = null
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bufferedTime, setBufferedTime] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showControls, setShowControls] = useState(true);
  const [showNextOverlay, setShowNextOverlay] = useState(false);
  const controlsTimeoutRef = useRef(null);

  // URL normalization
  const getFullUrl = () => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    let baseUrl = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5000';
    baseUrl = baseUrl.replace(/\/+$/, '');
    let path = url.startsWith('/') ? url : `/${url}`;

    if (baseUrl.endsWith('/api') && path.startsWith('/api')) {
      path = path.replace(/^\/api/, '');
    }

    return `${baseUrl}${path}`;
  };

  const fullUrl = getFullUrl();

  // Format time
  const formatTime = useCallback((seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'arrowright':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
        case 'arrowup':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.min(1, volume + 0.1) } });
          break;
        case 'arrowdown':
          e.preventDefault();
          handleVolumeChange({ target: { value: Math.max(0, volume - 0.1) } });
          break;
        case 'j':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          break;
        case 'l':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 10);
          break;
        case 'escape':
          if (isFullscreen) handleFullscreen();
          break;
        default:
          if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const percentage = parseInt(e.key) * 10;
            video.currentTime = (percentage / 100) * video.duration;
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [volume, isFullscreen, isPlaying]);

  // Fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement === containerRef.current ||
        document.webkitFullscreenElement === containerRef.current
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Auto-hide controls
  useEffect(() => {
    if (!isFullscreen) {
      setShowControls(true);
      return;
    }

    const resetControlsTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const handleMouseMove = () => resetControlsTimeout();
    containerRef.current?.addEventListener('mousemove', handleMouseMove);
    resetControlsTimeout();

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      containerRef.current?.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isFullscreen, isPlaying]);

  // Video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBufferedTime(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handleError = (e) => {
      const errorMsg = video.error?.message || 'Failed to load video';
      setError(errorMsg);
      setIsLoading(false);
      if (onError) onError(errorMsg);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('error', handleError);
    };
  }, [onError]);

  // Playback events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setShowNextOverlay(false); // Hide overlay on play
    };
    const handlePause = () => setIsPlaying(false);

    const handleEnded = () => {
      setIsPlaying(false);
      setShowNextOverlay(true); // Show overlay on end
      if (onComplete) onComplete();
    };

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100;
      setCurrentTime(video.currentTime);
      if (onProgress) {
        onProgress({
          currentTime: video.currentTime,
          duration: video.duration,
          progress: progress
        });
      }
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [onComplete, onProgress]);

  // Control handlers
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  }, [isMuted]);

  const handlePlaybackRateChange = useCallback((e) => {
    const newRate = parseFloat(e.target.value);
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
    }
  }, []);

  const handleProgressClick = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }, [duration]);

  const handleFullscreen = useCallback(() => {
    if (containerRef.current) {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if (containerRef.current.webkitRequestFullscreen) {
          containerRef.current.webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }
    }
  }, [isFullscreen]);

  const progressPercentage = (currentTime / duration) * 100 || 0;
  const bufferedPercentage = (bufferedTime / duration) * 100 || 0;

  // Styles
  const containerStyle = {
    width: '100%',
    maxWidth: isFullscreen ? '100%' : '100%',
    margin: isFullscreen ? 0 : '0 auto',
    backgroundColor: '#000',
    borderRadius: isFullscreen ? 0 : '8px',
    overflow: 'hidden',
    boxShadow: isFullscreen ? 'none' : '0 4px 12px rgba(0, 0, 0, 0.15)',
    marginBottom: isFullscreen ? 0 : '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    position: 'relative'
  };

  const videoWrapperStyle = {
    position: 'relative',
    width: '100%',
    paddingBottom: isFullscreen ? '0' : '50%',
    height: isFullscreen ? '100vh' : '0',
    backgroundColor: '#000',
    marginBottom: 0
  };

  const videoStyle = {
    position: isFullscreen ? 'relative' : 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    backgroundColor: '#000'
  };

  const controlsStyle = {
    position: 'relative',
    bottom: 'auto',
    left: 0,
    right: 0,
    backgroundColor: '#000',
    padding: '8px 16px 12px 16px',
    color: '#fff',
    display: showControls || !isFullscreen ? 'flex' : 'none',
    flexDirection: 'column-reverse',
    gap: '8px',
    transition: 'opacity 0.3s ease',
    opacity: showControls ? 1 : 0,
    zIndex: 30
  };

  const progressBarStyle = {
    width: '100%',
    height: '5px',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '3px',
    cursor: 'pointer',
    position: 'relative',
    overflow: 'hidden'
  };

  const bufferedStyle = {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    width: `${bufferedPercentage}%`,
    transition: 'width 0.3s ease'
  };

  const playedStyle = {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#ff0000',
    width: `${progressPercentage}%`,
    transition: 'width 0.1s ease'
  };

  const controlRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap'
  };

  const leftControlsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const rightControlsStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const buttonStyle = {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '6px 10px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
    minWidth: '32px'
  };

  const selectStyle = {
    backgroundColor: '#333',
    border: '1px solid #666',
    color: '#fff',
    padding: '5px 10px',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    outline: 'none'
  };

  const volumeSliderStyle = {
    width: '80px',
    cursor: 'pointer',
    accentColor: '#ff0000'
  };

  const timeStyle = {
    fontSize: '13px',
    color: '#fff',
    fontWeight: 500,
    whiteSpace: 'nowrap'
  };

  const loadingStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#fff',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const errorStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ff4444',
    fontSize: '14px',
    textAlign: 'center',
    padding: '20px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '8px'
  };

  if (error) {
    return (
      <div style={containerStyle} ref={containerRef}>
        <div style={videoWrapperStyle}>
          <div style={errorStyle}>
            <div>❌ Error Loading Video</div>
            <div style={{ marginTop: '10px', fontSize: '12px' }}>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle} ref={containerRef}>
      <div style={videoWrapperStyle}>
        <video
          ref={videoRef}
          style={videoStyle}
          src={fullUrl}
          autoPlay={autoplay}
          onClick={togglePlayPause}
        />

        {isLoading && (
          <div style={loadingStyle}>
            <div style={{
              width: '20px',
              height: '20px',
              border: '3px solid rgba(255,255,255,0.3)',
              borderTop: '3px solid #fff',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Loading...
          </div>
        )}

        {title && (
          <div style={{
            position: 'absolute',
            bottom: '60px',
            left: 0,
            right: 0,
            padding: '20px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0.3), transparent)',
            color: '#fff',
            zIndex: 20
          }}>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff'
            }}>
              {title}
            </h3>
          </div>
        )}

        {/* Next Video Overlay */}
        {showNextOverlay && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
            color: '#fff'
          }}>
            {nextVideo ? (
              <>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Up Next</h4>
                <h3 style={{ margin: '0 0 24px 0', fontSize: '24px', textAlign: 'center', maxWidth: '80%' }}>{nextVideo.title}</h3>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <button
                    onClick={() => {
                      setShowNextOverlay(false);
                      nextVideo.onNavigate();
                    }}
                    style={{
                      padding: '12px 24px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    {nextVideo.type === 'exam' ? '📝 Start Assessment' : '▶ Play Next'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                <h3 style={{ fontSize: '24px', margin: '0 0 8px 0' }}>Module Completed!</h3>
                <p style={{ color: '#94a3b8', margin: 0 }}>You have finished all videos in this section.</p>
                <button
                  onClick={() => {
                    setShowNextOverlay(false);
                  }}
                  style={{
                    marginTop: '24px',
                    padding: '10px 20px',
                    backgroundColor: 'transparent',
                    color: '#fff',
                    border: '1px solid #fff',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls BELOW Video */}
      <div style={controlsStyle}>
        <div style={controlRowStyle}>
          <div style={leftControlsStyle}>
            <button
              style={buttonStyle}
              onClick={togglePlayPause}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            <button
              style={buttonStyle}
              onClick={toggleMute}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {isMuted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              style={volumeSliderStyle}
            />

            <span style={timeStyle}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div style={rightControlsStyle}>
            <select
              value={playbackRate}
              onChange={handlePlaybackRateChange}
              style={selectStyle}
            >
              {playbackRates.map(rate => (
                <option key={rate} value={rate} style={{ backgroundColor: '#222', color: '#fff' }}>
                  {rate}x
                </option>
              ))}
            </select>

            <button
              style={buttonStyle}
              onClick={handleFullscreen}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              {isFullscreen ? '⛶' : '⛶'}
            </button>
          </div>
        </div>

        <div style={progressBarStyle} onClick={handleProgressClick}>
          <div style={bufferedStyle} />
          <div style={playedStyle} />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

VideoPlayer.propTypes = {
  url: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  title: PropTypes.string,
  onProgress: PropTypes.func,
  onError: PropTypes.func,
  autoplay: PropTypes.bool,
  playbackRates: PropTypes.arrayOf(PropTypes.number),
  nextVideo: PropTypes.shape({
    title: PropTypes.string,
    onNavigate: PropTypes.func
  })
};

export default VideoPlayer;
