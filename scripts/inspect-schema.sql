-- StackDek Database Schema Inspection Script
-- Run this in Supabase SQL Editor to get complete schema documentation
-- Generated: 2026-02-15

-- ============================================================================
-- PART 1: Tables and Columns
-- ============================================================================
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        ELSE ''
    END as key_type
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
        AND tc.table_schema = ku.table_schema
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================================================
-- PART 2: Foreign Key Constraints
-- ============================================================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- PART 3: Indexes
-- ============================================================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- PART 4: Unique Constraints
-- ============================================================================
SELECT
    tc.table_name,
    kcu.column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- PART 5: Check Constraints
-- ============================================================================
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints AS tc
JOIN information_schema.check_constraints AS cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- PART 6: RLS Policies (Postgres-specific)
-- ============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- PART 7: Table Statistics (row counts, size)
-- ============================================================================
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    pg_stat_get_live_tuples(schemaname||'.'||tablename::regclass) AS row_count
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- PART 8: Triggers
-- ============================================================================
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- PART 9: Views
-- ============================================================================
SELECT
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- PART 10: Enums (Custom Types)
-- ============================================================================
SELECT
    n.nspname AS schema,
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;
