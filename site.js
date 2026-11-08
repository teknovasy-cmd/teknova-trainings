/* =======================================================================
   site.js — سكربت العرض المشترك للصفحات الجديدة
   (الرئيسية / اختيار النمط / المسارات / تفاصيل التدريب)
   -----------------------------------------------------------------------
   لا يلمس منطق التسجيل. صفحة /register تستخدم app.js كما هي.
   يتعرّف على الصفحة عبر <body data-page="...">
   ======================================================================= */
(function () {
  "use strict";
  const T = (typeof TEKNOVA !== "undefined") ? TEKNOVA : {};
  const S = (typeof TEKNOVA_SITE !== "undefined") ? TEKNOVA_SITE : {};
  const D = (typeof TEKNOVA_TRAININGS !== "undefined") ? TEKNOVA_TRAININGS : {};
  const page = document.body.getAttribute("data-page") || "";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const iconBox = (path) => `<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg></span>`;
  const track = (id) => (T.tracks || []).find((x) => x.id === id);
  const qs = (o) => {
    const p = new URLSearchParams();
    Object.keys(o).forEach((k) => { if (o[k]) p.set(k, o[k]); });
    const s = p.toString();
    return s ? "?" + s : "";
  };

  /* ---------- زر واتساب العائم ---------- */
  function mountFab() {
    const a = document.createElement("a");
    a.className = "fab";
    a.href = "https://wa.me/" + String(T.whatsapp || "").replace(/\D/g, "") +
      "?text=" + encodeURIComponent("مرحباً Teknova Trainings، أرغب بالاستفسار عن التدريبات.");
    a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "تواصل معنا عبر واتساب");
    a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-11.9 7L4 20l1.5-4A8 8 0 1 1 20 11.5z"/></svg>';
    document.body.appendChild(a);
  }

  /* ============ الصفحة الرئيسية ============ */
  function renderHome() {
    // توافق مع الرابط القديم: /#register كان يفتح نموذج التسجيل
    if (location.hash === "#register") { location.replace("/register" + location.search); return; }
    // Hero
    const h = $("[data-hero]");
    if (h && S.hero) {
      h.innerHTML = `<h1>${esc(S.hero.title)}</h1>
        <p class="hero-lead">${esc(S.hero.lead)}</p>
        <div class="hero-cta">
          <a class="btn register" href="/register">سجّل الآن</a>
          <a class="btn" href="/modes">استكشف التدريبات</a>
          <a class="btn ghost" href="#about">تعرّف على تكنوفا</a>
        </div>`;
    }
    // Why
    const why = $("#why-grid");
    if (why && S.why) {
      why.innerHTML = S.why.map((w) => `<article class="fcard">${iconBox(w.icon)}<h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></article>`).join("");
    }
    // Journey
    const jn = $("#journey-list");
    if (jn && S.journey) {
      jn.innerHTML = S.journey.map((s, i) => `<li class="step"><span class="num">${i + 1}</span><div><b>${esc(s.title)}</b><p>${esc(s.text)}</p></div></li>`).join("");
    }
    // Stats (أرقام من config.js — تُخفى كلياً حتى تأكيد الأرقام)
    const st = $("#stats");
    if (st && Array.isArray(T.stats) && T.stats.length) {
      st.innerHTML = T.stats.map((x) => `<div class="stat"><strong data-n="${Number(x.value) || 0}">0+</strong><span>${esc(x.label)}</span></div>`).join("");
      const run = () => $$("strong", st).forEach((n) => {
        const to = +n.dataset.n, t0 = performance.now();
        const tick = (t) => {
          const p = Math.min((t - t0) / 900, 1);
          n.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))) + "+";
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      if ("IntersectionObserver" in window) {
        new IntersectionObserver((e, o) => { if (e[0].isIntersecting) { run(); o.disconnect(); } }).observe(st);
      } else run();
    } else if (st) {
      st.hidden = true;
    }
    // FAQ
    mountFaq("#faq-list", S.faqGeneral);
  }

  function mountFaq(sel, items) {
    const root = $(sel);
    if (!root || !Array.isArray(items) || !items.length) return;
    root.innerHTML = items.map((it) => `
      <details class="qa"><summary>${esc(it.q)}</summary>
        <div class="qa-a">${it.a ? esc(it.a) : '<span class="muted">الإجابة قيد الإضافة.</span>'}</div>
      </details>`).join("");
  }

  /* ============ صفحة اختيار النمط ============ */
  function renderModes() {
    const root = $("#modes-grid");
    if (!root || !S.modes) return;
    root.innerHTML = S.modes.map((m) => `
      <a class="mcard" href="/tracks${qs({ mode: m.modeId, city: m.cityId })}">
        ${iconBox(m.icon)}
        <h3>${esc(m.title)}</h3>
        <p>${esc(m.desc)}</p>
        <span class="mcard-go">استعرض المسارات<i></i></span>
      </a>`).join("");
  }

  /* ============ صفحة المسارات ============ */
  function renderTracks() {
    const root = $("#tracks-grid");
    if (!root) return;
    const q = new URLSearchParams(location.search);
    const modeId = q.get("mode") || "";
    const cityId = q.get("city") || "";
    const mode = (T.modes || []).find((m) => m.id === modeId);
    const list = $("#tracks-title"), sub = $("#tracks-sub"), back = $("#tracks-back");

    // عنوان الصفحة بحسب الاختيار
    let title = "المسارات التدريبية";
    if (mode) {
      if (modeId === "online") title = "التدريبات الأونلاين";
      else {
        const c = (T.cities || []).find((x) => x.id === cityId);
        title = c ? "التدريبات الحضورية في " + c.label : "التدريبات الحضورية";
      }
    }
    if (list) list.textContent = title;
    if (back) back.hidden = !mode;

    const tracks = (typeof T.getTracks === "function") ? T.getTracks(modeId, cityId) : [];
    if (!tracks.length) {
      if (sub) sub.textContent = "لا توجد مسارات متاحة لهذا الاختيار حالياً.";
      root.innerHTML = `<p class="empty">يرجى العودة واختيار نمط تدريب آخر.</p>`;
      return;
    }
    if (sub) sub.textContent = "اختر المسار لعرض تفاصيله وخطته التدريبية.";

    root.innerHTML = tracks.map((t) => {
      const info = D[t.id] || {};
      const plan = (typeof teknovaGetPlan === "function") ? teknovaGetPlan(t.id, modeId, cityId) : null;
      const meta = [];
      if (plan && plan.delivery) meta.push(`<span class="chip">${esc(plan.delivery)}</span>`);
      if (plan && plan.levels) meta.push(`<span class="chip">${esc(plan.levels)}</span>`);
      if (plan && plan.sessions) meta.push(`<span class="chip">${esc(plan.sessions)}</span>`);
      if (plan && plan.hours) meta.push(`<span class="chip">${esc(plan.hours)}</span>`);
      const desc = (plan && plan.tagline) || info.tagline || t.desc || "";
      const ins = (plan && plan.instructor && plan.instructor.name) || "";
      return `<article class="tcard">
        ${iconBox(t.icon)}
        <h3>${esc(info.nameEn || t.label)}</h3>
        <p class="tcard-desc">${esc(desc)}</p>
        ${meta.length ? `<div class="chips">${meta.join("")}</div>` : ""}
        ${ins ? `<p class="tcard-ins">المدرب: ${esc(ins)}</p>` : ""}
        <a class="btn pick" href="/trainings/${encodeURIComponent(t.id)}${qs({ mode: modeId, city: cityId })}">اكتشف تفاصيل التدريب</a>
      </article>`;
    }).join("");
  }

  /* ============ صفحة تفاصيل التدريب ============ */
  function renderTraining() {
    const root = $("#training-root");
    if (!root) return;
    // id من المسار /trainings/<id> (مع احتياط ?track= للاختبار المحلي)
    const seg = location.pathname.split("/").filter(Boolean);
    const last = decodeURIComponent(seg[seg.length - 1] || "");
    const q = new URLSearchParams(location.search);
    const id = (last && last !== "training.html") ? last : (q.get("track") || "");
    const modeId = q.get("mode") || "";
    const cityId = q.get("city") || "";
    const t = track(id);
    const info = D[id];

    if (!t || !info) {
      root.innerHTML = `<div class="card"><h2>التدريب غير موجود</h2>
        <p class="sub">تأكد من الرابط أو عد إلى قائمة المسارات.</p>
        <a class="btn" href="/modes">استعرض التدريبات</a></div>`;
      return;
    }
    const mode = (T.modes || []).find((m) => m.id === modeId);
    const city = (T.cities || []).find((c) => c.id === cityId);
    const plan = (typeof teknovaGetPlan === "function") ? teknovaGetPlan(id, modeId, cityId) : null;
    const regHref = "/register" + qs({ mode: modeId, city: cityId, track: id });

    // تخصيص خطة النمط/المدينة (تتجاوز بيانات المسار العامة عند وجودها، دون التأثير على الأونلاين)
    const planTagline = (plan && plan.tagline) || info.tagline || "";
    const planDesc = (plan && plan.desc) || info.desc || "";
    const planDetails = (plan && plan.details && plan.details.length) ? plan.details : info.details;
    const planInstructor = (plan && plan.instructor) || info.instructor;
    const planProjects = (plan && plan.projects && plan.projects.length) ? plan.projects : info.projects;

    const modeLine = [
      mode ? "نمط التدريب: " + mode.label + (mode.needsCity && city ? " — " + city.label : "") : "",
      plan && plan.delivery ? plan.delivery : "",
      plan && plan.sessions ? plan.sessions : "",
      plan && plan.sessionLength ? plan.sessionLength : "",
      plan && plan.hours ? plan.hours : "",
    ].filter(Boolean);

    root.innerHTML = `
      <nav class="crumb"><a href="/modes">اختيار نمط التدريب</a> <span>/</span>
        <a href="/tracks${qs({ mode: modeId, city: cityId })}">المسارات</a> <span>/</span>
        <span class="cur">${esc(info.nameEn || t.label)}</span></nav>

      <!-- 1: مقدمة -->
      <header class="t-hero">
        <div class="t-hero-main">
          ${iconBox(info.icon || t.icon)}
          <h1>${esc(info.nameEn || t.label)}</h1>
          <p class="t-ar">${esc(info.nameAr || "")}</p>
          <p class="t-lead">${esc(planTagline)}</p>
          ${modeLine.length ? `<div class="chips">${modeLine.map((m) => `<span class="chip">${esc(m)}</span>`).join("")}</div>` : ""}
          <a class="btn" href="${regHref}">سجّل الآن</a>
        </div>
        <div class="t-hero-art" aria-hidden="true">${iconBox(info.icon || t.icon)}</div>
      </header>

      <!-- 2: نبذة عن التدريب -->
      ${planDesc ? `<section class="blk"><h2>نبذة عن التدريب</h2><div class="para">${paras(planDesc)}</div></section>` : ""}

      <!-- 2.5: تفاصيل التدريب -->
      ${(planDetails && planDetails.length) ? `<section class="blk"><h2>تفاصيل التدريب</h2>${detailsBlock(planDetails)}</section>` : ""}

      <!-- 3: لمن هذا التدريب؟ -->
      <section class="blk"><h2>لمن هذا التدريب؟</h2>${forWho()}</section>

      <!-- 4: الخطة التدريبية -->
      <section class="blk"><h2>الخطة التدريبية</h2>${planBlock(plan)}</section>

      <!-- 5: المشاريع العملية -->
      <section class="blk"><h2>المشاريع العملية</h2>${projectsBlock(planProjects)}</section>

      <!-- 5.5: المتطلبات السابقة للمستوى الثاني -->
      ${(plan && plan.prerequisites && plan.prerequisites.length) ? `<section class="blk"><h2>المتطلبات السابقة</h2><div class="para"><p>يمكن الالتحاق بالمستوى الثاني إذا أنهى المتدرب المستوى الأول أو امتلك المعارف والمهارات المذكورة أدناه.</p></div><ul class="points">${plan.prerequisites.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></section>` : ""}

      <!-- 6: ماذا ستكتسب -->
      <section class="blk"><h2>ماذا ستكتسب من التدريب؟</h2>${outcomesBlock(info.outcomes)}</section>

      <!-- 6.5: ما يميز التدريب -->
      ${(info.highlights && info.highlights.length) ? `<section class="blk"><h2>ما يميز هذا التدريب؟</h2>${highlightsBlock(info.highlights)}</section>` : ""}

      <!-- 6.7: آلية التدريب والتقييم -->
      ${(info.methodology && info.methodology.length) ? `<section class="blk"><h2>آلية التدريب والتقييم</h2>${info.methodologyIntro ? `<div class="para">${paras(info.methodologyIntro)}</div>` : ""}${methodologyBlock(info.methodology)}${info.methodologyNote ? `<div class="callout"><p>${esc(info.methodologyNote)}</p></div>` : ""}</section>` : ""}

      <!-- 6.8: الأدوات والتقنيات -->
      ${hasTools(info.tools) ? `<section class="blk"><h2>${esc(info.toolsTitle || "الأدوات والتقنيات")}</h2>${info.toolsIntro ? `<div class="para">${paras(info.toolsIntro)}</div>` : ""}${toolsBlock(info.tools)}</section>` : ""}

      <!-- 7: المدرب -->
      ${planInstructor ? `<section class="blk"><h2>المدرب</h2>${instructorBlock(planInstructor)}</section>` : ""}

      <!-- 8: الشهادة والتأهيل (نص موحّد لجميع التدريبات) -->
      <section class="blk"><h2>الشهادة والتأهيل</h2>${simpleBlock(CERT_TEXT)}</section>

      <!-- 9: أسئلة شائعة خاصة بالتدريب -->
      <section class="blk"><h2>أسئلة شائعة عن التدريب</h2>${faqBlock(info.faq)}</section>

      <!-- 10: ملاحظة ختامية -->
      ${info.note ? `<section class="blk"><div class="callout">${paras(info.note)}</div></section>` : ""}

      <!-- آخر: التسجيل -->
      <section class="cta-end">
        <h2>ابدأ رحلتك مع تكنوفا – سجّل الآن</h2>
        <p class="sub">سيتم تمرير اختيارك تلقائياً إلى صفحة التسجيل.</p>
        <a class="btn" href="${regHref}">سجّل الآن</a>
      </section>`;
  }

  const empty = (msg) => `<p class="empty">${esc(msg)}</p>`;
  // فواصل الفقرات (سطر فارغ) → <p>
  const paras = (txt) => String(txt || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${esc(p).replace(/\s*\n\s*/g, " ")}</p>`).join("");
  // ترتيب عربي للوحدات: المحور الأول، الثاني...
  const ORD = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر"];
  const ord = (n) => ORD[n - 1] || String(n);

  // النص الموحّد لقسم «لمن هذا التدريب؟» — قيمة ثابتة في القالب تظهر تلقائياً لأي تدريب جديد
  const FOR_WHO_TEXT = "لطلاب الجامعات والخريجين والمهتمين بالمجالات التقنية";
  function forWho() {
    return `<p class="forwho">${esc(FOR_WHO_TEXT)}</p>`;
  }

  // النص الموحّد لقسم «الشهادة والتأهيل» — قيمة ثابتة تظهر تلقائياً لجميع التدريبات
  const CERT_TEXT = "بالتأكيد! نحرص في تكنوفا على توثيق رحلتك التعليمية وإنجازك. عند إتمام التدريب، تحصل على شهادة تدريب صادرة عن Teknova، كما يمكنك طلب شهادة اجتياز تدريب معتمدة من كلية أكسفورد للدراسات الدولية، كخيار إضافي لمن يرغب في تعزيز ملفه التعليمي والمهني.";

  function planBlock(plan) {
    if (!plan || (!plan.units || !plan.units.length))
      return empty("الخطة التدريبية التفصيلية (المحاور، الساعات والجلسات) ستُضاف بعد اعتماد المحتوى الرسمي للمسار.");
    const label = plan.unitsLabel || "الوحدة";
    return plan.units.map((u, i) => `
      <details class="lvl"${i === 0 ? " open" : ""}>
        <summary><span class="lvl-i">${esc(u.label || (label + " " + ord(i + 1)))}</span><span class="lvl-t">${esc(u.title || "")}</span></summary>
        <div class="lvl-body">
          ${u.intro ? `<p class="lvl-intro">${esc(u.intro)}</p>` : ""}
          ${(u.points && u.points.length) ? `<ul class="points">${u.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          ${(u.sections && u.sections.length) ? `<ul class="topics">${u.sections.map((s) => `<li class="topic"><b>${esc(s.title || "")}</b>${(s.points && s.points.length) ? `<ul>${s.points.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}</li>`).join("")}</ul>` : ""}
          ${(u.sessions && u.sessions.length) ? sessionsBlock(u.sessions) : ""}
          ${(u.ai && u.ai.points && u.ai.points.length) ? `<div class="lvl-ai"><h4>${esc(u.ai.title || "دمج أدوات الذكاء الاصطناعي")}</h4><ul class="points">${u.ai.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>` : ""}
          ${(u.outcomes && u.outcomes.length) ? `<div class="lvl-out"><h4>مخرجات المستوى</h4><ul class="points">${u.outcomes.map((o) => `<li>${esc(o)}</li>`).join("")}</ul></div>` : ""}
          ${u.project ? `<div class="proj-mini"><b>${esc(u.project.label || "المشروع العملي")}:</b> ${esc(u.project.name || "")}</div>` : ""}
        </div>
      </details>`).join("");
  }

  function sessionsBlock(list) {
    return `<ol class="sessions">${list.map((s) => `<li class="sess">
      <span class="sess-n">${esc(s.n)}</span>
      <div class="sess-b"><b>${esc(s.title || "")}</b>${s.text ? `<p>${esc(s.text)}</p>` : ""}</div>
    </li>`).join("")}</ol>`;
  }

  function detailsBlock(rows) {
    return `<dl class="facts">${rows.map((r) => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join("")}</dl>`;
  }

  function highlightsBlock(items) {
    return `<ul class="points">${items.map((h) => `<li><b>${esc(h.title)}</b>${h.text ? " — " + esc(h.text) : ""}</li>`).join("")}</ul>`;
  }

  function methodologyBlock(list) {
    return `<ul class="points">${list.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`;
  }

  const hasTools = (t) => Array.isArray(t) ? t.length > 0 : !!(t && t.groups && t.groups.length);

  function toolsBlock(t) {
    if (Array.isArray(t)) {
      if (typeof t[0] === "string")
        return `<ul class="points">${t.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`;
      return `<dl class="facts">${t.map((r) => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join("")}</dl>`;
    }
    if (!t || !t.groups || !t.groups.length) return "";
    const groups = t.groups.map((g) => `
      <div class="tool-group">
        ${g.title ? `<h3>${esc(g.title)}</h3>` : ""}
        ${(g.points && g.points.length) ? `<ul class="points">${g.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
        ${(g.sub && g.sub.length) ? `<div class="tool-subs">${g.sub.map((sg) => `
          <div class="tool-sub">
            ${sg.title ? `<h4>${esc(sg.title)}</h4>` : ""}
            ${(sg.points && sg.points.length) ? `<ul class="points">${sg.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""}
          </div>`).join("")}</div>` : ""}
      </div>`).join("");
    return `${groups}${t.note ? `<div class="callout tool-note"><p>${esc(t.note)}</p></div>` : ""}`;
  }

  function instructorBlock(ins) {
    return `<div class="instructor">
      <div class="ins-head">${iconBox('<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/><path d="M4 21a8 8 0 0 1 16 0"/>')}<h3>${esc(ins.name || "")}</h3></div>
      <div class="ins-bio">${(ins.bio || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    </div>`;
  }

  function projectsBlock(list) {
    if (!list || !list.length) return empty("سيتم عرض المشاريع العملية الخاصة بهذا المسار قريباً.");
    return `<div class="grid">${list.map((p) => `<article class="pcard">
      ${p.level ? `<span class="tag">المستوى ${esc(p.level)}</span>` : ""}
      <h3>${esc(p.name || "")}</h3>
      <p>${esc(p.desc || "")}</p>
      ${(p.items && p.items.length) ? `<ul class="points">${p.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${(p.skills && p.skills.length) ? `<div class="chips">${p.skills.map((s) => `<span class="chip">${esc(s)}</span>`).join("")}</div>` : ""}
    </article>`).join("")}</div>`;
  }

  function outcomesBlock(list) {
    if (!list || !list.length) return empty("سيتم عرض المهارات والمخرجات النهائية بعد اعتمادها.");
    return `<ul class="outcomes">${list.map((o) => `<li><span class="tick"></span>${esc(o)}</li>`).join("")}</ul>`;
  }
  function simpleBlock(text) {
    return text ? `<p class="para">${esc(text)}</p>` : empty("سيتم توضيح نظام الشهادة والتأهيل بعد اعتماد التفاصيل النهائية.");
  }
  function faqBlock(items) {
    if (!items || !items.length) return empty("لا توجد أسئلة خاصة بهذا المسار حالياً.");
    return `<div class="faq">${items.map((it) => `<details class="qa"><summary>${esc(it.q)}</summary><div class="qa-a">${it.a ? esc(it.a) : '<span class="muted">الإجابة قيد الإضافة.</span>'}</div></details>`).join("")}</div>`;
  }

  /* ---------- الحركة: كشف عند التمرير + تفاعل الشريط العلوي ---------- */
  const reduceMotion = () => !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function mountReveal() {
    if (reduceMotion() || !("IntersectionObserver" in window)) return;
    const targets = $$(".grid > *, .journey > *, .facts > div, .outcomes > li, .tool-group, .lvl, .callout, .cta-end, .stats, .faq > *");
    if (!targets.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    targets.forEach((el) => {
      const p = el.parentElement;
      const i = p ? Array.prototype.indexOf.call(p.children, el) : 0;
      el.classList.add("reveal");
      el.style.transitionDelay = Math.min(i, 5) * 70 + "ms";
      io.observe(el);
    });
  }

  function mountTopbar() {
    const bar = $(".topbar");
    if (!bar) return;
    const set = () => bar.classList.toggle("scrolled", window.scrollY > 8);
    set();
    window.addEventListener("scroll", set, { passive: true });
    // تمييز رابط الصفحة الحالية
    const path = location.pathname.replace(/\/+$/, "") || "/";
    $$(".nav a", bar).forEach((a) => {
      const href = (a.getAttribute("href") || "").replace(/\/+$/, "") || "/";
      if (href === path || (path.indexOf("/trainings") === 0 && href === "/modes")) a.classList.add("active");
    });
  }

  /* ---------- تشغيل ---------- */
  mountFab();
  mountTopbar();
  if (page === "home") renderHome();
  else if (page === "modes") renderModes();
  else if (page === "tracks") renderTracks();
  else if (page === "training") renderTraining();
  mountReveal();
})();
