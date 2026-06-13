ALTER TABLE "User" ADD COLUMN "calendarAccessOnHold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Instrument" ADD COLUMN "temporaryAccessEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "role" = 'TEMP',
    "calendarAccessOnHold" = true
WHERE lower("email") = 'temp@theboies.stanford.edu';

UPDATE "Instrument"
SET "temporaryAccessEnabled" = true
WHERE lower("name") LIKE '%glovebox%'
   OR lower("name") LIKE '%glove box%';
