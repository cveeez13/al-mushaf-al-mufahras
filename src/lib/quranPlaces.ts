/**
 * Quran Interactive Map — GeoJSON data model for places mentioned in the Quran
 * Each place has coordinates, associated verses, era/period, and topic mappings
 */

export interface QuranPlace {
  id: string;
  name_ar: string;
  name_en: string;
  lat: number;
  lng: number;
  era: PlaceEra;
  topicId: number;
  description_ar: string;
  description_en: string;
  verses: VerseRef[];
  icon: string;
}

export interface VerseRef {
  surah: number;
  ayah: number;
  verse_key: string;
  snippet_ar: string;
  snippet_en: string;
}

interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonPoint;
  properties: Record<string, unknown>;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

export type PlaceEra =
  | 'creation'      // آدم، نوح
  | 'ibrahim'       // إبراهيم، لوط، إسماعيل
  | 'musa'          // موسى، فرعون، بنو إسرائيل
  | 'prophets'      // داود، سليمان، يونس، عيسى
  | 'jahiliyyah'    // أصحاب الفيل، قريش
  | 'nabawi';       // العهد النبوي

export const ERA_LABELS: Record<PlaceEra, { ar: string; en: string; order: number }> = {
  creation:   { ar: 'عصر الخلق', en: 'Age of Creation', order: 0 },
  ibrahim:    { ar: 'عصر إبراهيم', en: 'Age of Ibrahim', order: 1 },
  musa:       { ar: 'عصر موسى', en: 'Age of Musa', order: 2 },
  prophets:   { ar: 'عصر الأنبياء', en: 'Age of Prophets', order: 3 },
  jahiliyyah: { ar: 'الجاهلية', en: 'Pre-Islamic Era', order: 4 },
  nabawi:     { ar: 'العهد النبوي', en: 'Prophetic Era', order: 5 },
};

export const ERAS_ORDERED: PlaceEra[] = [
  'creation', 'ibrahim', 'musa', 'prophets', 'jahiliyyah', 'nabawi',
];

