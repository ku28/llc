import LandingHeader from '../components/LandingHeader'
import Footer from '../components/lastleaf/sections/footer'

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
            <LandingHeader />
            <section id="about" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
                <hr className="border-gray-300 dark:border-gray-700 mb-12" />
                <div className="max-w-7xl mx-auto">
                <div className="bg-transparent border-none shadow-none text-center flex flex-col items-center justify-center">
                    <div className="mb-8">
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                            About Us
                        </h2>
                    </div>

                    <div className="max-w-5xl text-lg md:text-xl text-brand px-6 leading-relaxed">
                        LAST LEAF CARE is a leading Electrohomeopathic treatment centre all over the country. Doctors use Electrohomeopathic
                        Treatment to cure the acute & chronic diseases since 1965. Electrohomeopathy have served numerous patients with chronic
                        conditions with the help of natural substances and herbs/shurbs without any side effects. LAST LEAF CARE Electrohomeopathy
                        Centre gives you all forms of assurance for safe and effective treatment help. We have a team of experienced and well-equipped
                        doctors at our back (E.D.M.A.) who help maintain a healthy lifestyle with proper guidance and well-researched diet chart as per
                        patient&apos;s requirements. Our therapies focus more on patient&apos;s comfort to help them treat well both physically and psychologically.
                        LAST LEAF CARE Electrohomeopathy Centre provide expertise consultation and customized treatment help by understanding your health
                        issues and help to cure them naturally with Electrohomeopathic remedies.
                    </div>

                    <div className="text-gray-600 dark:text-gray-400 mt-12 text-lg italic">
                        &quot;Drugs are not always necessary. Belief in recovery always is.&quot; - Norman Cousins
                    </div>
                </div>
            </div>
            <hr className="border-gray-300 dark:border-gray-700 mt-12" />
        </section>
        <Footer />
        </div>
    );
}
