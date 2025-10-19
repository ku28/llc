"use client";
import { useEffect, useState } from "react";

const videos = [
  {
    embedUrl: "https://www.youtube.com/embed/b0akJtrJb7c?si=ATmgLLyvBAr3OAck",
    title: "YouTube video player"
  },
  {
    embedUrl: "https://www.youtube.com/embed/JxqXi4JhWvg?si=vdo0EWvUxy426vhs",
    title: "YouTube video player"
  },
  {
    embedUrl: "https://www.youtube.com/embed/BE5v5OZPpMw?si=KoqkZmYW9fzB1oGp",
    title: "YouTube video player"
  },
  {
    embedUrl: "https://www.youtube.com/embed/-e8aabBBWN0?si=9DOmQ0wFQ14OgR9o",
    title: "YouTube video player"
  },
];

export default function SponsorsSection() {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 1);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="sponsors" className="w-full pb-24 sm:pb-32 px-4 sm:px-6 lg:px-8">
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
