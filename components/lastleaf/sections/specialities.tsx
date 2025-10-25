import { useEffect, useState } from "react";

interface SpecialitiesContent {
  title: string;
  description: string;
  quote: string;
}

export default function SpecialitiesSection() {
  const [content, setContent] = useState<SpecialitiesContent>({
    title: 'Our Specialities',
    description: '',
    quote: ''
  });

  useEffect(() => {
    // Fetch specialities content from API
    fetch('/api/landing/specialities')
      .then(res => res.json())
      .then(data => setContent(data))
      .catch(err => console.error('Error loading specialities:', err));
  }, []);
  return (
    <section id="specialities" className="w-full py-12">
      <hr className="border-gray-300 dark:border-gray-700" />
      <div className="w-full py-20 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-transparent border-none shadow-none text-center flex flex-col items-center justify-center">
            <div className="mb-8">
              <div className="text-center">
                <h2 className="text-lg text-brand text-center mb-2 tracking-wider font-semibold">
                  Specialities
                </h2>

                <h2 className="text-3xl md:text-4xl text-center font-bold text-gray-900 dark:text-white">
                  {content.title}
                </h2>
              </div>
            </div>
            <div className="max-w-5xl text-lg md:text-xl text-brand px-6 leading-relaxed">
              {content.description}
            </div>

            <div className="text-gray-600 dark:text-gray-400 mt-8">
              {content.quote}
            </div>
          </div>
        </div>
      </div>
      <hr className="border-gray-300 dark:border-gray-700" />
    </section>
  );
}
