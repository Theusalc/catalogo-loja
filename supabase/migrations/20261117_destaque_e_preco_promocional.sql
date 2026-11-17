-- Aplicada no projeto catalogo-loja (Supabase) em 2026-11-17.
--
-- destaque: produto aparece primeiro na ordenação "Em destaque".
-- preco_promocional: quando preenchido (e menor que o preço), o catálogo
-- mostra o preço antigo riscado e o selo de promoção.
alter table public.produtos
  add column if not exists destaque boolean not null default false,
  add column if not exists preco_promocional numeric(10,2);

alter table public.produtos
  add constraint produtos_promocao_valida
  check (preco_promocional is null or (preco_promocional > 0 and preco_promocional < preco));
