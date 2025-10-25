"use client";
import { useEffect, useState } from "react";

interface BenefitsProps {
  icon: string;
  title: string;
  description: string;
}

export default function BenefitsSection() {
  const [content, setContent] = useState({
    title: 'Why Trust Us?',
    description: '',
    benefits: [] as BenefitsProps[]
  })

  useEffect(() => {
    fetch('/api/landing/benefits')
      .then(r => r.json())
      .then(data => {
        setContent({
          title: data.title,
          description: data.description,
          benefits: data.benefits
        })
      })
      .catch(err => console.error('Error loading benefits:', err))
  }, [])
  return (
    <section id="benefits" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 place-items-center lg:gap-24">
          <div className="text-center lg:text-left mb-12 lg:mb-0">
            <h2 className="text-lg text-brand mb-2 tracking-wider font-semibold">Benefits</h2>

            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {content.title}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              {content.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            {content.benefits.map(({ icon, title, description }, index) => (
              <div
                key={title}
                className="bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 p-6 rounded-xl border border-gray-200 dark:border-gray-800 group hover:shadow-lg hover:scale-105"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="text-4xl mb-2">{icon}</div>
                  <span className="text-5xl text-gray-200 dark:text-gray-800 font-medium transition-all duration-300 group-hover:text-gray-300 dark:group-hover:text-gray-700">
                    0{index + 1}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
