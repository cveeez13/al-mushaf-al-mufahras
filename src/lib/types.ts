export interface Topic {
  id: number;
  color: string;
  hex: string;
  name_ar: string;
  name_en: string;
}

export interface Verse {
  surah: number;
  ayah: number;
  page: number | null;
  verse_key: string;
  text: string;
  topic: Topic;
  confidence: string;
  method: string;
}

export interface TopicsMaster {
  metadata: {
    version: string;
    total_verses: number;
    total_topics: number;
    source: string;
    last_updated: string;
  };
  topics: Array<Topic & { verse_count: number; color_name: string; color_hex: string }>;
  verses: Verse[];
}

export interface SurahInfo {
  surah: number;
  name_ar: string;
  verse_count: number;
  topic_distribution: Record<string, number>;
  dominant_topic: string;
  topic_percentages: Record<string, number>;
}

export interface PageInfo {
  page: number;
  verses: Array<{ surah: number; ayah: number; topic_id: number }>;
  topic_distribution: Record<string, number>;
  dominant_topic: string;
  verse_count: number;
}

export interface JuzInfo {
  juz: number;
  verse_count: number;
  topic_distribution: Record<string, number>;
  dominant_topic: string;
  topic_percentages: Record<string, number>;
}

export const TOPICS: Record<number, Topic> = {
  1: { id: 1, color: 'blue', hex: '#3498DB', name_ar: 'دلائل قدرة الله وعظمته', name_en: "Signs of Allah's Power & Greatness" },
  2: { id: 2, color: 'green', hex: '#27AE60', name_ar: 'السيرة النبوية، صفات المؤمنين، الجنة', name_en: 'Seerah, Believers, Paradise' },
  3: { id: 3, color: 'brown', hex: '#8E6B3D', name_ar: 'آيات الأحكام والفقه', name_en: 'Rulings & Jurisprudence (Fiqh)' },
  4: { id: 4, color: 'yellow', hex: '#F1C40F', name_ar: 'قصص الأنبياء والأمم السابقة', name_en: 'Stories of Prophets & Past Nations' },
  5: { id: 5, color: 'purple', hex: '#8E44AD', name_ar: 'مكانة القرآن ورد الشبهات', name_en: 'Status of Quran & Refuting Doubts' },
  6: { id: 6, color: 'orange', hex: '#E67E22', name_ar: 'اليوم الآخر، الموت، البعث، الحساب', name_en: 'Afterlife, Death, Resurrection, Judgment' },
  7: { id: 7, color: 'red', hex: '#E74C3C', name_ar: 'أوصاف النار وعذاب الكافرين', name_en: 'Hellfire & Punishment of Disbelievers' },
};

export const TOPIC_BG: Record<string, string> = {
  blue: 'bg-topic-blue-bg',
  green: 'bg-topic-green-bg',
  brown: 'bg-topic-brown-bg',
  yellow: 'bg-topic-yellow-bg',
  purple: 'bg-topic-purple-bg',
  orange: 'bg-topic-orange-bg',
  red: 'bg-topic-red-bg',
};

export const TOPIC_HEX_BG: Record<string, string> = {
  blue: '#EBF5FB',
  green: '#E8F8F0',
  brown: '#F5EDE3',
  yellow: '#FEF9E7',
  purple: '#F4ECF7',
  orange: '#FDF2E9',
  red: '#FDEDEC',
};

