// The Perilous Void, NPC Name and NPC Surname tables (pp. 166–167).
const givenStarts = (
  "Ad Al Ala An Ar As Bal Ban Bol Bor " +
  "Bra Bru Can Cin Cie Da Dal Das Dav Daz " +
  "Dol Do Fan Fin Gar Gre Gro Ha Haz Hu " +
  "Il In Is Jan Jel Ji Jil Jor Kal Kan " +
  "Ke Ko La Lan Lar Le Lo Lor Lu Ma " +
  "Mi Mol Mul No Ol On Or Os Pai Par " +
  "Pir Pra Pru Ra Ras Re Ril Rin Rol Ron " +
  "Sa San Shan Si Ta Ul Un Us Va Val " +
  "Vaz Vel Ves Vi Vin Vu Vuz Wa Wan Was " +
  "Wi Wu Xa Xi Yel Zal Zar Zil Zir Zor"
).split(" ");

const givenEnds = (
  "- - - - - - - - - - " +
  "a ab abe al als am an ana ar arn " +
  "arna arra as ax be ca can car dar de " +
  "dira da do dor dra e gana go i ia " +
  "ib in inia io ios ira is issa ja jo " +
  "ju k ka ko la lo lu mar mo mua " +
  "na nar nor nora o on ona or ora ra " +
  "rab ran ras rin ro ron s si sir sira " +
  "sun ta tam tama tar than thana tir tira tor " +
  "tora tu tyl tyn u un ura ust z zo"
).split(" ");

const familyStarts = (
  "A Al An Ar As Ba Ban Bar Be Ber " +
  "Bi Blu Bran Bras Bri Brin Bro Bry Bur Cam " +
  "Can Cas Cor Da Dan Del Des Dol Don Dor " +
  "E El En Fil Fol Fon Gran Gren Gun Han " +
  "Har Hin Hor I Il Jan Jin Jis Ka Kal " +
  "Kan Kar Kil Kin Kla Klu Kol Kun La Lu " +
  "Man Mi Min O Ol On Or Pan Par Por " +
  "Qua Qui Quin Ra Re Ri Ru Sa Sar Shi " +
  "Si Su Sun Tha Tham Thi Til Ty U Ul " +
  "Un Ven Von Wil Win Ya Yar Yin Zan Zin"
).split(" ");

const familyEnds = (
  "aleon ana and ard as au ban bar da dar " +
  "daras darian dark daros das den dis dool dor een " +
  "en ene fa fir fo for fu gar garas gas " +
  "gir gis i if il in is jan janas jarian " +
  "ka kar karas karian kark kaws ko kor la las " +
  "lo ma mak mar maras marian mark mas mik mo " +
  "nall nar ne nor noros o ool phas phe phes " +
  "pho ra ra rand sard stee tar taras tarian taro " +
  "to tor tos tyr ul um us vin vir yk " +
  "za zar zaras zarian zel zil zir zo zor zu"
).split(" ");

export function rollNpcSurname(roll) {
  return familyStarts[roll(100) - 1] + familyEnds[roll(100) - 1];
}

export function rollNpcName(roll, existingName) {
  const start = givenStarts[roll(100) - 1];
  const end = givenEnds[roll(100) - 1];
  const givenName = start + (end === "-" ? "" : end);
  let surname = rollNpcSurname(roll);
  if (`${givenName} ${surname}` === existingName) {
    const offset = roll(100) - 1;
    const distinctStarts = familyStarts.filter(part => !surname.startsWith(part));
    surname = distinctStarts[offset % distinctStarts.length] + familyEnds[roll(100) - 1];
  }
  return { name: `${givenName} ${surname}`, surname };
}
