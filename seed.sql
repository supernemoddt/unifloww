-- OPTIONAL: run only in a development project after creating an auth user.
-- Replace target_user with that user's UUID. This script creates new sample rows.
begin;
do $$
declare
 target_user uuid := '00000000-0000-0000-0000-000000000000';
 group_uuid uuid;
 subject_uuid uuid;
 course text;
 i int := 0;
begin
 if not exists(select 1 from auth.users where id=target_user) then
   raise exception 'Replace target_user with an existing development auth user UUID';
 end if;
 perform set_config('request.jwt.claim.sub',target_user::text,true);
 insert into public.profiles(id,first_name,university,program,year)
 values(target_user,'Oleksandr','National University','Law',1)
 on conflict(id) do update set first_name='Oleksandr',university='National University',program='Law',year=1;
 group_uuid := public.create_group('PR-11');
 foreach course in array array['History of State and Law','Professional English','Professional Ukrainian','Theory and Philosophy of Law and Human Rights'] loop
  insert into public.subjects(owner_id,group_id,name,teacher,classroom,color,description)
  values(target_user,group_uuid,course,'Dr. Kovalenko','204','#6264d9','Course materials and seminar preparation') returning id into subject_uuid;
  insert into public.classes(owner_id,group_id,subject_id,title,teacher,classroom,start_time,end_time,weekday,date,repeat,type)
  values(target_user,group_uuid,subject_uuid,course,'Dr. Kovalenko','204',('09:00'::time + i*interval '100 minutes'),('10:20'::time + i*interval '100 minutes'),extract(dow from current_date)::int,current_date,case when i=3 then 'A' else 'every' end,case when i=1 then 'Seminar' else 'Lecture' end);
  insert into public.assignments(owner_id,group_id,subject_id,title,description,deadline,priority)
  values(target_user,group_uuid,subject_uuid,case when i=0 then 'Prepare questions 1–5' when i=1 then 'Complete exercises 4–7' else 'Review this week’s lecture notes' end,'Prepare notes for our next seminar.',current_date+i+1,case when i=0 then 'High' else 'Medium' end);
  insert into public.notes(owner_id,group_id,subject_id,title,body)
  values(target_user,group_uuid,subject_uuid,'Seminar preparation','Review the key concepts from the lecture and write down three questions to discuss.');
  i:=i+1;
 end loop;
end $$;
commit;
