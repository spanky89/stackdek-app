SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'clients'
ORDER BY policyname;
