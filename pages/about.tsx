import { useState, useEffect } from 'react'
import LandingHeader from '../components/LandingHeader'
import Footer from '../components/lastleaf/sections/footer'

export default function AboutPage() {
    const [content, setContent] = useState({
        title: 'About Us',
        description: '',
        quote: ''
    })

    useEffect(() => {
        fetch('/api/about-content')
            .then(r => r.json())
            .then(data => {
                setContent({
                    title: data.title,
                    description: data.description,
                    quote: data.quote
                })
            })
            .catch(err => console.error('Error loading about content:', err))
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
            <LandingHeader />
            <section id="about" className="w-full py-12 sm:py-24 lg:py-32 px-4 sm:px-6 lg:px-8">
                <hr className="border-gray-300 dark:border-gray-700 mb-6 sm:mb-12" />
                <div className="max-w-7xl mx-auto">
                <div className="bg-transparent border-none shadow-none text-center flex flex-col items-center justify-center">
                    <div className="mb-6 sm:mb-8">
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            {content.title}
                        </h2>
                    </div>

                    <div className="max-w-5xl text-base sm:text-lg md:text-xl text-brand px-4 sm:px-6 leading-relaxed whitespace-pre-line">
                        {content.description}
                    </div>

                    {content.quote && (
                        <div className="text-gray-600 dark:text-gray-400 mt-8 sm:mt-12 text-base sm:text-lg italic px-4">
                            {content.quote}
                        </div>
                    )}
                </div>
            </div>
            <hr className="border-gray-300 dark:border-gray-700 mt-6 sm:mt-12" />
        </section>
        <Footer />
        </div>
    );
}
