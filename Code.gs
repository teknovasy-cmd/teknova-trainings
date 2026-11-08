/** Teknova Trainings — Google Apps Script endpoint.
 * يحافظ على أي أعمدة وبيانات موجودة، ويضيف الأعمدة الناقصة إلى يمينها.
 */
const SHEET_ID = "1ejE1sAti0_OVRn82iyPyNSk7l6Dz3J60RIXUQG1CDLg";
const SHEET_NAME = "Registrations";
const HEADERS = ["الرقم التسلسلي", "تاريخ ووقت التسجيل", "الاسم الكامل", "رقم الهاتف", "التخصص المطلوب", "نمط التدريب", "المدينة", "الاختصاص الجامعي"];
const ONLINE_TRACKS = ["uiux", "frontend", "backend", "flutter", "cyber", "ai-data", "genai", "vibe", "ai-web"];
const ONSITE_TRACKS = ["frontend", "backend", "flutter", "ai-data"];
const CITY_LABELS = { damascus: "دمشق", aleppo: "حلب", homs: "حمص" };
const MODE_LABELS = { online: "أونلاين", onsite: "حضوري" };
const TRACK_LABELS = {
  uiux: "UI/UX Design", frontend: "Front-End Development",
  backend: "Back-End Development", flutter: "Flutter Development",
  cyber: "Cyber Security", "ai-data": "AI & Data Analysis",
  genai: "Generative AI", vibe: "Vibe Coding",
  "ai-web": "AI-Powered Web App Development"
};

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (!e || !e.postData || !e.postData.contents) return out({ ok: false, error: "empty_request" });
    const d = JSON.parse(e.postData.contents);
    const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
    const name = clean(d.name, 100), phone = clean(d.phone, 25);
    // الاختصاص الجامعي/التعليمي: حقل وُصفي (يُكتب في عمود مستقل في نهاية الأعمدة).
    // لا نرفض الطلب عند غيابه للحفاظ على توافق أي عميل قديم/مخزّن مؤقتاً.
    const specialty = clean(d.specialty, 120);
    const modeId = clean(d.modeId, 20), cityId = clean(d.cityId, 20);
    const trackId = clean(d.trackId, 30), requestId = clean(d.requestId, 100);
    if (!requestId || !/^[\w-]{8,100}$/.test(requestId)) return out({ ok: false, error: "invalid_request_id" });
    if (name.length < 3 || !/^\+?[\d\s\-()]{9,20}$/.test(phone)) return out({ ok: false, error: "invalid_contact" });
    if (!MODE_LABELS[modeId] || !TRACK_LABELS[trackId]) return out({ ok: false, error: "invalid_selection" });
    if (modeId === "online" && (cityId || ONLINE_TRACKS.indexOf(trackId) < 0)) return out({ ok: false, error: "invalid_online_selection" });
    if (modeId === "onsite" && (!CITY_LABELS[cityId] || ONSITE_TRACKS.indexOf(trackId) < 0)) return out({ ok: false, error: "invalid_onsite_selection" });

    const props = PropertiesService.getScriptProperties();
    const propKey = "TEKNOVA_REQ_" + requestId;
    const previous = props.getProperty(propKey);
    if (previous) return out({ ok: true, id: Number(previous), duplicate: true });

    const ss = SpreadsheetApp.openById(SHEET_ID);
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) sh = findExistingRegistrationSheet(ss);
    if (!sh) sh = ss.insertSheet(SHEET_NAME);
    const cols = ensureHeaders(sh);
    const serial = Math.max(1, sh.getLastRow()); // row 1 is the header
    const now = Utilities.formatDate(new Date(), "Asia/Damascus", "yyyy-MM-dd HH:mm:ss");
    const values = new Array(sh.getLastColumn()).fill("");
    values[cols["الرقم التسلسلي"] - 1] = serial;
    values[cols["تاريخ ووقت التسجيل"] - 1] = now;
    values[cols["الاسم الكامل"] - 1] = name;
    values[cols["رقم الهاتف"] - 1] = phone;
    values[cols["التخصص المطلوب"] - 1] = TRACK_LABELS[trackId];
    values[cols["نمط التدريب"] - 1] = MODE_LABELS[modeId];
    values[cols["المدينة"] - 1] = modeId === "onsite" ? CITY_LABELS[cityId] : "";
    values[cols["الاختصاص الجامعي"] - 1] = specialty;
    const row = sh.getLastRow() + 1;
    sh.getRange(row, cols["رقم الهاتف"]).setNumberFormat("@");
    sh.getRange(row, 1, 1, values.length).setValues([values]);
    SpreadsheetApp.flush();
    props.setProperty(propKey, String(serial));
    return out({ ok: true, id: serial });
  } catch (err) {
    return out({ ok: false, error: "server_error" });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}


