"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ServiceCard {
  image: string;
  name: string;
  tagline: string;
  info: string;
  description: string;
}

export default function TestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [services, setServices] = useState<ServiceCard[]>([]);

  useEffect(() => {
    // Fetch services from API
    fetch('/api/services-content')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => console.error('Error loading services:', err));
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % services.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + services.length) % services.length);
  };

  return (
    <section id="testimonials" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-lg text-brand text-center mb-2 tracking-wider font-semibold">
            Services
          </h2>

          <h2 className="text-3xl md:text-4xl text-center font-bold mb-4 text-gray-900 dark:text-white">
            Hear Are Some Examples
          </h2>
        </div>

        <div className="relative w-full mx-auto">
        {services.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No services available. Add services in the Services section.
          </div>
        ) : (
          <>
            <div className="overflow-hidden">
              <div 
                className="flex transition-transform duration-300 ease-in-out gap-4"
                style={{ transform: `translateX(-${currentIndex * 33.33}%)` }}
              >
                {services.map((service) => (
                  <div
                    key={service.name}
                    className="min-w-[100%] md:min-w-[50%] lg:min-w-[33.33%] px-2"
                  >
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 h-full">
                      <div className="p-4">
                        <div className="mb-4">
                          <Image
                            src={service.image}
                            alt={service.name}
                            width={400}
                            height={300}
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{service.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">&quot;{service.tagline}&quot;</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{service.info}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 pt-2">{service.description}</p>
                          <Link href="/services" className="inline-block mt-4 text-brand hover:underline">
                            Read More
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <button
              onClick={prevSlide}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="text-2xl">←</span>
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <span className="text-2xl">→</span>
            </button>
          </>
        )}
        </div>
      </div>
    </section>
  );
}
