insert into storage.buckets (id,name,public) values ('attachments','attachments',true) on conflict (id) do nothing;
