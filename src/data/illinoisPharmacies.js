/**
 * Illinois Pharmacy Directory
 * Comprehensive list of pharmacy locations across Illinois.
 * Data is representative for EHR demo purposes.
 */

// ── Standard hours by chain ──────────────────────────────────────────────────
const H = {
  WAG:  { mon:'8am–10pm',   tue:'8am–10pm',   wed:'8am–10pm',   thu:'8am–10pm',   fri:'8am–10pm',   sat:'9am–6pm',     sun:'10am–6pm'   },
  W24:  { mon:'Open 24 hours', tue:'Open 24 hours', wed:'Open 24 hours', thu:'Open 24 hours', fri:'Open 24 hours', sat:'Open 24 hours', sun:'Open 24 hours' },
  CVS:  { mon:'8am–9pm',    tue:'8am–9pm',    wed:'8am–9pm',    thu:'8am–9pm',    fri:'8am–9pm',    sat:'9am–6pm',     sun:'10am–5pm'   },
  WMT:  { mon:'9am–9pm',    tue:'9am–9pm',    wed:'9am–9pm',    thu:'9am–9pm',    fri:'9am–9pm',    sat:'9am–7pm',     sun:'10am–6pm'   },
  JWL:  { mon:'9am–9pm',    tue:'9am–9pm',    wed:'9am–9pm',    thu:'9am–9pm',    fri:'9am–9pm',    sat:'9am–7pm',     sun:'10am–6pm'   },
  MEI:  { mon:'8am–9pm',    tue:'8am–9pm',    wed:'8am–9pm',    thu:'8am–9pm',    fri:'8am–9pm',    sat:'8am–9pm',     sun:'8am–9pm'    },
  MAR:  { mon:'9am–9pm',    tue:'9am–9pm',    wed:'9am–9pm',    thu:'9am–9pm',    fri:'9am–9pm',    sat:'9am–7pm',     sun:'10am–6pm'   },
  COST: { mon:'10am–8:30pm',tue:'10am–8:30pm',wed:'10am–8:30pm',thu:'10am–8:30pm',fri:'10am–8:30pm',sat:'9:30am–6pm',  sun:'10am–6pm'   },
  SAMS: { mon:'10am–8pm',   tue:'10am–8pm',   wed:'10am–8pm',   thu:'10am–8pm',   fri:'10am–8pm',   sat:'9am–8pm',     sun:'10am–6pm'   },
  RA:   { mon:'8am–9pm',    tue:'8am–9pm',    wed:'8am–9pm',    thu:'8am–9pm',    fri:'8am–9pm',    sat:'9am–6pm',     sun:'10am–5pm'   },
  TGT:  { mon:'8am–9pm',    tue:'8am–9pm',    wed:'8am–9pm',    thu:'8am–9pm',    fri:'8am–9pm',    sat:'9am–8pm',     sun:'10am–6pm'   },
  SPEC: { mon:'9am–5pm',    tue:'9am–5pm',    wed:'9am–5pm',    thu:'9am–5pm',    fri:'9am–5pm',    sat:'Closed',      sun:'Closed'     },
  HOSP: { mon:'8am–8pm',    tue:'8am–8pm',    wed:'8am–8pm',    thu:'8am–8pm',    fri:'8am–8pm',    sat:'9am–5pm',     sun:'Closed'     },
};

// ── Standard capabilities by type ────────────────────────────────────────────
const CAP = {
  RETAIL: { erx:true,  epcs:true,  mailOrder:false, controlledSubstances:true  },
  BASIC:  { erx:true,  epcs:false, mailOrder:false, controlledSubstances:true  },
  SPEC:   { erx:true,  epcs:true,  mailOrder:false, controlledSubstances:true  },
  HOSP:   { erx:true,  epcs:false, mailOrder:false, controlledSubstances:true  },
};

const D = { isFavorite:false, lastUsedAt:null, category:'nearby', distanceMiles:null, open24h:false };

