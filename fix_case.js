const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

const replacements = {
  "Odottaa Hyväksyntää": "Odottaa hyväksyntää",
  "Koko Nimesi": "Koko nimesi",
  "Hallitse Alueita": "Hallitse alueita",
  "Famulan Kasvun Portaat": "Famulan kasvun portaat",
  "Oma Työlista": "Oma työlista",
  "Konsernin Yleiskatsaus": "Konsernin yleiskatsaus",
  "Toteutuneet tunnit (Edellinen Kk)": "Toteutuneet tunnit (edellinen kk)",
  "Myydyt lisätunnit (Tässä Kk)": "Myydyt lisätunnit (tässä kk)",
  "Alueiden Vertailu": "Alueiden vertailu",
  "Alueen Kasvu & Tavoite": "Alueen kasvu & tavoite",
  "Myyjän Raportti": "Myyjän raportti",
  "Uudet Asiakkaat": "Uudet asiakkaat",
  "Myydyt Tunnit": "Myydyt tunnit",
  "Tiimin Tilanne": "Tiimin tilanne",
  "Myynnin Tarjotin": "Myynnin tarjotin",
  "Oma Muistio": "Oma muistio",
  "Irtotunti Bonus": "Irtotuntibonus",
  "Jatkuva Tilaus Bonus": "Jatkuvan tilauksen bonus",
  "Uusi Asiakas Bonus": "Uuden asiakkaan bonus",
  "Uusi Asiakas": "Uusi asiakas",
  "Uudet asiakkaat": "Uudet asiakkaat",
  "Kirjattu Lisämyynti": "Kirjattu lisämyynti",
  "Valtakunnallinen Tarjotin": "Valtakunnallinen tarjotin",
  "Lataa Tavoitekirjastosta": "Lataa tavoitekirjastosta",
  "Kasvun Porras / Pohja": "Kasvun porras / pohja",
  "Muokkaa Tarjotinta": "Muokkaa tarjotinta",
  "Muokkaa Tavoitetta": "Muokkaa tavoitetta",
  "Lisää Oma Tavoite": "Lisää oma tavoite",
  "Muokkaa Tehtävää": "Muokkaa tehtävää",
  "Omat Raportit": "Omat raportit",
  "Kuukauden Teema": "Kuukauden teema",
  "Tallenna Suunnitelma": "Tallenna suunnitelma",
  "Päivitä Sivu": "Päivitä sivu",
  "Luo Työntekijän Profiili Ennakkoon": "Luo työntekijän profiili ennakkoon",
  "Lisää Työlistalle": "Lisää työlistalle",
  "Lisää Tarjottimelle": "Lisää tarjottimelle",
  "Peruuta Tapahtuma": "Peruuta tapahtuma"
};

for (const [key, value] of Object.entries(replacements)) {
  const regex = new RegExp(key, 'g');
  content = content.replace(regex, value);
}

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Replacements complete');