/** إذا كان اسم ورقة التسجيلات مختلفاً، استخدم ورقة موجودة تحمل عناوين تسجيل معروفة. */
function findExistingRegistrationSheet(ss) {
  const known = ["الاسم الكامل", "اسم الطالب", "رقم الهاتف", "الهاتف", "التخصص المطلوب", "نمط التدريب"];
  const sheets = ss.getSheets ? ss.getSheets() : [];
  for (let s = 0; s < sheets.length; s++) {
    const sh = sheets[s];
    if (sh.getLastRow() < 1 || sh.getLastColumn() < 1) continue;
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0]
      .map(v => String(v).trim());
    if (headers.some(h => known.indexOf(h) >= 0)) return sh;
  }
  return null;
}

/** يطابق أسماء الأعمدة الموجودة، ويضيف الناقص دون حذف/استبدال أي عمود أو صف سابق. */
function ensureHeaders(sh) {
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.setFrozenRows(1);
    sh.setRightToLeft(true);
  }
  let lastCol = Math.max(1, sh.getLastColumn());
  let row = sh.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
  const aliases = {
    "الرقم التسلسلي": ["الرقم التسلسلي", "رقم التسجيل", "الرقم"],
    "تاريخ ووقت التسجيل": ["تاريخ ووقت التسجيل", "تاريخ التسجيل", "التاريخ والوقت"],
    "الاسم الكامل": ["الاسم الكامل", "اسم الطالب", "الاسم"],
    "رقم الهاتف": ["رقم الهاتف", "الهاتف", "رقم الواتساب"],
    "التخصص المطلوب": ["التخصص المطلوب", "التخصص", "المسار التدريبي"],
    "نمط التدريب": ["نمط التدريب", "النمط"],
    "المدينة": ["المدينة"],
    "الاختصاص الجامعي": ["الاختصاص الجامعي", "الاختصاص", "الاختصاص التعليمي", "التخصص الجامعي"]
  };
  const map = {};
  HEADERS.forEach(function (h) {
    const choices = aliases[h] || [h];
    let index = -1;
    for (let i = 0; i < row.length; i++) {
      if (choices.indexOf(String(row[i]).trim()) >= 0) { index = i; break; }
    }
    if (index < 0) {
      lastCol++;
      sh.getRange(1, lastCol).setValue(h);
      row.push(h);
      index = lastCol - 1;
    }
    map[h] = index + 1;
  });
  sh.setFrozenRows(1);
  sh.setRightToLeft(true);
  return map;
}

function doGet() {
  return out({ ok: true, service: "teknova-registration", version: "2" });
}
function out(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

/** تشغيل اختياري من محرر Apps Script؛ لا يمسح أو يعيد كتابة بيانات. */
function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  ensureHeaders(sh);
  sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight("bold")
    .setBackground("#221a4a").setFontColor("#ffffff").setHorizontalAlignment("center");
  sh.getRange(2, 1, Math.max(1, sh.getMaxRows() - 1), sh.getLastColumn()).setVerticalAlignment("middle");
}
