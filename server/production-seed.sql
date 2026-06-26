-- PRODUCTION DATABASE MIGRATION
-- Run on your server: psql $DATABASE_URL -f production-seed.sql

-- Victory Mental Health Service
INSERT INTO locations (id, name, short_name, address, phone, fax, hours, type, status, npi, tax_id, place_of_service, rooms, telehealth, sort_order)
VALUES ('loc-victory','Victory Mental Health Service','Victory Mental Health','7060 Centennial Drive, Suite 102C, Tinley Park, IL 60477','708-575-8043','708-575-7872','Mon-Fri 9:00 AM-7:00 PM; Mon-Fri 6:00 PM-8:00 PM (Telehealth only)','Primary','Active','','','11 - Office',4,1,10)
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,short_name=EXCLUDED.short_name,address=EXCLUDED.address,phone=EXCLUDED.phone,fax=EXCLUDED.fax,hours=EXCLUDED.hours;

-- Idayatu Ola Omoniyi, NP  (initial password: Welcome2026, must change on first login)
INSERT INTO users (id,username,password_hash,first_name,last_name,role,credentials,specialty,npi,dea_number,email,two_factor_enabled,must_change_password,location_id)
VALUES ('u11','np.ola','$2a$12$Wl0FNhQgJ8IqMX1SN2TCPub.6vrB4GKJe3YUYDpbsu9qT/qlIzRGu','Idayatu Ola','Omoniyi','prescriber','NP','Psychiatry','1174282826','','ola_somoniyi@yahoo.com',true,true,'loc-victory')
ON CONFLICT (id) DO UPDATE SET username=EXCLUDED.username,first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,email=EXCLUDED.email,password_hash=EXCLUDED.password_hash,must_change_password=EXCLUDED.must_change_password,location_id=EXCLUDED.location_id;

SELECT 'np.ola inserted' AS result, id, username, role, email FROM users WHERE username='np.ola';
SELECT 'loc-victory inserted' AS result, id, name FROM locations WHERE id='loc-victory';
