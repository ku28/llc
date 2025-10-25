import { useState, useEffect } from "react";
import Image from "next/image";
import LandingHeader from '../components/LandingHeader'
import Footer from '../components/lastleaf/sections/footer'

interface ServiceProps {
    image: string;
    name: string;
    tagline: string;
    info: string;
    description: string;
}

export default function ServicesPage() {
    const [services, setServices] = useState<ServiceProps[]>([])

    useEffect(() => {
        fetch('/api/services-content')
            .then(r => r.json())
            .then(data => setServices(data))
            .catch(err => console.error('Error loading services:', err))
    }, [])

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
            <LandingHeader />
            <section id="services" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                            Our Services
                        </h2>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6 w-full">
                        {services.map(({ image, name, tagline, info, description }, index) => (
                            <div
                                key={index}
                                className="bg-gray-50 dark:bg-gray-900 hover:bg-white dark:hover:bg-gray-800 transition-all duration-300 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group"
                            >
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <Image
                                            src={image}
                                            alt="services"
                                            width={300}
                                            height={200}
                                            className="w-full h-48 object-cover rounded-lg"
                                        />
                                        <span className="ml-4 text-5xl text-gray-200 dark:text-gray-800 font-medium transition-all duration-300 group-hover:text-gray-300 dark:group-hover:text-gray-700 flex-shrink-0">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">&quot;{tagline}&quot;</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{info}</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            <Footer />
        </div>
    );
}
