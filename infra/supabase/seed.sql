-- Create a default bucket for media uploads
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;
