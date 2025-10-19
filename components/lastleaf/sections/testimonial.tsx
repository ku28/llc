"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface ReviewProps {
  image: string;
  name: string;
  userName: string;
  info: string;
  comment: string;
}

const reviewList: ReviewProps[] = [
  {
    image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750162752/trigeminal-neuralgia-2202_cnz7ri.jpg",
    name: "Trigeminal Neulalgia (TN) Treatment",
    userName: `"No more shocks to bear"`,
    info: "As indicated by Lambru G, et al. Practical Neurology 2021;21:392-402.",
    comment:
      "Trigeminal neuralgia (TN) is characterised by recurrent, unilateral, brief (<1 s-2 min), very painful, electric shock-like pain...",
  },
  {
    image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163029/physiotherapy-for-bells-palsy-calgary-nw_yjk4h3.jpg",
    name: "Bell's palsy Treatment",
    userName: `"Move with your intact expressions"`,
    info: "As evident in Eviston TJ, et al. Journal of Neurology, Neurosurgery and Psychiatry 2015;86:1356-1361.",
    comment:
      "Bell's palsy is a common cranial neuropathy causing acute unilateral lower motor neuron facial paralysis. Immune, infective and...",
  },
  {
    image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163377/type-1-diabetes-treatment-and-diagnosis_bsic0x.jpg",
    name: "Diabetes mellitus (DM) Treatment",
    userName: `"See off your sweet poison forever"`,
    info: "As per Diabetes mellitus Article • December 2014",
    comment:
      "Diabetes mellitus (DM) also known as simply diabetes, is a group of metabolic diseases in which there are high blood sugar...",
  },
  {
    image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163542/chronic-kidney-disease-2_hbberl.jpg",
    name: "Chronic Kidney Disease Treatment",
    userName: `"Say Bye to Dialysis"`,
    info: "According to Advances in Therapy (2022) 39:193-220",
    comment:
      "Chronic Kidney Disease CKD is diagnosed when the estimated glomerular filtration rate (eGFR) declines below 60 mL/min/1.73 m2...",
  },
  {
    image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163839/1696835903Understanding-Gallstones-and-Treatments-scaled_rumofu.webp",
    name: "Gallstone Treatment",
    userName: `"Get rid of stones in the way to digestion"`,
    info: "As mentioned in Nigerian Journal of Surgery Jul-Dec 2013 | Volume 19 | Issue 2",
    comment:
      "Gallstones or choleliths are hardened deposits of the digestive fluid bile, that can form within the gallbladder. They...",
  },
];

export default function TestimonialSection() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % reviewList.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + reviewList.length) % reviewList.length);
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
        <div className="overflow-hidden">
          <div 
            className="flex transition-transform duration-300 ease-in-out gap-4"
            style={{ transform: `translateX(-${currentIndex * 33.33}%)` }}
          >
            {reviewList.map((review) => (
              <div
                key={review.name}
                className="min-w-[100%] md:min-w-[50%] lg:min-w-[33.33%] px-2"
              >
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 h-full">
                  <div className="p-4">
                    <div className="mb-4">
                      <Image
                        src={review.image}
                        alt="services"
                        width={400}
                        height={300}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{review.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{review.userName}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{review.info}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 pt-2">{review.comment}</p>
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
        </div>
      </div>
    </section>
  );
}
