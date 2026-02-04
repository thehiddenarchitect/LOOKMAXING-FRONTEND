-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table profiles (
  user_id uuid references auth.users not null primary key,
  name text,
  age int,
  gender text,
  height_cm float,
  weight_kg float,
  bmi float,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone." on profiles
  for select using (true);

create policy "Users can insert their own profile." on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update own profile." on profiles
  for update using (auth.uid() = user_id);

-- Optional: Create a trigger to automatically create a profile entry (IF YOU PREFER AUTOMATION)
-- For the frontend code provided, we are doing an explicit insert, so this is optional.
