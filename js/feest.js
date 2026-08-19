/* Feest-laag: vuurwerk bij het openen van het boek, en Sylveon, Espeon,
   Dedenne en Celebi die rond blijven vliegen. Puur decoratie: alles staat
   op pointer-events none, dus het boek blijft gewoon bedienbaar. */
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---------- Vuurwerk (canvas) ----------
  const canvas = document.createElement('canvas');
  canvas.id = 'vuurwerk';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function pasGrootteAan() {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
  }
  pasGrootteAan();
  addEventListener('resize', pasGrootteAan);

  const KLEUREN = ['#ffd166', '#ef476f', '#f78c6b', '#06d6a0', '#8ecae6', '#e0aaff', '#f9f5e3'];
  const raketten = [];
  const vonken = [];
  const startTijd = performance.now();

  function lanceer() {
    raketten.push({
      x: canvas.width * (0.1 + Math.random() * 0.8),
      y: canvas.height + 10,
      vx: (Math.random() - 0.5) * 1.6,
      vy: -(canvas.height * 0.011 + Math.random() * canvas.height * 0.004),
      kleur: KLEUREN[(Math.random() * KLEUREN.length) | 0],
      lont: 60 + Math.random() * 25,
      leeftijd: 0,
    });
  }

  function ontplof(r) {
    const aantal = 55 + (Math.random() * 40) | 0;
    const dubbelkleur = Math.random() < 0.4 ? KLEUREN[(Math.random() * KLEUREN.length) | 0] : r.kleur;
    for (let i = 0; i < aantal; i++) {
      const hoek = (Math.PI * 2 * i) / aantal + Math.random() * 0.1;
      const kracht = 1.5 + Math.random() * 3.5;
      vonken.push({
        x: r.x,
        y: r.y,
        vx: Math.cos(hoek) * kracht,
        vy: Math.sin(hoek) * kracht,
        kleur: i % 2 ? r.kleur : dubbelkleur,
        leven: 1,
        verval: 0.008 + Math.random() * 0.012,
      });
    }
  }

  let volgendeLancering = 0;
  let salvoTot = 0;
  window.Feest = window.Feest || {};
  window.Feest.salvo = () => { salvoTot = performance.now() + 5000; };

  // Op een klein scherm minder pijlen tegelijk, anders wordt het te druk
  const klein = () => innerWidth < 700;

  function animeerVuurwerk(nu) {
    const verstreken = nu - startTijd;
    // Eerste ~10 seconden: groot spektakel. Daarna blijft het feest doorgaan.
    const spektakel = verstreken < 10000 || nu < salvoTot;
    const rustig = klein();
    const interval = spektakel ? (rustig ? 320 : 170) : (rustig ? 1600 : 850) + Math.random() * 600;
    if (nu > volgendeLancering) {
      lanceer();
      if (spektakel && !rustig) {
        lanceer();
        if (Math.random() < 0.5) lanceer();
      } else if (!spektakel && !rustig && Math.random() < 0.35) {
        lanceer();
      }
      volgendeLancering = nu + interval;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = raketten.length - 1; i >= 0; i--) {
      const r = raketten[i];
      r.x += r.vx;
      r.y += r.vy;
      r.vy += 0.045;
      r.leeftijd++;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.2, 0, Math.PI * 2);
      ctx.fillStyle = r.kleur;
      ctx.fill();
      // Staartje
      ctx.beginPath();
      ctx.arc(r.x - r.vx * 2, r.y - r.vy * 2, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 230, 180, 0.6)';
      ctx.fill();
      if (r.leeftijd > r.lont || r.vy > -1) {
        ontplof(r);
        raketten.splice(i, 1);
      }
    }

    for (let i = vonken.length - 1; i >= 0; i--) {
      const v = vonken[i];
      v.x += v.vx;
      v.y += v.vy;
      v.vx *= 0.985;
      v.vy = v.vy * 0.985 + 0.045;
      v.leven -= v.verval;
      if (v.leven <= 0) {
        vonken.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = Math.max(v.leven, 0);
      ctx.beginPath();
      ctx.arc(v.x, v.y, 1.8, 0, Math.PI * 2);
      ctx.fillStyle = v.kleur;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(animeerVuurwerk);
  }
  requestAnimationFrame(animeerVuurwerk);

  // ---------- Rondvliegende Pokemon ----------
  const POKEMON = [
    { naam: 'sylveon', grootte: 110, snelheid: 0.9 },
    { naam: 'espeon', grootte: 105, snelheid: 1.15 },
    { naam: 'dedenne', grootte: 80, snelheid: 1.45 },
    { naam: 'celebi', grootte: 85, snelheid: 0.7 },
    { naam: 'pikachu', grootte: 95, snelheid: 1.3 },
    { naam: 'snorlax', grootte: 130, snelheid: 0.45 },
    { naam: 'munchlax', grootte: 90, snelheid: 0.6 },
    { naam: 'stitch', grootte: 100, snelheid: 1.05 },
    { naam: 'angel', grootte: 100, snelheid: 1.0 },
    { naam: 'psyduck', grootte: 90, snelheid: 0.8 },
    { naam: 'meowth', grootte: 90, snelheid: 1.1 },
    { naam: 'persian', grootte: 110, snelheid: 1.2 },
    { naam: 'squirtle', grootte: 85, snelheid: 0.95 },
    { naam: 'togepi', grootte: 70, snelheid: 0.65 },
    { naam: 'oshawott', grootte: 80, snelheid: 0.9 },
    { naam: 'minion-stuart', grootte: 75, snelheid: 1.25 },
    { naam: 'minion-kevin', grootte: 65, snelheid: 1.35 },
    { naam: 'minion-bob', grootte: 70, snelheid: 1.15 },
  ];

  // Hoeveel figuren tegelijk? Dat hangt af van de schermgrootte: ongeveer een
  // per 110.000 pixels oppervlak, zodat het op een telefoon rustig blijft en op
  // een groot scherm gezellig druk wordt.
  const PIXELS_PER_VLIEGER = 110000;

  function gewenstAantal() {
    const ruw = Math.round((innerWidth * innerHeight) / PIXELS_PER_VLIEGER);
    return Math.min(Math.max(ruw, 3), POKEMON.length);
  }

  // Telkens een andere selectie, zodat je niet steeds dezelfde ziet
  function doorElkaar(lijst) {
    const kopie = lijst.slice();
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie;
  }

  // Op kleine schermen ook de figuren zelf wat kleiner
  const schaal = innerWidth < 700 ? 0.7 : 1;

  let vliegers = [];

  function maakVlieger(p, i) {
    const grootte = Math.round(p.grootte * schaal);
    const img = document.createElement('img');
    img.src = `${window.PLAKBOEK_STATISCH ? 'img/' : '/img/'}${p.naam}.png`;
    img.alt = '';
    img.className = 'vlieger';
    img.style.width = grootte + 'px';
    document.body.appendChild(img);
    return {
      el: img,
      grootte,
      basisSnelheid: p.snelheid,
      richting: i % 2 ? -1 : 1,
      x: Math.random() * innerWidth,
      basisY: innerHeight * (0.12 + 0.7 * Math.random()),
      amplitude: 30 + Math.random() * 55,
      golfsnelheid: 0.0012 + Math.random() * 0.0012,
      fase: Math.random() * Math.PI * 2,
      ontwijk: 0, // verticale uitwijking om het boek heen
    };
  }

  function stelGezelschapSamen() {
    const aantal = gewenstAantal();
    if (vliegers.length > aantal) {
      for (const v of vliegers.slice(aantal)) v.el.remove();
      vliegers = vliegers.slice(0, aantal);
    } else if (vliegers.length < aantal) {
      const alGekozen = new Set(vliegers.map((v) => v.el.src));
      const rest = doorElkaar(POKEMON).filter(
        (p) => ![...alGekozen].some((src) => src.endsWith(`/${p.naam}.png`))
      );
      for (let i = 0; vliegers.length < aantal && i < rest.length; i++) {
        vliegers.push(maakVlieger(rest[i], vliegers.length));
      }
    }
  }

  stelGezelschapSamen();

  let formaatTimer = null;
  addEventListener('resize', () => {
    clearTimeout(formaatTimer);
    formaatTimer = setTimeout(stelGezelschapSamen, 300);
  });

  function herstart(v) {
    v.richting *= -1;
    v.x = v.richting === 1 ? -v.grootte - 20 : innerWidth + 20;
    v.basisY = innerHeight * (0.08 + 0.75 * Math.random());
    v.amplitude = 30 + Math.random() * 55;
    v.golfsnelheid = 0.0012 + Math.random() * 0.0012;
  }

  function animeerVliegers(nu) {
    // Vliegers sturen om het boek heen: boven het boek langs als ze in de
    // bovenste helft vliegen, onder het boek langs in de onderste helft.
    const boekDom = document.getElementById('boek');
    const boekRect = boekDom ? boekDom.getBoundingClientRect() : null;
    const marge = 30;

    for (const v of vliegers) {
      v.x += v.richting * v.basisSnelheid * (1 + 0.25 * Math.sin(nu * 0.0007 + v.fase));
      const golfY = v.basisY + Math.sin(nu * v.golfsnelheid + v.fase) * v.amplitude;

      let doelOntwijk = 0;
      if (boekRect && boekRect.width > 0) {
        const midden = golfY + v.grootte / 2;
        const inBaan =
          v.x + v.grootte > boekRect.left - marge - 120 * Math.abs(v.richting) &&
          v.x < boekRect.right + marge + 120;
        const opBoekhoogte =
          midden > boekRect.top - marge && midden < boekRect.bottom + marge;
        if (inBaan && opBoekhoogte) {
          const boekMidden = (boekRect.top + boekRect.bottom) / 2;
          const doelMidden = midden < boekMidden
            ? boekRect.top - marge - v.grootte / 2      // erboven langs
            : boekRect.bottom + marge + v.grootte / 2;  // eronder langs
          const klem = Math.min(Math.max(doelMidden, v.grootte / 2 + 8), innerHeight - v.grootte / 2 - 8);
          doelOntwijk = klem - midden;
        }
      }
      v.ontwijk += (doelOntwijk - v.ontwijk) * 0.045;

      const y = golfY + v.ontwijk;
      const kantel = Math.cos(nu * v.golfsnelheid + v.fase) * 8;
      // De artwork-afbeeldingen kijken naar links: spiegel bij vliegen naar rechts
      const spiegel = v.richting === 1 ? -1 : 1;
      v.el.style.transform =
        `translate(${v.x}px, ${y}px) scaleX(${spiegel}) rotate(${kantel * spiegel}deg)`;
      if ((v.richting === 1 && v.x > innerWidth + 20) || (v.richting === -1 && v.x < -v.grootte - 20)) {
        herstart(v);
      }
    }
    requestAnimationFrame(animeerVliegers);
  }
  requestAnimationFrame(animeerVliegers);
})();
