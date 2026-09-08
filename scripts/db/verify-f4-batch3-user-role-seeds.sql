-- Clean disposable User-database evidence for the ordered F4 Batch 3 role seeds.
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM "User") <> 4 THEN
    RAISE EXCEPTION 'f4_batch3_user_fixture_count_mismatch';
  END IF;

  IF (SELECT COUNT(*) FROM "User" WHERE "role" = 'root-admin') <> 1 OR
     (SELECT COUNT(*) FROM "User" WHERE "role" = 'admin') <> 1 OR
     (SELECT COUNT(*) FROM "User" WHERE "role" = 'user') <> 2 OR
     (SELECT COUNT(*) FROM "User" WHERE "role" NOT IN ('user', 'admin', 'root-admin')) <> 0 THEN
    RAISE EXCEPTION 'f4_batch3_user_fixture_role_mismatch';
  END IF;
END $$;
