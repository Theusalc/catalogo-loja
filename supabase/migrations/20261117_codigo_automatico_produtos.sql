-- Aplicada no projeto catalogo-loja (Supabase) em 2026-11-17.
--
-- Código do produto automático: se o código vier vazio, o banco gera
-- "P" + id com 4 dígitos (ex.: id 12 -> P0012). Códigos digitados à mão
-- continuam valendo. Produtos antigos sem código também foram preenchidos.
create or replace function public.produtos_gerar_codigo()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.codigo is null or btrim(new.codigo) = '' then
    new.codigo := 'P' || lpad(new.id::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists produtos_codigo_automatico on public.produtos;
create trigger produtos_codigo_automatico
  before insert on public.produtos
  for each row execute function public.produtos_gerar_codigo();

update public.produtos
set codigo = 'P' || lpad(id::text, 4, '0')
where codigo is null or btrim(codigo) = '';

alter table public.produtos alter column codigo set not null;
