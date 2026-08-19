/* "Onze plekken": overlay-kaart met een speld per date, plus het
   mini-kaartje in de modal om een plek te kiezen. */
(function () {
  if (typeof L === 'undefined') return;

  const STATISCH = !!window.PLAKBOEK_STATISCH;

  const TEGELS = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
  const ATTRIBUTIE = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const NL_CENTRUM = [52.15, 5.3];

  const speldIcoon = L.divIcon({
    className: 'speld',
    html: '<svg viewBox="0 0 24 24" width="30" height="30"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" fill="#a8434e" stroke="#fdfbf6" stroke-width="1.4"/><circle cx="12" cy="9" r="2.6" fill="#fdfbf6"/></svg>',
    iconSize: [30, 30],
    iconAnchor: [15, 28],
    popupAnchor: [0, -26],
  });

  // ---------- Overlay ----------
  const overlay = document.getElementById('kaart-overlay');
  let overlayKaart = null;
  let speldenLaag = null;

  const kaartKnop = document.createElement('button');
  kaartKnop.type = 'button';
  kaartKnop.className = 'knop-kaart';
  kaartKnop.title = 'Onze plekken op de kaart';
  kaartKnop.innerHTML =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg><span>Onze plekken</span>';
  document.body.appendChild(kaartKnop);

  function maandKort(iso) {
    if (!iso) return 'datum volgt nog';
    const d = new Date(iso + 'T12:00:00');
    return isNaN(d)
      ? iso
      : new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  }

  function toonOverlay() {
    overlay.classList.remove('verborgen');
    if (!overlayKaart) {
      overlayKaart = L.map('kaart', { zoomControl: true });
      L.tileLayer(TEGELS, { attribution: ATTRIBUTIE, maxZoom: 19 }).addTo(overlayKaart);
      speldenLaag = L.layerGroup().addTo(overlayKaart);
    }
    speldenLaag.clearLayers();

    const metPlek = (window.Plakboek.entries || []).filter((e) => e.lat != null && e.lng != null);
    for (const entry of metPlek) {
      const marker = L.marker([entry.lat, entry.lng], { icon: speldIcoon }).addTo(speldenLaag);
      const popup = document.createElement('div');
      popup.className = 'speld-popup';
      popup.innerHTML = '<strong></strong><em></em><span></span><button type="button" class="knop knop-vol">Naar de pagina</button>';
      popup.querySelector('strong').textContent = entry.titel;
      popup.querySelector('em').textContent = entry.plek_naam || '';
      popup.querySelector('span').textContent = maandKort(entry.datum);
      popup.querySelector('button').addEventListener('click', () => {
        overlay.classList.add('verborgen');
        window.Plakboek.gaNaarEntry(entry.id);
      });
      marker.bindPopup(popup);
    }

    setTimeout(() => {
      overlayKaart.invalidateSize();
      if (metPlek.length) {
        overlayKaart.fitBounds(metPlek.map((e) => [e.lat, e.lng]), { padding: [60, 60], maxZoom: 12 });
      } else {
        overlayKaart.setView(NL_CENTRUM, 7);
      }
    }, 60);
  }

  kaartKnop.addEventListener('click', toonOverlay);
  document.getElementById('knop-kaart-sluit').addEventListener('click', () => overlay.classList.add('verborgen'));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') overlay.classList.add('verborgen');
  });

  // Het mini-kaartje hoort bij het formulier, dat de statische kopie niet heeft
  if (STATISCH) return;

  // ---------- Mini-kaartje in de modal ----------
  const formulier = document.getElementById('date-formulier');
  const speldWegKnop = document.getElementById('knop-speld-weg');
  let miniKaart = null;
  let miniSpeld = null;

  function zetSpeld(lat, lng) {
    formulier.elements.lat.value = lat != null ? lat : '';
    formulier.elements.lng.value = lng != null ? lng : '';
    speldWegKnop.classList.toggle('verborgen', lat == null);
    if (lat == null) {
      if (miniSpeld) { miniSpeld.remove(); miniSpeld = null; }
      return;
    }
    if (miniSpeld) miniSpeld.setLatLng([lat, lng]);
    else miniSpeld = L.marker([lat, lng], { icon: speldIcoon }).addTo(miniKaart);
  }

  // boek.js/toevoegen.js roept dit aan als de modal opengaat
  window.Plakboek = window.Plakboek || {};
  window.Plakboek.plekKiezerInit = function (entry) {
    if (!miniKaart) {
      miniKaart = L.map('plek-kaartje', { zoomControl: false, attributionControl: false });
      L.tileLayer(TEGELS, { maxZoom: 19 }).addTo(miniKaart);
      miniKaart.on('click', (e) => zetSpeld(e.latlng.lat, e.latlng.lng));
    }
    const heeftPlek = entry && entry.lat != null && entry.lng != null;
    zetSpeld(heeftPlek ? entry.lat : null, heeftPlek ? entry.lng : null);
    setTimeout(() => {
      miniKaart.invalidateSize();
      if (heeftPlek) miniKaart.setView([entry.lat, entry.lng], 11);
      else miniKaart.setView(NL_CENTRUM, 6);
    }, 60);
  };

  speldWegKnop.addEventListener('click', () => zetSpeld(null, null));
})();
