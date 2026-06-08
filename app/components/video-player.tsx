/**
 * 专业视频播放器
 * 播放/暂停、进度条拖拽、音量、倍速(0.5x~2x)、全屏、下载
 * 键盘快捷键：空格暂停、←→快进5秒、F全屏
 */

"use client";

import {
  Download,
  Maximize,
  Minimize,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showControls, setShowControls] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = time;
    setCurrentTime(time);
  }, []);

  const skip = useCallback((delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(video.currentTime + delta, 0), video.duration || 0);
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const wrap = videoRef.current?.parentElement;
    if (!wrap) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      wrap.requestFullscreen().catch(() => {});
    }
  }, []);

  const cycleSpeed = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const idx = SPEEDS.indexOf(video.playbackRate);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    video.playbackRate = next;
    setSpeed(next);
  }, []);

  const handleDownload = useCallback(() => {
    const a = document.createElement("a");
    a.href = src;
    a.download = src.split("/").pop() || "video.mp4";
    a.click();
  }, [src]);

  // mouse auto-hide controls
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 2000);
    }
  }, [playing]);

  // keyboard shortcuts
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      switch (event.key) {
        case " ":
          event.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          skip(-5);
          break;
        case "ArrowRight":
          skip(5);
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [togglePlay, skip, toggleFullscreen]);

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (error) {
    return (
      <div className="video-skeleton">
        <div style={{ textAlign: "center" }}>
          <p>视频加载失败</p>
          <a href={src} target="_blank" rel="noreferrer" style={{ fontSize: "var(--text-sm)" }}>
            直接打开视频
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="video-player-wrap"
      onMouseMove={showControlsTemporarily}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {!loaded ? (
        <div className="video-skeleton" style={{ position: "absolute", inset: 0 }}>
          <span>加载中...</span>
        </div>
      ) : null}

      <video
        ref={videoRef}
        src={src}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          setShowControls(true);
        }}
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
        onLoadedMetadata={() => {
          setDuration(videoRef.current?.duration || 0);
          setLoaded(true);
        }}
        onError={() => setError(true)}
      />

      <div className={`video-controls${showControls || !playing ? " visible" : ""}`}>
        {/* Progress bar */}
        <input
          type="range"
          className="video-progress"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
        />

        <div className="video-controls-row">
          <div className="video-controls-group">
            <button type="button" className="video-control-btn" onClick={() => skip(-5)} title="后退 5 秒">
              <SkipBack size={16} />
            </button>
            <button type="button" className="video-control-btn" onClick={togglePlay} title={playing ? "暂停" : "播放"}>
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button type="button" className="video-control-btn" onClick={() => skip(5)} title="前进 5 秒">
              <SkipForward size={16} />
            </button>
            <button type="button" className="video-control-btn" onClick={toggleMute} title={muted ? "取消静音" : "静音"}>
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <span className="video-time">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="video-controls-group">
            <button type="button" className="video-speed-btn" onClick={cycleSpeed} title="切换播放速度">
              {speed}x
            </button>
            <button type="button" className="video-control-btn" onClick={handleDownload} title="下载视频">
              <Download size={16} />
            </button>
            <button type="button" className="video-control-btn" onClick={toggleFullscreen} title={fullscreen ? "退出全屏" : "全屏"}>
              {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