export const QURAN_PLACES: QuranPlace[] = [
  // ===== مكة المكرمة =====
  {
    id: 'makkah',
    name_ar: 'مكة المكرمة',
    name_en: 'Makkah',
    lat: 21.4225,
    lng: 39.8262,
    era: 'ibrahim',
    topicId: 4,
    description_ar: 'أم القرى، موطن الكعبة المشرفة، بناها إبراهيم وإسماعيل عليهما السلام',
    description_en: 'Mother of Cities, home of the Holy Kaaba, built by Ibrahim and Ismail (AS)',
    icon: '🕋',
    verses: [
      { surah: 2, ayah: 127, verse_key: '2:127', snippet_ar: 'وَإِذْ يَرْفَعُ إِبْرَاهِيمُ الْقَوَاعِدَ مِنَ الْبَيْتِ وَإِسْمَاعِيلُ', snippet_en: 'And when Ibrahim was raising the foundations of the House with Ismail' },
      { surah: 3, ayah: 96, verse_key: '3:96', snippet_ar: 'إِنَّ أَوَّلَ بَيْتٍ وُضِعَ لِلنَّاسِ لَلَّذِي بِبَكَّةَ مُبَارَكًا', snippet_en: 'Indeed, the first House established for the people was at Bakkah, blessed' },
      { surah: 48, ayah: 24, verse_key: '48:24', snippet_ar: 'وَهُوَ الَّذِي كَفَّ أَيْدِيَهُمْ عَنكُمْ وَأَيْدِيَكُمْ عَنْهُم بِبَطْنِ مَكَّةَ', snippet_en: 'And it is He who withheld their hands from you and your hands from them within Makkah' },
    ],
  },
  // ===== المدينة المنورة =====
  {
    id: 'madinah',
    name_ar: 'المدينة المنورة',
    name_en: 'Madinah',
    lat: 24.4672,
    lng: 39.6112,
    era: 'nabawi',
    topicId: 2,
    description_ar: 'طيبة الطيبة، مهاجر النبي ﷺ ومدينته',
    description_en: 'The radiant city, the Prophet\'s (PBUH) city of migration',
    icon: '🕌',
    verses: [
      { surah: 9, ayah: 101, verse_key: '9:101', snippet_ar: 'وَمِمَّنْ حَوْلَكُم مِّنَ الْأَعْرَابِ مُنَافِقُونَ ۖ وَمِنْ أَهْلِ الْمَدِينَةِ', snippet_en: 'And among those around you of the bedouins are hypocrites, and among the people of Madinah' },
      { surah: 33, ayah: 60, verse_key: '33:60', snippet_ar: 'لَّئِن لَّمْ يَنتَهِ الْمُنَافِقُونَ', snippet_en: 'If the hypocrites do not desist...' },
      { surah: 63, ayah: 8, verse_key: '63:8', snippet_ar: 'يَقُولُونَ لَئِن رَّجَعْنَا إِلَى الْمَدِينَةِ', snippet_en: 'They say, "If we return to Madinah..."' },
    ],
  },
  // ===== مصر =====
  {
    id: 'misr',
    name_ar: 'مصر',
    name_en: 'Egypt',
    lat: 30.0444,
    lng: 31.2357,
    era: 'musa',
    topicId: 4,
    description_ar: 'أرض الفراعنة، مسرح قصة موسى عليه السلام وبني إسرائيل',
    description_en: 'Land of the Pharaohs, setting of the story of Musa (AS) and Bani Israel',
    icon: '🏛️',
    verses: [
      { surah: 10, ayah: 87, verse_key: '10:87', snippet_ar: 'وَأَوْحَيْنَا إِلَىٰ مُوسَىٰ وَأَخِيهِ أَن تَبَوَّآ لِقَوْمِكُمَا بِمِصْرَ بُيُوتًا', snippet_en: 'And We inspired Musa and his brother to settle your people in Egypt in houses' },
      { surah: 12, ayah: 21, verse_key: '12:21', snippet_ar: 'وَقَالَ الَّذِي اشْتَرَاهُ مِن مِّصْرَ', snippet_en: 'And the one who bought him from Egypt said...' },
      { surah: 12, ayah: 99, verse_key: '12:99', snippet_ar: 'فَلَمَّا دَخَلُوا عَلَىٰ يُوسُفَ آوَىٰ إِلَيْهِ أَبَوَيْهِ', snippet_en: 'When they entered upon Yusuf, he took his parents to himself' },
      { surah: 43, ayah: 51, verse_key: '43:51', snippet_ar: 'أَلَيْسَ لِي مُلْكُ مِصْرَ', snippet_en: 'Is not the kingdom of Egypt mine?' },
    ],
  },
  // ===== طور سيناء =====
  {
    id: 'sinai',
    name_ar: 'طور سيناء',
    name_en: 'Mount Sinai',
    lat: 28.5394,
    lng: 33.9750,
    era: 'musa',
    topicId: 1,
    description_ar: 'الجبل المقدس الذي كلّم الله فيه موسى عليه السلام',
    description_en: 'The sacred mountain where Allah spoke to Musa (AS)',
    icon: '⛰️',
    verses: [
      { surah: 20, ayah: 12, verse_key: '20:12', snippet_ar: 'إِنِّي أَنَا رَبُّكَ فَاخْلَعْ نَعْلَيْكَ ۖ إِنَّكَ بِالْوَادِ الْمُقَدَّسِ طُوًى', snippet_en: 'Indeed, I am your Lord, so remove your sandals. You are in the sacred valley of Tuwa' },
      { surah: 7, ayah: 143, verse_key: '7:143', snippet_ar: 'وَلَمَّا جَاءَ مُوسَىٰ لِمِيقَاتِنَا وَكَلَّمَهُ رَبُّهُ', snippet_en: 'And when Musa arrived at Our appointed time and his Lord spoke to him' },
      { surah: 95, ayah: 2, verse_key: '95:2', snippet_ar: 'وَطُورِ سِينِينَ', snippet_en: 'And [by] Mount Sinai' },
    ],
  },
  // ===== بيت المقدس / المسجد الأقصى =====
  {
    id: 'quds',
    name_ar: 'بيت المقدس',
    name_en: 'Jerusalem / Al-Aqsa',
    lat: 31.7781,
    lng: 35.2354,
    era: 'prophets',
    topicId: 1,
    description_ar: 'المسجد الأقصى المبارك، أولى القبلتين وثالث الحرمين، مسرى النبي ﷺ',
    description_en: 'Al-Aqsa Mosque, first Qibla, destination of the Prophet\'s Night Journey',
    icon: '🕌',
    verses: [
      { surah: 17, ayah: 1, verse_key: '17:1', snippet_ar: 'سُبْحَانَ الَّذِي أَسْرَىٰ بِعَبْدِهِ لَيْلًا مِّنَ الْمَسْجِدِ الْحَرَامِ إِلَى الْمَسْجِدِ الْأَقْصَى', snippet_en: 'Exalted is He who took His Servant by night from al-Masjid al-Haram to al-Masjid al-Aqsa' },
      { surah: 17, ayah: 7, verse_key: '17:7', snippet_ar: 'وَلِيَدْخُلُوا الْمَسْجِدَ كَمَا دَخَلُوهُ أَوَّلَ مَرَّةٍ', snippet_en: 'And to enter the mosque as they entered it the first time' },
    ],
  },
  // ===== مدين =====
  {
    id: 'madyan',
    name_ar: 'مدين',
    name_en: 'Madyan',
    lat: 28.5000,
    lng: 36.5500,
    era: 'musa',
    topicId: 4,
    description_ar: 'قوم شعيب عليه السلام، وفيها لجأ موسى بعد خروجه من مصر',
    description_en: 'People of Shu\'ayb (AS), where Musa took refuge after leaving Egypt',
    icon: '🏘️',
    verses: [
      { surah: 28, ayah: 22, verse_key: '28:22', snippet_ar: 'وَلَمَّا تَوَجَّهَ تِلْقَاءَ مَدْيَنَ قَالَ عَسَىٰ رَبِّي أَن يَهْدِيَنِي سَوَاءَ السَّبِيلِ', snippet_en: 'And when he directed himself toward Madyan, he said, "Perhaps my Lord will guide me to the right way"' },
      { surah: 7, ayah: 85, verse_key: '7:85', snippet_ar: 'وَإِلَىٰ مَدْيَنَ أَخَاهُمْ شُعَيْبًا', snippet_en: 'And to Madyan [We sent] their brother Shu\'ayb' },
      { surah: 11, ayah: 84, verse_key: '11:84', snippet_ar: 'وَإِلَىٰ مَدْيَنَ أَخَاهُمْ شُعَيْبًا', snippet_en: 'And to Madyan [We sent] their brother Shu\'ayb' },
    ],
  },
  // ===== بابل =====
  {
    id: 'babel',
    name_ar: 'بابل',
    name_en: 'Babylon',
    lat: 32.5363,
    lng: 44.4209,
    era: 'prophets',
    topicId: 4,
    description_ar: 'حيث أُنزل الملكان هاروت وماروت',
    description_en: 'Where the two angels Harut and Marut were sent down',
    icon: '🏰',
    verses: [
      { surah: 2, ayah: 102, verse_key: '2:102', snippet_ar: 'وَمَا أُنزِلَ عَلَى الْمَلَكَيْنِ بِبَابِلَ هَارُوتَ وَمَارُوتَ', snippet_en: 'And what was revealed to the two angels at Babylon, Harut and Marut' },
    ],
  },
  // ===== الأحقاف (عاد) =====
  {
    id: 'ahqaf',
    name_ar: 'الأحقاف',
    name_en: 'Al-Ahqaf (Region of \'Ad)',
    lat: 18.0000,
    lng: 52.0000,
    era: 'creation',
    topicId: 7,
    description_ar: 'ديار قوم عاد في جنوب الجزيرة العربية، أهلكهم الله بريح صرصر عاتية',
    description_en: 'Homeland of the people of \'Ad in southern Arabia, destroyed by a furious wind',
    icon: '🌪️',
    verses: [
      { surah: 46, ayah: 21, verse_key: '46:21', snippet_ar: 'وَاذْكُرْ أَخَا عَادٍ إِذْ أَنذَرَ قَوْمَهُ بِالْأَحْقَافِ', snippet_en: 'And mention the brother of \'Ad, when he warned his people in al-Ahqaf' },
      { surah: 69, ayah: 6, verse_key: '69:6', snippet_ar: 'وَأَمَّا عَادٌ فَأُهْلِكُوا بِرِيحٍ صَرْصَرٍ عَاتِيَةٍ', snippet_en: 'As for \'Ad, they were destroyed by a screaming violent wind' },
    ],
  },
  // ===== الحِجر (ثمود) =====
  {
    id: 'hijr',
    name_ar: 'الحِجر (مدائن صالح)',
    name_en: 'Al-Hijr (Mada\'in Salih)',
    lat: 26.7867,
    lng: 37.9531,
    era: 'creation',
    topicId: 7,
    description_ar: 'ديار قوم ثمود الذين نحتوا الجبال بيوتًا، وأرسل إليهم صالح عليه السلام',
    description_en: 'Homeland of Thamud, who carved houses in the mountains; Salih (AS) was sent to them',
    icon: '🗿',
    verses: [
      { surah: 15, ayah: 80, verse_key: '15:80', snippet_ar: 'وَلَقَدْ كَذَّبَ أَصْحَابُ الْحِجْرِ الْمُرْسَلِينَ', snippet_en: 'And certainly the companions of al-Hijr denied the messengers' },
      { surah: 7, ayah: 73, verse_key: '7:73', snippet_ar: 'وَإِلَىٰ ثَمُودَ أَخَاهُمْ صَالِحًا', snippet_en: 'And to Thamud [We sent] their brother Salih' },
      { surah: 91, ayah: 13, verse_key: '91:13', snippet_ar: 'فَقَالَ لَهُمْ رَسُولُ اللَّهِ نَاقَةَ اللَّهِ وَسُقْيَاهَا', snippet_en: 'And the messenger of Allah said to them, "[Do not harm] the she-camel of Allah"' },
    ],
  },
  // ===== إرم ذات العماد =====
  {
    id: 'iram',
    name_ar: 'إرم ذات العماد',
    name_en: 'Iram of the Pillars',
    lat: 18.25,
    lng: 54.00,
    era: 'creation',
    topicId: 7,
    description_ar: 'المدينة العظيمة التي شيّدها قوم عاد، لم يُخلق مثلها في البلاد',
    description_en: 'The great city built by the people of \'Ad, unique among all cities',
    icon: '🏛️',
    verses: [
      { surah: 89, ayah: 7, verse_key: '89:7', snippet_ar: 'إِرَمَ ذَاتِ الْعِمَادِ', snippet_en: 'Iram — who had lofty pillars' },
      { surah: 89, ayah: 8, verse_key: '89:8', snippet_ar: 'الَّتِي لَمْ يُخْلَقْ مِثْلُهَا فِي الْبِلَادِ', snippet_en: 'The likes of whom had never been created in the land' },
    ],
  },
  // ===== سبأ (اليمن) =====
  {
    id: 'saba',
    name_ar: 'سبأ',
    name_en: 'Saba (Sheba)',
    lat: 15.4000,
    lng: 45.3500,
    era: 'prophets',
    topicId: 4,
    description_ar: 'مملكة سبأ في اليمن، قصة الملكة بلقيس مع سليمان عليه السلام وسيل العرم',
    description_en: 'Kingdom of Sheba in Yemen, story of Queen Bilqis with Sulaiman (AS) and the dam flood',
    icon: '👑',
    verses: [
      { surah: 27, ayah: 22, verse_key: '27:22', snippet_ar: 'فَمَكَثَ غَيْرَ بَعِيدٍ فَقَالَ أَحَطتُ بِمَا لَمْ تُحِطْ بِهِ وَجِئْتُكَ مِن سَبَإٍ بِنَبَإٍ يَقِينٍ', snippet_en: 'And he stayed not long and said, "I have encompassed what you have not, and I have come from Sheba with certain news"' },
      { surah: 34, ayah: 15, verse_key: '34:15', snippet_ar: 'لَقَدْ كَانَ لِسَبَإٍ فِي مَسْكَنِهِمْ آيَةٌ ۖ جَنَّتَانِ عَن يَمِينٍ وَشِمَالٍ', snippet_en: 'There was for Sheba a sign in their dwelling place — two gardens on the right and on the left' },
    ],
  },
  // ===== الجودي =====
  {
    id: 'judi',
    name_ar: 'جبل الجودي',
    name_en: 'Mount Judi',
    lat: 37.3667,
    lng: 42.4667,
    era: 'creation',
    topicId: 4,
    description_ar: 'الجبل الذي استوت عليه سفينة نوح عليه السلام بعد الطوفان',
    description_en: 'The mountain where Noah\'s Ark came to rest after the flood',
    icon: '🚢',
    verses: [
      { surah: 11, ayah: 44, verse_key: '11:44', snippet_ar: 'وَاسْتَوَتْ عَلَى الْجُودِيِّ ۖ وَقِيلَ بُعْدًا لِّلْقَوْمِ الظَّالِمِينَ', snippet_en: 'And it came to rest on [Mount] Judi, and it was said, "Away with the wrongdoing people"' },
    ],
  },
  // ===== البحر الأحمر (فلق البحر) =====
  {
    id: 'red-sea',
    name_ar: 'البحر الأحمر',
    name_en: 'Red Sea (Sea Crossing)',
    lat: 28.2,
    lng: 33.6,
    era: 'musa',
    topicId: 1,
    description_ar: 'موقع معجزة فلق البحر لموسى عليه السلام وإغراق فرعون وجنوده',
    description_en: 'Site of the miracle of parting the sea for Musa (AS) and the drowning of Pharaoh',
    icon: '🌊',
    verses: [
      { surah: 26, ayah: 63, verse_key: '26:63', snippet_ar: 'فَأَوْحَيْنَا إِلَىٰ مُوسَىٰ أَنِ اضْرِب بِّعَصَاكَ الْبَحْرَ ۖ فَانفَلَقَ', snippet_en: 'So We inspired Musa, "Strike with your staff the sea," and it parted' },
      { surah: 10, ayah: 90, verse_key: '10:90', snippet_ar: 'وَجَاوَزْنَا بِبَنِي إِسْرَائِيلَ الْبَحْرَ فَأَتْبَعَهُمْ فِرْعَوْنُ وَجُنُودُهُ', snippet_en: 'We took the Children of Israel across the sea, and Pharaoh and his soldiers pursued them' },
    ],
  },
  // ===== غار حراء =====
  {
    id: 'hira',
    name_ar: 'غار حراء',
    name_en: 'Cave of Hira',
    lat: 21.4575,
    lng: 39.8583,
    era: 'nabawi',
    topicId: 5,
    description_ar: 'الغار الذي نزل فيه الوحي أول مرة على النبي ﷺ',
    description_en: 'The cave where revelation first descended upon the Prophet (PBUH)',
    icon: '🕳️',
    verses: [
      { surah: 96, ayah: 1, verse_key: '96:1', snippet_ar: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ', snippet_en: 'Read in the name of your Lord who created' },
      { surah: 96, ayah: 2, verse_key: '96:2', snippet_ar: 'خَلَقَ الْإِنسَانَ مِنْ عَلَقٍ', snippet_en: 'Created man from a clinging substance' },
    ],
  },
  // ===== غار ثور =====
  {
    id: 'thawr',
    name_ar: 'غار ثور',
    name_en: 'Cave of Thawr',
    lat: 21.3767,
    lng: 39.8483,
    era: 'nabawi',
    topicId: 2,
    description_ar: 'الغار الذي اختبأ فيه النبي ﷺ وأبو بكر أثناء الهجرة',
    description_en: 'The cave where the Prophet (PBUH) and Abu Bakr hid during the Hijra',
    icon: '🕳️',
    verses: [
      { surah: 9, ayah: 40, verse_key: '9:40', snippet_ar: 'إِذْ هُمَا فِي الْغَارِ إِذْ يَقُولُ لِصَاحِبِهِ لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا', snippet_en: 'When they were in the cave and he said to his companion, "Do not grieve; indeed Allah is with us"' },
    ],
  },
  // ===== بدر =====
  {
    id: 'badr',
    name_ar: 'بدر',
    name_en: 'Badr',
    lat: 23.7781,
    lng: 38.7917,
    era: 'nabawi',
    topicId: 2,
    description_ar: 'موقع غزوة بدر الكبرى، أول انتصار عسكري للمسلمين',
    description_en: 'Site of the Battle of Badr, the first major Muslim victory',
    icon: '⚔️',
    verses: [
      { surah: 3, ayah: 123, verse_key: '3:123', snippet_ar: 'وَلَقَدْ نَصَرَكُمُ اللَّهُ بِبَدْرٍ وَأَنتُمْ أَذِلَّةٌ', snippet_en: 'And already had Allah given you victory at Badr while you were few' },
      { surah: 8, ayah: 9, verse_key: '8:9', snippet_ar: 'إِذْ تَسْتَغِيثُونَ رَبَّكُمْ فَاسْتَجَابَ لَكُمْ أَنِّي مُمِدُّكُم بِأَلْفٍ مِّنَ الْمَلَائِكَةِ', snippet_en: 'When you asked help of your Lord, and He answered you, "Indeed, I will reinforce you with a thousand of the angels"' },
    ],
  },
  // ===== أُحد =====
  {
    id: 'uhud',
    name_ar: 'أُحد',
    name_en: 'Uhud',
    lat: 24.5019,
    lng: 39.6142,
    era: 'nabawi',
    topicId: 2,
    description_ar: 'جبل أحد وموقع غزوة أحد، استُشهد فيها حمزة بن عبد المطلب',
    description_en: 'Mount Uhud and site of the Battle of Uhud, where Hamza (RA) was martyred',
    icon: '⚔️',
    verses: [
      { surah: 3, ayah: 121, verse_key: '3:121', snippet_ar: 'وَإِذْ غَدَوْتَ مِنْ أَهْلِكَ تُبَوِّئُ الْمُؤْمِنِينَ مَقَاعِدَ لِلْقِتَالِ', snippet_en: 'And when you left your family in the morning to post the believers at their stations for the battle' },
      { surah: 3, ayah: 140, verse_key: '3:140', snippet_ar: 'إِن يَمْسَسْكُمْ قَرْحٌ فَقَدْ مَسَّ الْقَوْمَ قَرْحٌ مِّثْلُهُ', snippet_en: 'If a wound should touch you — there has already touched the people a wound similar to it' },
    ],
  },
  // ===== حنين =====
  {
    id: 'hunayn',
    name_ar: 'حنين',
    name_en: 'Hunayn',
    lat: 21.45,
    lng: 40.15,
    era: 'nabawi',
    topicId: 2,
    description_ar: 'موقع غزوة حنين بعد فتح مكة',
    description_en: 'Site of the Battle of Hunayn after the conquest of Makkah',
    icon: '⚔️',
    verses: [
      { surah: 9, ayah: 25, verse_key: '9:25', snippet_ar: 'لَقَدْ نَصَرَكُمُ اللَّهُ فِي مَوَاطِنَ كَثِيرَةٍ ۙ وَيَوْمَ حُنَيْنٍ', snippet_en: 'Allah has already given you victory in many regions and on the day of Hunayn' },
    ],
  },
  // ===== الطائف =====
  {
    id: 'taif',
    name_ar: 'الطائف',
    name_en: 'Ta\'if',
    lat: 21.2703,
    lng: 40.4158,
    era: 'nabawi',
    topicId: 4,
    description_ar: 'القرية التي ذُكرت في القرآن بأنها "القريتين عظيم"',
    description_en: 'Referenced as "a man from the two cities" in the Quran',
    icon: '🏔️',
    verses: [
      { surah: 43, ayah: 31, verse_key: '43:31', snippet_ar: 'وَقَالُوا لَوْلَا نُزِّلَ هَٰذَا الْقُرْآنُ عَلَىٰ رَجُلٍ مِّنَ الْقَرْيَتَيْنِ عَظِيمٍ', snippet_en: 'And they said, "Why was this Quran not sent down upon a great man from one of the two cities?"' },
    ],
  },
  // ===== سدوم (قوم لوط) =====
  {
    id: 'sodom',
    name_ar: 'سدوم (قوم لوط)',
    name_en: 'Sodom (People of Lut)',
    lat: 31.0500,
    lng: 35.3900,
    era: 'ibrahim',
    topicId: 7,
    description_ar: 'المؤتفكات — قرى قوم لوط التي قلبها الله عاليها سافلها',
    description_en: 'The overturned cities — towns of Lut\'s people destroyed by Allah',
    icon: '💥',
    verses: [
      { surah: 11, ayah: 82, verse_key: '11:82', snippet_ar: 'فَلَمَّا جَاءَ أَمْرُنَا جَعَلْنَا عَالِيَهَا سَافِلَهَا وَأَمْطَرْنَا عَلَيْهَا حِجَارَةً', snippet_en: 'When Our command came, We made the highest part its lowest and rained upon them stones' },
      { surah: 15, ayah: 74, verse_key: '15:74', snippet_ar: 'فَجَعَلْنَا عَالِيَهَا سَافِلَهَا وَأَمْطَرْنَا عَلَيْهِمْ حِجَارَةً مِّن سِجِّيلٍ', snippet_en: 'We made the highest part its lowest and rained upon them stones of hard clay' },
    ],
  },
  // ===== الأيكة (قوم شعيب) =====
  {
    id: 'aykah',
    name_ar: 'الأيكة',
    name_en: 'Al-Aykah (People of the Thicket)',
    lat: 28.75,
    lng: 36.60,
    era: 'ibrahim',
    topicId: 7,
    description_ar: 'أصحاب الأيكة، قوم آخر دعاهم شعيب عليه السلام',
    description_en: 'Companions of the thicket, another people called by Shu\'ayb (AS)',
    icon: '🌳',
    verses: [
      { surah: 26, ayah: 176, verse_key: '26:176', snippet_ar: 'كَذَّبَ أَصْحَابُ الْأَيْكَةِ الْمُرْسَلِينَ', snippet_en: 'The companions of the thicket denied the messengers' },
      { surah: 15, ayah: 78, verse_key: '15:78', snippet_ar: 'وَإِن كَانَ أَصْحَابُ الْأَيْكَةِ لَظَالِمِينَ', snippet_en: 'And the companions of the thicket were indeed wrongdoers' },
    ],
  },
  // ===== نينوى (يونس) =====
  {
    id: 'nineveh',
    name_ar: 'نينوى',
    name_en: 'Nineveh (People of Yunus)',
    lat: 36.3600,
    lng: 43.1500,
    era: 'prophets',
    topicId: 4,
    description_ar: 'مدينة قوم يونس عليه السلام، القوم الوحيد الذي آمن فرُفع عنه العذاب',
    description_en: 'City of Yunus (AS), the only nation that believed and had their punishment lifted',
    icon: '🐋',
    verses: [
      { surah: 10, ayah: 98, verse_key: '10:98', snippet_ar: 'فَلَوْلَا كَانَتْ قَرْيَةٌ آمَنَتْ فَنَفَعَهَا إِيمَانُهَا إِلَّا قَوْمَ يُونُسَ', snippet_en: 'Then has there not been a single city that believed so its faith benefited it except the people of Yunus' },
      { surah: 37, ayah: 147, verse_key: '37:147', snippet_ar: 'وَأَرْسَلْنَاهُ إِلَىٰ مِائَةِ أَلْفٍ أَوْ يَزِيدُونَ', snippet_en: 'And We sent him to a hundred thousand or more' },
    ],
  },
  // ===== الخليل (حبرون) — إبراهيم =====
  {
    id: 'hebron',
    name_ar: 'الخليل (أرض إبراهيم)',
    name_en: 'Hebron (Land of Ibrahim)',
    lat: 31.5326,
    lng: 35.0998,
    era: 'ibrahim',
    topicId: 4,
    description_ar: 'الأرض المباركة التي هاجر إليها إبراهيم عليه السلام',
    description_en: 'The blessed land to which Ibrahim (AS) migrated',
    icon: '🙏',
    verses: [
      { surah: 21, ayah: 71, verse_key: '21:71', snippet_ar: 'وَنَجَّيْنَاهُ وَلُوطًا إِلَى الْأَرْضِ الَّتِي بَارَكْنَا فِيهَا لِلْعَالَمِينَ', snippet_en: 'And We delivered him and Lut to the land which We had blessed for the worlds' },
      { surah: 29, ayah: 26, verse_key: '29:26', snippet_ar: 'فَآمَنَ لَهُ لُوطٌ ۘ وَقَالَ إِنِّي مُهَاجِرٌ إِلَىٰ رَبِّي', snippet_en: 'And Lut believed him. [Ibrahim] said, "Indeed, I will emigrate to my Lord"' },
    ],
  },
  // ===== يثرب (الأحزاب) =====
  {
    id: 'yathrib',
    name_ar: 'يثرب',
    name_en: 'Yathrib',
    lat: 24.47,
    lng: 39.61,
    era: 'nabawi',
    topicId: 2,
    description_ar: 'الاسم القديم للمدينة المنورة، ذُكر في سياق غزوة الأحزاب',
    description_en: 'Ancient name of Madinah, mentioned in the context of the Battle of the Trench',
    icon: '🏘️',
    verses: [
      { surah: 33, ayah: 13, verse_key: '33:13', snippet_ar: 'وَإِذْ قَالَت طَّائِفَةٌ مِّنْهُمْ يَا أَهْلَ يَثْرِبَ لَا مُقَامَ لَكُمْ فَارْجِعُوا', snippet_en: 'And when a faction of them said, "O people of Yathrib, there is no stability for you, so return"' },
    ],
  },
  // ===== الرس =====
  {
    id: 'rass',
    name_ar: 'الرس',
    name_en: 'Al-Rass',
    lat: 25.87,
    lng: 43.50,
    era: 'creation',
    topicId: 7,
    description_ar: 'أصحاب الرس الذين ذُكروا مع الأقوام المكذبين',
    description_en: 'People of al-Rass, mentioned among the destroyed nations',
    icon: '🏚️',
    verses: [
      { surah: 25, ayah: 38, verse_key: '25:38', snippet_ar: 'وَعَادًا وَثَمُودَ وَأَصْحَابَ الرَّسِّ وَقُرُونًا بَيْنَ ذَٰلِكَ كَثِيرًا', snippet_en: 'And \'Ad and Thamud and the companions of al-Rass and many generations between them' },
      { surah: 50, ayah: 12, verse_key: '50:12', snippet_ar: 'كَذَّبَتْ قَبْلَهُمْ قَوْمُ نُوحٍ وَأَصْحَابُ الرَّسِّ وَثَمُودُ', snippet_en: 'The people of Noah denied before them, and the companions of al-Rass and Thamud' },
    ],
  },
];

// ──── Helper functions ────

/** Get all unique eras from places data */
export function getAvailableEras(): PlaceEra[] {
  const eras = new Set(QURAN_PLACES.map(p => p.era));
  return ERAS_ORDERED.filter(e => eras.has(e));
}

/** Filter places by era range (inclusive) */
export function filterPlacesByEra(maxEraOrder: number): QuranPlace[] {
  return QURAN_PLACES.filter(p => ERA_LABELS[p.era].order <= maxEraOrder);
}

/** Filter places by topic */
export function filterPlacesByTopic(topicId: number): QuranPlace[] {
  return QURAN_PLACES.filter(p => p.topicId === topicId);
}

/** Search places by name */
export function searchPlaces(query: string): QuranPlace[] {
  const q = query.toLowerCase().trim();
  if (!q) return QURAN_PLACES;
  return QURAN_PLACES.filter(p =>
    p.name_ar.includes(q) ||
    p.name_en.toLowerCase().includes(q) ||
    p.description_ar.includes(q) ||
    p.description_en.toLowerCase().includes(q)
  );
}

/** Get total verse count across all places */
export function getTotalVerseRefs(): number {
  return QURAN_PLACES.reduce((sum, p) => sum + p.verses.length, 0);
}

/** Get a place by ID */
export function getPlaceById(id: string): QuranPlace | undefined {
  return QURAN_PLACES.find(p => p.id === id);
}

/** Convert places to GeoJSON FeatureCollection */
export function toGeoJSON(places: QuranPlace[]): GeoJsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: places.map(p => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [p.lng, p.lat],
      },
      properties: {
        id: p.id,
        name_ar: p.name_ar,
        name_en: p.name_en,
        era: p.era,
        topicId: p.topicId,
        verseCount: p.verses.length,
        icon: p.icon,
      },
    })),
  };
}
