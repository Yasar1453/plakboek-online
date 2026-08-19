/* Bouwt het plakboek op en regelt het bladeren (PageFlip). */
(function () {
  // De statische kopie (GitHub Pages) heeft geen server: de dates komen dan uit
  // entries.json en bewerken kan niet
  const STATISCH = !!window.PLAKBOEK_STATISCH;
  const BRON = STATISCH ? 'entries.json' : '/api/entries';
  const UPLOADS = STATISCH ? 'uploads/' : '/uploads/';

  const houderEl = document.getElementById('boek-houder');
  const standEl = document.getElementById('pagina-stand');
  let boekEl = document.getElementById('boek');

  let pageFlip = null;
  let entries = [];
  let aantalTocPaginas = 0;
  let eersteKeer = true;

  const maandFormat = new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  function formatteerDatum(iso) {
    if (!iso) return 'datum volgt nog';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d) ? iso : maandFormat.format(d);
  }

  function formatteerKort(iso) {
    if (!iso) return '?';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d)
      ? iso
      : new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' }).format(d);
  }

  // Dates zonder datum tellen niet mee voor het jaarbereik en de teller
  function metDatum() {
    return entries.filter((e) => e.datum);
  }

  function jarenBereik() {
    const gedateerd = metDatum();
    if (!gedateerd.length) return '';
    const jaren = gedateerd.map((e) => e.datum.slice(0, 4));
    const min = jaren[0];
    const max = jaren[jaren.length - 1];
    return min === max ? min : `${min} — ${max}`;
  }

  function dagenSamen() {
    const gedateerd = metDatum();
    if (!gedateerd.length) return null;
    const eerste = new Date(gedateerd[0].datum + 'T12:00:00');
    const dagen = Math.floor((Date.now() - eerste.getTime()) / 86400000);
    return dagen > 0 ? dagen : null;
  }

  function isVideo(bestandsnaam) {
    return /\.(mp4|mov|m4v|webm|ogv)$/i.test(bestandsnaam || '');
  }
  window.Plakboek = window.Plakboek || {};
  window.Plakboek.isVideo = isVideo;

  const hartSvg =
    '<svg class="kaft-hart" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.4 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.4h4c.8-1.3 2.2-2.4 4.2-2.4 3.4 0 5.4 3.4 3.8 6.5C19.5 16.1 12 21 12 21z" transform="scale(0.95) translate(0.6,0.6)"/></svg>';

  function maakKaft() {
    const el = document.createElement('div');
    el.className = 'pagina kaft';
    el.dataset.density = 'hard';
    const dagen = dagenSamen();
    el.innerHTML = `
      <div class="kaft-binnen">
        <div class="kaft-eyebrow">samen op stap</div>
        <div class="kaft-titel">Ons plakboek</div>
        ${hartSvg}
        <div class="kaft-jaren">${jarenBereik()}</div>
        ${dagen ? `<div class="kaft-teller">al ${dagen.toLocaleString('nl-NL')} dagen samen</div>` : ''}
      </div>`;
    return el;
  }

  function maakAchterkaft() {
    const el = document.createElement('div');
    el.className = 'pagina kaft';
    el.dataset.density = 'hard';
    el.innerHTML = `
      <div class="kaft-binnen">
        <div class="kaft-eyebrow">wordt vervolgd...</div>
        ${hartSvg}
      </div>`;
    return el;
  }

  // Pagina-index (binnen het boek) van date nummer i (0-gebaseerd)
  function datePaginaIndex(i) {
    return 1 + aantalTocPaginas + i;
  }

  function maakTocPaginas() {
    // Regels: jaarkop of date-regel; maximaal ~11 regels per pagina
    const regels = [];
    let vorigJaar = null;
    entries.forEach((entry, i) => {
      const jaar = entry.datum ? entry.datum.slice(0, 4) : 'Nog geen datum';
      if (jaar !== vorigJaar) {
        regels.push({ soort: 'jaar', jaar });
        vorigJaar = jaar;
      }
      regels.push({ soort: 'date', entry, index: i });
    });

    const PER_PAGINA = 11;
    const paginas = [];
    for (let start = 0; start < regels.length; start += PER_PAGINA) {
      const el = document.createElement('div');
      el.className = 'pagina';
      el.innerHTML = `
        <div class="pagina-binnen toc">
          ${paginas.length === 0 ? '<h2 class="toc-titel">Onze dates</h2>' : ''}
          <div class="toc-regels"></div>
        </div>`;
      const regelsEl = el.querySelector('.toc-regels');
      for (const regel of regels.slice(start, start + PER_PAGINA)) {
        if (regel.soort === 'jaar') {
          const kop = document.createElement('div');
          kop.className = 'toc-jaar';
          kop.textContent = regel.jaar;
          regelsEl.appendChild(kop);
        } else {
          const knop = document.createElement('button');
          knop.type = 'button';
          knop.className = 'toc-regel';
          knop.innerHTML =
            '<span class="toc-naam"></span><span class="toc-stippen"></span><span class="toc-datum"></span>';
          knop.querySelector('.toc-naam').textContent = regel.entry.titel;
          knop.querySelector('.toc-datum').textContent = formatteerKort(regel.entry.datum);
          ['pointerdown', 'mousedown', 'touchstart'].forEach((t) =>
            knop.addEventListener(t, (e) => e.stopPropagation())
          );
          const doelIndex = regel.index;
          knop.addEventListener('click', (e) => {
            e.stopPropagation();
            pageFlip && pageFlip.flip(datePaginaIndex(doelIndex));
          });
          regelsEl.appendChild(knop);
        }
      }
      paginas.push(el);
    }
    return paginas;
  }

  function maakDatePagina(entry, volgnummer) {
    const el = document.createElement('div');
    el.className = 'pagina';
    el.innerHTML = `
      <div class="pagina-binnen">
        <h2 class="pagina-titel"></h2>
        <div class="pagina-datum"></div>
        <div class="polaroid ${volgnummer % 2 ? 'draai-b' : 'draai-a'}"></div>
        <p class="pagina-tekst"></p>
        <span class="pagina-nummer">${volgnummer}</span>
        <div class="sticker-laag"></div>
        <button class="knop-bewerk" type="button" title="Deze date bewerken" aria-label="Deze date bewerken">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>
        </button>
      </div>`;
    el.querySelector('.pagina-titel').textContent = entry.titel;
    const datumEl = el.querySelector('.pagina-datum');
    datumEl.classList.toggle('geen-datum', !entry.datum);
    datumEl.textContent = formatteerDatum(entry.datum) + (entry.plek_naam ? ` — ${entry.plek_naam}` : '');
    const polaroid = el.querySelector('.polaroid');
    if (isVideo(entry.foto)) {
      const video = document.createElement('video');
      video.src = `${UPLOADS}${entry.foto}`;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      // Bedienen van de video mag geen pagina-sleep starten
      ['pointerdown', 'mousedown', 'touchstart'].forEach((t) =>
        video.addEventListener(t, (e) => e.stopPropagation())
      );
      polaroid.appendChild(video);
    } else {
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.src = `${UPLOADS}${entry.foto}`;
      img.alt = entry.titel;
      polaroid.appendChild(img);
    }
    el.querySelector('.pagina-tekst').textContent = entry.tekst || '';
    el.dataset.entryId = entry.id;

    if (window.Stickers) window.Stickers.vulLaag(el.querySelector('.sticker-laag'), entry);

    const bewerkKnop = el.querySelector('.knop-bewerk');
    if (STATISCH) {
      bewerkKnop.remove();
      return el;
    }
    ['pointerdown', 'mousedown', 'touchstart'].forEach((t) =>
      bewerkKnop.addEventListener(t, (e) => e.stopPropagation())
    );
    bewerkKnop.addEventListener('click', (e) => {
      e.stopPropagation();
      window.Plakboek.openBewerken(entry);
    });
    return el;
  }

  function maakLegePagina() {
    const el = document.createElement('div');
    el.className = 'pagina';
    el.innerHTML = `
      <div class="pagina-binnen">
        <div class="pagina-leeg">
          <p>Het boek is nog leeg...<br>Plak jullie eerste date erin met de knop rechtsonder.</p>
        </div>
      </div>`;
    return el;
  }

  function bouwBoek() {
    if (pageFlip) {
      // destroy() haalt het boek-element zelf uit de DOM, dus maak het opnieuw aan
      try { pageFlip.destroy(); } catch (_) {}
      pageFlip = null;
    }
    if (boekEl) boekEl.remove();
    boekEl = document.createElement('div');
    boekEl.id = 'boek';
    houderEl.appendChild(boekEl);

    const paginas = [maakKaft()];
    if (entries.length === 0) {
      aantalTocPaginas = 0;
      paginas.push(maakLegePagina());
    } else {
      const toc = maakTocPaginas();
      aantalTocPaginas = toc.length;
      toc.forEach((p) => paginas.push(p));
      entries.forEach((entry, i) => paginas.push(maakDatePagina(entry, i + 1)));
    }
    // PageFlip werkt het mooist met een even aantal binnenpagina's
    if ((paginas.length - 1) % 2 === 1) {
      const vulEl = document.createElement('div');
      vulEl.className = 'pagina';
      vulEl.innerHTML = '<div class="pagina-binnen"></div>';
      paginas.push(vulEl);
    }
    paginas.push(maakAchterkaft());
    // Links/rechts bepaalt de rugschaduw: binnenpagina i (1-gebaseerd) ligt
    // links bij oneven i, rechts bij even i
    paginas.forEach((p, i) => {
      if (i === 0 || i === paginas.length - 1) return;
      p.dataset.kant = i % 2 === 1 ? 'links' : 'rechts';
    });
    paginas.forEach((p) => boekEl.appendChild(p));

    pageFlip = new St.PageFlip(boekEl, {
      width: 480,
      height: 640,
      size: 'stretch',
      minWidth: 260,
      maxWidth: 540,
      minHeight: 340,
      maxHeight: 730,
      showCover: true,
      usePortrait: true,
      maxShadowOpacity: 0.35,
      mobileScrollSupport: false,
      flippingTime: 800,
      // Klik-bladeren staat aan: met disableFlipByClick weigert PageFlip ook
      // de animatie van de knoppen (het interne punt valt buiten de hoeken).
      // Klikken op knoppen, stickers en video's wordt apart afgevangen.
      disableFlipByClick: false,
    });
    pageFlip.loadFromHTML(boekEl.querySelectorAll('.pagina'));
    pageFlip.on('flip', werkStandBij);
    werkStandBij();
  }

  function werkStandBij() {
    if (!pageFlip) return;
    const totaal = pageFlip.getPageCount();
    const index = pageFlip.getCurrentPageIndex();
    standEl.textContent = `${index + 1} / ${totaal}`;
    document.getElementById('knop-vorige').disabled = index <= 0;
    document.getElementById('knop-volgende').disabled = index >= totaal - 1;
  }

  function gaNaarEntry(id, direct) {
    const i = entries.findIndex((e) => e.id === id);
    if (i < 0 || !pageFlip) return;
    const index = datePaginaIndex(i);
    setTimeout(() => (direct ? pageFlip.turnToPage(index) : pageFlip.flip(index)), 60);
  }

  // "Vandaag X jaar geleden": zelfde dag en maand, eerder jaar
  function controleerJubileum() {
    const vandaag = new Date();
    const dagMaand = `${String(vandaag.getMonth() + 1).padStart(2, '0')}-${String(vandaag.getDate()).padStart(2, '0')}`;
    const match = entries.find(
      (e) =>
        e.datum &&
        e.datum.slice(5) === dagMaand &&
        Number(e.datum.slice(0, 4)) < vandaag.getFullYear()
    );
    if (!match) return;
    const jaren = vandaag.getFullYear() - Number(match.datum.slice(0, 4));

    const banner = document.createElement('div');
    banner.className = 'jubileum-banner';
    banner.innerHTML = `<strong>Vandaag ${jaren} jaar geleden</strong><span></span>`;
    banner.querySelector('span').textContent = match.titel;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('zichtbaar'));
    setTimeout(() => {
      banner.classList.remove('zichtbaar');
      setTimeout(() => banner.remove(), 600);
    }, 7000);

    setTimeout(() => {
      gaNaarEntry(match.id);
      if (window.Feest) window.Feest.salvo();
    }, 1400);
  }

  async function herlaad(gaNaarEntryId) {
    const res = await fetch(BRON);
    if (res.status === 401) return location.assign('/login');
    entries = await res.json();
    bouwBoek();
    if (gaNaarEntryId != null) gaNaarEntry(gaNaarEntryId, true);
    if (eersteKeer) {
      eersteKeer = false;
      setTimeout(controleerJubileum, 900);
    }
  }

  // Bladeren met twee vangnetten: tijdens een omslag negeren we nieuwe klikken
  // (doorklikken voorbij het einde liet PageFlip intern vastlopen), en als de
  // animatie geweigerd wordt - dat gebeurt op de harde kaften - slaan we de
  // pagina direct om zodat je nooit vastzit
  let bladerBezig = false;

  function blader(richting) {
    if (!pageFlip || bladerBezig) return;
    const voor = pageFlip.getCurrentPageIndex();
    const totaal = pageFlip.getPageCount();
    if ((richting < 0 && voor <= 0) || (richting > 0 && voor >= totaal - 1)) return;

    bladerBezig = true;
    if (richting < 0) pageFlip.flipPrev();
    else pageFlip.flipNext();

    // Weigert PageFlip de animatie (dat gebeurt op de harde kaften), dan blijft
    // de status op 'read' staan en slaan we de pagina direct om
    if (pageFlip.getState() === 'read') {
      for (const stap of [richting, richting * 2]) {
        pageFlip.turnToPage(Math.min(Math.max(voor + stap, 0), totaal - 1));
        if (pageFlip.getCurrentPageIndex() !== voor) break;
      }
      bladerBezig = false;
      werkStandBij();
      return;
    }

    setTimeout(() => {
      bladerBezig = false;
      if (pageFlip) {
        // Op de laatste pagina raakt PageFlip zijn interne teller kwijt;
        // turnToPage zet die opnieuw goed zodat terugbladeren blijft werken
        const nu = pageFlip.getCurrentPageIndex();
        if (nu >= pageFlip.getPageCount() - 1) pageFlip.turnToPage(nu);
      }
      werkStandBij();
    }, 850); // net na de omslagtijd van 800 ms
  }

  document.getElementById('knop-vorige').addEventListener('click', () => blader(-1));
  document.getElementById('knop-volgende').addEventListener('click', () => blader(1));
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('input, textarea')) return;
    if (e.key === 'ArrowLeft') blader(-1);
    if (e.key === 'ArrowRight') blader(1);
  });

  window.Plakboek = window.Plakboek || {};
  window.Plakboek.herlaad = herlaad;
  window.Plakboek.gaNaarEntry = gaNaarEntry;
  Object.defineProperty(window.Plakboek, 'entries', { get: () => entries });

  herlaad();
})();