export const ILLINOIS_PHARMACIES = [

  // ══════════════════════════════════════════════════════════════════════════
  // CHICAGO — LOOP / DOWNTOWN / NEAR NORTH
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-chi-001', name:'Walgreens #03552', address1:'151 N State St',         city:'Chicago', state:'IL', zip:'60601', phone:'(312) 984-0676', fax:'(312) 984-0677', npi:'1111100001', ncpdp:'1000001', capabilities:CAP.RETAIL, hours:H.W24, open24h:true,  ...D },
  { id:'wag-chi-002', name:'Walgreens #02561', address1:'757 N Michigan Ave',     city:'Chicago', state:'IL', zip:'60611', phone:'(312) 664-8686', fax:'(312) 664-8687', npi:'1111100002', ncpdp:'1000002', capabilities:CAP.RETAIL, hours:H.WAG, ...D, isFavorite:true, lastUsedAt:Date.now()-86400000*2, distanceMiles:0.3 },
  { id:'wag-chi-003', name:'Walgreens #11034', address1:'6 E Superior St',        city:'Chicago', state:'IL', zip:'60611', phone:'(312) 640-2920', fax:'(312) 640-2921', npi:'1111100003', ncpdp:'1000003', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-chi-004', name:'Walgreens #06321', address1:'1200 N Dearborn St',     city:'Chicago', state:'IL', zip:'60610', phone:'(312) 943-0070', fax:'(312) 943-0071', npi:'1111100004', ncpdp:'1000004', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-chi-001', name:'CVS Pharmacy #01045', address1:'2 W Madison St',      city:'Chicago', state:'IL', zip:'60602', phone:'(312) 782-7200', fax:'(312) 782-7201', npi:'1222200001', ncpdp:'2000001', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'cvs-chi-002', name:'CVS Pharmacy #04518', address1:'8 S Michigan Ave',    city:'Chicago', state:'IL', zip:'60603', phone:'(312) 899-0200', fax:'(312) 899-0201', npi:'1222200002', ncpdp:'2000002', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'jwl-chi-001', name:'Jewel-Osco Pharmacy #3004', address1:'1224 S Wabash Ave', city:'Chicago', state:'IL', zip:'60605', phone:'(312) 583-8380', fax:'(312) 583-8381', npi:'1444400001', ncpdp:'4000001', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'mar-chi-001', name:"Mariano's Pharmacy #511", address1:'333 E Benton Pl', city:'Chicago', state:'IL', zip:'60601', phone:'(312) 819-2630', fax:'(312) 819-2631', npi:'1666600001', ncpdp:'6000001', capabilities:CAP.RETAIL, hours:H.MAR, ...D },

  // CHICAGO — NORTH SIDE
  { id:'wag-chi-005', name:'Walgreens #04839', address1:'3646 N Broadway',        city:'Chicago', state:'IL', zip:'60613', phone:'(773) 327-0110', fax:'(773) 327-0111', npi:'1111100005', ncpdp:'1000005', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-chi-006', name:'Walgreens #07823', address1:'4201 N Pulaski Rd',      city:'Chicago', state:'IL', zip:'60641', phone:'(773) 725-4680', fax:'(773) 725-4681', npi:'1111100006', ncpdp:'1000006', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-chi-007', name:'Walgreens #03197', address1:'7340 N Western Ave',     city:'Chicago', state:'IL', zip:'60645', phone:'(773) 764-7540', fax:'(773) 764-7541', npi:'1111100007', ncpdp:'1000007', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-chi-008', name:'Walgreens #05342', address1:'6554 N Sheridan Rd',     city:'Chicago', state:'IL', zip:'60626', phone:'(773) 262-5500', fax:'(773) 262-5501', npi:'1111100008', ncpdp:'1000008', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-chi-003', name:'CVS Pharmacy #08762', address1:'1031 W Belmont Ave',  city:'Chicago', state:'IL', zip:'60657', phone:'(773) 327-8400', fax:'(773) 327-8401', npi:'1222200003', ncpdp:'2000003', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'cvs-chi-004', name:'CVS Pharmacy #03287', address1:'5401 N Broadway',     city:'Chicago', state:'IL', zip:'60640', phone:'(773) 784-7200', fax:'(773) 784-7201', npi:'1222200004', ncpdp:'2000004', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'cvs-chi-005', name:'CVS Pharmacy #12345', address1:'6560 N Sheridan Rd',  city:'Chicago', state:'IL', zip:'60626', phone:'(773) 764-2160', fax:'(773) 764-2161', npi:'1222200005', ncpdp:'2000005', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'jwl-chi-002', name:'Jewel-Osco Pharmacy #3187', address1:'3530 N Broadway', city:'Chicago', state:'IL', zip:'60657', phone:'(773) 477-4080', fax:'(773) 477-4081', npi:'1444400002', ncpdp:'4000002', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'jwl-chi-003', name:'Jewel-Osco Pharmacy #3295', address1:'1763 N Milwaukee Ave', city:'Chicago', state:'IL', zip:'60647', phone:'(773) 395-2048', fax:'(773) 395-2049', npi:'1444400003', ncpdp:'4000003', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'mar-chi-002', name:"Mariano's Pharmacy #518", address1:'3145 W Diversey Ave', city:'Chicago', state:'IL', zip:'60647', phone:'(773) 804-7360', fax:'(773) 804-7361', npi:'1666600002', ncpdp:'6000002', capabilities:CAP.RETAIL, hours:H.MAR, ...D },

  // CHICAGO — WEST SIDE
  { id:'wag-chi-009', name:'Walgreens #09112', address1:'2601 N Harlem Ave',      city:'Chicago', state:'IL', zip:'60707', phone:'(773) 637-7250', fax:'(773) 637-7251', npi:'1111100009', ncpdp:'1000009', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-chi-006', name:'CVS Pharmacy #09451', address1:'3201 S Halsted St',   city:'Chicago', state:'IL', zip:'60608', phone:'(312) 842-7400', fax:'(312) 842-7401', npi:'1222200006', ncpdp:'2000006', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-chi-001', name:'Walmart Pharmacy #5401', address1:'2551 E 79th St',   city:'Chicago', state:'IL', zip:'60649', phone:'(773) 221-5000', fax:'(773) 221-5001', npi:'1333300001', ncpdp:'3000001', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wmt-chi-002', name:'Walmart Pharmacy #5640', address1:'4650 W North Ave', city:'Chicago', state:'IL', zip:'60639', phone:'(773) 836-7840', fax:'(773) 836-7841', npi:'1333300002', ncpdp:'3000002', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-chi-004', name:'Jewel-Osco Pharmacy #3012', address1:'1340 S Canal St', city:'Chicago', state:'IL', zip:'60607', phone:'(312) 341-0900', fax:'(312) 341-0901', npi:'1444400004', ncpdp:'4000004', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'genoa-chi-001', name:'Genoa Healthcare — Chicago West', address1:'1700 W Van Buren St', address2:'Ste 100', city:'Chicago', state:'IL', zip:'60612', phone:'(312) 996-7100', fax:'(312) 996-7101', npi:'1555500001', ncpdp:'5000001', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'genoa-chi-002', name:'Genoa Healthcare — Chicago North', address1:'5600 N Western Ave', address2:'Ste 210', city:'Chicago', state:'IL', zip:'60659', phone:'(773) 334-2100', fax:'(773) 334-2101', npi:'1555500002', ncpdp:'5000002', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'rush-chi',    name:'Rush University Medical Center Pharmacy', address1:'1620 W Harrison St', city:'Chicago', state:'IL', zip:'60612', phone:'(312) 942-5495', fax:'(312) 942-5499', npi:'1777700001', ncpdp:'7000001', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'nwm-chi',     name:'Northwestern Memorial Hospital Pharmacy', address1:'251 E Huron St', city:'Chicago', state:'IL', zip:'60611', phone:'(312) 926-5411', fax:'(312) 926-5412', npi:'1777700002', ncpdp:'7000002', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'uch-chi',     name:'University of Chicago Medicine Pharmacy', address1:'5841 S Maryland Ave', city:'Chicago', state:'IL', zip:'60637', phone:'(773) 702-1000', fax:'(773) 702-1001', npi:'1777700003', ncpdp:'7000003', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'va-chi',      name:'VA Jesse Brown Medical Center Pharmacy', address1:'820 S Damen Ave', city:'Chicago', state:'IL', zip:'60612', phone:'(312) 569-8387', fax:'(312) 569-8390', npi:'1777700004', ncpdp:'7000004', capabilities:CAP.HOSP, hours:H.HOSP, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // NORTH SUBURBS — COOK COUNTY
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-evn-001', name:'Walgreens #05823', address1:'1600 Sherman Ave',        city:'Evanston',       state:'IL', zip:'60201', phone:'(847) 869-2211', fax:'(847) 869-2212', npi:'1111100020', ncpdp:'1000020', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-evn-001', name:'CVS Pharmacy #05291', address1:'1104 Chicago Ave',     city:'Evanston',       state:'IL', zip:'60202', phone:'(847) 475-7200', fax:'(847) 475-7201', npi:'1222200020', ncpdp:'2000020', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'jwl-evn-001', name:'Jewel-Osco Pharmacy #3112', address1:'2020 Asbury Ave',city:'Evanston',       state:'IL', zip:'60201', phone:'(847) 866-4420', fax:'(847) 866-4421', npi:'1444400020', ncpdp:'4000020', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-sko-001', name:'Walgreens #07654', address1:'3701 W Dempster St',      city:'Skokie',         state:'IL', zip:'60076', phone:'(847) 679-8980', fax:'(847) 679-8981', npi:'1111100021', ncpdp:'1000021', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-sko-001', name:'CVS Pharmacy #07823', address1:'5100 Main St',         city:'Skokie',         state:'IL', zip:'60077', phone:'(847) 673-5100', fax:'(847) 673-5101', npi:'1222200021', ncpdp:'2000021', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wag-mor-001', name:'Walgreens #04231', address1:'9160 N Waukegan Rd',      city:'Morton Grove',   state:'IL', zip:'60053', phone:'(847) 966-5844', fax:'(847) 966-5845', npi:'1111100022', ncpdp:'1000022', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-prk-001', name:'Walgreens #03441', address1:'5 N Northwest Hwy',       city:'Park Ridge',     state:'IL', zip:'60068', phone:'(847) 825-2010', fax:'(847) 825-2011', npi:'1111100023', ncpdp:'1000023', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-prk-001', name:'CVS Pharmacy #04782', address1:'601 N Northwest Hwy',  city:'Park Ridge',     state:'IL', zip:'60068', phone:'(847) 823-5310', fax:'(847) 823-5311', npi:'1222200022', ncpdp:'2000022', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'adv-prk',     name:'Advocate Lutheran General Hospital Pharmacy', address1:'1775 Dempster St', city:'Park Ridge', state:'IL', zip:'60068', phone:'(847) 723-2210', fax:'(847) 723-2211', npi:'1777700010', ncpdp:'7000010', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'wag-des-001', name:'Walgreens #08941', address1:'770 E Touhy Ave',         city:'Des Plaines',    state:'IL', zip:'60018', phone:'(847) 297-8200', fax:'(847) 297-8201', npi:'1111100024', ncpdp:'1000024', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-des-001', name:'Walmart Pharmacy #1648', address1:'1102 E Oakton St',  city:'Des Plaines',    state:'IL', zip:'60018', phone:'(847) 390-2064', fax:'(847) 390-2065', npi:'1333300010', ncpdp:'3000010', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-nil-001', name:'Walgreens #02783', address1:'8220 N Milwaukee Ave',    city:'Niles',          state:'IL', zip:'60714', phone:'(847) 470-5858', fax:'(847) 470-5859', npi:'1111100025', ncpdp:'1000025', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-glv-001', name:'Walgreens #05671', address1:'4000 W Golf Rd',          city:'Glenview',       state:'IL', zip:'60025', phone:'(847) 998-1640', fax:'(847) 998-1641', npi:'1111100026', ncpdp:'1000026', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'jwl-glv-001', name:'Jewel-Osco Pharmacy #3178', address1:'2404 Waukegan Rd', city:'Glenview',     state:'IL', zip:'60025', phone:'(847) 724-9760', fax:'(847) 724-9761', npi:'1444400025', ncpdp:'4000025', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-nhb-001', name:'Walgreens #03981', address1:'2400 Dundee Rd',          city:'Northbrook',     state:'IL', zip:'60062', phone:'(847) 272-4190', fax:'(847) 272-4191', npi:'1111100027', ncpdp:'1000027', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-arp-001', name:'Walgreens #04918', address1:'77 W Rand Rd',            city:'Arlington Heights', state:'IL', zip:'60004', phone:'(847) 398-2380', fax:'(847) 398-2381', npi:'1111100028', ncpdp:'1000028', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-arp-001', name:'CVS Pharmacy #09321', address1:'101 S Evergreen Ave',  city:'Arlington Heights', state:'IL', zip:'60005', phone:'(847) 253-9740', fax:'(847) 253-9741', npi:'1222200025', ncpdp:'2000025', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'nwc-arp',     name:'Northwest Community Hospital Pharmacy', address1:'800 W Central Rd', city:'Arlington Heights', state:'IL', zip:'60005', phone:'(847) 618-4700', fax:'(847) 618-4704', npi:'1777700011', ncpdp:'7000011', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'wag-pal-001', name:'Walgreens #04516', address1:'1300 E Dundee Rd',        city:'Palatine',       state:'IL', zip:'60074', phone:'(847) 359-2120', fax:'(847) 359-2124', npi:'1111100029', ncpdp:'1000029', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'jwl-pal-001', name:'Jewel-Osco Pharmacy #3241', address1:'1561 N Rand Rd', city:'Palatine',       state:'IL', zip:'60074', phone:'(847) 776-9360', fax:'(847) 776-9361', npi:'1444400026', ncpdp:'4000026', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-rol-001', name:'Walgreens #09878', address1:'2380 Hicks Rd',           city:'Rolling Meadows',state:'IL', zip:'60008', phone:'(847) 392-3880', fax:'(847) 392-3884', npi:'1174561234', ncpdp:'5647823', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-rol-001', name:'CVS Pharmacy #16839', address1:'3409 Kirchoff Rd',     city:'Rolling Meadows',state:'IL', zip:'60008', phone:'(847) 818-5580', fax:'(847) 818-5584', npi:'1234567890', ncpdp:'6172834', capabilities:CAP.RETAIL, hours:H.CVS, ...D, lastUsedAt:Date.now()-86400000*10, distanceMiles:0.8 },
  { id:'jwl-rol-001', name:'Jewel-Osco Pharmacy #3456', address1:'2323 Hicks Rd', city:'Rolling Meadows', state:'IL', zip:'60008', phone:'(847) 577-3440', fax:'(847) 577-3444', npi:'1345678901', ncpdp:'7283945', capabilities:CAP.RETAIL, hours:H.JWL, ...D, distanceMiles:1.1 },
  { id:'wag-hof-001', name:'Walgreens #06241', address1:'990 Higgins Rd',          city:'Hoffman Estates',state:'IL', zip:'60169', phone:'(847) 882-0240', fax:'(847) 882-0241', npi:'1111100030', ncpdp:'1000030', capabilities:CAP.RETAIL, hours:H.WAG, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // NORTH SUBURBS — LAKE COUNTY
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-wau-001', name:'Walgreens #05671', address1:'900 N Lewis Ave',         city:'Waukegan',       state:'IL', zip:'60085', phone:'(847) 623-0454', fax:'(847) 623-0455', npi:'1111100040', ncpdp:'1000040', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-wau-001', name:'CVS Pharmacy #06841', address1:'1401 Belvidere Rd',    city:'Waukegan',       state:'IL', zip:'60085', phone:'(847) 625-2880', fax:'(847) 625-2881', npi:'1222200040', ncpdp:'2000040', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-wau-001', name:'Walmart Pharmacy #1712', address1:'3200 Belvidere Rd', city:'Waukegan',       state:'IL', zip:'60085', phone:'(847) 623-9004', fax:'(847) 623-9005', npi:'1333300020', ncpdp:'3000020', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-wau-001', name:'Jewel-Osco Pharmacy #3381', address1:'1215 N McAree Rd', city:'Waukegan',     state:'IL', zip:'60085', phone:'(847) 360-0170', fax:'(847) 360-0171', npi:'1444400040', ncpdp:'4000040', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-gur-001', name:'Walgreens #07234', address1:'6432 Grand Ave',          city:'Gurnee',         state:'IL', zip:'60031', phone:'(847) 855-0770', fax:'(847) 855-0771', npi:'1111100041', ncpdp:'1000041', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-gur-001', name:'Walmart Pharmacy #3410', address1:'6751 Grand Ave',    city:'Gurnee',         state:'IL', zip:'60031', phone:'(847) 855-8000', fax:'(847) 855-8001', npi:'1333300021', ncpdp:'3000021', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-vlh-001', name:'Walgreens #03892', address1:'475 N Milwaukee Ave',     city:'Vernon Hills',   state:'IL', zip:'60061', phone:'(847) 913-9210', fax:'(847) 913-9211', npi:'1111100042', ncpdp:'1000042', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-vlh-001', name:'CVS Pharmacy #07542', address1:'700 N Milwaukee Ave',  city:'Vernon Hills',   state:'IL', zip:'60061', phone:'(847) 680-0810', fax:'(847) 680-0811', npi:'1222200041', ncpdp:'2000041', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wag-lib-001', name:'Walgreens #04531', address1:'1555 S Milwaukee Ave',    city:'Libertyville',   state:'IL', zip:'60048', phone:'(847) 367-7750', fax:'(847) 367-7751', npi:'1111100043', ncpdp:'1000043', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-mun-001', name:'Walgreens #06891', address1:'1121 S Lake St',          city:'Mundelein',      state:'IL', zip:'60060', phone:'(847) 566-6380', fax:'(847) 566-6381', npi:'1111100044', ncpdp:'1000044', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-hpl-001', name:'Walgreens #06712', address1:'1849 Green Bay Rd',       city:'Highland Park',  state:'IL', zip:'60035', phone:'(847) 831-9810', fax:'(847) 831-9811', npi:'1111100045', ncpdp:'1000045', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-lfo-001', name:'Walgreens #04781', address1:'824 N Western Ave',       city:'Lake Forest',    state:'IL', zip:'60045', phone:'(847) 295-1140', fax:'(847) 295-1141', npi:'1111100046', ncpdp:'1000046', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-bar-001', name:'Walgreens #02341', address1:'600 S Hough St',          city:'Barrington',     state:'IL', zip:'60010', phone:'(847) 381-6400', fax:'(847) 381-6401', npi:'1111100047', ncpdp:'1000047', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'adv-bar',     name:'Advocate Good Shepherd Hospital Pharmacy', address1:'450 W Highway 22', city:'Barrington', state:'IL', zip:'60010', phone:'(847) 381-0123', fax:'(847) 381-0127', npi:'1777700012', ncpdp:'7000012', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'wag-ant-001', name:'Walgreens #08341', address1:'880 Rt 173',              city:'Antioch',        state:'IL', zip:'60002', phone:'(847) 395-0480', fax:'(847) 395-0481', npi:'1111100048', ncpdp:'1000048', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-zio-001', name:'Walgreens #05123', address1:'2200 Sheridan Rd',        city:'Zion',           state:'IL', zip:'60099', phone:'(847) 731-5830', fax:'(847) 731-5831', npi:'1111100049', ncpdp:'1000049', capabilities:CAP.RETAIL, hours:H.WAG, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // NORTHWEST SUBURBS — SCHAUMBURG / HOFFMAN ESTATES
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-sch-001', name:'Walgreens #06862', address1:'1101 E Golf Rd',          city:'Schaumburg',     state:'IL', zip:'60173', phone:'(847) 517-3920', fax:'(847) 517-3924', npi:'1111100050', ncpdp:'1000050', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-sch-002', name:'Walgreens #03417', address1:'800 E Algonquin Rd',      city:'Schaumburg',     state:'IL', zip:'60173', phone:'(847) 882-0260', fax:'(847) 882-0264', npi:'1111100051', ncpdp:'1000051', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-sch-001', name:'CVS Pharmacy #04522', address1:'1250 N Roselle Rd',    city:'Schaumburg',     state:'IL', zip:'60195', phone:'(847) 884-4130', fax:'(847) 884-4134', npi:'1222200050', ncpdp:'2000050', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'jwl-sch-001', name:'Jewel-Osco Pharmacy #3108', address1:'1341 E Algonquin Rd', city:'Schaumburg', state:'IL', zip:'60173', phone:'(847) 885-1950', fax:'(847) 885-1954', npi:'1444400050', ncpdp:'4000050', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'cost-sch',    name:'Costco Pharmacy #536', address1:'1375 N Meacham Rd',   city:'Schaumburg',     state:'IL', zip:'60173', phone:'(847) 240-2540', fax:'(847) 240-2544', npi:'1888800001', ncpdp:'8000001', capabilities:CAP.BASIC, hours:H.COST, ...D },
  { id:'wmt-sch-001', name:'Walmart Pharmacy #4018', address1:'1501 E Golf Rd',    city:'Schaumburg',     state:'IL', zip:'60173', phone:'(847) 839-5600', fax:'(847) 839-5601', npi:'1333300030', ncpdp:'3000030', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'genoa-sch',   name:'Genoa Healthcare — Schaumburg', address1:'1051 Perimeter Dr', address2:'Ste 350', city:'Schaumburg', state:'IL', zip:'60173', phone:'(847) 605-8440', fax:'(847) 605-8444', npi:'1555500010', ncpdp:'5000010', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'mar-bar-001', name:"Mariano's Pharmacy #547", address1:'100 W Higgins Rd', city:'South Barrington',state:'IL', zip:'60010', phone:'(847) 756-7400', fax:'(847) 756-7404', npi:'1666600010', ncpdp:'6000010', capabilities:CAP.RETAIL, hours:H.MAR, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // NORTHWEST SUBURBS — KANE / McHENRY COUNTIES
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-aur-001', name:'Walgreens #08231', address1:'1860 W Galena Blvd',      city:'Aurora',         state:'IL', zip:'60506', phone:'(630) 896-5410', fax:'(630) 896-5411', npi:'1111100060', ncpdp:'1000060', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-aur-002', name:'Walgreens #04762', address1:'2890 N Farnsworth Ave',   city:'Aurora',         state:'IL', zip:'60502', phone:'(630) 585-2940', fax:'(630) 585-2941', npi:'1111100061', ncpdp:'1000061', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-aur-001', name:'CVS Pharmacy #04219', address1:'1717 N Farnsworth Ave',city:'Aurora',         state:'IL', zip:'60505', phone:'(630) 851-7960', fax:'(630) 851-7961', npi:'1222200060', ncpdp:'2000060', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-aur-001', name:'Walmart Pharmacy #1832', address1:'1225 N Lake St',    city:'Aurora',         state:'IL', zip:'60506', phone:'(630) 896-5500', fax:'(630) 896-5501', npi:'1333300040', ncpdp:'3000040', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-aur-001', name:'Jewel-Osco Pharmacy #3289', address1:'2020 W Galena Blvd', city:'Aurora',    state:'IL', zip:'60506', phone:'(630) 844-0340', fax:'(630) 844-0341', npi:'1444400060', ncpdp:'4000060', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-elg-001', name:'Walgreens #09341', address1:'1100 N McLean Blvd',      city:'Elgin',          state:'IL', zip:'60123', phone:'(847) 888-1240', fax:'(847) 888-1241', npi:'1111100062', ncpdp:'1000062', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-elg-001', name:'CVS Pharmacy #07812', address1:'610 E Chicago St',     city:'Elgin',          state:'IL', zip:'60120', phone:'(847) 742-6510', fax:'(847) 742-6511', npi:'1222200061', ncpdp:'2000061', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-elg-001', name:'Walmart Pharmacy #2001', address1:'2000 N Randall Rd', city:'Elgin',          state:'IL', zip:'60123', phone:'(847) 741-5224', fax:'(847) 741-5229', npi:'1333300041', ncpdp:'3000041', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-elg-001', name:'Jewel-Osco Pharmacy #3104', address1:'965 E Chicago St', city:'Elgin',        state:'IL', zip:'60120', phone:'(847) 931-1860', fax:'(847) 931-1861', npi:'1444400061', ncpdp:'4000061', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'genoa-elg',   name:'Genoa Healthcare — Elgin', address1:'750 S McLean Blvd', city:'Elgin',        state:'IL', zip:'60123', phone:'(847) 608-4680', fax:'(847) 608-4684', npi:'1555500011', ncpdp:'5000011', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'wag-alg-001', name:'Walgreens #11265', address1:'4101 W Algonquin Rd',     city:'Algonquin',      state:'IL', zip:'60102', phone:'(847) 854-5270', fax:'(847) 854-5274', npi:'1111100063', ncpdp:'1000063', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-alg-001', name:'Walmart Pharmacy #5060', address1:'1410 S Randall Rd', city:'Algonquin',      state:'IL', zip:'60102', phone:'(847) 458-5735', fax:'(847) 458-5752', npi:'1333300042', ncpdp:'3000042', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-alg-001', name:'Jewel-Osco Pharmacy #3021', address1:'1450 S Randall Rd', city:'Algonquin',   state:'IL', zip:'60102', phone:'(847) 458-2310', fax:'(847) 458-2314', npi:'1444400062', ncpdp:'4000062', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-cry-001', name:'Walgreens #05432', address1:'500 E Terra Cotta Ave',   city:'Crystal Lake',   state:'IL', zip:'60014', phone:'(815) 455-3760', fax:'(815) 455-3761', npi:'1111100064', ncpdp:'1000064', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-cry-001', name:'CVS Pharmacy #08231', address1:'6 N Virginia St',      city:'Crystal Lake',   state:'IL', zip:'60014', phone:'(815) 459-2800', fax:'(815) 459-2801', npi:'1222200062', ncpdp:'2000062', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-cry-001', name:'Walmart Pharmacy #1902', address1:'5500 Northwest Hwy',city:'Crystal Lake',   state:'IL', zip:'60014', phone:'(815) 479-1564', fax:'(815) 479-1565', npi:'1333300043', ncpdp:'3000043', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-stc-001', name:'Walgreens #03871', address1:'2940 W Main St',          city:'St. Charles',    state:'IL', zip:'60175', phone:'(630) 513-8200', fax:'(630) 513-8201', npi:'1111100065', ncpdp:'1000065', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'jwl-stc-001', name:'Jewel-Osco Pharmacy #3201', address1:'3585 E Main St', city:'St. Charles',    state:'IL', zip:'60174', phone:'(630) 584-5040', fax:'(630) 584-5041', npi:'1444400063', ncpdp:'4000063', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-gen-001', name:'Walgreens #04231', address1:'600 S 7th St',            city:'Geneva',         state:'IL', zip:'60134', phone:'(630) 232-4780', fax:'(630) 232-4781', npi:'1111100066', ncpdp:'1000066', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-mch-001', name:'Walgreens #06123', address1:'4020 W Elm St',           city:'McHenry',        state:'IL', zip:'60050', phone:'(815) 344-7080', fax:'(815) 344-7081', npi:'1111100067', ncpdp:'1000067', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-mch-001', name:'Walmart Pharmacy #4218', address1:'620 S Route 31',    city:'McHenry',        state:'IL', zip:'60050', phone:'(815) 344-9000', fax:'(815) 344-9001', npi:'1333300044', ncpdp:'3000044', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-wdsk-001', name:'Walgreens #07834', address1:'1200 Lake Ave',          city:'Woodstock',      state:'IL', zip:'60098', phone:'(815) 338-2640', fax:'(815) 338-2641', npi:'1111100068', ncpdp:'1000068', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-hun-001', name:'Walgreens #12341', address1:'11411 Haligus Rd',        city:'Huntley',        state:'IL', zip:'60142', phone:'(847) 515-5350', fax:'(847) 515-5351', npi:'1111100069', ncpdp:'1000069', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-hun-001', name:'Walmart Pharmacy #5210', address1:'10774 Rt 47',       city:'Huntley',        state:'IL', zip:'60142', phone:'(847) 515-1480', fax:'(847) 515-1481', npi:'1333300045', ncpdp:'3000045', capabilities:CAP.RETAIL, hours:H.WMT, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // WEST SUBURBS — DuPAGE COUNTY
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-nap-001', name:'Walgreens #08934', address1:'1296 W Ogden Ave',        city:'Naperville',     state:'IL', zip:'60563', phone:'(630) 355-2700', fax:'(630) 355-2701', npi:'1111100080', ncpdp:'1000080', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-nap-002', name:'Walgreens #06521', address1:'3002 Olsen Dr',           city:'Naperville',     state:'IL', zip:'60564', phone:'(630) 527-2560', fax:'(630) 527-2561', npi:'1111100081', ncpdp:'1000081', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-nap-001', name:'CVS Pharmacy #05621', address1:'1548 N Naper Blvd',    city:'Naperville',     state:'IL', zip:'60563', phone:'(630) 983-4400', fax:'(630) 983-4401', npi:'1222200080', ncpdp:'2000080', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'jwl-nap-001', name:'Jewel-Osco Pharmacy #3341', address1:'360 S Main St',  city:'Naperville',     state:'IL', zip:'60540', phone:'(630) 355-4680', fax:'(630) 355-4681', npi:'1444400080', ncpdp:'4000080', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wmt-nap-001', name:'Walmart Pharmacy #1567', address1:'2560 W 75th St',    city:'Naperville',     state:'IL', zip:'60565', phone:'(630) 778-0288', fax:'(630) 778-0289', npi:'1333300060', ncpdp:'3000060', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-whe-001', name:'Walgreens #04872', address1:'250 S Wheaton Ave',       city:'Wheaton',        state:'IL', zip:'60187', phone:'(630) 682-2640', fax:'(630) 682-2641', npi:'1111100082', ncpdp:'1000082', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-whe-001', name:'CVS Pharmacy #08912', address1:'108 E Roosevelt Rd',   city:'Wheaton',        state:'IL', zip:'60187', phone:'(630) 668-6600', fax:'(630) 668-6601', npi:'1222200081', ncpdp:'2000081', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'jwl-whe-001', name:'Jewel-Osco Pharmacy #3421', address1:'2100 Manchester Rd', city:'Wheaton',    state:'IL', zip:'60187', phone:'(630) 690-6400', fax:'(630) 690-6401', npi:'1444400081', ncpdp:'4000081', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'genoa-whe',   name:'Genoa Healthcare — Wheaton', address1:'2100 Manchester Rd', address2:'Ste 720', city:'Wheaton', state:'IL', zip:'60187', phone:'(630) 690-6570', fax:'(630) 690-6574', npi:'1555500012', ncpdp:'5000012', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'wag-dow-001', name:'Walgreens #07831', address1:'4901 Main St',            city:'Downers Grove',  state:'IL', zip:'60515', phone:'(630) 968-1600', fax:'(630) 968-1601', npi:'1111100083', ncpdp:'1000083', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'jwl-dow-001', name:'Jewel-Osco Pharmacy #3512', address1:'1200 75th St',   city:'Downers Grove',  state:'IL', zip:'60516', phone:'(630) 663-0750', fax:'(630) 663-0751', npi:'1444400082', ncpdp:'4000082', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-lom-001', name:'Walgreens #05231', address1:'200 W St Charles Rd',     city:'Lombard',        state:'IL', zip:'60148', phone:'(630) 629-0280', fax:'(630) 629-0281', npi:'1111100084', ncpdp:'1000084', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-lom-001', name:'Walmart Pharmacy #2891', address1:'2021 S Highland Ave',city:'Lombard',        state:'IL', zip:'60148', phone:'(630) 932-9300', fax:'(630) 932-9301', npi:'1333300061', ncpdp:'3000061', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-lom-001', name:'Jewel-Osco Pharmacy #3601', address1:'433 E Roosevelt Rd', city:'Lombard',    state:'IL', zip:'60148', phone:'(630) 629-0700', fax:'(630) 629-0701', npi:'1444400083', ncpdp:'4000083', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-elm-001', name:'Walgreens #03412', address1:'215 S Addison Ave',       city:'Elmhurst',       state:'IL', zip:'60126', phone:'(630) 993-1120', fax:'(630) 993-1121', npi:'1111100085', ncpdp:'1000085', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'jwl-elm-001', name:'Jewel-Osco Pharmacy #3561', address1:'100 N Addison Ave', city:'Elmhurst',    state:'IL', zip:'60126', phone:'(630) 941-1272', fax:'(630) 941-1273', npi:'1444400084', ncpdp:'4000084', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-bol-001', name:'Walgreens #09823', address1:'280 E Boughton Rd',       city:'Bolingbrook',    state:'IL', zip:'60440', phone:'(630) 783-1240', fax:'(630) 783-1241', npi:'1111100086', ncpdp:'1000086', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-bol-001', name:'Walmart Pharmacy #2134', address1:'700 E Boughton Rd', city:'Bolingbrook',    state:'IL', zip:'60440', phone:'(630) 739-5004', fax:'(630) 739-5005', npi:'1333300062', ncpdp:'3000062', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-gle-001', name:'Walgreens #04561', address1:'495 Roosevelt Rd',        city:'Glen Ellyn',     state:'IL', zip:'60137', phone:'(630) 790-4020', fax:'(630) 790-4021', npi:'1111100087', ncpdp:'1000087', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-wst-001', name:'Walgreens #06712', address1:'6400 S Cass Ave',         city:'Westmont',       state:'IL', zip:'60559', phone:'(630) 968-8420', fax:'(630) 968-8421', npi:'1111100088', ncpdp:'1000088', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-lis-001', name:'Walgreens #07231', address1:'5500 Lincoln Ave',        city:'Lisle',          state:'IL', zip:'60532', phone:'(630) 241-9140', fax:'(630) 241-9141', npi:'1111100089', ncpdp:'1000089', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-add-001', name:'Walgreens #05841', address1:'1060 E Lake St',          city:'Addison',        state:'IL', zip:'60101', phone:'(630) 628-1820', fax:'(630) 628-1821', npi:'1111100090', ncpdp:'1000090', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cost-nap',    name:'Costco Pharmacy #668', address1:'900 W 75th St',        city:'Naperville',     state:'IL', zip:'60565', phone:'(630) 961-2490', fax:'(630) 961-2491', npi:'1888800002', ncpdp:'8000002', capabilities:CAP.BASIC, hours:H.COST, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // SOUTHWEST / SOUTH SUBURBS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-jol-001', name:'Walgreens #06842', address1:'2800 W Jefferson St',     city:'Joliet',         state:'IL', zip:'60435', phone:'(815) 741-1200', fax:'(815) 741-1201', npi:'1111100100', ncpdp:'1000100', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-jol-002', name:'Walgreens #04512', address1:'3101 Caton Farm Rd',      city:'Joliet',         state:'IL', zip:'60431', phone:'(815) 436-0330', fax:'(815) 436-0331', npi:'1111100101', ncpdp:'1000101', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-jol-001', name:'Walmart Pharmacy #1234', address1:'3200 W Jefferson St', city:'Joliet',       state:'IL', zip:'60435', phone:'(815) 744-6900', fax:'(815) 744-6901', npi:'1333300080', ncpdp:'3000080', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-jol-001', name:'Jewel-Osco Pharmacy #3612', address1:'3120 W Jefferson St', city:'Joliet',    state:'IL', zip:'60435', phone:'(815) 741-3670', fax:'(815) 741-3671', npi:'1444400100', ncpdp:'4000100', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'genoa-jol',   name:'Genoa Healthcare — Joliet', address1:'900 Essington Rd', address2:'Ste 140',  city:'Joliet', state:'IL', zip:'60435', phone:'(815) 744-7460', fax:'(815) 744-7464', npi:'1555500020', ncpdp:'5000020', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'wag-orl-001', name:'Walgreens #07341', address1:'14760 S La Grange Rd',    city:'Orland Park',    state:'IL', zip:'60462', phone:'(708) 349-5540', fax:'(708) 349-5541', npi:'1111100102', ncpdp:'1000102', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-orl-001', name:'CVS Pharmacy #06721', address1:'15400 S LaGrange Rd',  city:'Orland Park',    state:'IL', zip:'60462', phone:'(708) 349-1370', fax:'(708) 349-1371', npi:'1222200100', ncpdp:'2000100', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-orl-001', name:'Walmart Pharmacy #1983', address1:'15255 S 94th Ave',  city:'Orland Park',    state:'IL', zip:'60462', phone:'(708) 349-7640', fax:'(708) 349-7641', npi:'1333300081', ncpdp:'3000081', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-tin-001', name:'Walgreens #05823', address1:'16445 Oak Park Ave',      city:'Tinley Park',    state:'IL', zip:'60477', phone:'(708) 429-6040', fax:'(708) 429-6041', npi:'1111100103', ncpdp:'1000103', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-tin-001', name:'Walmart Pharmacy #2341', address1:'18100 S 76th Ave',  city:'Tinley Park',    state:'IL', zip:'60487', phone:'(708) 614-3000', fax:'(708) 614-3001', npi:'1333300082', ncpdp:'3000082', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-oak-001', name:'Walgreens #04231', address1:'9901 S Cicero Ave',       city:'Oak Lawn',       state:'IL', zip:'60453', phone:'(708) 636-2860', fax:'(708) 636-2861', npi:'1111100104', ncpdp:'1000104', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-oak-001', name:'Walmart Pharmacy #2291', address1:'6600 W 95th St',    city:'Oak Lawn',       state:'IL', zip:'60453', phone:'(708) 636-5068', fax:'(708) 636-5069', npi:'1333300083', ncpdp:'3000083', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-hom-001', name:'Walgreens #06782', address1:'18060 Halsted St',        city:'Homewood',       state:'IL', zip:'60430', phone:'(708) 799-0560', fax:'(708) 799-0561', npi:'1111100105', ncpdp:'1000105', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-bri-001', name:'Walgreens #04921', address1:'7960 W 95th St',          city:'Bridgeview',     state:'IL', zip:'60455', phone:'(708) 430-4560', fax:'(708) 430-4561', npi:'1111100106', ncpdp:'1000106', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-eve-001', name:'Walgreens #07231', address1:'9730 S Western Ave',      city:'Evergreen Park', state:'IL', zip:'60805', phone:'(708) 425-9720', fax:'(708) 425-9721', npi:'1111100107', ncpdp:'1000107', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-opk-001', name:'Walgreens #03821', address1:'1 N Oak Park Ave',        city:'Oak Park',       state:'IL', zip:'60301', phone:'(708) 386-1700', fax:'(708) 386-1701', npi:'1111100108', ncpdp:'1000108', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'jwl-opk-001', name:'Jewel-Osco Pharmacy #3198', address1:'715 Lake St',    city:'Oak Park',       state:'IL', zip:'60301', phone:'(708) 386-4800', fax:'(708) 386-4801', npi:'1444400101', ncpdp:'4000101', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-bwy-001', name:'Walgreens #05641', address1:'6720 Cermak Rd',          city:'Berwyn',         state:'IL', zip:'60402', phone:'(708) 788-2540', fax:'(708) 788-2541', npi:'1111100109', ncpdp:'1000109', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-cic-001', name:'Walgreens #08134', address1:'5150 W Cermak Rd',        city:'Cicero',         state:'IL', zip:'60804', phone:'(708) 863-2770', fax:'(708) 863-2771', npi:'1111100110', ncpdp:'1000110', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-mat-001', name:'Walgreens #07821', address1:'4540 W 211th St',         city:'Matteson',       state:'IL', zip:'60443', phone:'(708) 503-0020', fax:'(708) 503-0021', npi:'1111100111', ncpdp:'1000111', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-cal-001', name:'Walgreens #06123', address1:'1501 Torrence Ave',       city:'Calumet City',   state:'IL', zip:'60409', phone:'(708) 891-8690', fax:'(708) 891-8691', npi:'1111100112', ncpdp:'1000112', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cost-olk',    name:'Costco Pharmacy #720', address1:'17550 S La Grange Rd', city:'Orland Park',   state:'IL', zip:'60467', phone:'(708) 349-4880', fax:'(708) 349-4881', npi:'1888800003', ncpdp:'8000003', capabilities:CAP.BASIC, hours:H.COST, ...D },
  { id:'sams-jol',    name:"Sam's Club Pharmacy #6476", address1:'3401 Caton Farm Rd', city:'Joliet',     state:'IL', zip:'60431', phone:'(815) 254-0780', fax:'(815) 254-0781', npi:'1999800001', ncpdp:'9800001', capabilities:CAP.BASIC, hours:H.SAMS, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // ROCKFORD / NORTHERN ILLINOIS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-rok-001', name:'Walgreens #04231', address1:'4901 E State St',         city:'Rockford',       state:'IL', zip:'61108', phone:'(815) 399-1540', fax:'(815) 399-1541', npi:'1111100120', ncpdp:'1000120', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-rok-002', name:'Walgreens #07834', address1:'1415 S Alpine Rd',        city:'Rockford',       state:'IL', zip:'61108', phone:'(815) 397-8120', fax:'(815) 397-8121', npi:'1111100121', ncpdp:'1000121', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-rok-003', name:'Walgreens #05341', address1:'4219 N Main St',          city:'Rockford',       state:'IL', zip:'61103', phone:'(815) 877-4640', fax:'(815) 877-4641', npi:'1111100122', ncpdp:'1000122', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-rok-001', name:'CVS Pharmacy #09341', address1:'6000 E State St',      city:'Rockford',       state:'IL', zip:'61108', phone:'(815) 398-3220', fax:'(815) 398-3221', npi:'1222200120', ncpdp:'2000120', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-rok-001', name:'Walmart Pharmacy #1402', address1:'7219 Walton St',    city:'Rockford',       state:'IL', zip:'61108', phone:'(815) 227-9944', fax:'(815) 227-9945', npi:'1333300100', ncpdp:'3000100', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wmt-rok-002', name:'Walmart Pharmacy #2891', address1:'3831 Auburn St',    city:'Rockford',       state:'IL', zip:'61101', phone:'(815) 964-8800', fax:'(815) 964-8801', npi:'1333300101', ncpdp:'3000101', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-rok-001', name:'Jewel-Osco Pharmacy #3710', address1:'4127 N Rockton Ave', city:'Rockford',   state:'IL', zip:'61103', phone:'(815) 654-0440', fax:'(815) 654-0441', npi:'1444400120', ncpdp:'4000120', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'mei-rok-001', name:'Meijer Pharmacy #245', address1:'7219 E State St',     city:'Rockford',       state:'IL', zip:'61108', phone:'(815) 332-0408', fax:'(815) 332-0409', npi:'1999900001', ncpdp:'9900001', capabilities:CAP.BASIC, hours:H.MEI, ...D },
  { id:'genoa-rok',   name:'Genoa Healthcare — Rockford', address1:'3005 McFarland Rd', address2:'Ste 105', city:'Rockford', state:'IL', zip:'61115', phone:'(815) 636-4480', fax:'(815) 636-4484', npi:'1555500030', ncpdp:'5000030', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'wag-lpk-001', name:'Walgreens #05612', address1:'1610 N Alpine Rd',        city:'Loves Park',     state:'IL', zip:'61111', phone:'(815) 654-2330', fax:'(815) 654-2331', npi:'1111100123', ncpdp:'1000123', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-bel-001', name:'Walgreens #04921', address1:'724 S State St',          city:'Belvidere',      state:'IL', zip:'61008', phone:'(815) 547-8450', fax:'(815) 547-8451', npi:'1111100124', ncpdp:'1000124', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-fre-001', name:'Walgreens #06231', address1:'1520 S Galena Ave',       city:'Freeport',       state:'IL', zip:'61032', phone:'(815) 232-2260', fax:'(815) 232-2261', npi:'1111100125', ncpdp:'1000125', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-fre-001', name:'Walmart Pharmacy #1634', address1:'1506 S Galena Ave', city:'Freeport',       state:'IL', zip:'61032', phone:'(815) 233-9100', fax:'(815) 233-9101', npi:'1333300102', ncpdp:'3000102', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'osf-rok',     name:'OSF Saint Anthony Medical Center Pharmacy', address1:'5666 E State St', city:'Rockford', state:'IL', zip:'61108', phone:'(815) 395-5000', fax:'(815) 395-5001', npi:'1777700030', ncpdp:'7000030', capabilities:CAP.HOSP, hours:H.HOSP, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // PEORIA / CENTRAL ILLINOIS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-peo-001', name:'Walgreens #06123', address1:'4730 N University St',    city:'Peoria',         state:'IL', zip:'61614', phone:'(309) 692-7160', fax:'(309) 692-7161', npi:'1111100140', ncpdp:'1000140', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-peo-002', name:'Walgreens #08912', address1:'3209 N Knoxville Ave',    city:'Peoria',         state:'IL', zip:'61603', phone:'(309) 685-0440', fax:'(309) 685-0441', npi:'1111100141', ncpdp:'1000141', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-peo-001', name:'CVS Pharmacy #07234', address1:'4500 N Prospect Rd',   city:'Peoria',         state:'IL', zip:'61614', phone:'(309) 685-5100', fax:'(309) 685-5101', npi:'1222200140', ncpdp:'2000140', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-peo-001', name:'Walmart Pharmacy #1634', address1:'2000 W War Memorial Dr', city:'Peoria',    state:'IL', zip:'61615', phone:'(309) 637-2944', fax:'(309) 637-2945', npi:'1333300120', ncpdp:'3000120', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-peo-001', name:'Jewel-Osco Pharmacy #3821', address1:'4800 N University', city:'Peoria',      state:'IL', zip:'61614', phone:'(309) 685-4140', fax:'(309) 685-4141', npi:'1444400140', ncpdp:'4000140', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'mei-peo-001', name:'Meijer Pharmacy #183', address1:'2400 W Lake Ave',     city:'Peoria',         state:'IL', zip:'61615', phone:'(309) 691-3700', fax:'(309) 691-3701', npi:'1999900002', ncpdp:'9900002', capabilities:CAP.BASIC, hours:H.MEI, ...D },
  { id:'osf-peo',     name:'OSF Saint Francis Medical Center Pharmacy', address1:'530 NE Glen Oak Ave', city:'Peoria', state:'IL', zip:'61637', phone:'(309) 655-2000', fax:'(309) 655-2001', npi:'1777700040', ncpdp:'7000040', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'wag-blo-001', name:'Walgreens #05231', address1:'2012 E Empire St',        city:'Bloomington',    state:'IL', zip:'61704', phone:'(309) 662-0440', fax:'(309) 662-0441', npi:'1111100142', ncpdp:'1000142', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-blo-001', name:'CVS Pharmacy #08341', address1:'1601 E Empire St',     city:'Bloomington',    state:'IL', zip:'61704', phone:'(309) 663-5200', fax:'(309) 663-5201', npi:'1222200141', ncpdp:'2000141', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-nor-001', name:'Walmart Pharmacy #1832', address1:'201 Veterans Pkwy', city:'Normal',         state:'IL', zip:'61761', phone:'(309) 452-7600', fax:'(309) 452-7601', npi:'1333300121', ncpdp:'3000121', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'mei-blo-001', name:'Meijer Pharmacy #341', address1:'1701 E Empire St',    city:'Bloomington',    state:'IL', zip:'61704', phone:'(309) 662-7200', fax:'(309) 662-7201', npi:'1999900003', ncpdp:'9900003', capabilities:CAP.BASIC, hours:H.MEI, ...D },
  { id:'wag-gal-001', name:'Walgreens #04231', address1:'345 E Main St',           city:'Galesburg',      state:'IL', zip:'61401', phone:'(309) 343-6560', fax:'(309) 343-6561', npi:'1111100143', ncpdp:'1000143', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-gal-001', name:'Walmart Pharmacy #1784', address1:'1830 N Henderson St', city:'Galesburg',    state:'IL', zip:'61401', phone:'(309) 344-3008', fax:'(309) 344-3009', npi:'1333300122', ncpdp:'3000122', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-kan-001', name:'Walgreens #06412', address1:'1225 S Schuyler Ave',     city:'Kankakee',       state:'IL', zip:'60901', phone:'(815) 937-1140', fax:'(815) 937-1141', npi:'1111100144', ncpdp:'1000144', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-kan-001', name:'Walmart Pharmacy #1923', address1:'1575 S Schuyler Ave', city:'Kankakee',     state:'IL', zip:'60901', phone:'(815) 932-0700', fax:'(815) 932-0701', npi:'1333300123', ncpdp:'3000123', capabilities:CAP.RETAIL, hours:H.WMT, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // SPRINGFIELD / CENTRAL ILLINOIS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-spr-001', name:'Walgreens #06781', address1:'1229 N Dirksen Pkwy',     city:'Springfield',    state:'IL', zip:'62702', phone:'(217) 523-3100', fax:'(217) 523-3101', npi:'1111100160', ncpdp:'1000160', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-spr-002', name:'Walgreens #04512', address1:'2650 S MacArthur Blvd',   city:'Springfield',    state:'IL', zip:'62704', phone:'(217) 787-4440', fax:'(217) 787-4441', npi:'1111100161', ncpdp:'1000161', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-spr-001', name:'CVS Pharmacy #08921', address1:'2801 S 6th St',        city:'Springfield',    state:'IL', zip:'62703', phone:'(217) 753-8800', fax:'(217) 753-8801', npi:'1222200160', ncpdp:'2000160', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-spr-001', name:'Walmart Pharmacy #2001', address1:'3199 Sangamon Ave', city:'Springfield',    state:'IL', zip:'62702', phone:'(217) 528-0800', fax:'(217) 528-0801', npi:'1333300140', ncpdp:'3000140', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-spr-001', name:'Jewel-Osco Pharmacy #3904', address1:'2455 S MacArthur', city:'Springfield',  state:'IL', zip:'62704', phone:'(217) 787-2340', fax:'(217) 787-2341', npi:'1444400160', ncpdp:'4000160', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'mei-spr-001', name:'Meijer Pharmacy #341', address1:'1100 Lejune Dr',      city:'Springfield',    state:'IL', zip:'62704', phone:'(217) 787-3630', fax:'(217) 787-3631', npi:'1999900010', ncpdp:'9900010', capabilities:CAP.BASIC, hours:H.MEI, ...D },
  { id:'genoa-spr',   name:'Genoa Healthcare — Springfield', address1:'601 N Bruns Ln', address2:'Ste 4', city:'Springfield', state:'IL', zip:'62702', phone:'(217) 698-6900', fax:'(217) 698-6904', npi:'1555500040', ncpdp:'5000040', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'mem-spr',     name:'Memorial Medical Center Pharmacy', address1:'701 N 1st St', city:'Springfield', state:'IL', zip:'62781', phone:'(217) 788-3000', fax:'(217) 788-3001', npi:'1777700050', ncpdp:'7000050', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'wag-dec-001', name:'Walgreens #07231', address1:'3405 N Water St',         city:'Decatur',        state:'IL', zip:'62526', phone:'(217) 877-0880', fax:'(217) 877-0881', npi:'1111100162', ncpdp:'1000162', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-dec-001', name:'Walmart Pharmacy #1781', address1:'5101 Hwy 36 W',     city:'Decatur',        state:'IL', zip:'62522', phone:'(217) 875-6700', fax:'(217) 875-6701', npi:'1333300141', ncpdp:'3000141', capabilities:CAP.RETAIL, hours:H.WMT, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // CHAMPAIGN / EAST CENTRAL ILLINOIS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-cham-001', name:'Walgreens #05871', address1:'703 S Neil St',          city:'Champaign',      state:'IL', zip:'61820', phone:'(217) 352-1230', fax:'(217) 352-1231', npi:'1111100170', ncpdp:'1000170', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-cham-002', name:'Walgreens #07234', address1:'1705 W Kirby Ave',       city:'Champaign',      state:'IL', zip:'61821', phone:'(217) 355-7920', fax:'(217) 355-7921', npi:'1111100171', ncpdp:'1000171', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-cham-001', name:'CVS Pharmacy #04231', address1:'602 N Neil St',       city:'Champaign',      state:'IL', zip:'61820', phone:'(217) 398-5900', fax:'(217) 398-5901', npi:'1222200170', ncpdp:'2000170', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-cham-001', name:'Walmart Pharmacy #1781', address1:'2610 N Prospect Ave', city:'Champaign',   state:'IL', zip:'61822', phone:'(217) 355-5488', fax:'(217) 355-5489', npi:'1333300160', ncpdp:'3000160', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-cham-001', name:'Jewel-Osco Pharmacy #3892', address1:'2007 S Neil St', city:'Champaign',     state:'IL', zip:'61820', phone:'(217) 352-7930', fax:'(217) 352-7931', npi:'1444400170', ncpdp:'4000170', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'mei-cham-001', name:'Meijer Pharmacy #402', address1:'1704 W Marketview Dr', city:'Champaign',    state:'IL', zip:'61822', phone:'(217) 352-5200', fax:'(217) 352-5201', npi:'1999900020', ncpdp:'9900020', capabilities:CAP.BASIC, hours:H.MEI, ...D },
  { id:'genoa-cham',  name:'Genoa Healthcare — Champaign', address1:'1801 Fox Dr', address2:'Ste E',      city:'Champaign', state:'IL', zip:'61820', phone:'(217) 239-4410', fax:'(217) 239-4414', npi:'1555500041', ncpdp:'5000041', capabilities:CAP.SPEC, hours:H.SPEC, ...D },
  { id:'wag-dan-001', name:'Walgreens #06341', address1:'1015 N Vermilion St',     city:'Danville',       state:'IL', zip:'61832', phone:'(217) 431-6850', fax:'(217) 431-6851', npi:'1111100172', ncpdp:'1000172', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'va-dan',      name:'VA Danville Medical Center Pharmacy', address1:'1900 E Main St', city:'Danville', state:'IL', zip:'61832', phone:'(217) 554-3000', fax:'(217) 554-3001', npi:'1777700060', ncpdp:'7000060', capabilities:CAP.HOSP, hours:H.HOSP, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // SOUTHERN ILLINOIS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-bvl-001', name:'Walgreens #07123', address1:'400 S Illinois St',       city:'Belleville',     state:'IL', zip:'62220', phone:'(618) 234-1900', fax:'(618) 234-1901', npi:'1111100180', ncpdp:'1000180', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-bvl-001', name:'CVS Pharmacy #08234', address1:'1201 Carlyle Ave',     city:'Belleville',     state:'IL', zip:'62221', phone:'(618) 233-3900', fax:'(618) 233-3901', npi:'1222200180', ncpdp:'2000180', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wmt-bvl-001', name:'Walmart Pharmacy #1441', address1:'1500 W Main St',    city:'Belleville',     state:'IL', zip:'62226', phone:'(618) 277-4200', fax:'(618) 277-4201', npi:'1333300180', ncpdp:'3000180', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'jwl-bvl-001', name:'Jewel-Osco Pharmacy #3931', address1:'801 W Main St',  city:'Belleville',     state:'IL', zip:'62220', phone:'(618) 233-2340', fax:'(618) 233-2341', npi:'1444400180', ncpdp:'4000180', capabilities:CAP.RETAIL, hours:H.JWL, ...D },
  { id:'wag-ofl-001', name:'Walgreens #04821', address1:'1 Eastport Plaza Dr',     city:"O'Fallon",       state:'IL', zip:'62269', phone:'(618) 624-2860', fax:'(618) 624-2861', npi:'1111100181', ncpdp:'1000181', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-ofl-001', name:'Walmart Pharmacy #1892', address1:'1200 Central Park Dr', city:"O'Fallon",    state:'IL', zip:'62269', phone:'(618) 624-5300', fax:'(618) 624-5301', npi:'1333300181', ncpdp:'3000181', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-edw-001', name:'Walgreens #08312', address1:'6700 Center Grove Rd',    city:'Edwardsville',   state:'IL', zip:'62025', phone:'(618) 656-4090', fax:'(618) 656-4091', npi:'1111100182', ncpdp:'1000182', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-col-001', name:'Walgreens #05671', address1:'920 N Bluff Rd',          city:'Collinsville',   state:'IL', zip:'62234', phone:'(618) 344-9090', fax:'(618) 344-9091', npi:'1111100183', ncpdp:'1000183', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-car-001', name:'Walgreens #05632', address1:'1100 E Main St',          city:'Carbondale',     state:'IL', zip:'62901', phone:'(618) 549-0491', fax:'(618) 549-0492', npi:'1111100184', ncpdp:'1000184', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-car-001', name:'Walmart Pharmacy #1834', address1:'1450 E Main St',    city:'Carbondale',     state:'IL', zip:'62901', phone:'(618) 529-3032', fax:'(618) 529-3033', npi:'1333300182', ncpdp:'3000182', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-mar-001', name:'Walgreens #09231', address1:'2307 E DeYoung St',       city:'Marion',         state:'IL', zip:'62959', phone:'(618) 998-0240', fax:'(618) 998-0241', npi:'1111100185', ncpdp:'1000185', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-mar-001', name:'Walmart Pharmacy #1568', address1:'2901 W DeYoung St', city:'Marion',         state:'IL', zip:'62959', phone:'(618) 997-7900', fax:'(618) 997-7901', npi:'1333300183', ncpdp:'3000183', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-mtv-001', name:'Walgreens #07341', address1:'320 S 42nd St',           city:'Mount Vernon',   state:'IL', zip:'62864', phone:'(618) 244-6920', fax:'(618) 244-6921', npi:'1111100186', ncpdp:'1000186', capabilities:CAP.RETAIL, hours:H.WAG, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // QUAD CITIES / NORTHWEST ILLINOIS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-mol-001', name:'Walgreens #07812', address1:'3801 16th St',            city:'Moline',         state:'IL', zip:'61265', phone:'(309) 764-7560', fax:'(309) 764-7561', npi:'1111100200', ncpdp:'1000200', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'cvs-mol-001', name:'CVS Pharmacy #06834', address1:'3800 Avenue of the Cities', city:'Moline',    state:'IL', zip:'61265', phone:'(309) 797-2800', fax:'(309) 797-2801', npi:'1222200200', ncpdp:'2000200', capabilities:CAP.RETAIL, hours:H.CVS, ...D },
  { id:'wag-ri-001',  name:'Walgreens #05432', address1:'1629 5th Ave',            city:'Rock Island',    state:'IL', zip:'61201', phone:'(309) 786-9808', fax:'(309) 786-9809', npi:'1111100201', ncpdp:'1000201', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-mol-001', name:'Walmart Pharmacy #1534', address1:'900 42nd Ave',      city:'Moline',         state:'IL', zip:'61265', phone:'(309) 764-5800', fax:'(309) 764-5801', npi:'1333300200', ncpdp:'3000200', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'mei-mol-001', name:'Meijer Pharmacy #507', address1:'3815 16th St',        city:'Moline',         state:'IL', zip:'61265', phone:'(309) 797-4880', fax:'(309) 797-4881', npi:'1999900030', ncpdp:'9900030', capabilities:CAP.BASIC, hours:H.MEI, ...D },
  { id:'wag-sil-001', name:'Walgreens #06123', address1:'101 W First St',          city:'Silvis',         state:'IL', zip:'61282', phone:'(309) 792-2820', fax:'(309) 792-2821', npi:'1111100202', ncpdp:'1000202', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-kew-001', name:'Walgreens #04781', address1:'500 N Main St',           city:'Kewanee',        state:'IL', zip:'61443', phone:'(309) 852-3920', fax:'(309) 852-3921', npi:'1111100203', ncpdp:'1000203', capabilities:CAP.RETAIL, hours:H.WAG, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // DOWNSTATE CITIES — MISCELLANEOUS
  // ══════════════════════════════════════════════════════════════════════════
  { id:'wag-rck-001', name:'Walgreens #05781', address1:'3401 N Main St',          city:'Rockford',       state:'IL', zip:'61103', phone:'(815) 877-1920', fax:'(815) 877-1921', npi:'1111100210', ncpdp:'1000210', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-qcy-001', name:'Walgreens #06123', address1:'101 N 12th St',           city:'Quincy',         state:'IL', zip:'62301', phone:'(217) 222-4120', fax:'(217) 222-4121', npi:'1111100211', ncpdp:'1000211', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wmt-qcy-001', name:'Walmart Pharmacy #1781', address1:'3600 Broadway St',  city:'Quincy',         state:'IL', zip:'62305', phone:'(217) 228-5280', fax:'(217) 228-5281', npi:'1333300210', ncpdp:'3000210', capabilities:CAP.RETAIL, hours:H.WMT, ...D },
  { id:'wag-jol-003', name:'Walgreens #08231', address1:'400 Larkin Ave',          city:'Joliet',         state:'IL', zip:'60432', phone:'(815) 723-5780', fax:'(815) 723-5781', npi:'1111100212', ncpdp:'1000212', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-war-001', name:'Walgreens #07891', address1:'405 N Main St',           city:'Washington',     state:'IL', zip:'61571', phone:'(309) 444-4440', fax:'(309) 444-4441', npi:'1111100213', ncpdp:'1000213', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-mot-001', name:'Walgreens #06341', address1:'120 E Queenwood Rd',      city:'Morton',         state:'IL', zip:'61550', phone:'(309) 266-6720', fax:'(309) 266-6721', npi:'1111100214', ncpdp:'1000214', capabilities:CAP.RETAIL, hours:H.WAG, ...D },
  { id:'wag-cen-001', name:'Walgreens #05432', address1:'1301 E Broadway',         city:'Centralia',      state:'IL', zip:'62801', phone:'(618) 532-2810', fax:'(618) 532-2811', npi:'1111100215', ncpdp:'1000215', capabilities:CAP.RETAIL, hours:H.WAG, ...D },

  // ══════════════════════════════════════════════════════════════════════════
  // VA / HOSPITAL — STATEWIDE
  // ══════════════════════════════════════════════════════════════════════════
  { id:'va-hines',    name:'VA Edward Hines Jr. Hospital Pharmacy', address1:'5000 S 5th Ave', city:'Hines', state:'IL', zip:'60141', phone:'(708) 202-8387', fax:'(708) 202-8390', npi:'1777700070', ncpdp:'7000070', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'loy-mayw',    name:'Loyola University Medical Center Pharmacy', address1:'2160 S 1st Ave', city:'Maywood', state:'IL', zip:'60153', phone:'(708) 216-9000', fax:'(708) 216-9001', npi:'1777700071', ncpdp:'7000071', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'silver-chi',  name:'Stroger Hospital (Cook County) Pharmacy', address1:'1901 W Harrison St', city:'Chicago', state:'IL', zip:'60612', phone:'(312) 864-6000', fax:'(312) 864-6001', npi:'1777700072', ncpdp:'7000072', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
  { id:'uch-ingls',   name:'Ingalls Memorial Hospital Pharmacy', address1:'1 Ingalls Dr', city:'Harvey', state:'IL', zip:'60426', phone:'(708) 333-2300', fax:'(708) 333-2301', npi:'1777700073', ncpdp:'7000073', capabilities:CAP.HOSP, hours:H.HOSP, ...D },
];