export const SURAH_NAMES: Record<number, string> = {
  1:'الفاتحة',2:'البقرة',3:'آل عمران',4:'النساء',5:'المائدة',6:'الأنعام',7:'الأعراف',
  8:'الأنفال',9:'التوبة',10:'يونس',11:'هود',12:'يوسف',13:'الرعد',14:'إبراهيم',
  15:'الحجر',16:'النحل',17:'الإسراء',18:'الكهف',19:'مريم',20:'طه',21:'الأنبياء',
  22:'الحج',23:'المؤمنون',24:'النور',25:'الفرقان',26:'الشعراء',27:'النمل',28:'القصص',
  29:'العنكبوت',30:'الروم',31:'لقمان',32:'السجدة',33:'الأحزاب',34:'سبأ',35:'فاطر',
  36:'يس',37:'الصافات',38:'ص',39:'الزمر',40:'غافر',41:'فصلت',42:'الشورى',
  43:'الزخرف',44:'الدخان',45:'الجاثية',46:'الأحقاف',47:'محمد',48:'الفتح',49:'الحجرات',
  50:'ق',51:'الذاريات',52:'الطور',53:'النجم',54:'القمر',55:'الرحمن',56:'الواقعة',
  57:'الحديد',58:'المجادلة',59:'الحشر',60:'الممتحنة',61:'الصف',62:'الجمعة',63:'المنافقون',
  64:'التغابن',65:'الطلاق',66:'التحريم',67:'الملك',68:'القلم',69:'الحاقة',70:'المعارج',
  71:'نوح',72:'الجن',73:'المزمل',74:'المدثر',75:'القيامة',76:'الإنسان',77:'المرسلات',
  78:'النبأ',79:'النازعات',80:'عبس',81:'التكوير',82:'الانفطار',83:'المطففين',84:'الانشقاق',
  85:'البروج',86:'الطارق',87:'الأعلى',88:'الغاشية',89:'الفجر',90:'البلد',91:'الشمس',
  92:'الليل',93:'الضحى',94:'الشرح',95:'التين',96:'العلق',97:'القدر',98:'البينة',
  99:'الزلزلة',100:'العاديات',101:'القارعة',102:'التكاثر',103:'العصر',104:'الهمزة',105:'الفيل',
  106:'قريش',107:'الماعون',108:'الكوثر',109:'الكافرون',110:'النصر',111:'المسد',112:'الإخلاص',
  113:'الفلق',114:'الناس'
};

/** Number of ayahs in each surah (1-indexed by surah number) */
export const SURAH_AYAH_COUNTS: Record<number, number> = {
  1:7,2:286,3:200,4:176,5:120,6:165,7:206,8:75,9:129,10:109,
  11:123,12:111,13:43,14:52,15:99,16:128,17:111,18:110,19:98,20:135,
  21:112,22:78,23:118,24:64,25:77,26:227,27:93,28:88,29:69,30:60,
  31:34,32:30,33:73,34:54,35:45,36:83,37:182,38:88,39:75,40:85,
  41:54,42:53,43:89,44:59,45:37,46:35,47:38,48:29,49:18,50:45,
  51:60,52:49,53:62,54:55,55:78,56:96,57:29,58:22,59:24,60:13,
  61:14,62:11,63:11,64:18,65:12,66:12,67:30,68:52,69:52,70:44,
  71:28,72:28,73:20,74:56,75:40,76:31,77:50,78:40,79:46,80:42,
  81:29,82:19,83:36,84:25,85:22,86:17,87:19,88:26,89:30,90:20,
  91:15,92:21,93:11,94:8,95:8,96:19,97:5,98:8,99:8,100:11,
  101:11,102:8,103:3,104:9,105:5,106:4,107:7,108:3,109:6,110:3,
  111:5,112:4,113:5,114:6
};

/** Start (first) Mushaf page for each surah */
export const SURAH_START_PAGES: Record<number, number> = {
  1:1,2:2,3:50,4:77,5:106,6:128,7:151,8:177,9:187,10:208,
  11:221,12:235,13:249,14:255,15:262,16:267,17:282,18:293,19:305,20:312,
  21:322,22:332,23:342,24:350,25:359,26:367,27:377,28:385,29:396,30:404,
  31:411,32:415,33:418,34:428,35:434,36:440,37:446,38:453,39:458,40:467,
  41:477,42:483,43:489,44:496,45:499,46:502,47:507,48:511,49:515,50:518,
  51:520,52:523,53:526,54:528,55:531,56:534,57:537,58:542,59:545,60:549,
  61:551,62:553,63:554,64:556,65:558,66:560,67:562,68:564,69:566,70:568,
  71:570,72:572,73:574,74:575,75:577,76:578,77:580,78:582,79:583,80:585,
  81:586,82:587,83:587,84:589,85:590,86:591,87:591,88:592,89:593,90:594,
  91:595,92:595,93:596,94:596,95:597,96:597,97:598,98:598,99:599,100:599,
  101:600,102:600,103:601,104:601,105:601,106:602,107:602,108:602,109:603,110:603,
  111:603,112:604,113:604,114:604
};
