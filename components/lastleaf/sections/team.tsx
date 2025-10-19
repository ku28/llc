"use client";
import Image from "next/image";
import { useEffect, useState } from "react";

interface TeamProps {
  imageUrl: string;
}

const teamList: TeamProps[] = [
  {
    imageUrl: 
      "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164667/a2_nuuwo0.png",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164667/a3_v6ic6r.png",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_v6ic6r.png",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a1_u4i3jx.png",
  },
  {
    imageUrl:
      "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
];

export default function TeamSection() {
  const [scrollPosition, setScrollPosition] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setScrollPosition((prev) => prev + 1);
    }, 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="team" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
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
          <div 
            className="flex gap-12 w-fit"
            style={{
              transform: `translateX(-${scrollPosition}px)`,
              animation: 'none'
            }}
          >
          {[...teamList, ...teamList, ...teamList].map((item, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden group flex-shrink-0"
            >
              <div className="p-0">
                <Image
                  src={item.imageUrl}
                  alt="achievement"
                  width={300}
                  height={300}
                  className="w-[300px] h-auto"
                />
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </section>
  );
}
