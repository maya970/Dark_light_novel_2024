/* Load book lists from the cn/*.txt dumps. Quote-aware CSV, skips bad lines. */
(function (global) {
  "use strict";

  var allBooks = [];
  var filteredBooks = [];
  var currentPage = 1;
  var rowsPerPage = 10;
  var showId = false;

  function splitCSV(line) {
    var out = [];
    var cur = "";
    var quote = "";
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (quote) {
        if (c === quote) quote = "";
        else cur += c;
        continue;
      }
      if (c === "'" || c === '"') {
        quote = c;
        continue;
      }
      if (c === ",") {
        out.push(cur.trim());
        cur = "";
        continue;
      }
      cur += c;
    }
    out.push(cur.trim());
    return out;
  }

  function parseLine(line) {
    line = String(line || "").replace(/^\uFEFF/, "").trim();
    if (!line) return null;
    var p = splitCSV(line);
    if (p.length < 8) return null;
    var title = p[5] || "";
    if (!title) return null;
    return {
      id: p[0] || "",
      rating: parseFloat(p[3]),
      category: p[2] || "",
      ratingCount: parseInt(p[4], 10),
      title: title,
      wordCount: parseInt(p[6], 10),
      author: p[7] || "",
      link: p[8] || ""
    };
  }

  function parseBooks(text) {
    var lines = String(text).split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      try {
        var book = parseLine(lines[i]);
        if (book) allBooks.push(book);
      } catch (err) {}
    }
  }

  function num(v) {
    return typeof v === "number" && !isNaN(v) ? v : 0;
  }

  function sortBooks(field) {
    field = field || "rating";
    filteredBooks.sort(function (a, b) {
      return num(b[field]) - num(a[field]);
    });
  }

  function setCount(text) {
    var el = document.querySelector(".dl-count");
    if (el) el.textContent = text;
  }

  function populateTable(books) {
    var table = document.getElementById("bookTable");
    if (!table) return;
    var tbody = table.getElementsByTagName("tbody")[0];
    if (!tbody) return;
    tbody.innerHTML = "";

    var list = books || [];
    var pages = list.length ? Math.ceil(list.length / rowsPerPage) : 0;
    if (pages > 0 && currentPage > pages) currentPage = pages;
    if (currentPage < 1) currentPage = 1;
    var start = (currentPage - 1) * rowsPerPage;
    var end = start + rowsPerPage;
    var pageRows = list.slice(start, end);

    for (var i = 0; i < pageRows.length; i++) {
      var book = pageRows[i];
      var tr = document.createElement("tr");
      var link = book.link || "";
      var cells = "";
      if (showId) cells += "<td>" + escapeHtml(book.id) + "</td>";
      cells +=
        "<td>" +
        (num(book.rating) ? book.rating : "—") +
        "</td>" +
        "<td>" +
        escapeHtml(book.category) +
        "</td>" +
        "<td>" +
        (num(book.ratingCount) ? book.ratingCount : "—") +
        "</td>" +
        "<td>" +
        escapeHtml(book.title) +
        "</td>" +
        "<td>" +
        (num(book.wordCount) ? book.wordCount : "—") +
        "</td>" +
        "<td>" +
        escapeHtml(book.author) +
        "</td>" +
        "<td>" +
        (link
          ? '<a href="' +
            escapeHtml(link) +
            '" target="_blank" rel="noopener">链接</a>'
          : "—") +
        "</td>";
      tr.innerHTML = cells;
      tbody.appendChild(tr);
    }

    var prev = document.getElementById("prevPage");
    var next = document.getElementById("nextPage");
    if (prev) prev.disabled = currentPage <= 1 || pages === 0;
    if (next) next.disabled = pages === 0 || currentPage >= pages;
    var pager = document.getElementById("pageInfo");
    if (pager) {
      pager.textContent = pages
        ? "第 " + currentPage + " / " + pages + " 页"
        : "";
    }
    if (list.length) {
      setCount("共 " + list.length + " 本 · 第 " + currentPage + " / " + pages + " 页");
    } else {
      setCount("没有匹配的书");
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function filterByRating(rating, filter) {
    if (!filter) return true;
    var parts = filter.split("-").map(Number);
    return rating >= parts[0] && rating < parts[1];
  }

  function filterTable() {
    var nameEl = document.getElementById("nameFilter");
    var catEl = document.getElementById("categoryFilter");
    var rateEl = document.getElementById("ratingFilter");
    var name = ((nameEl && nameEl.value) || "").toUpperCase();
    var category = (catEl && catEl.value) || "";
    var rating = (rateEl && rateEl.value) || "";

    filteredBooks = allBooks.filter(function (book) {
      var title = String(book.title || "").toUpperCase();
      var cat = String(book.category || "");
      var matchesName = !name || title.indexOf(name) !== -1;
      var matchesCategory = !category || cat.indexOf(category) !== -1;
      var matchesRating = filterByRating(num(book.rating), rating);
      return matchesName && matchesCategory && matchesRating;
    });

    currentPage = 1;
    sortBooks("rating");
    populateTable(filteredBooks);
  }

  function changePage(direction) {
    currentPage += direction;
    if (currentPage < 1) currentPage = 1;
    populateTable(filteredBooks);
  }

  function sortTable(field) {
    sortBooks(field);
    currentPage = 1;
    populateTable(filteredBooks);
  }

  function memoryText(file) {
    var bag = global.__BOOK_FILES;
    return bag && typeof bag[file] === "string" ? bag[file] : null;
  }

  function unique(arr) {
    var seen = {};
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      if (!arr[i] || seen[arr[i]]) continue;
      seen[arr[i]] = 1;
      out.push(arr[i]);
    }
    return out;
  }

  function siblingUrl(name) {
    try {
      return new URL(name, document.baseURI).href;
    } catch (e) {
      return name;
    }
  }

  function loadScriptFile(src, file) {
    return new Promise(function (resolve, reject) {
      var hit = memoryText(file);
      if (hit != null) {
        resolve(hit);
        return;
      }
      var s = document.createElement("script");
      s.charset = "utf-8";
      s.src = src;
      s.onload = function () {
        var data = memoryText(file);
        if (data != null) resolve(data);
        else reject(new Error("empty"));
      };
      s.onerror = function () {
        reject(new Error("script"));
      };
      document.head.appendChild(s);
    });
  }

  function loadFile(file) {
    var hit = memoryText(file);
    if (hit != null) return Promise.resolve(hit);

    var name = String(file).split("/").pop();
    var dataName = name.replace(/\.txt$/i, ".data.js");
    var scriptSrc = siblingUrl(dataName);

    function fromScript() {
      var again = memoryText(file);
      if (again != null) return Promise.resolve(again);
      return loadScriptFile(scriptSrc, file);
    }

    if (location.protocol === "file:") {
      return fromScript();
    }

    var urls = unique([
      siblingUrl(name),
      siblingUrl(file),
      (location.origin || "") + "/cn/" + name
    ]);

    function tryFetch(i) {
      if (i >= urls.length) return fromScript();
      return fetch(urls[i])
        .then(function (res) {
          if (!res.ok) throw new Error(String(res.status));
          return res.text();
        })
        .catch(function () {
          return tryFetch(i + 1);
        });
    }

    return tryFetch(0);
  }

  function start(opts) {
    opts = opts || {};
    showId = !!opts.showId;
    rowsPerPage = opts.perPage || 100;
    var files = opts.files || [];

    function run() {
      setCount("正在载入书目…");
      allBooks = [];
      Promise.all(
        files.map(function (file) {
          return loadFile(file).then(
            function (text) {
              return { ok: true, text: text };
            },
            function (err) {
              console.error(file, err);
              return { ok: false };
            }
          );
        })
      ).then(function (results) {
        var loaded = false;
        for (var i = 0; i < results.length; i++) {
          if (results[i].ok) {
            loaded = true;
            parseBooks(results[i].text);
          }
        }
        if (!loaded) {
          setCount("书目加载失败：浏览器拦了书目文件。请通过网站地址打开，不要直接双击 html。");
          return;
        }
        filteredBooks = allBooks.slice();
        sortBooks("rating");
        populateTable(filteredBooks);
        if (!allBooks.length) setCount("书目文件是空的");
      });
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", run);
    } else {
      run();
    }
  }

  global.populateTable = populateTable;
  global.filterTable = filterTable;
  global.changePage = changePage;
  global.sortTable = sortTable;
  global.BookList = { start: start, filter: filterTable };
})(window);
