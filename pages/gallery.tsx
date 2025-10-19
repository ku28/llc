import Image from "next/image";
import LandingHeader from '../components/LandingHeader'
import Footer from '../components/lastleaf/sections/footer'

interface GalleryProps {
  imageUrl: string;
}

const galleryList: GalleryProps[] = [
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164667/a2_nuuwo0.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164667/a3_v6ic6r.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_v6ic6r.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a1_u4i3jx.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
  {
    imageUrl: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750164666/a3_1_ebo8df.png",
  },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <LandingHeader />
      <section id="gallery" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            Our Gallery
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {galleryList.map(({ imageUrl }, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-900 flex flex-col h-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 group hover:shadow-lg transition-all duration-300"
            >
              <div className="p-0 overflow-hidden">
                <Image
                  src={imageUrl}
                  alt={`Gallery image ${index + 1}`}
                  width={300}
                  height={300}
                  className="w-full aspect-square object-cover transition-all duration-300 ease-in-out group-hover:scale-105"
                />
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
