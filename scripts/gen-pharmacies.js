/**
 * Generates a comprehensive Illinois pharmacy list and patches it into
 * src/data/mockData.js, replacing the existing `pharmacies` export.
 * Run: node scripts/gen-pharmacies.js
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(__dirname, '../src/data/mockData.js');

// ─── Seed data ────────────────────────────────────────────────────────────────

const CHAINS = [
  {
    chain: 'Walgreens',
    prefix: 'Walgreens #',
    npiBase: 10100000,
    locations: [
      // Chicago neighborhoods
      ['5734','757 N Michigan Ave','Chicago','60611','(312) 664-8681'],
      ['3218','2 E Roosevelt Rd','Chicago','60605','(312) 427-0863'],
      ['4590','6140 N Broadway','Chicago','60660','(773) 973-0430'],
      ['12835','1601 N Wells St','Chicago','60614','(312) 642-4008'],
      ['2867','200 W Adams St','Chicago','60606','(312) 332-1862'],
      ['9021','1500 N Clybourn Ave','Chicago','60610','(312) 944-5515'],
      ['7834','3501 N Halsted St','Chicago','60657','(773) 549-1144'],
      ['9462','4200 W Irving Park Rd','Chicago','60641','(773) 282-5010'],
      ['2103','8101 S Cottage Grove Ave','Chicago','60619','(773) 488-3010'],
      ['5882','1372 N Milwaukee Ave','Chicago','60622','(773) 395-6811'],
      ['3640','2950 E 79th St','Chicago','60649','(773) 731-4211'],
      ['7129','3201 N Harlem Ave','Chicago','60634','(773) 637-8280'],
      ['4851','5150 S Pulaski Rd','Chicago','60632','(773) 476-2300'],
      ['6705','2701 N Clark St','Chicago','60614','(773) 549-3860'],
      ['8230','1200 N Lake Shore Dr','Chicago','60610','(312) 440-1900'],
      ['9915','5400 N Western Ave','Chicago','60625','(773) 561-3210'],
      ['3472','1300 S Michigan Ave','Chicago','60605','(312) 461-0001'],
      ['8821','4051 N Pulaski Rd','Chicago','60641','(773) 725-1052'],
      ['5236','9 W Division St','Chicago','60610','(312) 642-0862'],
      ['4482','303 E Ontario St','Chicago','60611','(312) 280-0550'],
      ['6912','6625 N Sheridan Rd','Chicago','60626','(773) 274-5151'],
      ['7531','3146 W 26th St','Chicago','60623','(773) 847-8741'],
      ['8104','10 N State St','Chicago','60602','(312) 984-0727'],
      ['9351','4201 S Archer Ave','Chicago','60632','(773) 927-4171'],
      ['3902','1801 N Harlem Ave','Chicago','60707','(773) 836-0330'],
      // North suburbs
      ['6140','1825 Waukegan Rd','Glenview','60025','(847) 729-8190'],
      ['3890','621 Waukegan Rd','Deerfield','60015','(847) 945-2522'],
      ['7481','100 N Milwaukee Ave','Libertyville','60048','(847) 362-2400'],
      ['5129','2100 N Mannheim Rd','Melrose Park','60160','(708) 338-2110'],
      ['8672','3651 N Harlem Ave','Elmwood Park','60707','(708) 452-8840'],
      ['7638','1350 E Belvidere Rd','Gurnee','60031','(847) 249-5560'],
      ['4310','1101 S Main St','Elgin','60123','(847) 622-8090'],
      ['9152','701 N McLean Blvd','Elgin','60123','(847) 741-2311'],
      ['6280','1301 E Dundee Rd','Palatine','60074','(847) 358-0420'],
      ['2914','155 S Arlington Heights Rd','Arlington Heights','60005','(847) 253-4252'],
      ['7063','1225 S Elmhurst Rd','Mount Prospect','60056','(847) 228-2224'],
      ['4720','701 S Waukegan Rd','Lake Forest','60045','(847) 615-1690'],
      ['5841','9101 Waukegan Rd','Morton Grove','60053','(847) 583-1172'],
      ['3298','4800 Golf Rd','Skokie','60077','(847) 677-4120'],
      ['6750','1 Elm Place','Winnetka','60093','(847) 441-1140'],
      // West suburbs
      ['4103','2001 Butterfield Rd','Downers Grove','60515','(630) 963-0126'],
      ['9034','550 N Lake St','Aurora','60506','(630) 896-0220'],
      ['7120','801 W Galena Blvd','Aurora','60506','(630) 844-8420'],
      ['5834','800 S Route 59','Naperville','60540','(630) 369-8870'],
      ['4293','220 E Fullerton Ave','Carol Stream','60188','(630) 682-9440'],
      ['3127','2530 W Jefferson St','Joliet','60435','(815) 744-1044'],
      ['8411','14001 S Harlem Ave','Orland Park','60462','(708) 349-1110'],
      // South suburbs
      ['6593','7201 W 159th St','Tinley Park','60477','(708) 429-1522'],
      ['5045','9417 S Western Ave','Evergreen Park','60805','(708) 422-0340'],
      ['8390','3400 W 115th St','Merrionette Park','60803','(708) 385-7801'],
      ['7204','16600 S Oak Park Ave','Tinley Park','60477','(708) 532-3121'],
      // Central/Downstate
      ['8456','2000 Wabash Ave','Springfield','62704','(217) 787-1330'],
      ['11302','501 N State St','Springfield','62702','(217) 544-2101'],
      ['7205','2316 W Monroe St','Springfield','62704','(217) 546-8234'],
      ['2873','2408 S 6th St','Springfield','62703','(217) 753-1082'],
      ['4710','1320 E Empire St','Bloomington','61701','(309) 662-0389'],
      ['3841','1705 S Neil St','Champaign','61820','(217) 359-8010'],
      ['5290','2005 W Springfield Ave','Champaign','61821','(217) 351-4210'],
      ['12040','300 S Neil St','Champaign','61820','(217) 359-2200'],
      ['6318','7501 N University St','Peoria','61614','(309) 692-2148'],
      ['5871','5001 N Knoxville Ave','Peoria','61614','(309) 689-5440'],
      ['7403','2202 E Main St','Carbondale','62901','(618) 457-0391'],
      ['8864','3950 N Vermilion St','Danville','61832','(217) 443-2620'],
      ['4031','1000 E Court St','Kankakee','60901','(815) 933-0491'],
      ['6517','3120 Broadway Ave','Quincy','62301','(217) 228-0440'],
      ['9280','1501 W Wabash Ave','Effingham','62401','(217) 342-6501'],
      ['9342','1602 Wabash Ave','Decatur','62526','(217) 875-0081'],
      ['8721','920 E Sangamon Ave','Rantoul','61866','(217) 893-0041'],
      ['5103','1201 W Morton Ave','Jacksonville','62650','(217) 245-2812'],
      ['6841','1412 N Court St','Rockford','61103','(815) 968-6110'],
      ['7290','4202 E State St','Rockford','61108','(815) 399-2301'],
    ],
  },
  {
    chain: 'CVS',
    prefix: 'CVS Pharmacy #',
    npiBase: 10200000,
    locations: [
      // Chicago
      ['8432','205 W Randolph St','Chicago','60606','(312) 782-8820'],
      ['8205','600 W Diversey Pkwy','Chicago','60614','(773) 525-2500'],
      ['8671','4051 N Broadway','Chicago','60613','(773) 477-2350'],
      ['8310','6150 N Lincoln Ave','Chicago','60659','(773) 267-1210'],
      ['8530','3033 N Halsted St','Chicago','60657','(773) 935-3011'],
      ['7831','1200 N Dearborn St','Chicago','60610','(312) 337-4910'],
      ['7512','4201 W Madison St','Chicago','60624','(773) 826-1020'],
      ['9043','2345 S Michigan Ave','Chicago','60616','(312) 842-4010'],
      ['6820','5400 N Sheridan Rd','Chicago','60640','(773) 275-8810'],
      ['9318','7001 S Stony Island Ave','Chicago','60649','(773) 947-1244'],
      ['7204','420 E 87th St','Chicago','60619','(773) 723-0801'],
      ['8563','5901 N Clark St','Chicago','60660','(773) 561-0020'],
      ['7845','2800 N Lincoln Ave','Chicago','60657','(773) 472-8230'],
      ['6912','33 S State St','Chicago','60603','(312) 781-8300'],
      ['9154','6401 N Central Ave','Chicago','60646','(773) 763-6911'],
      ['8037','3131 N Clybourn Ave','Chicago','60618','(773) 549-8210'],
      ['7623','4630 N Sheridan Rd','Chicago','60640','(773) 271-1055'],
      ['8934','8201 S Western Ave','Chicago','60620','(773) 434-0201'],
      ['6754','1041 W Madison St','Chicago','60607','(312) 421-6221'],
      ['9512','1360 N Sandburg Ter','Chicago','60610','(312) 642-0841'],
      ['8103','11250 S Michigan Ave','Chicago','60628','(773) 785-1011'],
      ['7452','2159 N Clybourn Ave','Chicago','60614','(773) 348-0040'],
      ['9241','1101 W Chicago Ave','Chicago','60642','(312) 491-6201'],
      // North suburbs
      ['8919','7520 W North Ave','Elmwood Park','60707','(708) 453-4410'],
      ['8271','1700 E Golf Rd','Schaumburg','60173','(847) 517-3880'],
      ['7934','2780 Mannheim Rd','Des Plaines','60018','(847) 296-9840'],
      ['9034','4910 Oakton St','Skokie','60077','(847) 673-4340'],
      ['8410','1290 Waukegan Rd','Northbrook','60062','(847) 272-5910'],
      ['7182','200 S Weber Rd','Bolingbrook','60490','(630) 759-1320'],
      ['9631','8660 W 159th St','Orland Park','60462','(708) 403-2040'],
      ['8702','1165 Ogden Ave','Naperville','60540','(630) 961-4012'],
      ['8145','4809 Cal Sag Rd','Crestwood','60418','(708) 385-7700'],
      ['6831','901 Waukegan Rd','Glenview','60025','(847) 998-2101'],
      ['7520','730 Dundee Rd','Northbrook','60062','(847) 564-0041'],
      ['8913','1600 N Rand Rd','Palatine','60074','(847) 397-9010'],
      ['7210','500 E Rand Rd','Arlington Heights','60004','(847) 392-3850'],
      // West suburbs
      ['7513','2415 N University St','Peoria','61604','(309) 688-0101'],
      ['8043','1515 E State St','Rockford','61104','(815) 399-5010'],
      // Central/Downstate
      ['8821','3101 Montvale Dr','Springfield','62704','(217) 698-2250'],
      ['8054','2108 N Veterans Pkwy','Bloomington','61704','(309) 662-4730'],
      ['9214','1515 W Springfield Ave','Champaign','61821','(217) 355-9410'],
      ['8721','3221 S 6th St','Springfield','62703','(217) 529-1400'],
      ['7831b','840 W 75th St','Naperville','60565','(630) 548-0031'],
      ['8413','21 E North Ave','Villa Park','60181','(630) 832-0040'],
    ],
  },
  {
    chain: 'Jewel-Osco',
    prefix: 'Jewel-Osco Pharmacy #',
    npiBase: 10300000,
    locations: [
      ['3042','1224 S Wabash Ave','Chicago','60605','(312) 663-0974'],
      ['3156','550 N State St','Chicago','60654','(312) 923-0285'],
      ['3310','4660 N Broadway','Chicago','60640','(773) 275-3820'],
      ['3125','1340 S Canal St','Chicago','60607','(312) 563-1481'],
      ['3480','3531 N Broadway','Chicago','60657','(773) 348-1012'],
      ['3522','1955 E Oakton St','Des Plaines','60018','(847) 635-0423'],
      ['3690','160 S Lincolnway','North Aurora','60542','(630) 897-7440'],
      ['3201','1301 S Naper Blvd','Naperville','60540','(630) 369-1720'],
      ['3344','2855 W 95th St','Evergreen Park','60805','(708) 424-2012'],
      ['3890','2940 N Ashland Ave','Chicago','60657','(773) 868-4001'],
      ['3402','6700 N Cicero Ave','Lincolnwood','60712','(847) 676-5010'],
      ['3561','2000 Pfingsten Rd','Glenview','60026','(847) 998-2540'],
      ['3243','7251 S Stony Island Ave','Chicago','60649','(773) 752-6940'],
      ['3814','14450 S LaGrange Rd','Orland Park','60462','(708) 349-0820'],
      ['3628','6751 W Belmont Ave','Chicago','60634','(773) 637-0820'],
      ['3710','350 Skokie Blvd','Wilmette','60091','(847) 251-3210'],
      ['3504','1220 N Larkin Ave','Joliet','60435','(815) 744-9330'],
      ['3832','600 E Ogden Ave','Westmont','60559','(630) 789-3310'],
      ['3941','2135 Waukegan Rd','Bannockburn','60015','(847) 940-0511'],
      ['3720','1515 S Arlington Heights Rd','Arlington Heights','60005','(847) 228-3740'],
      ['3604','3400 W Touhy Ave','Lincolnwood','60712','(847) 673-3010'],
      ['3812','2323 S Mannheim Rd','Westchester','60154','(708) 562-3010'],
      ['3480b','1320 W Lake St','Addison','60101','(630) 279-3840'],
      ['3902','2101 W Galena Blvd','Aurora','60506','(630) 859-1201'],
      ['3570','200 W Army Trail Rd','Bloomingdale','60108','(630) 893-2340'],
      ['3660','2012 N Rand Rd','Palatine','60074','(847) 991-3930'],
      ['3730','2040 E Higgins Rd','Elk Grove Village','60007','(847) 228-1020'],
      ['3810','1601 Deerfield Rd','Deerfield','60015','(847) 945-2780'],
      ['3880','3601 Oakton St','Skokie','60076','(847) 673-4790'],
      ['3950','6 W Grand Ave','Lake Villa','60046','(847) 356-3310'],
    ],
  },
  {
    chain: "Mariano's",
    prefix: "Mariano's Pharmacy #",
    npiBase: 10500000,
    locations: [
      ['502','333 E Benton Pl','Chicago','60601','(312) 729-7200'],
      ['508','2021 W Chicago Ave','Chicago','60622','(773) 489-6910'],
      ['514','6009 N Broadway','Chicago','60660','(773) 465-1040'],
      ['521','3030 N Broadway','Chicago','60657','(773) 248-0920'],
      ['527','4651 N Lincoln Ave','Chicago','60625','(773) 769-1050'],
      ['533','1800 S Halsted St','Chicago','60608','(312) 243-1020'],
      ['540','2401 N Elston Ave','Chicago','60647','(773) 276-5410'],
      ['546','6020 N Cicero Ave','Chicago','60646','(773) 545-8820'],
      ['553','100 W Hillcrest Blvd','Schaumburg','60195','(847) 524-1040'],
      ['559','1363 W Lake St','Addison','60101','(630) 889-0511'],
      ['565','1210 S Naper Blvd','Naperville','60540','(630) 983-2810'],
      ['572','111 W Maple Ave','Mundelein','60060','(847) 970-1010'],
      ['578','7420 N Milwaukee Ave','Niles','60714','(847) 647-5210'],
      ['584','1720 Shermer Rd','Northbrook','60062','(847) 272-0830'],
      ['590','3015 W Peterson Ave','Chicago','60659','(773) 267-9010'],
      ['601','1 N Wacker Dr','Chicago','60606','(312) 782-8040'],
      ['612','3735 N Country Club Rd','Woodstock','60098','(815) 334-0820'],
      ['624','101 S Waukegan Rd','Lake Bluff','60044','(847) 604-0411'],
    ],
  },
  {
    chain: 'Walmart',
    prefix: 'Walmart Pharmacy #',
    npiBase: 10400000,
    locations: [
      ['2608','4650 W North Ave','Chicago','60639','(773) 384-1200'],
      ['5184','7535 S Ashland Ave','Chicago','60620','(773) 925-5800'],
      ['2901','155 Skokie Blvd','Skokie','60077','(847) 675-9630'],
      ['3412','2500 W Schaumburg Rd','Schaumburg','60194','(847) 519-0710'],
      ['1824','2020 S Washington St','Naperville','60565','(630) 416-3120'],
      ['2187','4320 E New York St','Aurora','60504','(630) 820-8100'],
      ['3756','1800 Larkin Ave','Elgin','60123','(847) 741-2020'],
      ['2093','3101 Plainfield Rd','Joliet','60435','(815) 254-5900'],
      ['4218','2450 S Sullivan Rd','Aurora','60505','(630) 898-0901'],
      ['2634','6650 W North Ave','Elmwood Park','60707','(708) 452-5310'],
      ['1502','201 N Larkin Ave','Joliet','60435','(815) 744-2410'],
      ['3871','1001 W Randall Rd','Algonquin','60102','(847) 854-9710'],
      ['2940','100 S Route 83','Mundelein','60060','(847) 970-3720'],
      ['4103','1200 N Michael Dr','Wood Dale','60191','(630) 766-5060'],
      ['1834','405 E Rollins Rd','Round Lake Beach','60073','(847) 546-8220'],
      ['2752','500 N Perryville Rd','Rockford','61107','(815) 877-0210'],
      ['3290','4550 N Prospect Rd','Peoria Heights','61616','(309) 686-3840'],
      ['1625','3401 S 6th Street Rd','Springfield','62703','(217) 787-8900'],
      ['2483','1701 E Empire St','Bloomington','61701','(309) 662-1200'],
      ['3104','1801 N Market St','Champaign','61820','(217) 359-5801'],
      ['2571','1275 State Hwy 121 W','Lincoln','62656','(217) 732-2110'],
      ['1893','5000 E Main St','Carbondale','62901','(618) 457-2240'],
      ['3402','1905 N Lakewood Dr','Effingham','62401','(217) 347-0020'],
      ['2214','3901 S MacArthur Blvd','Springfield','62711','(217) 787-0080'],
      ['4051','3241 Broadway St','Quincy','62301','(217) 223-6110'],
      ['3180','1301 W Wabash Ave','Waukegan','60085','(847) 623-7040'],
      ['2840','15 S Route 59','Naperville','60540','(630) 579-1020'],
      ['3630','1150 W US Hwy 30','Matteson','60443','(708) 748-4100'],
      ['4310','8151 Oakton St','Niles','60714','(847) 635-9030'],
      ['2710','2401 W War Memorial Dr','Peoria','61614','(309) 693-0020'],
      ['3940','1000 S Galena Ave','Freeport','61032','(815) 232-1820'],
      ['2950','1920 N Vermilion St','Danville','61832','(217) 431-8850'],
    ],
  },
  {
    chain: 'Meijer',
    prefix: 'Meijer Pharmacy #',
    npiBase: 10600000,
    locations: [
      ['253','8300 S Holland Rd','Chicago','60620','(773) 488-3410'],
      ['289','4901 W North Ave','Chicago','60639','(773) 745-2550'],
      ['302','2500 W Lake St','Melrose Park','60160','(708) 338-1260'],
      ['267','7000 Cermak Rd','Berwyn','60402','(708) 484-7310'],
      ['198','12001 S Pulaski Rd','Alsip','60803','(708) 396-0105'],
      ['275','4200 Conestoga Dr','Springfield','62711','(217) 679-3290'],
      ['310','1601 E Empire St','Bloomington','61701','(309) 664-5420'],
      ['245','3600 E Lincolnway','Sterling','61081','(815) 564-2340'],
      ['320','2501 N Prospect Ave','Champaign','61822','(217) 373-1250'],
      ['188','5001 W War Memorial Dr','Peoria','61615','(309) 693-8720'],
      ['334','1300 S Randall Rd','Elgin','60123','(847) 888-3010'],
      ['358','2101 W Schaumburg Rd','Schaumburg','60194','(847) 330-4110'],
      ['371','1070 N Route 59','Naperville','60563','(630) 355-2800'],
      ['384','1611 McConnell Blvd','Joliet','60435','(815) 744-0280'],
      ['397','7800 S Cicero Ave','Burbank','60459','(708) 425-5020'],
      ['410','1501 Essington Rd','Joliet','60435','(815) 577-8010'],
      ['424','6145 E State St','Rockford','61108','(815) 229-5610'],
      ['438','4601 N Harlem Ave','Norridge','60706','(708) 456-3820'],
      ['451','2350 Butterfield Rd','Aurora','60502','(630) 820-8490'],
      ['465','300 W Kirchoff Rd','Rolling Meadows','60008','(847) 398-2110'],
    ],
  },
  {
    chain: 'Costco',
    prefix: 'Costco Pharmacy #',
    npiBase: 10700000,
    locations: [
      ['452','1430 S Ashland Ave','Chicago','60608','(312) 421-1250'],
      ['488','4999 Old Orchard Ctr','Skokie','60077','(847) 763-4620'],
      ['510','2020 N Sterling Ave','Peoria','61604','(309) 683-5810'],
      ['534','1500 McConnell Blvd','Joliet','60435','(815) 254-0840'],
      ['562','700 E Ogden Ave','Naperville','60563','(630) 305-1740'],
      ['580','2411 W Schaumburg Rd','Schaumburg','60194','(847) 884-7830'],
      ['602','1100 N Milwaukee Ave','Vernon Hills','60061','(847) 573-1290'],
      ['624','2000 Spring Rd','Oak Brook','60523','(630) 368-5640'],
      ['648','15105 S LaGrange Rd','Orland Park','60462','(708) 873-5310'],
      ['672','2575 Boughton Rd','Bolingbrook','60490','(630) 783-3110'],
      ['695','501 Waukegan Rd','Deerfield','60015','(847) 405-5810'],
      ['718','815 E Golf Rd','Arlington Heights','60005','(847) 342-8820'],
      ['741','680 S State Route 59','Naperville','60540','(630) 548-0891'],
      ['764','1201 Lake Cook Rd','Deerfield','60015','(847) 940-9210'],
    ],
  },
  {
    chain: "Sam's Club",
    prefix: "Sam's Club Pharmacy #",
    npiBase: 10900000,
    locations: [
      ['4921','8331 N Milwaukee Ave','Niles','60714','(847) 470-9830'],
      ['4854','1001 N Lake St','Aurora','60506','(630) 896-3810'],
      ['5103','1800 E Rand Rd','Arlington Heights','60004','(847) 259-1820'],
      ['4765','7510 Lemont Rd','Darien','60561','(630) 960-5010'],
      ['5234','2551 W 75th St','Naperville','60565','(630) 983-4720'],
      ['4680','2211 E Empire St','Bloomington','61704','(309) 662-3920'],
      ['5312','4201 W Lake Ave','Peoria','61615','(309) 693-1810'],
      ['4930','3301 Prairie Ave','Mattoon','61938','(217) 235-5820'],
      ['5150','6401 N Illinois St','Fairview Heights','62208','(618) 489-2110'],
      ['4847','3351 W Dirksen Pkwy','Springfield','62703','(217) 793-4830'],
      ['5271','1 E Rand Rd','Mount Prospect','60056','(847) 258-0210'],
      ['4903','1600 N Route 59','Naperville','60563','(630) 527-5610'],
    ],
  },
  {
    chain: 'Target (CVS)',
    prefix: 'Target Pharmacy (CVS) #',
    npiBase: 10800000,
    locations: [
      ['T-1482','3 E Chicago Ave','Chicago','60611','(312) 494-7710'],
      ['T-1635','2656 N Elston Ave','Chicago','60647','(773) 342-4010'],
      ['T-1720','1154 S Clark St','Chicago','60605','(312) 922-9040'],
      ['T-1841','4555 N Lincoln Ave','Chicago','60625','(773) 784-0040'],
      ['T-1958','7601 S Cicero Ave','Chicago','60652','(773) 582-5210'],
      ['T-2043','2100 N Mannheim Rd','Franklin Park','60131','(847) 678-0920'],
      ['T-2184','4 Woodfield Mall','Schaumburg','60173','(847) 619-3840'],
      ['T-2270','1301 W 22nd St','Oak Brook','60523','(630) 572-3060'],
      ['T-2352','1000 N Rohlwing Rd','Rolling Meadows','60008','(847) 253-0810'],
      ['T-2445','7436 W 191st St','Tinley Park','60477','(708) 532-2840'],
      ['T-2530','1260 W 75th St','Downers Grove','60516','(630) 963-0070'],
      ['T-2618','2100 E Golf Rd','Schaumburg','60173','(847) 839-1810'],
      ['T-2703','1500 N Randall Rd','Elgin','60123','(847) 608-9010'],
      ['T-2790','1575 N Naper Blvd','Naperville','60563','(630) 536-0821'],
    ],
  },
  {
    chain: 'Rite Aid',
    prefix: 'Rite Aid Pharmacy #',
    npiBase: 11000000,
    locations: [
      ['4821','6840 N Western Ave','Chicago','60645','(773) 743-1210'],
      ['4932','1901 N Narragansett Ave','Chicago','60639','(773) 889-0841'],
      ['5043','7501 W Belmont Ave','Chicago','60634','(773) 889-5040'],
      ['4756','3655 W Devon Ave','Chicago','60659','(773) 267-0020'],
      ['5121','1127 N State St','Chicago','60610','(312) 337-1830'],
      ['4890','9035 N Milwaukee Ave','Niles','60714','(847) 965-2230'],
      ['5210','3715 W Dempster St','Skokie','60076','(847) 673-2610'],
      ['4965','201 E Rand Rd','Mount Prospect','60056','(847) 398-1420'],
      ['5302','600 N Waukegan Rd','Deerfield','60015','(847) 940-0120'],
      ['5084','321 E Ogden Ave','La Grange','60525','(708) 354-8310'],
      ['4830','5100 W Devon Ave','Chicago','60646','(773) 631-1420'],
      ['5170','3100 W Irving Park Rd','Chicago','60618','(773) 267-3220'],
    ],
  },
  {
    chain: 'HyVee',
    prefix: 'HyVee Pharmacy #',
    npiBase: 11100000,
    locations: [
      ['1452','1010 N Henderson St','Galesburg','61401','(309) 343-5380'],
      ['1380','801 W 12th St','Rock Island','61201','(309) 786-0280'],
      ['1501','4000 Avenue of the Cities','Moline','61265','(309) 762-4220'],
      ['1424','720 N Broad St','Galesburg','61401','(309) 341-1040'],
      ['1466','1635 41st Ave','Silvis','61282','(309) 792-3810'],
    ],
  },
  {
    chain: 'Schnucks',
    prefix: 'Schnucks Pharmacy #',
    npiBase: 11200000,
    locations: [
      ['401','6001 N Illinois St','Fairview Heights','62208','(618) 394-3010'],
      ['412','1025 Beltline Rd','Collinsville','62234','(618) 344-8820'],
      ['423','1801 Salem Rd','Mount Vernon','62864','(618) 244-3010'],
      ['435','301 Exchange St','O\'Fallon','62269','(618) 632-4040'],
      ['441','4601 E Main St','Belleville','62221','(618) 234-8010'],
      ['452','1001 E Union Ave','Alton','62002','(618) 462-3730'],
      ['463','300 S Buchanan St','Edwardsville','62025','(618) 656-2420'],
      ['474','2501 Nameoki Rd','Granite City','62040','(618) 877-0820'],
    ],
  },
];

// ─── Hospital / Health System Outpatient Pharmacies ──────────────────────────
const HOSPITAL_PHARMACIES = [
  { name: 'Northwestern Medicine Outpatient Pharmacy', chain: 'Northwestern Medicine', address: '251 E Huron St', city: 'Chicago', zip: '60611', phone: '(312) 926-5770', fax: '(312) 926-5771', npi: '1130000001' },
  { name: 'Rush University Medical Center Pharmacy', chain: 'Rush Health', address: '1653 W Congress Pkwy', city: 'Chicago', zip: '60612', phone: '(312) 942-5000', fax: '(312) 942-5001', npi: '1130000002' },
  { name: 'UI Health Outpatient Pharmacy', chain: 'UI Health', address: '1740 W Taylor St', city: 'Chicago', zip: '60612', phone: '(312) 413-7250', fax: '(312) 413-7251', npi: '1130000003' },
  { name: 'Advocate Christ Medical Center Pharmacy', chain: 'Advocate Health', address: '4440 W 95th St', city: 'Oak Lawn', zip: '60453', phone: '(708) 684-8780', fax: '(708) 684-8781', npi: '1130000004' },
  { name: 'OSF Saint Francis Medical Center Pharmacy', chain: 'OSF HealthCare', address: '530 NE Glen Oak Ave', city: 'Peoria', zip: '61637', phone: '(309) 655-2400', fax: '(309) 655-2401', npi: '1130000005' },
  { name: 'Memorial Medical Center Outpatient Pharmacy', chain: 'Memorial Health', address: '701 N First St', city: 'Springfield', zip: '62781', phone: '(217) 788-3500', fax: '(217) 788-3501', npi: '1130000006' },
  { name: 'Carle Foundation Hospital Pharmacy', chain: 'Carle Health', address: '611 W Park St', city: 'Urbana', zip: '61801', phone: '(217) 383-3000', fax: '(217) 383-3001', npi: '1130000007' },
  { name: 'Loyola Medicine Outpatient Pharmacy', chain: 'Trinity Health', address: '2160 S First Ave', city: 'Maywood', zip: '60153', phone: '(708) 216-9300', fax: '(708) 216-9301', npi: '1130000008' },
  { name: 'Edward-Elmhurst Health Pharmacy', chain: 'Edward-Elmhurst Health', address: '801 S Washington St', city: 'Naperville', zip: '60540', phone: '(630) 527-3200', fax: '(630) 527-3201', npi: '1130000009' },
  { name: 'NorthShore University HealthSystem Pharmacy', chain: 'NorthShore', address: '2650 Ridge Ave', city: 'Evanston', zip: '60201', phone: '(847) 570-2850', fax: '(847) 570-2851', npi: '1130000010' },
  { name: 'Amita Health Saint Joseph Medical Pharmacy', chain: 'Amita Health', address: '333 N Madison St', city: 'Joliet', zip: '60435', phone: '(815) 725-7180', fax: '(815) 725-7181', npi: '1130000011' },
  { name: 'UnityPoint Health Methodist Pharmacy', chain: 'UnityPoint Health', address: '221 NE Glen Oak Ave', city: 'Peoria', zip: '61636', phone: '(309) 672-5000', fax: '(309) 672-5001', npi: '1130000012' },
  { name: 'Advocate Good Samaritan Hospital Pharmacy', chain: 'Advocate Health', address: '3815 Highland Ave', city: 'Downers Grove', zip: '60515', phone: '(630) 275-5800', fax: '(630) 275-5801', npi: '1130000013' },
  { name: 'SwedishAmerican Hospital Pharmacy', chain: 'UW Health', address: '1401 E State St', city: 'Rockford', zip: '61104', phone: '(815) 968-4400', fax: '(815) 968-4401', npi: '1130000014' },
  { name: "Stroger Hospital Outpatient Pharmacy", chain: 'Cook County Health', address: '1901 W Harrison St', city: 'Chicago', zip: '60612', phone: '(312) 864-7050', fax: '(312) 864-7051', npi: '1130000015' },
];

// ─── Specialty Pharmacies ─────────────────────────────────────────────────────
const SPECIALTY_PHARMACIES = [
  { name: 'Walgreens Specialty Pharmacy — Chicago', chain: 'Walgreens Specialty', address: '104 S Michigan Ave', city: 'Chicago', zip: '60603', phone: '(312) 984-0410', fax: '(312) 984-0411', npi: '1140000001' },
  { name: 'CVS Specialty Pharmacy — Deerfield', chain: 'CVS Specialty', address: '2030 Waukegan Rd', city: 'Deerfield', zip: '60015', phone: '(847) 405-1100', fax: '(847) 405-1101', npi: '1140000002' },
  { name: 'Accredo Health Group — Chicago', chain: 'Accredo', address: '55 E Monroe St Suite 2900', city: 'Chicago', zip: '60603', phone: '(312) 566-9300', fax: '(312) 566-9301', npi: '1140000003' },
  { name: 'BioPlus Specialty Pharmacy — Lincolnshire', chain: 'BioPlus', address: '1 Overlook Point', city: 'Lincolnshire', zip: '60069', phone: '(847) 295-0101', fax: '(847) 295-0102', npi: '1140000004' },
  { name: 'PharMerica — Broadview', chain: 'PharMerica', address: '2401 S 25th Ave', city: 'Broadview', zip: '60155', phone: '(708) 344-0700', fax: '(708) 344-0701', npi: '1140000005' },
  { name: 'Diplomat Pharmacy — Chicago', chain: 'Diplomat', address: '211 E Ontario St Suite 1110', city: 'Chicago', zip: '60611', phone: '(312) 943-5810', fax: '(312) 943-5811', npi: '1140000006' },
  { name: 'Omnicare Long-Term Care Pharmacy — Chicago', chain: 'Omnicare', address: '4055 W Arthington St', city: 'Chicago', zip: '60624', phone: '(773) 533-9200', fax: '(773) 533-9201', npi: '1140000007' },
  { name: 'Express Scripts Specialty Pharmacy — IL', chain: 'Express Scripts', address: '600 N Elston Ave', city: 'Chicago', zip: '60654', phone: '(312) 280-6900', fax: '(312) 280-6901', npi: '1140000008' },
];

// ─── Independent Pharmacies ───────────────────────────────────────────────────
const INDEPENDENT_PHARMACIES = [
  { name: 'Ravenswood Pharmacy', chain: 'Independent', address: '4553 N Damen Ave', city: 'Chicago', zip: '60625', phone: '(773) 769-0010', fax: '(773) 769-0011', npi: '1150000001' },
  { name: 'Lincoln Square Pharmacy', chain: 'Independent', address: '4738 N Western Ave', city: 'Chicago', zip: '60625', phone: '(773) 561-5444', fax: '(773) 561-5445', npi: '1150000002' },
  { name: 'Hyde Park Drugs', chain: 'Independent', address: '1512 E 55th St', city: 'Chicago', zip: '60615', phone: '(773) 667-1400', fax: '(773) 667-1401', npi: '1150000003' },
  { name: 'Wicker Park Pharmacy', chain: 'Independent', address: '1500 N Milwaukee Ave', city: 'Chicago', zip: '60622', phone: '(773) 342-0880', fax: '(773) 342-0881', npi: '1150000004' },
  { name: 'South Loop Pharmacy', chain: 'Independent', address: '1720 S Michigan Ave', city: 'Chicago', zip: '60616', phone: '(312) 326-0040', fax: '(312) 326-0041', npi: '1150000005' },
  { name: 'Lakeview Pharmacy', chain: 'Independent', address: '3457 N Southport Ave', city: 'Chicago', zip: '60657', phone: '(773) 472-7300', fax: '(773) 472-7301', npi: '1150000006' },
  { name: 'Pilsen Pharmacy', chain: 'Independent', address: '1800 W 18th St', city: 'Chicago', zip: '60608', phone: '(312) 733-5411', fax: '(312) 733-5412', npi: '1150000007' },
  { name: 'Bridgeport Pharmacy', chain: 'Independent', address: '3101 S Halsted St', city: 'Chicago', zip: '60608', phone: '(312) 842-0020', fax: '(312) 842-0021', npi: '1150000008' },
  { name: 'Beverly Family Pharmacy', chain: 'Independent', address: '10348 S Western Ave', city: 'Chicago', zip: '60643', phone: '(773) 233-3400', fax: '(773) 233-3401', npi: '1150000009' },
  { name: 'Rogers Park Pharmacy', chain: 'Independent', address: '1501 W Howard St', city: 'Chicago', zip: '60626', phone: '(773) 761-0020', fax: '(773) 761-0021', npi: '1150000010' },
  { name: 'Andersonville Pharmacy', chain: 'Independent', address: '5201 N Clark St', city: 'Chicago', zip: '60640', phone: '(773) 334-2222', fax: '(773) 334-2223', npi: '1150000011' },
  { name: 'Chatham Pharmacy', chain: 'Independent', address: '8100 S Cottage Grove Ave', city: 'Chicago', zip: '60619', phone: '(773) 487-0110', fax: '(773) 487-0111', npi: '1150000012' },
  { name: 'Pullman Pharmacy', chain: 'Independent', address: '11155 S Cottage Grove Ave', city: 'Chicago', zip: '60628', phone: '(773) 785-1300', fax: '(773) 785-1301', npi: '1150000013' },
  { name: 'Bucktown Pharmacy', chain: 'Independent', address: '2100 N Western Ave', city: 'Chicago', zip: '60647', phone: '(773) 489-3010', fax: '(773) 489-3011', npi: '1150000014' },
  { name: 'Elmhurst Community Pharmacy', chain: 'Independent', address: '190 S Addison Ave', city: 'Elmhurst', zip: '60126', phone: '(630) 833-0040', fax: '(630) 833-0041', npi: '1150000015' },
  { name: 'Wheaton Family Pharmacy', chain: 'Independent', address: '225 N Main St', city: 'Wheaton', zip: '60187', phone: '(630) 653-0820', fax: '(630) 653-0821', npi: '1150000016' },
  { name: 'Geneva Community Pharmacy', chain: 'Independent', address: '420 S Third St', city: 'Geneva', zip: '60134', phone: '(630) 232-5010', fax: '(630) 232-5011', npi: '1150000017' },
  { name: 'St. Charles Pharmacy', chain: 'Independent', address: '2 E Main St', city: 'St. Charles', zip: '60174', phone: '(630) 584-1020', fax: '(630) 584-1021', npi: '1150000018' },
  { name: 'Barrington Family Pharmacy', chain: 'Independent', address: '142 E Station St', city: 'Barrington', zip: '60010', phone: '(847) 381-3050', fax: '(847) 381-3051', npi: '1150000019' },
  { name: 'Crystal Lake Pharmacy', chain: 'Independent', address: '35 N Williams St', city: 'Crystal Lake', zip: '60014', phone: '(815) 459-0120', fax: '(815) 459-0121', npi: '1150000020' },
  { name: 'Libertyville Pharmacy', chain: 'Independent', address: '712 N Milwaukee Ave', city: 'Libertyville', zip: '60048', phone: '(847) 362-2100', fax: '(847) 362-2101', npi: '1150000021' },
  { name: 'Downtown Bloomington Pharmacy', chain: 'Independent', address: '303 N Main St', city: 'Bloomington', zip: '61701', phone: '(309) 827-0301', fax: '(309) 827-0302', npi: '1150000022' },
  { name: 'Prairie Capital Pharmacy', chain: 'Independent', address: '1030 S Sixth St', city: 'Springfield', zip: '62703', phone: '(217) 544-0101', fax: '(217) 544-0102', npi: '1150000023' },
  { name: 'Heartland Pharmacy — Champaign', chain: 'Independent', address: '902 W Springfield Ave', city: 'Champaign', zip: '61820', phone: '(217) 352-1080', fax: '(217) 352-1081', npi: '1150000024' },
  { name: 'College of Pharmacy Clinic Rx', chain: 'Independent', address: '833 S Wood St', city: 'Chicago', zip: '60612', phone: '(312) 996-9600', fax: '(312) 996-9601', npi: '1150000025' },
];

// ─── Build & write ─────────────────────────────────────────────────────────────

let id = 1;
const entries = [];

for (const c of CHAINS) {
  c.locations.forEach(([num, address, city, zip, phone]) => {
    const faxLast = String(parseInt(phone.replace(/\D/g, '').slice(-4)) + 1).padStart(4, '0');
    const fax = phone.slice(0, -4) + faxLast;
    entries.push({
      id: `ph${id++}`,
      name: `${c.prefix}${num}`,
      chain: c.chain,
      address,
      city,
      state: 'IL',
      zip,
      phone,
      fax,
      npi: String(c.npiBase + id).padStart(10, '0'),
    });
  });
}

for (const p of [...HOSPITAL_PHARMACIES, ...SPECIALTY_PHARMACIES, ...INDEPENDENT_PHARMACIES]) {
  entries.push({ id: `ph${id++}`, ...p, state: 'IL' });
}

const arrayStr =
  '// ========== ILLINOIS PHARMACIES ==========\n' +
  'export const pharmacies = [\n' +
  entries
    .map(e => {
      const esc = (s) => s.replace(/'/g, "\\'");
      const { id, name, chain, address, city, state, zip, phone, fax, npi } = e;
      return `  { id: '${id}', name: '${esc(name)}', chain: '${esc(chain)}', address: '${esc(address)}', city: '${esc(city)}', state: '${state}', zip: '${zip}', phone: '${phone}', fax: '${fax}', npi: '${npi}' },`;
    })
    .join('\n') +
  '\n];\n';

// Patch mockData.js
const src = readFileSync(TARGET, 'utf8');
const start = src.indexOf('// ========== ILLINOIS PHARMACIES ==========');
const end   = src.indexOf('\n];\n', start) + '\n];\n'.length;

if (start === -1) {
  console.error('Could not find ILLINOIS PHARMACIES section in mockData.js');
  process.exit(1);
}

const patched = src.slice(0, start) + arrayStr + src.slice(end);
writeFileSync(TARGET, patched, 'utf8');
console.log(`✅  Wrote ${entries.length} pharmacy entries to mockData.js`);
