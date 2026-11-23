create table private.approved_team_emails(email text primary key,display_name text not null,role text not null check(role in ('admin','trainer')));
alter table private.approved_team_emails enable row level security;
revoke all on private.approved_team_emails from public,anon,authenticated;
create function private.divafit_activate_member() returns trigger language plpgsql security definer set search_path='' as $fn$
declare approved private.approved_team_emails%rowtype;
begin
select * into approved from private.approved_team_emails where email=lower(new.email);
if not found then
 if TG_OP='INSERT' then raise exception 'Cadastro restrito à equipe autorizada';end if;
 delete from public.team_members where user_id=new.id;
 return new;
end if;
if new.email_confirmed_at is not null then
 insert into public.team_members(user_id,display_name,role) values(new.id,approved.display_name,approved.role)
 on conflict(user_id) do update set display_name=excluded.display_name,role=excluded.role;
else
 delete from public.team_members where user_id=new.id;
end if;
return new;
end;$fn$;
revoke all on function private.divafit_activate_member() from public,anon,authenticated;
create trigger divafit_activate_member after insert or update of email,email_confirmed_at on auth.users for each row execute function private.divafit_activate_member();
