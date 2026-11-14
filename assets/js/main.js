/* ==========================================================================
   aegisfleet portfolio — data-driven renderer
   data/projects.json を読み込み、全セクションを描画する。
   ========================================================================== */
const HTML_ESCAPE_RE = /[&<>"']/g;
const HTML_ESCAPE_MAP = {
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
};
const EXTERNAL_URL_RE = /^https?:\/\//;
const TRAILING_SLASH_RE = /\/$/;
const BSKY_SUFFIX_RE = /\.bsky\.social$/;

(() => {
    const DATA_URL = "data/projects.json";
    const GH_CACHE_KEY = "aegisfleet:gh-repos:v1";
    const GH_CACHE_TTL = 60 * 60 * 1000; // 1時間
    const reduceMotion = globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

    const esc = (s = "") => String(s).replace(HTML_ESCAPE_RE, (c) => HTML_ESCAPE_MAP[c]);

    const isExternal = (url) => EXTERNAL_URL_RE.test(url);
    const linkAttrs = (url) => isExternal(url) ? ' target="_blank" rel="noopener"' : "";
    const repoUrl = (gh, repo) => `https://github.com/${gh}/${repo}`;
    const chips = (list = []) => `<div class="chips">${list.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
    const fresh = (repo) => repo ? `<span class="fresh" data-repo="${esc(repo)}"></span>` : "";
    const prettyUrl = (url) => url.replace(EXTERNAL_URL_RE, "").replace(TRAILING_SLASH_RE, "");

    /* ---------------- Hero ---------------- */
    function renderHero(data) {
        const { profile, showcase, products, bots } = data;

        const webApps = products.filter((p) => p.url).length;
        const kpis = [
            { value: showcase.length, unit: "サイト", label: "自動運用メディア" },
            { value: webApps, unit: "本", label: "公開Webアプリ" },
            { value: bots.items.length, unit: "体", label: "24時間稼働BOT" },
        ];
        $("#kpis").innerHTML = kpis.map((k) => `
            <li class="kpi">
                <div class="kpi-value"><span data-count="${k.value}">${reduceMotion ? k.value : 0}</span><small>${esc(k.unit)}</small></div>
                <p class="kpi-label">${esc(k.label)}</p>
            </li>`).join("");

        const socialHtml = profile.socials.map((s) => `
            <li><a href="${esc(s.url)}" target="_blank" rel="noopener" aria-label="${esc(s.label)}" title="${esc(s.label)}"><i class="${esc(s.icon)}"></i></a></li>`).join("");
        $("#socials").innerHTML = socialHtml;
        $("#socials-footer").innerHTML = socialHtml;

        if (!reduceMotion) countUp();
        startConsole(data);
    }

    function countUp() {
        const els = $$("[data-count]");
        const start = performance.now();
        const dur = 1400;
        const tick = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const e = 1 - (1 - t) ** 3;
            for (const el of els) { el.textContent = Math.round(Number(el.dataset.count) * e); }
            if (t < 1) requestAnimationFrame(tick);
        };
        setTimeout(() => requestAnimationFrame(tick), 500);
    }

    /* 自動化パイプラインの「様子」をイメージとして流すコンソール */
    function startConsole(data) {
        const box = $("#console");
        const lines = [];
        for (const p of data.showcase) {
            lines.push({ type: "run", repo: p.repo, msg: `${p.pipeline[0]} → ${p.pipeline[1]}` });
            lines.push({ type: "ok", repo: p.repo, msg: `${p.pipeline[2]} 通過 → ${p.pipeline.at(-1)}` });
        }
        lines.push({ type: "run", repo: `trend-bots ×${data.bots.items.length}`, msg: "トレンド収集 → Gemini で要約" });
        lines.push({ type: "ok", repo: "bluesky", msg: `${data.bots.items.map((b) => b.name).join(" / ")} へ投稿完了` });

        const line = (l) => `
            <li class="log ${l.type}">
                <span class="log-icon">${l.type === "ok" ? "✔" : "▸"}</span>
                <span><span class="log-repo">${esc(l.repo)}</span><span class="log-msg">${esc(l.msg)}</span></span>
            </li>`;
        const cursor = `<li class="log"><span class="log-icon">$</span><span><span class="cursor"></span></span></li>`;

        if (reduceMotion) {
            box.innerHTML = lines.slice(-6).map(line).join("") + cursor;
            return;
        }
        let i = 0;
        const shown = [];
        const step = () => {
            shown.push(line(lines[i % lines.length]));
            if (shown.length > 7) shown.shift();
            box.innerHTML = shown.join("") + cursor;
            i += 1;
        };
        step();
        setInterval(() => { if (!document.hidden) step(); }, 1700);
    }

    /* ---------------- 2. Scrollytelling ---------------- */
    const pipelineHtml = (steps) => steps.map((s, i) =>
        `<li class="pipe-node" style="--i:${i}"><small>${String(i + 1).padStart(2, "0")}</small>${esc(s)}</li>`).join("");

    function renderShowcase(data) {
        const { showcase, profile } = data;
        $("#stage-total").textContent = String(showcase.length).padStart(2, "0");
        $("#stage-shots").innerHTML = showcase.map((p, i) =>
            `<img src="${esc(p.shot)}" alt="" width="960" height="600" data-index="${i}">`).join("");
        $("#stage-dots").innerHTML = showcase.map((p, i) =>
            `<button type="button" data-goto="${i}" aria-label="${esc(p.name)} へ移動"></button>`).join("");

        $("#scrolly-steps").innerHTML = showcase.map((p, i) => `
            <article class="step" data-step="${i}" id="flagship-${esc(p.id)}">
                <div class="step-media">
                    <img src="${esc(p.shot)}" alt="${esc(p.name)} の画面" width="960" height="600">
                    <ol class="pipeline">${pipelineHtml(p.pipeline)}</ol>
                </div>
                <p class="step-eyebrow">${esc(p.eyebrow)}</p>
                <h3>${esc(p.name)}</h3>
                <p class="step-tagline">${esc(p.tagline)}</p>
                <p class="step-desc">${esc(p.description)}</p>
                <ul class="step-highlights">${p.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
                ${chips(p.tech)}
                <div class="step-actions">
                    <a class="btn btn-primary" href="${esc(p.url)}"${linkAttrs(p.url)}>サイトを見る<i class="fa-solid fa-arrow-up-right-from-square"></i></a>
                    <a class="btn btn-ghost" href="${repoUrl(profile.github, p.repo)}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i>Source</a>
                    ${fresh(p.repo)}
                </div>
            </article>`).join("");

        const shots = $$("#stage-shots img");
        const dots = $$("#stage-dots button");
        const steps = $$(".step");
        const pipe = $("#stage-pipeline");
        let current = -1;

        const activate = (i) => {
            if (i === current) return;
            current = i;
            const p = showcase[i];
            for (const [k, img] of shots.entries()) { img.classList.toggle("is-active", k === i); }
            for (const [k, d] of dots.entries()) { d.classList.toggle("is-active", k === i); }
            for (const [k, s] of steps.entries()) { s.classList.toggle("is-active", k === i); }
            $("#stage-url").textContent = prettyUrl(p.url);
            $("#stage-current").textContent = String(i + 1).padStart(2, "0");
            pipe.innerHTML = pipelineHtml(p.pipeline);
            pipe.classList.remove("is-running");
            pipe.getBoundingClientRect(); // アニメーションを再始動
            pipe.classList.add("is-running");
            const mobilePipe = $(".step-media .pipeline", steps[i]);
            mobilePipe?.classList.add("is-running");
        };

        const io = new IntersectionObserver((entries) => {
            for (const en of entries) { if (en.isIntersecting) activate(Number(en.target.dataset.step)); }
        }, { rootMargin: "-45% 0px -45% 0px" });
        for (const s of steps) { io.observe(s); }

        for (const d of dots) {
            d.addEventListener("click", () => {
                steps[Number(d.dataset.goto)].scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
            });
        }
        activate(0);
    }

    /* ---------------- 3. Bento ---------------- */
    function renderTileLinks(p, githubUser) {
        return `
            <div class="tile-links">
                ${p.url ? `<a class="link-btn primary" href="${esc(p.url)}"${linkAttrs(p.url)}>Open<i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ""}
                ${p.repo ? `<a class="link-btn" href="${repoUrl(githubUser, p.repo)}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i>GitHub</a>` : ""}
                ${fresh(p.repo)}
            </div>`;
    }

    function renderTileMain(p, catLabel, githubUser) {
        const stack = Array.isArray(p.stack) && p.stack.length > 0
            ? `<ol class="tile-stack">${p.stack.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`
            : "";
        return `
            <div class="tile-meta">
                <span class="tile-cat">${esc(catLabel[p.category] || p.category)}</span>
                ${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
            </div>
            <h3>${esc(p.name)}</h3>
            <p class="tile-desc">${esc(p.description)}</p>
            ${p.point ? `<p class="tile-point">${esc(p.point)}</p>` : ""}
            ${stack}
            <div class="tile-foot">${chips(p.tech)}${renderTileLinks(p, githubUser)}</div>`;
    }

    function renderProductTile(p, i, catLabel, githubUser) {
        const size = p.size || "sm";
        const hasShot = Boolean(p.shot);
        const wideShot = size === "wide" && hasShot;
        const main = renderTileMain(p, catLabel, githubUser);
        const media = wideShot
            ? `<div class="tile-side"><img src="${esc(p.shot)}" alt="${esc(p.name)} の画面" width="960" height="600"></div>`
            : `${hasShot ? `<div class="tile-shot"><img src="${esc(p.shot)}" alt="${esc(p.name)} の画面" width="960" height="600"></div>` : ""}${!hasShot && p.icon ? `<div class="tile-icon"><i class="${esc(p.icon)}"></i></div><i class="tile-bg-glyph ${esc(p.icon)}" aria-hidden="true"></i>` : ""}`;

        return `
            <article class="tile tile-${esc(size)}${wideShot ? " has-shot" : ""}" data-category="${esc(p.category)}" data-reveal style="--delay:${(i % 4) * 0.06}s">
                ${media}<div class="tile-main">${main}</div>
            </article>`;
    }

    function renderProducts(data) {
        const { products, productFilters, profile } = data;
        const catLabel = Object.fromEntries(productFilters.map((f) => [f.id, f.label]));

        $("#product-filters").innerHTML = productFilters.map((f, i) =>
            `<button type="button" data-filter="${esc(f.id)}" aria-pressed="${i === 0}">${esc(f.label)}</button>`).join("");

        $("#bento").innerHTML = products.map((p, i) => renderProductTile(p, i, catLabel, profile.github)).join("");

        // カテゴリフィルタ（View Transitions 対応ブラウザではモーフィング）
        const buttons = $$("#product-filters button");
        for (const btn of buttons) {
            btn.addEventListener("click", () => {
                const f = btn.dataset.filter;
                const apply = () => {
                    for (const b of buttons) { b.setAttribute("aria-pressed", String(b === btn)); }
                    for (const t of $$("#bento .tile")) {
                        t.classList.toggle("is-hidden", f !== "all" && t.dataset.category !== f);
                        t.classList.add("is-in");
                    }
                };
                if (document.startViewTransition && !reduceMotion) document.startViewTransition(apply);
                else apply();
            });
        }

        // マウス追従スポットライト
        $("#bento").addEventListener("pointermove", (e) => {
            const tile = e.target.closest(".tile");
            if (!tile) return;
            const r = tile.getBoundingClientRect();
            tile.style.setProperty("--mx", `${e.clientX - r.left}px`);
            tile.style.setProperty("--my", `${e.clientY - r.top}px`);
        });
    }

    /* ---------------- 4. BOT network ---------------- */
    function renderBots(data) {
        const { bots, profile } = data;
        $("#bot-network").innerHTML = `
            <div class="botnet glass" data-reveal>
                <div class="botnet-copy">
                    <p class="eyebrow"><i class="fa-brands fa-bluesky"></i>Bluesky</p>
                    <h3>${esc(bots.name)}</h3>
                    <p>${esc(bots.description)}</p>
                    <div class="botnet-stats">
                        <div><b>${bots.items.length}</b><span>独立稼働BOT</span></div>
                        <div><b>1</b><span>共通アーキテクチャ</span></div>
                        <div><b>0</b><span>運用の手作業</span></div>
                    </div>
                    ${chips(bots.tech)}
                </div>
                <div class="botnet-diagram">
                    <ol class="flow" aria-label="共通パイプライン">
                        ${bots.pipeline.map((s) => `<li class="flow-node"><i class="${esc(s.icon)}"></i><b>${esc(s.label)}</b><span>${esc(s.detail)}</span></li>`).join("")}
                    </ol>
                    <ul class="bot-pills">
                        ${bots.items.map((b) => {
                            const handle = (b.url.split("/profile/")[1] || "").replace(BSKY_SUFFIX_RE, "");
                            return `
                            <li class="bot-pill">
                                <i class="${esc(b.icon)}"></i>
                                <span class="bot-pill-text">
                                    <b><a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.name)}</a></b>
                                    <small>@${esc(handle)}</small>
                                </span>
                                <a class="bot-repo" href="${repoUrl(profile.github, b.repo)}" target="_blank" rel="noopener" aria-label="${esc(b.name)} BOT のソースコード"><i class="fa-brands fa-github"></i></a>
                            </li>`;
                        }).join("")}
                    </ul>
                </div>
            </div>`;
    }

    /* ---------------- Archive ---------------- */
    function renderArchive(data) {
        const { archive, profile } = data;
        if (!archive?.length) { $("#archive").remove(); return; }
        $("#archive-list").innerHTML = archive.map((a) => `
            <li class="archive-item">
                <b>${esc(a.name)}</b>
                <p>${esc(a.description)}</p>
                ${chips(a.tech)}
                <a class="link-btn" href="${repoUrl(profile.github, a.repo)}" target="_blank" rel="noopener"><i class="fa-brands fa-github"></i>GitHub</a>
            </li>`).join("");
    }

    /* ---------------- GitHub API 同期（最終更新日の自動表示） ---------------- */
    function relTime(iso) {
        const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
        if (days <= 0) return "今日更新";
        if (days < 30) return `${days}日前に更新`;
        if (days < 365) return `${Math.floor(days / 30)}か月前に更新`;
        return `${Math.floor(days / 365)}年前に更新`;
    }

    function loadGitHubCache() {
        try {
            const cached = JSON.parse(localStorage.getItem(GH_CACHE_KEY) || "null");
            if (cached && Date.now() - cached.at < GH_CACHE_TTL) return cached;
        } catch { /* キャッシュ破損は無視 */ }
        return null;
    }

    async function fetchGitHubRepos(user) {
        try {
            const res = await fetch(`https://api.github.com/users/${user}/repos?per_page=100&sort=pushed`);
            if (!res.ok) throw new Error(res.status);
            const json = await res.json();
            const repos = Object.fromEntries(json.map((r) => [r.name, { pushed: r.pushed_at, stars: r.stargazers_count }]));
            const at = Date.now();
            localStorage.setItem(GH_CACHE_KEY, JSON.stringify({ at, repos }));
            return { repos, at };
        } catch {
            return null; // API 制限時は静かに諦める
        }
    }

    async function syncGitHub(user) {
        const result = loadGitHubCache() || await fetchGitHubRepos(user);
        if (!result) return;
        const { repos, at: fetchedAt } = result;

        for (const el of $$(".fresh[data-repo]")) {
            const r = repos[el.dataset.repo];
            if (!r) continue;
            el.textContent = relTime(r.pushed);
            el.title = new Date(r.pushed).toLocaleString("ja-JP");
            const days = (Date.now() - new Date(r.pushed).getTime()) / 86400000;
            el.classList.toggle("is-hot", days < 7);
        }
        const t = new Date(fetchedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
        $("#sync-status").innerHTML = `<i class="fa-solid fa-rotate"></i>Data-driven by <code>data/projects.json</code> · GitHub 同期 ${t}`;
    }

    /* ---------------- 共通インタラクション ---------------- */
    function setupReveal() {
        const targets = $$("[data-reveal]");
        if (reduceMotion || !("IntersectionObserver" in globalThis)) {
            for (const t of targets) { t.classList.add("is-in"); }
            return;
        }
        const io = new IntersectionObserver((entries) => {
            for (const en of entries) {
                if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
            }
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
        for (const t of targets) { io.observe(t); }
    }

    function setupNav() {
        const nav = $("#nav");
        const links = $$("[data-nav]");
        const progress = $(".progress");
        const scrollSupported = CSS.supports("animation-timeline: scroll()");
        const onScroll = () => {
            nav.classList.toggle("is-scrolled", globalThis.scrollY > 12);
            if (!scrollSupported) {
                const max = document.documentElement.scrollHeight - globalThis.innerHeight;
                progress.style.setProperty("--progress", max > 0 ? globalThis.scrollY / max : 0);
            }
        };
        globalThis.addEventListener("scroll", onScroll, { passive: true });
        onScroll();

        const io = new IntersectionObserver((entries) => {
            for (const en of entries) {
                if (!en.isIntersecting) continue;
                for (const l of links) { l.classList.toggle("is-active", l.getAttribute("href") === `#${en.target.id}`); }
            }
        }, { rootMargin: "-40% 0px -55% 0px" });
        for (const l of links) { const s = $(l.getAttribute("href")); if (s) io.observe(s); }
    }

    /* ---------------- 起動 ---------------- */
    async function init() {
        $("#year").textContent = new Date().getFullYear();
        setupNav();
        try {
            const res = await fetch(DATA_URL, { cache: "no-cache" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderHero(data);
            renderShowcase(data);
            renderProducts(data);
            renderBots(data);
            renderArchive(data);
            setupReveal();
            syncGitHub(data.profile.github);
        } catch (err) {
            console.error(err);
            setupReveal();
            $("#showcase .scrolly").innerHTML = `<p class="load-error">データ（${DATA_URL}）の読み込みに失敗した。ローカルで確認する場合は <code>python -m http.server</code> などで配信して開くこと。</p>`;
        }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
