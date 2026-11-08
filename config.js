/* المصدر المركزي للبيانات — عدّل هنا فقط لإضافة مسارات أو مدن أو أنماط تدريب */
const TEKNOVA = {
  brand: "Teknova Trainings",
  whatsapp: "963981890957",
  // ضع هنا رابط Web App الناتج عن Google Apps Script (انظر README.md)
  endpoint: "https://script.google.com/macros/s/AKfycbyFbFmeyysjjQwzyTOQtGRGrJ6qZAZo6U7X4W5zDlg3iobjXydCELr6qKYKTbpBK0v9/exec",

  // إحصائيات الصفحة الرئيسية — لا تُعرض إلا بعد تأكيد الأرقام رسمياً.
  // لإظهارها لاحقاً أضف عناصر بالشكل التالي، وتُقرأ من هنا فقط:
  //   { value: 100, label: "وصف الرقم" }
  stats: [],

  // needsCity: هل يتطلب النمط اختيار مدينة؟
  modes: [
    { id: "online", label: "أونلاين", needsCity: false },
    { id: "onsite", label: "حضوري", needsCity: true },
  ],

  // registrationEnabled:false يُخفي المدينة من خيارات التسجيل الجديدة فقط،
  // مع الحفاظ الكامل على بياناتها السابقة في Google Sheets وعلى الروابط القديمة.
  cities: [
    { id: "damascus", label: "دمشق" },
    { id: "aleppo", label: "حلب" },
    { id: "homs", label: "حمص", registrationEnabled: false },
  ],

  tracks: [
    { id: "uiux", label: "UI/UX Design", desc: "تصميم تجارب وواجهات المنتجات الرقمية", icon: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.6 7.6"/><circle cx="11" cy="11" r="2"/>' },
    { id: "frontend", label: "Front-End Development", desc: "بناء واجهات الويب التفاعلية الحديثة", icon: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>' },
    { id: "backend", label: "Back-End Development", desc: "تطوير الخوادم وقواعد البيانات وواجهات API", icon: '<rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/>' },
    { id: "flutter", label: "Flutter Development", desc: "تطبيقات موبايل بمنصتين من قاعدة كود واحدة", icon: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>' },
    { id: "cyber", label: "Cyber Security", desc: "حماية الأنظمة والشبكات واختبار الاختراق", icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
    { id: "ai-data", label: "AI & Data Analysis", desc: "تحليل البيانات وبناء حلول الذكاء الاصطناعي", icon: '<path d="M12 20V10M18 20V4M6 20v-4"/>' },
    { id: "genai", label: "Generative AI", desc: "توظيف النماذج التوليدية في بناء المنتجات", icon: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>' },
    { id: "vibe", label: "Vibe Coding", desc: "البرمجة بمساعدة الذكاء الاصطناعي بسرعة واحترافية", icon: '<path d="M4 17l6-6-6-6M12 19h8"/>' },
    { id: "ai-web", label: "AI-Powered Web App Development", desc: "تطوير تطبيقات الويب بالذكاء الاصطناعي من الفكرة إلى الإطلاق", icon: '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2a2.06 2.06 0 0 0-3-3z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>' },
  ],

  // المتاح فعلياً: مصفوفة (نمط بلا مدن) أو كائن { مدينة: [مسارات] }
  offerings: {
    online: ["uiux", "frontend", "backend", "flutter", "cyber", "ai-data", "genai", "vibe", "ai-web"],
    onsite: {
      damascus: ["ai-data", "flutter", "backend", "frontend"],
      aleppo: ["ai-data", "flutter", "backend", "frontend"],
      homs: [],
    },
  },
};

const byId = (list, id) => list.find((x) => x.id === id);

/* المسارات المتاحة لنمط (ومدينة) معيّنين */
TEKNOVA.getTracks = function (modeId, cityId) {
  const mode = byId(this.modes, modeId);
  if (!mode) return [];
  const o = this.offerings[modeId];
  const ids = mode.needsCity ? (cityId && o && o[cityId]) || [] : o || [];
  return ids.map((id) => byId(this.tracks, id)).filter(Boolean);
};
TEKNOVA.getCities = function (modeId) {
  const o = this.offerings[modeId];
  return o && !Array.isArray(o)
    ? this.cities.filter((c) => c.registrationEnabled !== false && o[c.id] && o[c.id].length)
    : [];
};
if (typeof module !== "undefined") module.exports = TEKNOVA;
