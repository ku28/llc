"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface GalleryImage {
  imageUrl: string;
  order: number;
}

export default function AchievementsSection() {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [images, setImages] = useState<GalleryImage[]>([]);

  useEffect(() => {
    // Fetch images from achievements API
    fetch('/api/achievements-content')
      .then(res => res.json())
      .then(data => setImages(data))
      .catch(err => console.error('Error loading gallery images:', err));
  }, []);

  useEffect(() => {
    if (images.length === 0) return;
    
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 1);
    }, 30);

    return () => clearInterval(interval);
  }, [images]);

  return (
    <section id="achievements" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-lg text-brand text-center mb-2 tracking-wider font-semibold">
            Achievement
          </h2>

          <h2 className="text-3xl md:text-4xl text-center font-bold text-gray-900 dark:text-white">
            Our Achievements
          </h2>
        </div>

        <div className="relative overflow-hidden rounded-xl">
          {images.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No achievement images available. Add images in the Gallery section.
            </div>
          ) : (
            <div 
              className="flex gap-12 w-fit"
              style={{
                transform: `translateX(-${scrollPosition}px)`,
                animation: 'none'
              }}
            >
              {[...images, ...images, ...images].map((item, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden group flex-shrink-0"
                >
                  <div className="p-0">
                    <Image
                      src={item.imageUrl}
                      alt={`Achievement ${index + 1}`}
                      width={300}
                      height={300}
                      className="w-[300px] h-[300px] object-cover"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
