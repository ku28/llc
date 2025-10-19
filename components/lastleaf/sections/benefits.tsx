interface BenefitsProps {
  icon: string;
  title: string;
  description: string;
}

const benefitList: BenefitsProps[] = [
  {
    icon: "💚",
    title: "Consultation",
    description:
      "Get a free consultation from LAST LEAF CARE Electrohomeopathy Centre to understand and analyze issues regarding your health.",
  },
  {
    icon: "💓",
    title: "Diagnosis",
    description:
      "At LAST LEAF CARE Electrohomeopathy Centre we try to differentiate the common symptoms of the disease and performs in-depth analysis for peculiar, uncommon characteristics.",
  },
  {
    icon: "🫶",
    title: "Treatment",
    description:
      "LAST LEAF CARE Electrohomeopathy Centre helps to provide a customized Electrohomeopathic treatment plan and diet charts for more accurate outcomes.",
  },
  {
    icon: "📅",
    title: "Enquire Now",
    description:
      "Request Appointment Repeat the Medicine. Enquire Now.",
  },
];

export default function BenefitsSection() {
  return (
    <section id="benefits" className="w-full py-24 sm:py-32 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 place-items-center lg:gap-24">
          <div className="text-center lg:text-left mb-12 lg:mb-0">
            <h2 className="text-lg text-brand mb-2 tracking-wider font-semibold">Benefits</h2>

            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              Why Trust Us?
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
            LAST LEAF CARE Electrohomeopathy Centre is expertise in the medicinal world; 
            it is one of the top growing Electrohomeopathy Centres in India; we have helped 
            numerous patients from all over periphery & abroad as well with Electrohomeopathic 
            treatment in our Electrohomeopathy Centre. And treated their chronic disorder without 
            any side effects from their root cause. Electrohomeopathic treatment is very safe, and 
            their medicines contain natural and herbal substances. We don't prescribe generic medication 
            to our patients. Instead, provide the best Electrohomeopathic-based treatment with a proper 
            guidance and a well-researched diet according to disease that can help patients. And also 
            provides some facilities that cure patients physically and psychologically.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
            {benefitList.map(({ icon, title, description }, index) => (
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
