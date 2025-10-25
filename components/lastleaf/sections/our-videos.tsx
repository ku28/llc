"use client";
import { useEffect, useState } from "react";

interface Video {
  embedUrl: string;
  title: string;
}

export default function OurVideosSection() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    fetch('/api/landing/videos')
      .then(r => r.json())
      .then(data => setVideos(data))
      .catch(err => console.error('Error loading videos:', err))
  }, [])

  useEffect(() => {
    if (isPaused) return; // Don't scroll when paused

    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 1);
    }, 30);

    return () => clearInterval(interval);
  }, [isPaused]);

  return (
    <section id="our-videos" className="w-full pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-lg md:text-xl text-center mb-8 text-gray-900 dark:text-white font-semibold">
          Our Videos
        </h2>

        <div className="relative overflow-hidden rounded-xl">
        <div 
          className="flex gap-12 w-fit"
          style={{
            transform: `translateX(-${scrollPosition}px)`,
            animation: 'none'
          }}
        >
          {[...videos, ...videos, ...videos].map(({ embedUrl, title }, index) => (
            <div
              key={`${embedUrl}-${index}`}
              className="w-[560px] h-[315px] flex-shrink-0"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <iframe
                width="560"
                height="315"
                src={embedUrl}
                title={title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="rounded-lg"
              />
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
