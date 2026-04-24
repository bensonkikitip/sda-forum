-- Add city field to profiles (replaces country/region on the signup form)
alter table profiles add column if not exists city text;
