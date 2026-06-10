/**
 * Illinois Lab Directory
 * Quest Diagnostics, LabCorp, hospital labs, and reference labs
 * across all Illinois regions. Data representative for EHR demo purposes.
 */
import { getProximityInfo } from '../utils/proximity';
export { getProximityInfo as getLabProximityInfo };

const D = { isFavorite: false, lastUsedAt: null, distanceMiles: null };

const H = {
  QUEST: { mon:'7am–4pm', tue:'7am–4pm', wed:'7am–4pm', thu:'7am–4pm', fri:'7am–4pm', sat:'7am–12pm', sun:'Closed' },
  LABCO: { mon:'7am–4pm', tue:'7am–4pm', wed:'7am–4pm', thu:'7am–4pm', fri:'7am–4pm', sat:'7am–11am', sun:'Closed' },
  HOSP:  { mon:'Open 24 hours', tue:'Open 24 hours', wed:'Open 24 hours', thu:'Open 24 hours', fri:'Open 24 hours', sat:'Open 24 hours', sun:'Open 24 hours' },
  REF:   { mon:'8am–5pm', tue:'8am–5pm', wed:'8am–5pm', thu:'8am–5pm', fri:'8am–5pm', sat:'Closed', sun:'Closed' },
};

export const ILLINOIS_LABS = [
  // ══════════════════════════════════════════════════════
  // QUEST DIAGNOSTICS — CHICAGO METRO
  // ══════════════════════════════════════════════════════
  { id:'q-chi-001', name:'Quest Diagnostics — Chicago Loop',         network:'Quest Diagnostics', address1:'222 W Adams St', address2:'Ste 100', city:'Chicago',          state:'IL', zip:'60606', phone:'(312) 621-0390', fax:'(312) 621-0395', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-chi-002', name:'Quest Diagnostics — Chicago River North',  network:'Quest Diagnostics', address1:'680 N Lake Shore Dr', address2:'Ste 1200', city:'Chicago',    state:'IL', zip:'60611', phone:'(312) 642-7830', fax:'(312) 642-7831', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-chi-003', name:'Quest Diagnostics — Chicago Lincoln Park', network:'Quest Diagnostics', address1:'2550 N Clark St', address2:'Ste 200', city:'Chicago',          state:'IL', zip:'60614', phone:'(773) 348-0820', fax:'(773) 348-0821', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-chi-004', name:'Quest Diagnostics — Chicago Wicker Park',  network:'Quest Diagnostics', address1:'1585 N Milwaukee Ave', address2:'Ste 100', city:'Chicago',     state:'IL', zip:'60622', phone:'(773) 862-4100', fax:'(773) 862-4101', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-chi-005', name:'Quest Diagnostics — Chicago Hyde Park',    network:'Quest Diagnostics', address1:'5758 S Maryland Ave', address2:'Ste 100', city:'Chicago',      state:'IL', zip:'60637', phone:'(773) 667-0400', fax:'(773) 667-0401', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-chi-006', name:'Quest Diagnostics — Chicago West Loop',    network:'Quest Diagnostics', address1:'1725 W Harrison St', address2:'Ste 300', city:'Chicago',       state:'IL', zip:'60612', phone:'(312) 563-5200', fax:'(312) 563-5201', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-evn-001', name:'Quest Diagnostics — Evanston',             network:'Quest Diagnostics', address1:'1000 Central St', address2:'Ste 100', city:'Evanston',         state:'IL', zip:'60201', phone:'(847) 866-9400', fax:'(847) 866-9401', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-skk-001', name:'Quest Diagnostics — Skokie',               network:'Quest Diagnostics', address1:'9900 Gross Point Rd', address2:'Ste 100', city:'Skokie',       state:'IL', zip:'60076', phone:'(847) 673-4500', fax:'(847) 673-4501', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-arh-001', name:'Quest Diagnostics — Arlington Heights',    network:'Quest Diagnostics', address1:'3800 N Wilke Rd', address2:'Ste 100', city:'Arlington Heights',state:'IL', zip:'60004', phone:'(847) 398-1560', fax:'(847) 398-1561', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-sch-001', name:'Quest Diagnostics — Schaumburg',           network:'Quest Diagnostics', address1:'1585 N Roselle Rd', address2:'Ste 100', city:'Schaumburg',     state:'IL', zip:'60195', phone:'(847) 884-4080', fax:'(847) 884-4081', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-rol-001', name:'Quest Diagnostics — Rolling Meadows',      network:'Quest Diagnostics', address1:'3901 Algonquin Rd', address2:'Ste 100', city:'Rolling Meadows',state:'IL', zip:'60008', phone:'(847) 818-5600', fax:'(847) 818-5601', hours:H.QUEST, appointmentRequired:false, ...D, isFavorite:true, lastUsedAt: Date.now()-86400000*3 },
  { id:'q-wau-001', name:'Quest Diagnostics — Waukegan',             network:'Quest Diagnostics', address1:'2000 Belvidere Rd', address2:'Ste 300', city:'Waukegan',       state:'IL', zip:'60085', phone:'(847) 623-5500', fax:'(847) 623-5501', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-aur-001', name:'Quest Diagnostics — Aurora',               network:'Quest Diagnostics', address1:'2010 Dean St', address2:'Ste 100', city:'Aurora',             state:'IL', zip:'60506', phone:'(630) 896-7090', fax:'(630) 896-7091', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-nap-001', name:'Quest Diagnostics — Naperville',           network:'Quest Diagnostics', address1:'1320 N Naper Blvd', address2:'Ste 100', city:'Naperville',     state:'IL', zip:'60563', phone:'(630) 527-3450', fax:'(630) 527-3451', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-whe-001', name:'Quest Diagnostics — Wheaton',              network:'Quest Diagnostics', address1:'100 E Roosevelt Rd', address2:'Ste 200', city:'Wheaton',       state:'IL', zip:'60187', phone:'(630) 668-5300', fax:'(630) 668-5301', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-jol-001', name:'Quest Diagnostics — Joliet',               network:'Quest Diagnostics', address1:'1700 Silver Cross Blvd', address2:'Ste 200', city:'Joliet',   state:'IL', zip:'60432', phone:'(815) 741-1700', fax:'(815) 741-1701', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-rok-001', name:'Quest Diagnostics — Rockford',             network:'Quest Diagnostics', address1:'1341 N Bell School Rd', address2:'Ste 100', city:'Rockford',   state:'IL', zip:'61107', phone:'(815) 229-9200', fax:'(815) 229-9201', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-peo-001', name:'Quest Diagnostics — Peoria',               network:'Quest Diagnostics', address1:'8721 N Knoxville Ave', address2:'Ste 100', city:'Peoria',     state:'IL', zip:'61615', phone:'(309) 692-7400', fax:'(309) 692-7401', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-spr-001', name:'Quest Diagnostics — Springfield',          network:'Quest Diagnostics', address1:'3132 Old Jacksonville Rd', address2:'Ste 100', city:'Springfield', state:'IL', zip:'62704', phone:'(217) 787-3400', fax:'(217) 787-3401', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-cham-001',name:'Quest Diagnostics — Champaign',            network:'Quest Diagnostics', address1:'1805 S Neil St', address2:'Ste 100', city:'Champaign',         state:'IL', zip:'61820', phone:'(217) 352-0400', fax:'(217) 352-0401', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-bvl-001', name:'Quest Diagnostics — Belleville',           network:'Quest Diagnostics', address1:'500 N Green Mount Rd', address2:'Ste 100', city:'Belleville',  state:'IL', zip:'62226', phone:'(618) 234-4700', fax:'(618) 234-4701', hours:H.QUEST, appointmentRequired:false, ...D },
  { id:'q-mol-001', name:'Quest Diagnostics — Moline',               network:'Quest Diagnostics', address1:'510 John Deere Rd', address2:'Ste 100', city:'Moline',         state:'IL', zip:'61265', phone:'(309) 797-1300', fax:'(309) 797-1301', hours:H.QUEST, appointmentRequired:false, ...D },

  // ══════════════════════════════════════════════════════
  // LABCORP — ILLINOIS
  // ══════════════════════════════════════════════════════
  { id:'lc-chi-001', name:'LabCorp — Chicago River North',           network:'LabCorp', address1:'444 N Michigan Ave', address2:'Ste 100', city:'Chicago',                 state:'IL', zip:'60611', phone:'(312) 828-0990', fax:'(312) 828-0995', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-chi-002', name:'LabCorp — Chicago Lincoln Square',        network:'LabCorp', address1:'4801 N Western Ave', address2:'Ste 100', city:'Chicago',                 state:'IL', zip:'60625', phone:'(773) 561-4000', fax:'(773) 561-4001', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-chi-003', name:'LabCorp — Chicago South Loop',            network:'LabCorp', address1:'1900 S Indiana Ave', address2:'Ste 100', city:'Chicago',                 state:'IL', zip:'60616', phone:'(312) 842-0900', fax:'(312) 842-0901', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-chi-004', name:'LabCorp — Chicago Bridgeport',            network:'LabCorp', address1:'3501 S Halsted St', address2:'Ste 100', city:'Chicago',                  state:'IL', zip:'60609', phone:'(312) 326-4400', fax:'(312) 326-4401', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-evn-001', name:'LabCorp — Evanston',                      network:'LabCorp', address1:'1603 Orrington Ave', address2:'Ste 100', city:'Evanston',                state:'IL', zip:'60201', phone:'(847) 570-2200', fax:'(847) 570-2201', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-nhb-001', name:'LabCorp — Northbrook',                    network:'LabCorp', address1:'3000 Dundee Rd', address2:'Ste 200', city:'Northbrook',                  state:'IL', zip:'60062', phone:'(847) 498-3100', fax:'(847) 498-3101', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-arp-001', name:'LabCorp — Arlington Heights',             network:'LabCorp', address1:'100 S Evergreen Ave', address2:'Ste 100', city:'Arlington Heights',      state:'IL', zip:'60005', phone:'(847) 253-1010', fax:'(847) 253-1011', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-sch-001', name:'LabCorp — Schaumburg',                    network:'LabCorp', address1:'1585 E Woodfield Rd', address2:'Ste 100', city:'Schaumburg',             state:'IL', zip:'60173', phone:'(847) 619-8300', fax:'(847) 619-8301', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-alg-001', name:'LabCorp — Algonquin',                     network:'LabCorp', address1:'2500 N Randall Rd', address2:'Ste 100', city:'Algonquin',               state:'IL', zip:'60102', phone:'(847) 854-4400', fax:'(847) 854-4401', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-nap-001', name:'LabCorp — Naperville',                    network:'LabCorp', address1:'808 N Washington St', address2:'Ste 100', city:'Naperville',             state:'IL', zip:'60563', phone:'(630) 527-7700', fax:'(630) 527-7701', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-dow-001', name:'LabCorp — Downers Grove',                 network:'LabCorp', address1:'2100 Midwest Rd', address2:'Ste 100', city:'Downers Grove',             state:'IL', zip:'60515', phone:'(630) 963-9200', fax:'(630) 963-9201', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-orl-001', name:'LabCorp — Orland Park',                   network:'LabCorp', address1:'16350 S La Grange Rd', address2:'Ste 100', city:'Orland Park',          state:'IL', zip:'60462', phone:'(708) 349-4900', fax:'(708) 349-4901', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-rok-001', name:'LabCorp — Rockford',                      network:'LabCorp', address1:'5510 E State St', address2:'Ste 100', city:'Rockford',                   state:'IL', zip:'61108', phone:'(815) 229-0100', fax:'(815) 229-0101', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-peo-001', name:'LabCorp — Peoria',                        network:'LabCorp', address1:'7301 N University St', address2:'Ste 100', city:'Peoria',               state:'IL', zip:'61614', phone:'(309) 689-0600', fax:'(309) 689-0601', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-spr-001', name:'LabCorp — Springfield',                   network:'LabCorp', address1:'1500 S 6th St', address2:'Ste 100', city:'Springfield',                  state:'IL', zip:'62703', phone:'(217) 753-7200', fax:'(217) 753-7201', hours:H.LABCO, appointmentRequired:false, ...D },
  { id:'lc-cham-001',name:'LabCorp — Champaign',                     network:'LabCorp', address1:'2010 W Windsor Rd', address2:'Ste 100', city:'Champaign',               state:'IL', zip:'61821', phone:'(217) 398-8600', fax:'(217) 398-8601', hours:H.LABCO, appointmentRequired:false, ...D },

  // ══════════════════════════════════════════════════════
  // HOSPITAL LABS — ILLINOIS
  // ══════════════════════════════════════════════════════
  { id:'h-nwm-chi',  name:'Northwestern Memorial Hospital Lab',      network:'Hospital Lab (in-house)', address1:'251 E Huron St',          city:'Chicago',          state:'IL', zip:'60611', phone:'(312) 926-5411', fax:'(312) 926-5412', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-rush-chi', name:'Rush University Medical Center Lab',      network:'Hospital Lab (in-house)', address1:'1620 W Harrison St',      city:'Chicago',          state:'IL', zip:'60612', phone:'(312) 942-5495', fax:'(312) 942-5499', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-uch-chi',  name:'University of Chicago Medicine Lab',      network:'Hospital Lab (in-house)', address1:'5841 S Maryland Ave',     city:'Chicago',          state:'IL', zip:'60637', phone:'(773) 702-6234', fax:'(773) 702-6235', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-loy-may',  name:'Loyola University Medical Center Lab',    network:'Hospital Lab (in-house)', address1:'2160 S 1st Ave',          city:'Maywood',          state:'IL', zip:'60153', phone:'(708) 216-9100', fax:'(708) 216-9101', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-adv-prk',  name:'Advocate Lutheran General Hospital Lab',  network:'Hospital Lab (in-house)', address1:'1775 Dempster St',        city:'Park Ridge',       state:'IL', zip:'60068', phone:'(847) 723-5700', fax:'(847) 723-5701', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-adv-bar',  name:'Advocate Good Shepherd Hospital Lab',     network:'Hospital Lab (in-house)', address1:'450 W Highway 22',        city:'Barrington',       state:'IL', zip:'60010', phone:'(847) 381-3800', fax:'(847) 381-3801', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-nwc-arp',  name:'Northwest Community Hospital Lab',        network:'Hospital Lab (in-house)', address1:'800 W Central Rd',        city:'Arlington Heights',state:'IL', zip:'60005', phone:'(847) 618-4300', fax:'(847) 618-4301', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-cent-spr', name:'Memorial Medical Center Lab',             network:'Hospital Lab (in-house)', address1:'701 N 1st St',            city:'Springfield',      state:'IL', zip:'62781', phone:'(217) 788-3100', fax:'(217) 788-3101', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-osf-peo',  name:'OSF Saint Francis Medical Center Lab',    network:'Hospital Lab (in-house)', address1:'530 NE Glen Oak Ave',     city:'Peoria',           state:'IL', zip:'61637', phone:'(309) 655-2300', fax:'(309) 655-2301', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-osf-rok',  name:'OSF Saint Anthony Medical Center Lab',    network:'Hospital Lab (in-house)', address1:'5666 E State St',         city:'Rockford',         state:'IL', zip:'61108', phone:'(815) 395-5300', fax:'(815) 395-5301', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-sil-chi',  name:'Stroger Hospital (Cook County) Lab',      network:'Hospital Lab (in-house)', address1:'1901 W Harrison St',      city:'Chicago',          state:'IL', zip:'60612', phone:'(312) 864-6200', fax:'(312) 864-6201', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-va-chi',   name:'VA Jesse Brown Medical Center Lab',       network:'Hospital Lab (in-house)', address1:'820 S Damen Ave',         city:'Chicago',          state:'IL', zip:'60612', phone:'(312) 569-8400', fax:'(312) 569-8401', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-va-hns',   name:'VA Hines Hospital Laboratory',            network:'Hospital Lab (in-house)', address1:'5000 S 5th Ave',          city:'Hines',            state:'IL', zip:'60141', phone:'(708) 202-8700', fax:'(708) 202-8701', hours:H.HOSP, appointmentRequired:false, ...D },
  { id:'h-va-dan',   name:'VA Danville Medical Center Lab',          network:'Hospital Lab (in-house)', address1:'1900 E Main St',          city:'Danville',         state:'IL', zip:'61832', phone:'(217) 554-3200', fax:'(217) 554-3201', hours:H.HOSP, appointmentRequired:false, ...D },

  // ══════════════════════════════════════════════════════
  // REFERENCE LABS
  // ══════════════════════════════════════════════════════
  { id:'ref-mayo',   name:'Mayo Clinic Laboratories',                network:'Mayo Clinic Laboratories',    address1:'200 First St SW',       city:'Rochester',  state:'MN', zip:'55905', phone:'(800) 533-1710', fax:'(507) 284-0043', hours:H.REF, appointmentRequired:true, ...D },
  { id:'ref-arup',   name:'ARUP Laboratories',                       network:'ARUP Laboratories',           address1:'500 Chipeta Way',       city:'Salt Lake City', state:'UT', zip:'84108', phone:'(800) 522-2787', fax:'(801) 584-5207', hours:H.REF, appointmentRequired:true, ...D },
  { id:'ref-bior',   name:'BioReference Laboratories',               network:'BioReference Laboratories',   address1:'481 Edward H. Ross Dr', city:'Elmwood Park',   state:'NJ', zip:'07407', phone:'(800) 229-5227', fax:'(201) 791-1941', hours:H.REF, appointmentRequired:true, ...D },
  { id:'ref-gen',    name:'Genoptix / Veracyte Genomics Lab',        network:'Specialty Reference Lab',     address1:'6110 El Camino Real',   city:'Carlsbad',       state:'CA', zip:'92009', phone:'(760) 268-6200', fax:'(760) 268-6201', hours:H.REF, appointmentRequired:true, ...D },
];
