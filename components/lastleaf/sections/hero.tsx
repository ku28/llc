import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import BookingModal from '../../BookingModal'

export default function HeroSection() {
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)
    const [content, setContent] = useState({
        badge: 'An Electrohomeopathy Centre',
        heading: 'Welcome to Last Leaf Care landing page',
        headingGreen: 'Last Leaf Care',
        tagline: 'We Care.',
        imageUrl: 'https://res.cloudinary.com/dwgsflt8h/image/upload/v1749928246/banner_qf5r5l.png'
    })

    useEffect(() => {
        fetch('/api/landing/hero')
            .then(r => r.json())
            .then(data => {
                setContent({
                    badge: data.badge,
                    heading: data.heading,
                    headingGreen: data.headingGreen || 'Last Leaf Care',
                    tagline: data.tagline,
                    imageUrl: data.imageUrl
                })
            })
            .catch(err => console.error('Error loading hero:', err))
    }, [])

    return (
        <>
            <BookingModal isOpen={isBookingModalOpen} onClose={() => setIsBookingModalOpen(false)} />
            <section className="w-full px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="grid place-items-center max-w-7xl gap-6 sm:gap-8 mx-auto py-12 sm:py-16 md:py-20 lg:py-32">
                <div className="text-center space-y-4 sm:space-y-6 md:space-y-8">
                    <div className="inline-block">
                        <div className="px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-700 rounded-full text-xs sm:text-sm">
                            <span className="mr-1.5 sm:mr-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-brand text-white rounded-full text-[10px] sm:text-xs font-medium">
                                New
                            </span>
                            <span className="text-gray-700 dark:text-gray-300"> {content.badge} </span>
                        </div>
                    </div>

                    <div className="max-w-screen-md mx-auto text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold px-2">
                        <h1 className="text-gray-900 dark:text-white leading-tight">
                            {content.heading.split(content.headingGreen).map((part, index, arr) => (
                                <span key={index}>
                                    {part}
                                    {index < arr.length - 1 && (
                                        <span className="text-brand">{content.headingGreen}</span>
                                    )}
                                </span>
                            ))}
                        </h1>
                    </div>

                    <p className="max-w-screen-sm mx-auto text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400 px-4">
                        {content.tagline}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 px-4">
                        <button 
                            onClick={() => setIsBookingModalOpen(true)}
                            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-brand text-white rounded-lg text-sm sm:text-base font-bold hover:bg-brand-600 transition-colors group whitespace-nowrap"
                        >
                            Book Appointments
                            <span className="ml-2 inline-block group-hover:translate-x-1 transition-transform">→</span>
                        </button>

                        <Link
                            href="https://github.com/ku28/lastleafcare.git"
                            target="_blank"
                            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-white/10 dark:bg-white/10 backdrop-blur-md border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white rounded-lg text-sm sm:text-base font-bold hover:bg-white/20 dark:hover:bg-white/20 transition-all text-center whitespace-nowrap"
                        >
                            Connect With Us
                        </Link>
                    </div>
                </div>

                <div className="relative group mt-8 sm:mt-10 md:mt-14 w-full">
                    <div className="absolute top-2 lg:-top-8 left-1/2 transform -translate-x-1/2 w-[90%] mx-auto h-20 sm:h-24 lg:h-80 bg-brand/50 rounded-full blur-3xl"></div>
                    <Image
                        width={1200}
                        height={1200}
                        className="w-full md:w-[1200px] mx-auto rounded-lg relative leading-none flex items-center border border-gray-200 dark:border-gray-800 border-t-brand/30"
                        src={content.imageUrl}
                        alt="dashboard"
                    />

                    <div className="absolute bottom-0 left-0 w-full h-16 sm:h-20 md:h-28 bg-gradient-to-b from-transparent via-white/50 dark:via-[#0a0a0a]/50 to-white dark:to-[#0a0a0a] rounded-lg"></div>
                </div>
            </div>
        </section>
        </>
    );
}
