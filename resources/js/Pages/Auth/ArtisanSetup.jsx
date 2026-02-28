import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { 
    UploadCloud, CheckCircle2, FileText, ShieldCheck, MapPin, 
    ArrowLeft, FileCheck, Store, Phone, Building, Clock, 
    Sparkles, ArrowRight, LogOut, ChevronDown
} from 'lucide-react';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';

// --- COMPLETE CAVITE BARANGAY DATA ---
const CAVITE_BARANGAYS = {
    // Cities
    "Bacoor City": ["Alima", "Aniban I", "Aniban II", "Aniban III", "Aniban IV", "Aniban V", "Banalo", "Bayanan", "Camposanto", "Daang Bukid", "Digman", "Dulong Bayan", "Habay I", "Habay II", "Kaingin", "Ligas I", "Ligas II", "Ligas III", "Mabolo I", "Mabolo II", "Mabolo III", "Maliksi I", "Maliksi II", "Maliksi III", "Mambog I", "Mambog II", "Mambog III", "Mambog IV", "Mambog V", "Molino I", "Molino II", "Molino III", "Molino IV", "Molino V", "Molino VI", "Molino VII", "Niog I", "Niog II", "Niog III", "P.F. Espiritu I", "P.F. Espiritu II", "P.F. Espiritu III", "P.F. Espiritu IV", "P.F. Espiritu V", "P.F. Espiritu VI", "P.F. Espiritu VII", "P.F. Espiritu VIII", "Panapaan I", "Panapaan II", "Panapaan III", "Panapaan IV", "Panapaan V", "Panapaan VI", "Panapaan VII", "Panapaan VIII", "Queens Row Central", "Queens Row East", "Queens Row West", "Real I", "Real II", "Salinas I", "Salinas II", "Salinas III", "Salinas IV", "San Nicolas I", "San Nicolas II", "San Nicolas III", "Sineguelasan", "Tabing Dagat", "Talaba I", "Talaba II", "Talaba III", "Talaba IV", "Talaba V", "Talaba VI", "Talaba VII", "Zapote I", "Zapote II", "Zapote III", "Zapote IV", "Zapote V"],
    "Cavite City": ["Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5", "Barangay 6", "Barangay 7", "Barangay 8", "Barangay 9", "Barangay 10", "Barangay 10-A", "Barangay 10-B", "Barangay 11", "Barangay 12", "Barangay 13", "Barangay 14", "Barangay 15", "Barangay 16", "Barangay 17", "Barangay 18", "Barangay 19", "Barangay 20", "Barangay 21", "Barangay 22", "Barangay 22-A", "Barangay 23", "Barangay 24", "Barangay 25", "Barangay 26", "Barangay 27", "Barangay 28", "Barangay 29", "Barangay 29-A", "Barangay 30", "Barangay 31", "Barangay 32", "Barangay 33", "Barangay 34", "Barangay 35", "Barangay 36", "Barangay 36-A", "Barangay 37", "Barangay 38", "Barangay 38-A", "Barangay 39", "Barangay 40", "Barangay 41", "Barangay 42", "Barangay 42-A", "Barangay 42-B", "Barangay 42-C", "Barangay 43", "Barangay 44", "Barangay 45", "Barangay 46", "Barangay 47", "Barangay 48", "Barangay 49", "Barangay 50", "Barangay 51", "Barangay 52", "Barangay 53", "Barangay 54", "Barangay 55", "Barangay 56", "Barangay 57", "Barangay 58", "Barangay 59", "Barangay 60", "Barangay 61", "Barangay 62"],
    "Dasmariñas City": ["Burol I", "Burol II", "Burol III", "Burol Main", "Datu Esmael", "Emmanuel Bergado I", "Emmanuel Bergado II", "Fatima I", "Fatima II", "Fatima III", "Langkaan I", "Langkaan II", "Luzviminda I", "Luzviminda II", "Paliparan I", "Paliparan II", "Paliparan III", "Sabang", "Salawag", "Salitran I", "Salitran II", "Salitran III", "Salitran IV", "Salitran V", "Salitran VI", "Sampaloc I", "Sampaloc II", "Sampaloc III", "Sampaloc IV", "Sampaloc V", "San Agustin I", "San Agustin II", "San Agustin III", "San Andres I", "San Andres II", "San Dionisio", "San Esteban", "San Francisco", "San Jose", "San Juan", "San Lorenzo Ruiz I", "San Lorenzo Ruiz II", "San Luis I", "San Luis II", "San Manuel I", "San Manuel II", "San Miguel I", "San Miguel II", "San Nicolas I", "San Nicolas II", "San Roque", "San Simon", "Santa Cruz I", "Santa Cruz II", "Santa Fe", "Santa Lucia", "Santa Maria", "Santo Cristo", "Santo Niño I", "Santo Niño II", "Victoria Reyes", "Zone I", "Zone I-A", "Zone II", "Zone III", "Zone IV"],
    "General Trias City": ["Alingaro", "Arnaldo Pob.", "Bacao I", "Bacao II", "Bagumbayan Pob.", "Biclatan", "Buenavista I", "Buenavista II", "Buenavista III", "Corregidor Pob.", "Dulong Bayan Pob.", "Gov. Ferrer Pob.", "Javalera", "Manggahan", "Navarro", "Ninety Kawit", "Panungyanan", "Pasong Camachile I", "Pasong Camachile II", "Pasong Kawayan I", "Pasong Kawayan II", "Pinagtipunan", "Prinza Pob.", "Sampalucan Pob.", "San Francisco", "San Gabriel Pob.", "San Juan I", "San Juan II", "Santa Clara", "Santiago Pob.", "Tapia", "Tejero", "Vibora Pob."],
    "Imus City": ["Alapan I-A", "Alapan I-B", "Alapan I-C", "Alapan II-A", "Alapan II-B", "Anabu I-A", "Anabu I-B", "Anabu I-C", "Anabu I-D", "Anabu I-E", "Anabu I-F", "Anabu I-G", "Anabu II-A", "Anabu II-B", "Anabu II-C", "Anabu II-D", "Anabu II-E", "Anabu II-F", "Bagong Silang", "Bayan Luma I", "Bayan Luma II", "Bayan Luma III", "Bayan Luma IV", "Bayan Luma V", "Bayan Luma VI", "Bayan Luma VII", "Bayan Luma VIII", "Bayan Luma IX", "Buhay na Tubig", "Bucandala I", "Bucandala II", "Bucandala III", "Bucandala IV", "Bucandala V", "Carsadang Bago I", "Carsadang Bago II", "Magdalo", "Maharlika", "Malagasang I-A", "Malagasang I-B", "Malagasang I-C", "Malagasang I-D", "Malagasang I-E", "Malagasang I-F", "Malagasang I-G", "Malagasang II-A", "Malagasang II-B", "Malagasang II-C", "Malagasang II-D", "Malagasang II-E", "Malagasang II-F", "Malagasang II-G", "Mariano Espeleta I", "Mariano Espeleta II", "Mariano Espeleta III", "Medicion I-A", "Medicion I-B", "Medicion I-C", "Medicion I-D", "Medicion II-A", "Medicion II-B", "Medicion II-C", "Medicion II-D", "Medicion II-E", "Medicion II-F", "Palico I", "Palico II", "Palico III", "Palico IV", "Pasong Buaya I", "Pasong Buaya II", "Pinagbuklod", "Poblacion I-A", "Poblacion I-B", "Poblacion I-C", "Poblacion II-A", "Poblacion II-B", "Poblacion III-A", "Poblacion III-B", "Poblacion IV-A", "Poblacion IV-B", "Poblacion IV-C", "Poblacion IV-D", "Tanzang Luma I", "Tanzang Luma II", "Tanzang Luma III", "Tanzang Luma IV", "Tanzang Luma V", "Tanzang Luma VI", "Toclong I-A", "Toclong I-B", "Toclong I-C", "Toclong II-A", "Toclong II-B"],
    "Tagaytay City": ["Asisan", "Bagong Tubig", "Calabuso", "Dapdap East", "Dapdap West", "Francisco", "Guinhawa North", "Guinhawa South", "Iruhin Central", "Iruhin East", "Iruhin South", "Iruhin West", "Kaybagal Central", "Kaybagal North", "Kaybagal South", "Mag-Asawang Ilat", "Maharlika East", "Maharlika West", "Maitim II Central", "Maitim II East", "Maitim II West", "Mendez Crossing East", "Mendez Crossing West", "Neogan", "Patutong Malaki North", "Patutong Malaki South", "Sambong", "San Jose", "Silang Junction North", "Silang Junction South", "Sungay East", "Sungay West", "Tolentino East", "Tolentino West", "Zambal"],
    "Trece Martires City": ["Aguado", "Cabezas", "Cabuco", "Conchu", "De Ocampo", "Gregorio", "Inocencio", "Lapidario", "Lallana", "Luciano", "Osorio", "Perez", "San Agustin"],
    // Municipalities
    "Alfonso": ["Amuyong", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Barangay V", "Bilog", "Buck Estate", "Esperanza Ibaba", "Esperanza Ilaya", "Kaysuyo", "Luksuhin Ibaba", "Luksuhin Ilaya", "Mangas I", "Mangas II", "Marahan I", "Marahan II", "Matagbak I", "Matagbak II", "Pajo", "Palumlum", "Kaytambog", "Kaytapos", "Upli", "Sikat", "Sinaliw Malaki", "Sinaliw Maliit", "Taywanak Ibaba", "Taywanak Ilaya", "Upli"],
    "Amadeo": ["Banaybanay", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Barangay V", "Barangay VI", "Barangay VII", "Barangay VIII", "Bucal", "Buho", "Dagatan", "Halang", "Laging Handa", "Maymangga", "Minantok East", "Minantok West", "Pangil", "Salaban", "Talon", "Tamacan"],
    "Carmona": ["Bancal", "Cabilang Baybay", "Lantic", "Mabuhay", "Maduya", "Milagrosa"],
    "Indang": ["Agus-os", "Alulod", "Banaba Cerca", "Banaba Lejos", "Bancod", "Buna Cerca", "Buna Lejos I", "Buna Lejos II", "Calumpang Cerca", "Calumpang Lejos I", "Calumpang Lejos II", "Carasuchi", "Daine I", "Daine II", "Guyam Malaki", "Guyam Munti", "Harasan", "Kayquit I", "Kayquit II", "Kayquit III", "Kaytapos", "Limbon", "Lumampong Balagbag", "Lumampong Halayhay", "Mahabang Kahoy Cerca", "Mahabang Kahoy Lejos", "Mataas na Lupa", "Pulo", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Tambo Balagbag", "Tambo Ilaya", "Tambo Kulit", "Tambo Malaki", "Poblacion"],
    "Kawit": ["Balsahan-Bisita", "Batong Dalig", "Binakayan-Aplaya", "Binakayan-Kanluran", "Gahak", "Kaingen", "Marulas", "Panamitan", "Poblacion", "Pulvorista", "Samala-Marquez", "San Sebastian", "Santa Isabel", "Tabon I", "Tabon II", "Tabon III", "Toclong", "Tramo-Bantayan", "Wakas I", "Wakas II"],
    "Magallanes": ["Baliwag", "Barangay 1", "Barangay 2", "Barangay 3", "Barangay 4", "Barangay 5", "Barangay 6", "Barangay 7", "Bendita I", "Bendita II", "Caluangan", "Pacheco", "Ramirez", "San Agustin"],
    "Maragondon": ["Bucal I", "Bucal II", "Bucal III-A", "Bucal III-B", "Bucal IV-A", "Bucal IV-B", "Caingin Pob.", "Garita I-A", "Garita I-B", "Layong Mabilog", "Mabato", "Pantihan I", "Pantihan II", "Pantihan III", "Pantihan IV", "Patungan", "Pinagsanhan I-A", "Pinagsanhan I-B", "Poblacion I-A", "Poblacion I-B", "Poblacion II-A", "Poblacion II-B", "San Miguel I-A", "San Miguel I-B", "Talipusngo", "Tulay Kanluran", "Tulay Silangan"],
    "Mendez": ["Anuling Cerca I", "Anuling Cerca II", "Anuling Lejos I", "Anuling Lejos II", "Ayungon", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Galicia I", "Galicia II", "Galicia III", "Panungyan I", "Panungyan II", "Palocpoc I", "Palocpoc II"],
    "Naic": ["Bagong Karsada", "Balsahan", "Bancaan", "Bucana Malaki", "Bucana Sasahan", "Calubcob I", "Calubcob II", "Capt. C. Nazareno", "Gomez-Zamora", "Halang", "Humbac", "Ibayo Estacion", "Ibayo Silangan", "Kanluran", "Labac", "Latoria", "Mabolo", "Makina", "Malainen Bago", "Malainen Luma", "Molino", "Munting Mapino", "Palangue I", "Palangue II", "Palangue III", "Poblacion I", "Poblacion II", "Poblacion III", "Poblacion IV", "Sabang", "San Roque", "Santulan", "Sapa", "Timalan Balsahan", "Timalan Concepcion"],
    "Noveleta": ["Magdiwang", "Poblacion", "Salcedo I", "Salcedo II", "San Antonio I", "San Antonio II", "San Jose I", "San Jose II", "San Juan I", "San Juan II", "San Rafael I", "San Rafael II", "San Rafael III", "San Rafael IV", "Santa Rosa I", "Santa Rosa II"],
    "Rosario": ["Bagbag I", "Bagbag II", "Kanluran", "Ligtong I", "Ligtong II", "Ligtong III", "Ligtong IV", "Muzon I", "Muzon II", "Poblacion", "Sapa I", "Sapa II", "Sapa III", "Sapa IV", "Silangan I", "Silangan II", "Wawa I", "Wawa II", "Wawa III"],
    "Silang": ["Acacia", "Adlas", "Anahaw I", "Anahaw II", "Balite I", "Balite II", "Batas", "Biga I", "Biga II", "Biluso", "Bucal", "Buho", "Bulihan", "Cabangaan", "Carmen", "Hoyo", "Hukay", "Iba", "Inchican", "Ipil I", "Ipil II", "Kalubkob", "Kaong", "Lalaan I", "Lalaan II", "Litlit", "Lucsuhin", "Lumil", "Magallanes", "Malabag", "Mataas na Burol", "Munting Ilog", "Narra I", "Narra II", "Narra III", "Paligawan", "Pasong Langka", "Pooc I", "Pooc II", "Poblacion I", "Poblacion II", "Poblacion III", "Poblacion IV", "Poblacion V", "Pulong Bunga", "Pulong Saging", "Puting Kahoy", "Sabutan", "San Miguel I", "San Miguel II", "San Vicente I", "San Vicente II", "Santol", "Toledo", "Tubuan I", "Tubuan II", "Tubuan III", "Ulat", "Yakal"],
    "Tanza": ["Amaya I", "Amaya II", "Amaya III", "Amaya IV", "Amaya V", "Amaya VI", "Amaya VII", "Bagtas", "Biga", "Biwas", "Bucal", "Bunga", "Calibuyo", "Capipisa", "Daang Amaya I", "Daang Amaya II", "Daang Amaya III", "Halayhay", "Julugan I", "Julugan II", "Julugan III", "Julugan IV", "Julugan V", "Julugan VI", "Julugan VII", "Julugan VIII", "Mulawin", "Navotas", "Punta I", "Punta II", "Sahud Ulan", "Sanja Mayor", "Santol", "Tanauan", "Tres Cruses"],
    "Ternate": ["Bucana", "De Ocampo", "Poblacion I", "Poblacion II", "Poblacion III", "San Jose", "San Juan I", "San Juan II", "Sapang I", "Sapang II"]
};

export default function ArtisanSetup({ auth }) {
    const [step, setStep] = useState(1);
    const isRejected = auth.user.artisan_status === 'rejected';

    const { data, setData, post, processing, errors, transform } = useForm({
        current_step: 1,
        shop_name: auth.user.shop_name || '',
        phone_number: auth.user.phone_number || '',
        street_address: auth.user.street_address || '',
        city: auth.user.city || 'Dasmariñas City',
        barangay: '',
        zip_code: auth.user.zip_code || '',
        business_permit: null,
        dti_registration: null,
        valid_id: null,
        tin_id: null,
    });

    const submit = (e) => {
        e.preventDefault();

        transform((data) => ({
            ...data,
            current_step: step,
        }));

        post(route('artisan.setup.store'), {
            forceFormData: true,
            onSuccess: () => {
                if (step < 2) setStep(step + 1);
                else {
                    window.location.href = '/artisan/pending';
                }
            },
            onError: (err) => console.error("Submission Errors:", err)
        });
    };

    const handleFileChange = useCallback((file, field) => {
        setData(field, file);
    }, [setData]);

    const currentBarangays = useMemo(() => CAVITE_BARANGAYS[data.city] || [], [data.city]);

    return (
        <>
            <Head title="Setup Your Shop" />

            <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-lg border-b border-amber-100 sticky top-0 z-50">
                    <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img 
                                src="/images/logo.png" 
                                alt="LikhangKamay" 
                                className="h-10 w-10 object-contain"
                            />
                            <div>
                                <h1 className="font-bold text-gray-900">LikhangKamay</h1>
                                <p className="text-xs text-gray-500">Seller Onboarding</p>
                            </div>
                        </div>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition"
                        >
                            <LogOut size={16} /> Sign Out
                        </Link>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-4xl mx-auto px-4 py-8">
                    {/* Rejection Banner */}
                    {isRejected && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                                    <ShieldCheck size={20} className="text-red-600" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-red-800">Your Previous Application Was Rejected</h3>
                                    <p className="text-sm text-red-700 mt-1">{auth.user.artisan_rejection_reason}</p>
                                    <p className="text-xs text-red-600 mt-2">Please update your documents and resubmit.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Hero Section */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-full text-sm font-medium mb-4">
                            <Sparkles size={16} /> Become a Verified Seller
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-gray-900 mb-2">
                            Setup Your Artisan Shop
                        </h1>
                        <p className="text-gray-500 max-w-md mx-auto">
                            Complete your profile to start selling your handcrafted products to customers across the Philippines.
                        </p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-0 bg-white rounded-2xl p-1 shadow-lg border border-gray-100">
                            <StepPill number={1} label="Shop Info" active={step >= 1} current={step === 1} />
                            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-clay-500' : 'bg-gray-200'}`} />
                            <StepPill number={2} label="Documents" active={step >= 2} current={step === 2} />
                            <div className="w-8 h-0.5 bg-gray-200" />
                            <StepPill icon={<Clock size={14} />} label="Review" active={false} current={false} />
                        </div>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                        
                        {/* STEP 1: SHOP INFO */}
                        {step === 1 && (
                            <form onSubmit={submit} className="p-6 sm:p-10">
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-10 h-10 bg-clay-100 rounded-xl flex items-center justify-center">
                                            <MapPin size={20} className="text-clay-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Business Details</h2>
                                            <p className="text-sm text-gray-500">Tell us about your artisan shop</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* Shop Name */}
                                    <div>
                                        <InputLabel htmlFor="shop_name" value="Shop Name *" />
                                        <div className="relative mt-1">
                                            <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <TextInput 
                                                id="shop_name" 
                                                value={data.shop_name} 
                                                onChange={(e) => setData('shop_name', e.target.value)} 
                                                className="w-full pl-12 py-3 rounded-xl" 
                                                placeholder="e.g. Silang Pottery Works" 
                                            />
                                        </div>
                                        <InputError message={errors.shop_name} className="mt-2" />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <InputLabel htmlFor="phone_number" value="Contact Number *" />
                                        <div className="relative mt-1">
                                            <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <TextInput 
                                                id="phone_number" 
                                                value={data.phone_number} 
                                                onChange={(e) => setData('phone_number', e.target.value)} 
                                                className="w-full pl-12 py-3 rounded-xl" 
                                                placeholder="09XX XXX XXXX" 
                                            />
                                        </div>
                                        <InputError message={errors.phone_number} className="mt-2" />
                                    </div>

                                    {/* Address Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <InputLabel htmlFor="street_address" value="Street Address *" />
                                            <div className="relative mt-1">
                                                <Building size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <TextInput 
                                                    id="street_address" 
                                                    value={data.street_address} 
                                                    onChange={(e) => setData('street_address', e.target.value)} 
                                                    className="w-full pl-12 py-3 rounded-xl" 
                                                    placeholder="House No., Street Name" 
                                                />
                                            </div>
                                            <InputError message={errors.street_address} className="mt-2" />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="city" value="City / Municipality *" />
                                            <DropdownSelect
                                                id="city"
                                                value={data.city}
                                                onChange={(val) => {
                                                    setData(prev => ({ ...prev, city: val, barangay: '' }));
                                                }}
                                                options={Object.keys(CAVITE_BARANGAYS)}
                                                placeholder="Select City/Municipality"
                                            />
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="barangay" value="Barangay *" />
                                            <DropdownSelect
                                                id="barangay"
                                                value={data.barangay}
                                                onChange={(val) => setData('barangay', val)}
                                                options={currentBarangays}
                                                placeholder="Select Barangay"
                                                required
                                            />
                                            {errors.barangay && <InputError message={errors.barangay} className="mt-2" />}
                                        </div>

                                        <div>
                                            <InputLabel htmlFor="zip_code" value="Zip Code *" />
                                            <TextInput 
                                                id="zip_code" 
                                                value={data.zip_code} 
                                                onChange={(e) => setData('zip_code', e.target.value)} 
                                                className="w-full mt-1 py-3 rounded-xl" 
                                                placeholder="4118" 
                                            />
                                            <InputError message={errors.zip_code} className="mt-2" />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-clay-600 to-clay-700 text-white font-bold rounded-xl shadow-lg shadow-clay-200 hover:from-clay-700 hover:to-clay-800 transition disabled:opacity-50"
                                    >
                                        Continue to Documents <ArrowRight size={18} />
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* STEP 2: LEGAL DOCUMENTS */}
                        {step === 2 && (
                            <form onSubmit={submit} className="p-6 sm:p-10">
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                            <FileText size={20} className="text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-gray-900">Legal Verification</h2>
                                            <p className="text-sm text-gray-500">Upload clear photos or scans of your documents</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                    <p className="text-sm text-amber-800">
                                        <strong>📋 Why do we need these?</strong> To protect buyers and ensure authenticity of all artisan sellers on our platform.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FileUploadField 
                                        label="Business Permit (Mayor's Permit)" 
                                        id="business_permit" 
                                        file={data.business_permit} 
                                        onFileSelect={(file) => handleFileChange(file, 'business_permit')} 
                                        error={errors.business_permit} 
                                    />
                                    <FileUploadField 
                                        label="DTI Registration" 
                                        id="dti_registration" 
                                        file={data.dti_registration}
                                        onFileSelect={(file) => handleFileChange(file, 'dti_registration')} 
                                        error={errors.dti_registration} 
                                    />
                                    <FileUploadField 
                                        label="Valid Government ID (Front)" 
                                        id="valid_id" 
                                        file={data.valid_id}
                                        onFileSelect={(file) => handleFileChange(file, 'valid_id')} 
                                        error={errors.valid_id} 
                                    />
                                    <FileUploadField 
                                        label="TIN ID / Registration" 
                                        id="tin_id" 
                                        file={data.tin_id}
                                        onFileSelect={(file) => handleFileChange(file, 'tin_id')} 
                                        error={errors.tin_id} 
                                    />
                                </div>

                                <div className="mt-8 flex items-center justify-between">
                                    <button 
                                        type="button"
                                        onClick={() => setStep(1)}
                                        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium transition"
                                    >
                                        <ArrowLeft size={16} /> Back
                                    </button>

                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className="flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:from-green-700 hover:to-green-800 transition disabled:opacity-50"
                                    >
                                        {processing ? 'Uploading...' : 'Submit for Review'} <CheckCircle2 size={18} />
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>By submitting, you agree to our <Link href="/seller-agreement" className="text-clay-600 underline">Seller Agreement</Link> and <Link href="/seller-privacy" className="text-clay-600 underline">Data Privacy Policy</Link>.</p>
                    </div>
                </main>
            </div>
        </>
    );
}

// --- COMPONENTS ---

function StepPill({ number, icon, label, active, current }) {
    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition ${
            current ? 'bg-clay-600 text-white' : active ? 'bg-clay-100 text-clay-700' : 'text-gray-400'
        }`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                current ? 'bg-white text-clay-600' : active ? 'bg-clay-200 text-clay-700' : 'bg-gray-100'
            }`}>
                {icon || number}
            </div>
            <span className="text-sm font-medium hidden sm:block">{label}</span>
        </div>
    );
}

const FileUploadField = React.memo(({ label, id, onFileSelect, error, file }) => {
    const inputRef = useRef(null);

    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <div 
                onClick={() => inputRef.current?.click()}
                className={`mt-1 flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl hover:bg-gray-50 transition cursor-pointer ${
                    file ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-white'
                }`}
            >
                {file ? (
                    <>
                        <FileCheck size={32} className="text-green-600 mb-2" />
                        <p className="text-sm font-medium text-green-700 truncate max-w-full">{file.name}</p>
                        <p className="text-xs text-green-600">Click to change</p>
                    </>
                ) : (
                    <>
                <UploadCloud size={32} className="text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-600">Click to upload</p>
                        <p className="text-xs text-gray-400">PNG, JPG, PDF up to 5MB</p>
                    </>
                )}
                <input 
                    ref={inputRef}
                    id={id} 
                    name={id} 
                    type="file" 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])} 
                    accept="image/*,.pdf" 
                />
            </div>
            <InputError message={error} className="mt-2" />
        </div>
    );
});

// Custom Dropdown that opens DOWNWARD with max 5 visible items
function DropdownSelect({ id, value, onChange, options, placeholder, required }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!search) return options;
        return options.filter(opt => 
            opt.toLowerCase().includes(search.toLowerCase())
        );
    }, [options, search]);

    // Close on outside click
    React.useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (opt) => {
        onChange(opt);
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="relative mt-1" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                id={id}
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
                }}
                className={`w-full py-3 px-4 text-left border border-gray-300 rounded-xl shadow-sm bg-white flex items-center justify-between focus:border-clay-500 focus:ring-1 focus:ring-clay-500 transition ${
                    !value ? 'text-gray-400' : 'text-gray-900'
                }`}
            >
                <span className="truncate">{value || placeholder}</span>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel - Opens DOWNWARD */}
            {isOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-100">
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Type to search..."
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-clay-500"
                        />
                    </div>
                    
                    {/* Options List - Max 5 visible with scroll */}
                    <ul className="max-h-[200px] overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-gray-400 text-center">No results found</li>
                        ) : (
                            filteredOptions.map((opt) => (
                                <li
                                    key={opt}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-clay-50 transition ${
                                        value === opt ? 'bg-clay-100 text-clay-700 font-medium' : 'text-gray-700'
                                    }`}
                                >
                                    {opt}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}