/* Stickers en krabbels: plakken, slepen en weghalen op date-pagina's. */
(function () {
  const SVGS = {
    hart: '<svg viewBox="0 0 24 24" fill="#c94f5c"><path d="M12 21s-7.5-4.9-10-9.5C.4 8.4 2.4 5 5.8 5c2 0 3.4 1.1 4.2 2.4h4c.8-1.3 2.2-2.4 4.2-2.4 3.4 0 5.4 3.4 3.8 6.5C19.5 16.1 12 21 12 21z"/></svg>',
    ster: '<svg viewBox="0 0 24 24" fill="#e2b13c"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/></svg>',
    bloem: '<svg viewBox="0 0 24 24"><g fill="#e694a8"><circle cx="12" cy="5.5" r="3.4"/><circle cx="18.5" cy="10.5" r="3.4"/><circle cx="16" cy="18" r="3.4"/><circle cx="8" cy="18" r="3.4"/><circle cx="5.5" cy="10.5" r="3.4"/></g><circle cx="12" cy="12" r="3.2" fill="#e2b13c"/></svg>',
    smiley: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f2cf5b"/><circle cx="8.5" cy="10" r="1.4" fill="#5a4326"/><circle cx="15.5" cy="10" r="1.4" fill="#5a4326"/><path d="M7.5 14.5c1.2 1.8 2.7 2.7 4.5 2.7s3.3-.9 4.5-2.7" fill="none" stroke="#5a4326" stroke-width="1.6" stroke-linecap="round"/></svg>',
  };

  // In de statische kopie zijn stickers alleen om naar te kijken: er is geen
  // server om ze te bewaren
  const STATISCH = !!window.PLAKBOEK_STATISCH;
  window.Stickers = {
    vulLaag(laagEl, entry) {
      for (const sticker of entry.stickers || []) {
        laagEl.appendChild(maakStickerEl(sticker));
      }
    },
  };
  if (STATISCH) return;

  let plakSoort = null; // 'hart' | 'ster' | 'bloem' | 'smiley' | 'tekst'
  let plakTekst = '';

  // ---------- Tray ----------
  const trayKnop = document.createElement('button');
  trayKnop.type = 'button';
  trayKnop.id = 'knop-stickers';
  trayKnop.className = 'knop-stickers';
  trayKnop.title = 'Stickers en krabbels';
  trayKnop.innerHTML = SVGS.hart + '<span>Versieren</span>';
  document.body.appendChild(trayKnop);

  const tray = document.createElement('div');
  tray.className = 'sticker-tray verborgen';
  tray.innerHTML = `
    <p class="tray-uitleg">Kies een sticker en klik op een pagina om hem te plakken. Sleep om te verplaatsen.</p>
    <div class="tray-stickers">
      ${Object.entries(SVGS)
        .map(([soort, svg]) => `<button type="button" class="tray-sticker" data-soort="${soort}" title="${soort}">${svg}</button>`)
        .join('')}
    </div>
    <div class="tray-krabbel">
      <input type="text" maxlength="60" placeholder="of schrijf een krabbel...">
      <button type="button" class="knop knop-vol tray-krabbel-knop">Plak</button>
    </div>
    <p class="tray-status verborgen"></p>`;
  document.body.appendChild(tray);

  const statusEl = tray.querySelector('.tray-status');
  const krabbelInput = tray.querySelector('.tray-krabbel input');

  function zetPlakModus(soort, tekst) {
    plakSoort = soort;
    plakTekst = tekst || '';
    document.body.classList.toggle('plak-modus', !!soort);
    tray.querySelectorAll('.tray-sticker').forEach((k) =>
      k.classList.toggle('actief', k.dataset.soort === soort)
    );
    statusEl.classList.toggle('verborgen', !soort);
    if (soort) {
      statusEl.textContent =
        soort === 'tekst'
          ? 'Klik op een pagina om je krabbel te plakken (Esc om te stoppen)'
          : 'Klik op een pagina om te plakken (Esc om te stoppen)';
    }
  }

  trayKnop.addEventListener('click', () => {
    tray.classList.toggle('verborgen');
    if (tray.classList.contains('verborgen')) zetPlakModus(null);
  });

  tray.querySelectorAll('.tray-sticker').forEach((k) =>
    k.addEventListener('click', () => zetPlakModus(k.dataset.soort === plakSoort ? null : k.dataset.soort))
  );

  tray.querySelector('.tray-krabbel-knop').addEventListener('click', () => {
    const tekst = krabbelInput.value.trim();
    if (tekst) zetPlakModus('tekst', tekst);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') zetPlakModus(null);
  });

  // ---------- Plakken ----------
  // In plak-modus mag PageFlip de klik niet oppakken (capture-fase)
  document.addEventListener(
    'pointerdown',
    (e) => {
      if (plakSoort && e.target.closest('.sticker-laag, .pagina-binnen')) e.stopPropagation();
    },
    true
  );

  document.addEventListener('click', async (e) => {
    if (!plakSoort) return;
    const binnen = e.target.closest('.pagina-binnen');
    if (!binnen || !binnen.parentElement.dataset.entryId) return;
    e.stopPropagation();
    const entryId = Number(binnen.parentElement.dataset.entryId);
    const rect = binnen.getBoundingClientRect();
    const x_pct = ((e.clientX - rect.left) / rect.width) * 100;
    const y_pct = ((e.clientY - rect.top) / rect.height) * 100;
    const rotatie = (Math.random() - 0.5) * (plakSoort === 'tekst' ? 10 : 26);

    const res = await fetch('/api/stickers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entry_id: entryId, soort: plakSoort, x_pct, y_pct, rotatie, tekst: plakTekst }),
    });
    if (res.status === 401) return location.assign('/login');
    if (!res.ok) return;
    const sticker = await res.json();

    const entry = window.Plakboek.entries.find((en) => en.id === entryId);
    if (entry) entry.stickers.push(sticker);
    binnen.querySelector('.sticker-laag').appendChild(maakStickerEl(sticker));
    if (plakSoort === 'tekst') {
      krabbelInput.value = '';
      zetPlakModus(null);
    }
  });

  // ---------- Renderen, slepen en verwijderen ----------
  function maakStickerEl(sticker) {
    const el = document.createElement('span');
    el.className = 'sticker' + (sticker.soort === 'tekst' ? ' sticker-tekst' : '');
    el.dataset.stickerId = sticker.id;
    el.style.left = sticker.x_pct + '%';
    el.style.top = sticker.y_pct + '%';
    el.style.setProperty('--rotatie', sticker.rotatie + 'deg');
    if (sticker.soort === 'tekst') {
      el.textContent = sticker.tekst;
    } else {
      el.innerHTML = SVGS[sticker.soort] || '';
    }
    if (STATISCH) return el;

    const weg = document.createElement('button');
    weg.type = 'button';
    weg.className = 'sticker-weg';
    weg.title = 'Sticker weghalen';
    weg.textContent = '×';
    el.appendChild(weg);
    weg.addEventListener('pointerdown', (e) => e.stopPropagation());
    weg.addEventListener('click', async (e) => {
      e.stopPropagation();
      await fetch(`/api/stickers/${sticker.id}`, { method: 'DELETE' });
      const entry = window.Plakboek.entries.find((en) => en.id === sticker.entry_id);
      if (entry) entry.stickers = entry.stickers.filter((s) => s.id !== sticker.id);
      el.remove();
    });

    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const laag = el.parentElement;
      const rect = laag.getBoundingClientRect();
      let laatsteX = sticker.x_pct;
      let laatsteY = sticker.y_pct;
      function beweeg(ev) {
        laatsteX = Math.min(Math.max(((ev.clientX - rect.left) / rect.width) * 100, 0), 100);
        laatsteY = Math.min(Math.max(((ev.clientY - rect.top) / rect.height) * 100, 0), 100);
        el.style.left = laatsteX + '%';
        el.style.top = laatsteY + '%';
      }
      function klaar() {
        document.removeEventListener('pointermove', beweeg);
        document.removeEventListener('pointerup', klaar);
        sticker.x_pct = laatsteX;
        sticker.y_pct = laatsteY;
        fetch(`/api/stickers/${sticker.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x_pct: laatsteX, y_pct: laatsteY }),
        });
      }
      document.addEventListener('pointermove', beweeg);
      document.addEventListener('pointerup', klaar);
    });
    return el;
  }
})();
