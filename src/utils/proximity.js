/**
 * Shared geographic proximity scoring.
 * Used by Illinois pharmacy and lab directories to sort results
 * nearest-first based on patient address.
 */

const CITY_REGION = {
  'chicago':'chicago','harvey':'chicago','hines':'chicago','maywood':'chicago',
  'evanston':'northcook','skokie':'northcook','morton grove':'northcook',
  'park ridge':'northcook','des plaines':'northcook','niles':'northcook',
  'glenview':'northcook','northbrook':'northcook','arlington heights':'northcook',
  'palatine':'northcook','rolling meadows':'northcook','hoffman estates':'northcook',
  'waukegan':'northlake','gurnee':'northlake','vernon hills':'northlake',
  'libertyville':'northlake','mundelein':'northlake','highland park':'northlake',
  'lake forest':'northlake','barrington':'northlake','south barrington':'northlake',
  'antioch':'northlake','zion':'northlake',
  'schaumburg':'northwest','algonquin':'northwest','aurora':'northwest',
  'elgin':'northwest','crystal lake':'northwest','st. charles':'northwest',
  'geneva':'northwest','mchenry':'northwest','woodstock':'northwest','huntley':'northwest',
  'naperville':'west','wheaton':'west','downers grove':'west','lombard':'west',
  'elmhurst':'west','bolingbrook':'west','glen ellyn':'west','westmont':'west',
  'lisle':'west','addison':'west',
  'joliet':'southwest','orland park':'southwest','tinley park':'southwest',
  'oak lawn':'southwest','bridgeview':'southwest','evergreen park':'southwest',
  'oak park':'southwest','berwyn':'southwest','cicero':'southwest',
  'matteson':'southwest','calumet city':'southwest','homewood':'southwest',
  'rockford':'rockford','loves park':'rockford','belvidere':'rockford','freeport':'rockford',
  'peoria':'peoria','bloomington':'peoria','normal':'peoria',
  'washington':'peoria','morton':'peoria','kewanee':'peoria','galesburg':'peoria',
  'springfield':'springfield','decatur':'springfield','kankakee':'springfield',
  'champaign':'champaign','danville':'champaign',
  'belleville':'southernIL',"o'fallon":'southernIL','edwardsville':'southernIL',
  'collinsville':'southernIL','carbondale':'southernIL','marion':'southernIL',
  'mount vernon':'southernIL','centralia':'southernIL',
  'moline':'quadcities','rock island':'quadcities','silvis':'quadcities',
  'quincy':'quincy',
};

/**
 * Score proximity between a patient address and a location.
 * Lower score = closer.
 *
 * 0  same ZIP           → "< 1 mi"
 * 1  4-digit ZIP prefix → "~2 mi"
 * 2  same city          → "~5 mi"
 * 3  3-digit ZIP prefix → "~8 mi"
 * 4  same region        → "~15 mi"
 * 99 unrelated          → null
 */
export function getProximityInfo(patientAddress, location) {
  if (!patientAddress) return { score: 99, label: null };

  const patZip  = (patientAddress.zip  || '').replace(/\D/g, '');
  const patCity = (patientAddress.city || '').toLowerCase().trim();
  const locZip  = (location.zip  || '').replace(/\D/g, '');
  const locCity = (location.city || '').toLowerCase().trim();

  if (patZip && locZip && patZip === locZip)
    return { score: 0, label: '< 1 mi' };
  if (patZip.length >= 4 && locZip.length >= 4 && patZip.slice(0,4) === locZip.slice(0,4))
    return { score: 1, label: '~2 mi' };
  if (patCity && locCity && patCity === locCity)
    return { score: 2, label: '~5 mi' };
  if (patZip.length >= 3 && locZip.length >= 3 && patZip.slice(0,3) === locZip.slice(0,3))
    return { score: 3, label: '~8 mi' };

  const pr = CITY_REGION[patCity];
  const lr = CITY_REGION[locCity];
  if (pr && lr && pr === lr) return { score: 4, label: '~15 mi' };

  return { score: 99, label: null };
}
