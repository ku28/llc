import Image from "next/image";
import LandingHeader from '../components/LandingHeader'
import Footer from '../components/lastleaf/sections/footer'

interface ServiceProps {
    image: string;
    name: string;
    userName: string;
    info: string;
    comment: string;
}

const serviceList: ServiceProps[] = [
    {
        image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750162752/trigeminal-neuralgia-2202_cnz7ri.jpg",
        name: "Trigeminal Neulalgia (TN) Treatment",
        userName: `"No more shocks to bear"`,
        info: "As indicated by Lambru G, et al. Practical Neurology 2021;21:392-402.",
        comment:
            "Trigeminal neuralgia (TN) is characterised by recurrent, unilateral, brief (<1 s-2 min), very painful, electric shock-like pain episodes in the trigeminal distribution that are abrupt in onset and termination. It is a highly debilitating disorder that impacts on basic human functions such as talking, eating, drinking and touching the face, thereby resulting in a poor quality of life. As per Journal of Korean Neurosurgical Society 66 (1) : 12-23, 2023 Glossopharyngeal neuralgia (GPN) is a rare disease that must be differentiated from trigeminal neuralgia. Glossopharyngeal neuralgia (GPN) can cause sharp, stabbing, or shooting pain in the throat area near the tonsils, the back of the tongue or the middle ear. The pain occurs along the pathway of the glossopharyngeal nerve, which is located deep in the neck. It serves the back of the tongue, throat and the parotid gland (one of the salivary glands) the middle ear and eustachian tube. However, Trigeminal Neulalgia (TN)/Glossopharygeal Neuralgia (GPN) is susceptible and vulnerable, so using other medical Pathies, medicine has many chances of side effects. But in the case of Electrohomeopathy, it has proved very effective by studying the nerve type, genetic and immune system factors of patients. We at LAST LEAF CARE Electrohomeopathy Centre help patients with neuralgias by giving them guidance and medicine that helps to cure the same without any side effects.",
    },
    {
        image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163029/physiotherapy-for-bells-palsy-calgary-nw_yjk4h3.jpg",
        name: "Bell's palsy Treatment",
        userName: `"Move with your intact expressions"`,
        info: "As evident in Eviston TJ, et al. Journal of Neurology, Neurosurgery and Psychiatry 2015;86:1356-1361.",
        comment:
            "Bell's palsy is a common cranial neuropathy causing acute unilateral lower motor neuron facial paralysis. Immune, infective and ischaemic mechanisms are all potential contributors to the development of Bell's palsy, The clinical presentation of the disorder is a rapid onset, unilateral, lower motor neuron-type facial weakness with accompanying symptoms of postauricular pain, dysgeusia, subjective change in facial sensation and hyperacusis. Electrohomeopathy gives supportive treatment; Electrohomeopathy is obtained from natural plant sources to treat nerve paralysis. Later's recovery result varies from person to person; an earlier start, the medicine has a higher chance to help cure better. Electrohomeopathy uses natural treatment to cure patients, so it has no side effects on the nervous system and is safe for long-term use. LAST LEAF CARE Electrohomeopathy Centre has expertise in this type of medicine that helps to heal the nervous tissues and also helps strengthen muscle tissues that has atrophied.",
    },
    {
        image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163377/type-1-diabetes-treatment-and-diagnosis_bsic0x.jpg",
        name: "Diabetes mellitus (DM) Treatment",
        userName: `"See off your sweet poison forever"`,
        info: "As per Diabetes mellitus Article • December 2014",
        comment:
            "Diabetes mellitus (DM) also known as simply diabetes, is a group of metabolic diseases in which there are high blood sugar levels over a prolonged period. This high blood sugar produces the symptoms of frequent urination, increased thirst, and increased hunger. Untreated, diabetes can cause many complications. Diabetes is due to either the pancreas not producing enough insulin, or the cells of the body not responding properly to the insulin produced. There are three main types of diabetes mellitus: 1. (IDDM) or \"juvenile diabetes\".; 2. Type 2 DM (NIDDM) or \"adult-onset diabetes\"; 3. Gestational diabetes. Electrohomeopathy is believed to trigger antibodies to cure naturally. Electrohomeopathy fixes all the diseases from the root level and prevents further dysfunction, especially it controls glucose levels in the blood. We at LAST LEAF CARE Electrohomeopathy Centre mainly focuses on patients with all kinds of problems related to the metabolism with expert guidance and Electrohomeopathic-based treatment help to cure the diseases.",
    },
    {
        image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163542/chronic-kidney-disease-2_hbberl.jpg",
        name: "Chronic Kidney Disease Treatment",
        userName: `"Say Bye to Dialysis"`,
        info: "According to Advances in Therapy (2022) 39:193-220",
        comment:
            "Chronic Kidney Disease CKD is diagnosed when the estimated glomerular filtration rate (eGFR) declines below 60 mL/min/1.73 m2 or the urinary albumin-to-creatinine ratio (UACR) equals or exceeds 30 mg/g for 3 months or longer. Delaying disease progression and reducing the risk of mortality are key goals in the treatment of chronic kidney disease (CKD). Wherein in any other medical system, there is no natural treatment for kidney disease & there are great beliefs and trust in Electrohomeopathy medicines for kidney dysfunction curing help. In medicine, Electrohomeopathy is known as a superhero that triggers antibodies to cure naturally. Electrohomeopathy fixes all the diseases from the root level and prevents further dysfunction, especially it helps control creatinine levels in the blood. We at LAST LEAF CARE Electrohomeopathy Centre mainly focuses on patients with all kinds of problems related to the kidneys with expert guidance and Electrohomeopathic-based treatment help to cure.",
    },
    {
        image: "https://res.cloudinary.com/dwgsflt8h/image/upload/v1750163839/1696835903Understanding-Gallstones-and-Treatments-scaled_rumofu.webp",
        name: "Gallstone Treatment",
        userName: `"Get rid of stones in the way to digestion"`,
        info: "As mentioned in Nigerian Journal of Surgery Jul-Dec 2013 | Volume 19 | Issue 2",
        comment:
            "Gallstones or choleliths are hardened deposits of the digestive fluid bile, that can form within the gallbladder. They vary in size and shape from as small as a grain of sand to as large as a golf ball. Gallstones occur when there is an imbalance in the chemical constituents of bile that result in precipitation of one or more of the components. High biliary protein and lipid concentrations are risk factors for the formation of gallstones, while gallbladder sludge is thought to be the usual precursor of gallstones. Biliary calcium concentration also plays a part in bilirubin precipitation and gallstone calcification. There are generally two types of gallstones: i) cholesterol and ii) pigment stones. Gallstone disease may not be symptomatic until there are complications. There are great beliefs and trust in We at LAST LEAF CARE Electrohomeopathy Centre helps patients with medication of Electrohomeopathic methodology for curing the disease in less time, and our expert guidance (E.D.M.A.) or researched diet charts that affect on patient's lifestyle in a healthy way.",
    },
];

export default function ServicesPage() {
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
                        {serviceList.map(({ image, name, userName, info, comment }, index) => (
                            <div
                                key={name}
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
                                            0{index + 1}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{userName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{info}</p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {comment}
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
