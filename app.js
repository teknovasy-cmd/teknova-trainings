(function () {
  const T = TEKNOVA, $ = (s, r = document) => r.querySelector(s);
  const el = (h) => { const t = document.createElement("template"); t.innerHTML = h.trim(); return t.content.firstChild; };
  const icon = (t) => `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${t.icon}</svg></span>`;
  const state = { mode: "", city: "", track: "" };

  /* ---------- النموذج ---------- */
  function mountForm(root) {
    root.innerHTML = `
      <div class="card" id="card">
        <h2>سجّل في تدريبات Teknova</h2>
        <p class="sub" style="margin:4px 0 0">أربع خطوات سريعة، دون إنشاء حساب.</p>
        <form id="f" novalidate>
          <div class="field"><label for="name">الاسم الكامل</label>
            <input id="name" type="text" autocomplete="name" placeholder="مثال: أحمد محمد" required><div class="err" id="e-name"></div></div>
          <div class="field"><label for="phone">رقم الهاتف أو واتساب</label>
            <input id="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" style="text-align:right" placeholder="+963 9XX XXX XXX" required><div class="err" id="e-phone"></div></div>
          <div class="field"><label for="specialty">الاختصاص الجامعي أو التعليمي</label>
            <input id="specialty" type="text" autocomplete="organization-title" placeholder="مثال: هندسة معلوماتية" required><div class="err" id="e-specialty"></div></div>
          <div id="dyn"></div>
          <input class="hp" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true">
          <div class="formerr" id="formerr" role="alert" hidden></div>
          <button class="btn submit" id="go" type="submit">إرسال الطلب</button>
        </form>
      </div>`;
    renderDyn();
    $("#f", root).addEventListener("submit", submit);
    ["name", "phone", "specialty"].forEach((id) => $("#" + id).addEventListener("input", () => clearErr(id)));
  }

  function renderDyn() {
    const mode = T.modes.find((m) => m.id === state.mode);
    const cities = state.mode ? T.getCities(state.mode) : [];
    const tracks = T.getTracks(state.mode, state.city);
    const showTracks = state.mode && (!mode.needsCity || state.city);
    const radio = (n, v, checked, inner) =>
      `<label class="opt"><input type="radio" name="${n}" value="${v}" ${checked ? "checked" : ""}><span>${inner}</span></label>`;
    $("#dyn").innerHTML = `
      <div class="field" role="radiogroup" aria-labelledby="l-mode"><span class="lbl" id="l-mode">نمط التدريب</span>
        <div class="seg">${T.modes.map((m) => radio("mode", m.id, state.mode === m.id, m.label)).join("")}</div><div class="err" id="e-mode"></div></div>
      ${mode && mode.needsCity ? `<div class="field fade" role="radiogroup" aria-labelledby="l-city"><span class="lbl" id="l-city">المدينة</span>
        <div class="seg">${cities.map((c) => radio("city", c.id, state.city === c.id, c.label)).join("")}</div><div class="err" id="e-city"></div></div>` : ""}
      ${showTracks ? `<div class="field fade" role="radiogroup" aria-labelledby="l-track"><span class="lbl" id="l-track">التخصص التدريبي</span>
        <div class="list">${tracks.map((t) => radio("track", t.id, state.track === t.id, icon(t) + t.label)).join("")}</div><div class="err" id="e-track"></div></div>` : ""}`;
    $("#dyn").querySelectorAll("input").forEach((i) => i.addEventListener("change", () => {
      state[i.name] = i.value;
      if (i.name === "mode") { state.city = ""; state.track = ""; }
      if (i.name === "city") state.track = "";
      if (!T.getTracks(state.mode, state.city).some((t) => t.id === state.track)) state.track = "";
      renderDyn();
    }));
  }

  const setErr = (id, m) => { const e = $("#e-" + id); if (e) e.textContent = m; const i = $("#" + id); if (i) i.setAttribute("aria-invalid", "true"); };
  const clearErr = (id) => { const e = $("#e-" + id); if (e) e.textContent = ""; const i = $("#" + id); if (i) i.removeAttribute("aria-invalid"); };

  function validate() {
    let first = null, ok = true;
    const fail = (id, m) => { setErr(id, m); ok = false; first = first || id; };
    ["name", "phone", "specialty", "mode", "city", "track"].forEach(clearErr);
    const name = $("#name").value.trim().replace(/\s+/g, " ");
    const specialty = $("#specialty").value.trim().replace(/\s+/g, " ");
    const digits = $("#phone").value.replace(/[\s\-()+]/g, "").replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d));
    if (name.length < 3 || name.split(" ").length < 2) fail("name", "يرجى كتابة الاسم الكامل (الاسم والكنية)");
    if (specialty.length < 2) fail("specialty", "يرجى كتابة الاختصاص الجامعي أو التعليمي");
    if (!/^\d{9,15}$/.test(digits)) fail("phone", "رقم الهاتف غير صحيح");
    const mode = T.modes.find((m) => m.id === state.mode);
    if (!mode) fail("mode", "اختر نمط التدريب");
    else if (mode.needsCity && !state.city) fail("city", "اختر المدينة");
    else if (!T.getTracks(state.mode, state.city).some((t) => t.id === state.track)) fail("track", "اختر التخصص");
    if (first) { const t = $("#" + first) || $("#e-" + first); t && t.scrollIntoView({ block: "center", behavior: "smooth" }); if (t && t.focus) t.focus(); }
    return ok ? { name, phone: $("#phone").value.trim(), specialty } : null;
  }

  let sending = false;
  let activeRequestId = "";
  async function submit(ev) {
    ev.preventDefault();
    if (sending) return;
    const base = validate(); if (!base) return;
    const fe = $("#formerr"); fe.hidden = true;
    if ($("#hp").value) return;
    const mode = T.modes.find((m) => m.id === state.mode);
    if (!mode) return;
    const city = mode.needsCity ? T.cities.find((c) => c.id === state.city) : null;
    const track = T.getTracks(state.mode, state.city).find((t) => t.id === state.track);
    if (!track || (mode.needsCity && !city)) {
      fe.textContent = "يرجى إعادة اختيار المدينة والتخصص ثم المحاولة مجدداً.";
      fe.hidden = false; return;
    }
    const data = {
      name: base.name,
      phone: base.phone,
      specialty: base.specialty,
      track: track.label,
      trackId: track.id,
      mode: mode.label,
      modeId: mode.id,
      city: city ? city.label : "",
      cityId: city ? city.id : ""
    };
    sending = true;
    if (!activeRequestId) activeRequestId = (window.crypto && crypto.randomUUID)
      ? crypto.randomUUID()
      : "tk-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    const btn = $("#go"); btn.disabled = true; btn.innerHTML = '<span class="spin"></span> جارٍ الإرسال…';
    try {
      if (!T.endpoint || /PASTE_|YOUR_|REPLACE_/i.test(T.endpoint)) throw new Error("endpoint not configured");
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 20000);
      let res, result;
      try {
        res = await fetch(T.endpoint, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ ...data, requestId: activeRequestId }),
          signal: ctl.signal,
          redirect: "follow"
        });
        if (!res.ok) throw new Error("http");
        result = await res.json();
      } finally { clearTimeout(to); }
      if (!result || result.ok !== true || !result.id) throw new Error((result && result.error) || "save failed");
      success(data); // لا تظهر رسالة النجاح إلا بعد استجابة تؤكد الحفظ
    } catch (e) {
      fe.textContent = "تعذّر تأكيد حفظ طلبك. لم نعرض رسالة نجاح؛ تحقق من اتصالك ثم أعد المحاولة. إذا استمرت المشكلة تواصل معنا عبر واتساب.";
      fe.hidden = false;
      btn.disabled = false; btn.textContent = "إعادة المحاولة";
      // Keep the same requestId on retry so a timed-out successful write cannot be duplicated.
    } finally { sending = false; }
  }

  function waText(d) {
    const l = [
      "مرحباً فريق Teknova Trainings،",
      "",
      "قمت بالتسجيل في تدريبات تكنوفا وأرغب بالحصول على الملف التعريفي الكامل للتدريب.",
      "",
      "الاسم: " + d.name,
      "الاختصاص: " + d.specialty,
      "التخصص: " + d.track,
      "نمط التدريب: " + d.mode
    ];
    if (d.city) l.push("المدينة: " + d.city);
    l.push("", "أرجو إرسال الملف التعريفي الذي يتضمن شرحاً متكاملاً عن هذا التدريب ومحاوره ومحتواه.", "", "شكراً لكم.");
    return l.join("\n");
  }
  const waLink = (d) => `https://wa.me/${String(T.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(waText(d))}`;

  function success(d) {
    const c = el(`<div class="card ok fade" id="card"><div class="check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
      <h2>تم استلام طلبك بنجاح!</h2><p>أهلاً بك <strong class="n"></strong>.</p>
      <p>لقد استلمنا طلبك للانضمام إلى تدريب <strong class="t" dir="ltr"></strong> ضمن تدريبات Teknova Trainings.</p>
      <p>للتعرّف بشكل كامل على محتوى التدريب ومحاوره وآلية تنفيذه وجميع التفاصيل المتعلقة به، نرجو منك طلب الملف التعريفي الخاص بالتدريب عبر فريقنا.</p>
      <p><strong>نسعد بوجودك معنا!</strong></p>
      <p class="lbl2">الرسالة الجاهزة لفريقنا على واتساب:</p><pre class="msg"></pre>
      <a class="btn wa" target="_blank" rel="noopener" referrerpolicy="no-referrer"></a></div>`);
    $(".msg", c).textContent = waText(d); $(".n", c).textContent = d.name; $(".t", c).textContent = d.track;
    const a = $(".wa", c); a.href = waLink(d); a.textContent = "اطلب الملف التعريفي عبر واتساب";
    $("#card").replaceWith(c);
    c.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  /* ---------- تهيئة + معاملات URL ---------- */
  function prefill() {
    const q = new URLSearchParams(location.search);
    const m = q.get("mode"), c = q.get("city"), t = q.get("track");
    if (T.modes.some((x) => x.id === m)) {
      state.mode = m;
      if (T.getCities(m).some((x) => x.id === c)) state.city = c;
      if (T.getTracks(m, state.city).some((x) => x.id === t)) state.track = t;
    }
  }
  document.body.append(el(`<a class="fab" href="https://wa.me/${T.whatsapp}?text=${encodeURIComponent("مرحباً Teknova Trainings، أرغب بالاستفسار عن التدريبات.")}" target="_blank" rel="noopener" aria-label="تواصل معنا عبر واتساب"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/></svg></a>`));
  prefill();
  if ($("#form-root")) mountForm($("#form-root"));
})();
