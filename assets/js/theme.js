/* 冷门历史小说 — static front-end glue. No backend, no build. */
(function () {
  "use strict";

  var page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  if (!page || page.indexOf(".") === -1) page = "index.html";

  var GLOBAL_NAV = [
    { href: "index.html", title: "首页" },
    { href: "book241026.html", title: "历史书目" },
    { href: "cold.html", title: "冷门外国" },
    { href: "japan.html", title: "日本" },
    { href: "picture.html", title: "公众号" },
    { href: "about.html", title: "关于本站" }
  ];

  var PAGE_TITLES = {
    "index.html": "首页",
    "book241026.html": "历史书目",
    "book.html": "历史书目",
    "bookstext.html": "历史书目",
    "cold.html": "冷门外国史",
    "japan.html": "日本",
    "picture.html": "公众号",
    "about.html": "关于本站"
  };

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html) node.innerHTML = html;
    return node;
  }

  function brandLogo() {
    qsa(".logo a, .navbar-brand .logo").forEach(function (a) {
      a.innerHTML =
        '<span class="dl-mark">冷</span><span class="dl-brand">冷门历史小说<small>COLD HISTORY</small></span>';
      a.setAttribute("href", "index.html");
      a.classList.add("dl-branded");
    });
    qsa('[data-toggle="mobile-menu"]').forEach(function (a) {
      a.innerHTML = '<span class="dl-burger" aria-hidden="true"></span>';
      a.setAttribute("aria-label", "打开菜单");
    });
  }

  function unifyNav() {
    var menu = qs("#main-menu");
    if (!menu) return;

    var hashLinks = qsa("a.smooth", menu)
      .map(function (a) {
        var titleNode = qs(".title", a) || a;
        return {
          href: a.getAttribute("href"),
          title: (titleNode.textContent || "").replace(/\s+/g, " ").trim()
        };
      })
      .filter(function (item) {
        if (!item.href || item.href.charAt(0) !== "#" || !item.title) return false;
        try {
          return !!qs(item.href);
        } catch (err) {
          return false;
        }
      });

    var html = "";
    GLOBAL_NAV.forEach(function (item) {
      var active = item.href === page ? " class=\"active\"" : "";
      html +=
        "<li" +
        active +
        '><a href="' +
        item.href +
        '"><span class="dl-dot"></span><span class="title">' +
        item.title +
        "</span></a></li>";
    });

    if (hashLinks.length) {
      html += '<li class="dl-nav-label">本页目录</li>';
      hashLinks.forEach(function (item) {
        html +=
          '<li><a href="' +
          item.href +
          '" class="smooth"><span class="dl-dot"></span><span class="title">' +
          item.title +
          "</span></a></li>";
      });
    }

    menu.innerHTML = html;
  }

  function crumb() {
    var content = qs(".main-content");
    if (!content || qs(".dl-crumb")) return;
    var nav = qs(".navbar.user-info-navbar", content);
    var bar = el(
      "div",
      "dl-crumb",
      "<span>冷门历史小说 / <b>" +
        (PAGE_TITLES[page] || "书单") +
        '</b></span><span>止于 2024.10.26</span>'
    );
    if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(bar, nav.nextSibling);
    } else {
      content.insertBefore(bar, content.firstChild);
    }
  }

  function setMenu(open) {
    var menu = qs("#main-menu");
    if (!menu) return;
    menu.classList.toggle("mobile-is-visible", open);
    document.body.classList.toggle("dl-nav-open", open);
  }

  function mobileChrome() {
    if (qs(".dl-backdrop")) return;
    var backdrop = el("div", "dl-backdrop");
    document.body.appendChild(backdrop);

    document.addEventListener("click", function (e) {
      var toggle = e.target.closest && e.target.closest('[data-toggle="mobile-menu"]');
      if (toggle) {
        e.preventDefault();
        setMenu(!document.body.classList.contains("dl-nav-open"));
        return;
      }
      if (e.target === backdrop) {
        setMenu(false);
        return;
      }
      var link = e.target.closest && e.target.closest("#main-menu a");
      if (link && window.innerWidth <= 768) setMenu(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 768) setMenu(false);
    });
  }

  function chromeClicks() {
    document.addEventListener("click", function (e) {
      var top = e.target.closest && e.target.closest("[rel=go-top]");
      if (top) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      var smooth = e.target.closest && e.target.closest("a.smooth");
      if (!smooth) return;
      var id = smooth.getAttribute("href");
      if (!id || id.charAt(0) !== "#") return;
      var target = qs(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function nextContent(node) {
    var n = node.nextSibling;
    while (n) {
      if (n.nodeType === 3 && n.textContent.replace(/^\s+|\s+$/g, "")) return n;
      if (n.nodeType === 1) return n;
      n = n.nextSibling;
    }
    return null;
  }

  function isHeading(node) {
    return node && node.nodeType === 1 && /^(H3|H4|H5)$/.test(node.tagName);
  }

  function enhanceBookLists() {
    var root = qs(".main-content");
    if (!root || qs("#bookTable") || qs(".dl-wechat") || qs(".dl-hero")) return;
    if (qs(".dl-era")) return;

    var nodes = Array.prototype.slice.call(root.childNodes);
    var current = null;

    nodes.forEach(function (node) {
      if (isHeading(node)) {
        if (node.tagName === "H3") {
          var nxt = nextContent(node);
          if (isHeading(nxt) && nxt.tagName !== "H3") {
            current = null;
            return;
          }
        }
        current = el("div", "dl-era");
        root.insertBefore(current, node);
        current.appendChild(node);
        var body = el("div", "dl-era-body");
        current.appendChild(body);
        return;
      }

      if (!current) return;

      var body = qs(".dl-era-body", current);
      if (!body) return;

      if (node.nodeType === 3) {
        var text = node.textContent.replace(/^\s+|\s+$/g, "");
        if (!text) return;
        body.insertAdjacentHTML("beforeend", decorateBooks(text));
        node.parentNode.removeChild(node);
      } else if (node.nodeType === 1 && !/^(H3|H4|H5|FOOTER|NAV|SCRIPT|DIV)$/.test(node.tagName)) {
        body.appendChild(node);
        body.innerHTML = decorateBooks(body.innerHTML);
      }
    });

    addListSearch();
  }

  function decorateBooks(text) {
    return String(text).replace(/《([^》]+)》/g, '<span class="dl-book">《$1》</span>');
  }

  function addListSearch() {
    if (!qs(".dl-era") || qs(".dl-search")) return;
    var first = qs(".dl-era");
    var bar = el("div", "dl-toolbar");
    bar.innerHTML =
      '<input type="search" class="dl-search" placeholder="搜索本书单里的书名…" enterkeyhint="search">';
    first.parentNode.insertBefore(bar, first);

    var input = qs(".dl-search", bar);
    var timer = 0;
    input.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = (input.value || "").replace(/\s+/g, "").toLowerCase();
        qsa(".dl-book").forEach(function (chip) {
          var hit = !q || chip.textContent.toLowerCase().indexOf(q) !== -1;
          chip.classList.toggle("is-hit", !!q && hit);
          chip.classList.toggle("is-dim", !!q && !hit);
        });
        qsa(".dl-era").forEach(function (era) {
          var any = !q || !!qs(".dl-book.is-hit", era) || !qs(".dl-book", era);
          era.style.display = any ? "" : "none";
        });
      }, 80);
    });
  }

  function wrapFilters() {
    var name = qs("#nameFilter");
    if (!name || name.closest(".dl-toolbar")) return;
    var parent = name.parentNode;
    parent.classList.add("dl-toolbar");
    qsa("#prevPage, #nextPage").forEach(function (btn) {
      btn.classList.add("dl-btn");
    });
    if (!qs(".dl-count")) {
      var count = el("div", "dl-count", "正在载入书目…");
      parent.parentNode.insertBefore(count, qs("#bookTable"));
    }
    hookPopulate();
  }

  function hookPopulate() {
    if (typeof window.populateTable !== "function" || window.populateTable.__dlHooked) return;
    var orig = window.populateTable;
    window.populateTable = function (books) {
      orig(books);
      updateCount(books);
      labelTable();
    };
    window.populateTable.__dlHooked = true;
  }

  function updateCount(books) {
    /* books.js writes 共 N 本 · 第 x / y 页 */
  }

  function labelTable() {
    var table = qs("#bookTable");
    if (!table) return;
    var heads = qsa("thead th", table).map(function (th) {
      return (th.textContent || "").replace(/\s+/g, "");
    });
    qsa("tbody tr", table).forEach(function (tr) {
      qsa("td", tr).forEach(function (td, i) {
        if (heads[i]) td.setAttribute("data-label", heads[i]);
      });
    });
  }

  function watchTable() {
    var table = qs("#bookTable");
    if (!table) return;
    wrapFilters();
    labelTable();
    var obs = new MutationObserver(labelTable);
    obs.observe(table, { childList: true, subtree: true });
  }

  function analytics() {
    window.addEventListener("load", function () {
      setTimeout(function () {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?c05bb16ea908292af9f6c513087a1cc3";
        hm.async = true;
        document.head.appendChild(hm);
      }, 1800);
    });
  }

  function boot() {
    document.body.classList.add("dl-site");
    brandLogo();
    unifyNav();
    crumb();
    mobileChrome();
    chromeClicks();
    enhanceBookLists();
    watchTable();
    analytics();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
