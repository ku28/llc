import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import EditLayout from '../components/EditLayout'
import StatusModal from '../components/StatusModal'

type TabType = 'hero' | 'benefits' | 'videos' | 'specialities'

export default function EditHomePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabType>('hero')

    // Status modal states
    const [statusModal, setStatusModal] = useState({
        isOpen: false,
        status: 'loading' as 'loading' | 'success' | 'error',
        message: ''
    })

    // Hero Section Content
    const [heroContent, setHeroContent] = useState({
        badge: 'An Electrohomeopathy Centre',
        heading: 'Welcome to Last Leaf Care landing page',
        tagline: 'We Care.',
        imageUrl: 'https://res.cloudinary.com/dwgsflt8h/image/upload/v1749928246/banner_qf5r5l.png'
    })

    // Benefits Section Content
    const [benefitsContent, setBenefitsContent] = useState({
        title: 'Why Trust Us?',
        description: `LAST LEAF CARE Electrohomeopathy Centre is expertise in the medicinal world; it is one of the top growing Electrohomeopathy Centres in India; we have helped numerous patients from all over periphery & abroad as well with Electrohomeopathic treatment in our Electrohomeopathy Centre. And treated their chronic disorder without any side effects from their root cause. Electrohomeopathic treatment is very safe, and their medicines contain natural and herbal substances. We don't prescribe generic medication to our patients. Instead, provide the best Electrohomeopathic-based treatment with a proper guidance and a well-researched diet according to disease that can help patients. And also provides some facilities that cure patients physically and psychologically.`,
        benefits: [
            {
                icon: '💚',
                title: 'Consultation',
                description: 'Get a free consultation from LAST LEAF CARE Electrohomeopathy Centre to understand and analyze issues regarding your health.'
            },
            {
                icon: '💓',
                title: 'Diagnosis',
                description: 'At LAST LEAF CARE Electrohomeopathy Centre we try to differentiate the common symptoms of the disease and performs in-depth analysis for peculiar, uncommon characteristics.'
            },
            {
                icon: '🫶',
                title: 'Treatment',
                description: 'LAST LEAF CARE Electrohomeopathy Centre helps to provide a customized Electrohomeopathic treatment plan and diet charts for more accurate outcomes.'
            },
            {
                icon: '📅',
                title: 'Enquire Now',
                description: 'Request Appointment Repeat the Medicine. Enquire Now.'
            }
        ]
    })

    // Videos Section Content
    const [videos, setVideos] = useState([
        {
            embedUrl: 'https://www.youtube.com/embed/b0akJtrJb7c?si=ATmgLLyvBAr3OAck',
            title: 'YouTube video player'
        },
        {
            embedUrl: 'https://www.youtube.com/embed/JxqXi4JhWvg?si=vdo0EWvUxy426vhs',
            title: 'YouTube video player'
        },
        {
            embedUrl: 'https://www.youtube.com/embed/BE5v5OZPpMw?si=KoqkZmYW9fzB1oGp',
            title: 'YouTube video player'
        },
        {
            embedUrl: 'https://www.youtube.com/embed/-e8aabBBWN0?si=9DOmQ0wFQ14OgR9o',
            title: 'YouTube video player'
        }
    ])

    // Specialities Section Content
    const [specialitiesContent, setSpecialitiesContent] = useState({
        title: 'Our Specialities',
        description: `LAST LEAF CARE Electrohomeopathy Centre is one of the most prominent Electrohomeopathic Centres in area. Since 1965 Electohomeopathy has treated patients with well-experienced expertise and advanced Electrohomeopathic Methodology. We are offering our services to patients help them in the treatment of Kidney Diseases (like Chronic Kidney Disease, UTI, Diabetic Kidney Disease, Nephrotic syndrome, Renal cyst, Renal stone etc.), Neuralgias ( Trigeminal neuralgia, Glossopharyngeal neuralgia, Bell's Palsy etc.), Diabetes and other chronic diseases. This Electrohomeopathy Centre runs by doctor aiming to provide help for the best treatment to patients. In our Electrohomeopathy Centre, we provide help for customized treatment for each patient and follow up on their health conditions that can help cure them permanently. As a result, It is the only Electrohomeopathy Centre in Area that has built a reputation for its practical impact and evidence-based Electrohomeopathic Treatment guidance.`,
        quote: '"Drugs are not always necessary. Belief in recovery always is." - Norman Cousins'
    })

    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => r.json())
            .then(d => {
                if (!d.user || d.user.role !== 'admin') {
                    router.push('/')
                    return
                }
                setUser(d.user)
                loadContent()
            })
            .catch(() => {
                router.push('/')
            })
    }, [])

    const loadContent = async () => {
        setStatusModal({ isOpen: true, status: 'loading', message: 'Loading home page content...' })
        try {
            // Load hero
            const heroRes = await fetch('/api/landing/hero')
            if (heroRes.ok) {
                const heroData = await heroRes.json()
                setHeroContent({
                    badge: heroData.badge,
                    heading: heroData.heading,
                    tagline: heroData.tagline,
                    imageUrl: heroData.imageUrl
                })
            }

            // Load benefits
            const benefitsRes = await fetch('/api/landing/benefits')
            if (benefitsRes.ok) {
                const benefitsData = await benefitsRes.json()
                setBenefitsContent({
                    title: benefitsData.title,
                    description: benefitsData.description,
                    benefits: benefitsData.benefits
                })
            }

            // Load videos
            const videosRes = await fetch('/api/landing/videos')
            if (videosRes.ok) {
                const videosData = await videosRes.json()
                setVideos(videosData)
            }

            // Load specialities
            const specialitiesRes = await fetch('/api/landing/specialities')
            if (specialitiesRes.ok) {
                const specialitiesData = await specialitiesRes.json()
                setSpecialitiesContent({
                    title: specialitiesData.title,
                    description: specialitiesData.description,
                    quote: specialitiesData.quote
                })
            }

            setLoading(false)
            setStatusModal({ isOpen: false, status: 'loading', message: '' })
        } catch (error) {
            console.error('Error loading content:', error)
            setLoading(false)
            setStatusModal({ 
                isOpen: true, 
                status: 'error', 
                message: 'Failed to load content. Please try again.' 
            })
        }
    }

    const sidebarItems = [
        { id: 'hero' as TabType, label: 'Hero Section', icon: '🏠' },
        { id: 'benefits' as TabType, label: 'Benefits', icon: '✨' },
        { id: 'videos' as TabType, label: 'Our Videos', icon: '🎥' },
        { id: 'specialities' as TabType, label: 'Specialities', icon: '⭐' }
    ]

    const handleSave = async () => {
        setStatusModal({ 
            isOpen: true, 
            status: 'loading', 
            message: `Saving ${sidebarItems.find(s => s.id === activeTab)?.label}...` 
        })
        try {
            let endpoint = ''
            let data: any = null

            switch (activeTab) {
                case 'hero':
                    endpoint = '/api/landing/hero'
                    data = heroContent
                    break
                case 'benefits':
                    endpoint = '/api/landing/benefits'
                    data = benefitsContent
                    break
                case 'videos':
                    endpoint = '/api/landing/videos'
                    data = videos
                    break
                case 'specialities':
                    endpoint = '/api/landing/specialities'
                    data = specialitiesContent
                    break
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data })
            })

            if (res.ok) {
                setStatusModal({ 
                    isOpen: true, 
                    status: 'success', 
                    message: `${sidebarItems.find(s => s.id === activeTab)?.label} saved successfully!` 
                })
            } else {
                const errorData = await res.json().catch(() => ({}))
                throw new Error(errorData.error || 'Failed to save content')
            }
        } catch (error: any) {
            console.error('Save error:', error)
            setStatusModal({ 
                isOpen: true, 
                status: 'error', 
                message: error.message || 'Failed to save content. Please try again.' 
            })
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setStatusModal({ isOpen: true, status: 'loading', message: 'Uploading hero image...' })
        try {
            // Convert to base64
            const reader = new FileReader()
            reader.readAsDataURL(file)
            reader.onload = async () => {
                const base64 = reader.result as string

                // Upload to Cloudinary
                const res = await fetch('/api/upload-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64, folder: 'landing' })
                })

                const data = await res.json()
                if (data.url) {
                    setHeroContent({ ...heroContent, imageUrl: data.url })
                    setStatusModal({ 
                        isOpen: true, 
                        status: 'success', 
                        message: 'Hero image uploaded successfully!' 
                    })
                } else {
                    throw new Error('Upload failed')
                }
            }
        } catch (error: any) {
            console.error('Upload error:', error)
            setStatusModal({ 
                isOpen: true, 
                status: 'error', 
                message: error.message || 'Failed to upload image. Please try again.' 
            })
        }
    }

    const addVideo = () => {
        setVideos([...videos, { embedUrl: '', title: 'YouTube video player' }])
    }

    const deleteVideo = (index: number) => {
        setVideos(videos.filter((_, i) => i !== index))
    }

    const updateVideo = (index: number, embedUrl: string) => {
        const updated = [...videos]
        updated[index].embedUrl = embedUrl
        setVideos(updated)
    }

    const renderEditor = () => {
        switch (activeTab) {
            case 'hero':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Badge Text</label>
                            <input
                                type="text"
                                value={heroContent.badge}
                                onChange={(e) => setHeroContent({ ...heroContent, badge: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                placeholder="e.g., An Electrohomeopathy Centre"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Main Heading</label>
                            <input
                                type="text"
                                value={heroContent.heading}
                                onChange={(e) => setHeroContent({ ...heroContent, heading: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                placeholder="e.g., Welcome to Last Leaf Care landing page"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Tagline</label>
                            <input
                                type="text"
                                value={heroContent.tagline}
                                onChange={(e) => setHeroContent({ ...heroContent, tagline: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                placeholder="e.g., We Care."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Hero Image</label>
                            <div className="space-y-3">
                                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-green-500 dark:hover:border-green-500 transition-all bg-gray-50 dark:bg-gray-800/50">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />
                                    <div className="text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                            Click to upload hero image
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-500">PNG, JPG, GIF up to 10MB</p>
                                    </div>
                                </label>
                                {heroContent.imageUrl && (
                                    <div className="relative">
                                        <img src={heroContent.imageUrl} alt="Hero preview" className="w-full max-w-md rounded-lg border border-gray-300 dark:border-gray-600" />
                                        <button
                                            onClick={() => setHeroContent({ ...heroContent, imageUrl: '' })}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            title="Remove image"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )

            case 'benefits':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Section Title</label>
                            <input
                                type="text"
                                value={benefitsContent.title}
                                onChange={(e) => setBenefitsContent({ ...benefitsContent, title: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                rows={8}
                                value={benefitsContent.description}
                                onChange={(e) => setBenefitsContent({ ...benefitsContent, description: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            />
                        </div>

                        <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h3 className="text-lg font-semibold mb-4">Benefit Cards</h3>
                            {benefitsContent.benefits.map((benefit, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1">Icon</label>
                                            <input
                                                type="text"
                                                value={benefit.icon}
                                                onChange={(e) => {
                                                    const updated = [...benefitsContent.benefits]
                                                    updated[index].icon = e.target.value
                                                    setBenefitsContent({ ...benefitsContent, benefits: updated })
                                                }}
                                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium mb-1">Title</label>
                                            <input
                                                type="text"
                                                value={benefit.title}
                                                onChange={(e) => {
                                                    const updated = [...benefitsContent.benefits]
                                                    updated[index].title = e.target.value
                                                    setBenefitsContent({ ...benefitsContent, benefits: updated })
                                                }}
                                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-medium mb-1">Description</label>
                                            <textarea
                                                rows={2}
                                                value={benefit.description}
                                                onChange={(e) => {
                                                    const updated = [...benefitsContent.benefits]
                                                    updated[index].description = e.target.value
                                                    setBenefitsContent({ ...benefitsContent, benefits: updated })
                                                }}
                                                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case 'videos':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">YouTube Video URLs</h3>
                            <button
                                onClick={addVideo}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add Video
                            </button>
                        </div>

                        {videos.map((video, index) => (
                            <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium mb-2">Video #{index + 1} Embed URL</label>
                                        <input
                                            type="text"
                                            value={video.embedUrl}
                                            onChange={(e) => updateVideo(index, e.target.value)}
                                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                            placeholder="https://www.youtube.com/embed/..."
                                        />
                                    </div>
                                    <button
                                        onClick={() => deleteVideo(index)}
                                        className="mt-8 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Delete video"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )

            case 'specialities':
                return (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Section Title</label>
                            <input
                                type="text"
                                value={specialitiesContent.title}
                                onChange={(e) => setSpecialitiesContent({ ...specialitiesContent, title: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                placeholder="e.g., Our Specialities"
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                value={specialitiesContent.description}
                                onChange={(e) => setSpecialitiesContent({ ...specialitiesContent, description: e.target.value })}
                                rows={10}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                                placeholder="Enter the main description about your specialities..."
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium mb-2">Inspirational Quote</label>
                            <textarea
                                value={specialitiesContent.quote}
                                onChange={(e) => setSpecialitiesContent({ ...specialitiesContent, quote: e.target.value })}
                                rows={3}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                                placeholder='e.g., "Drugs are not always necessary. Belief in recovery always is." - Norman Cousins'
                            />
                        </div>
                    </div>
                )
        }
    }

    return (
        <EditLayout>
            <div className="max-w-7xl mx-auto px-4 pb-20">
                <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Edit Home Page</h1>

                {/* Mobile Tabs */}
                <div className="md:hidden mb-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                        <div className="flex gap-1 p-2 min-w-max">
                            {sidebarItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap text-sm ${
                                        activeTab === item.id
                                            ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="font-medium">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-6">
                    {/* Desktop Sidebar */}
                    <div className="hidden md:block w-64 flex-shrink-0">
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sticky top-24 border border-gray-200 dark:border-gray-700">
                            <nav className="space-y-1">
                                {sidebarItems.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                                            activeTab === item.id
                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30 font-medium'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-md'
                                        }`}
                                    >
                                        <span className="text-xl">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-4 sm:p-6 md:p-8 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                                        {sidebarItems.find(s => s.id === activeTab)?.label}
                                    </h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                        Edit the content for this section
                                    </p>
                                </div>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all shadow-md hover:shadow-lg font-medium"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Changes
                                </button>
                            </div>

                            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                                {renderEditor()}
                            </div>
                        </div>

                        {/* Info Card */}
                        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">Preview Changes</h3>
                                    <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                                        Changes are saved locally. Click "Save Changes" to persist them to the database. Visit the landing page to see your changes live.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <StatusModal
                isOpen={statusModal.isOpen}
                status={statusModal.status}
                message={statusModal.message}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
            />
        </EditLayout>
    )
}
