alter table public.workouts add column method_level text not null default 'A revisar' check(method_level in ('Iniciante','Intermediário','Avançado','Misto','A revisar'));
