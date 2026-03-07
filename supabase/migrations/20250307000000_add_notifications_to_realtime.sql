-- Add notifications table to Supabase Realtime publication
-- Run this in Supabase SQL Editor or via supabase db push
-- Required for real-time notification delivery via postgres_changes

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
