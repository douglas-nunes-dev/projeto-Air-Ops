-- Dados de exemplo (fictícios) para testar e demonstrar o sistema.
--
-- Usa a primeira empresa cadastrada e só insere se ela ainda não tiver clientes:
-- rodar de novo não duplica nada nem altera cadastros reais.
--
-- No Supabase local (Docker), roda sozinho a cada `supabase db reset`.
-- Na nuvem: npx supabase db query --linked -f supabase/seed.sql
--
-- Nunca use dados reais de clientes aqui: este arquivo vai para o Git.

do $$
declare
  org uuid;
  hospital uuid;
  clinica uuid;
  padaria uuid;
  escola uuid;
  residencia uuid;
  local_recepcao uuid;
  local_uti uuid;
  local_centro_cirurgico uuid;
  local_clinica_terreo uuid;
  local_clinica_andar uuid;
  local_padaria_loja uuid;
  local_padaria_fundos uuid;
  local_escola_sala uuid;
  local_escola_diretoria uuid;
  local_casa uuid;
begin
  select id into org from public.organizacoes order by criado_em limit 1;

  if org is null then
    raise notice 'Dados de exemplo: nenhuma empresa cadastrada; nada a fazer.';
    return;
  end if;

  if exists (select 1 from public.clientes where organizacao_id = org) then
    raise notice 'Dados de exemplo: a empresa já tem clientes; nada a fazer.';
    return;
  end if;

  -- Clientes ------------------------------------------------------------------

  insert into public.clientes (organizacao_id, tipo_pessoa, nome, documento, telefone, email, contato_nome, observacoes)
  values (org, 'juridica', 'Hospital Exemplo de Passos', '11222333000181', '3535210000',
          'manutencao@hospitalexemplo.com.br', 'Eng. Marta Ribeiro',
          'Exige relatório assinado em toda visita. Acesso pela portaria de serviço.')
  returning id into hospital;

  insert into public.clientes (organizacao_id, tipo_pessoa, nome, telefone, email, contato_nome)
  values (org, 'juridica', 'Clínica Vida', '3535221111', 'contato@clinicavida.com.br', 'Juliana')
  returning id into clinica;

  insert into public.clientes (organizacao_id, tipo_pessoa, nome, telefone, contato_nome, observacoes)
  values (org, 'juridica', 'Padaria Pão Bom', '35999990001', 'Sr. Antônio',
          'Câmara fria não pode ficar desligada mais de 2 horas.')
  returning id into padaria;

  insert into public.clientes (organizacao_id, tipo_pessoa, nome, telefone, email, contato_nome)
  values (org, 'juridica', 'Escola Municipal Centro', '3535232222', 'escola.centro@exemplo.gov.br',
          'Diretora Sandra')
  returning id into escola;

  insert into public.clientes (organizacao_id, tipo_pessoa, nome, documento, telefone, contato_nome)
  values (org, 'fisica', 'Paulo Henrique Souza', '52998224725', '35988887777', 'Paulo')
  returning id into residencia;

  -- Locais --------------------------------------------------------------------

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf, observacoes)
  values (org, hospital, 'Bloco A — Recepção', '37900000', 'Avenida das Palmeiras', '1500', 'Centro', 'Passos', 'MG', null)
  returning id into local_recepcao;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf, observacoes)
  values (org, hospital, 'Bloco B — UTI', '37900000', 'Avenida das Palmeiras', '1500', 'Centro', 'Passos', 'MG',
          'Área restrita: usar avental e avisar a enfermagem antes de entrar.')
  returning id into local_uti;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf)
  values (org, hospital, 'Centro Cirúrgico', '37900000', 'Avenida das Palmeiras', '1500', 'Centro', 'Passos', 'MG')
  returning id into local_centro_cirurgico;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf)
  values (org, clinica, 'Térreo', '37902000', 'Rua dos Ipês', '230', 'Belo Horizonte', 'Passos', 'MG')
  returning id into local_clinica_terreo;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf)
  values (org, clinica, '1º andar — Consultórios', '37902000', 'Rua dos Ipês', '230', 'Belo Horizonte', 'Passos', 'MG')
  returning id into local_clinica_andar;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf)
  values (org, padaria, 'Loja', '37904000', 'Rua São Francisco', '45', 'Santa Luzia', 'São Sebastião do Paraíso', 'MG')
  returning id into local_padaria_loja;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, bairro, cidade, uf)
  values (org, padaria, 'Fundos — Produção', '37904000', 'Rua São Francisco', '45', 'Santa Luzia', 'São Sebastião do Paraíso', 'MG')
  returning id into local_padaria_fundos;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, logradouro, numero, bairro, cidade, uf)
  values (org, escola, 'Sala 3', 'Praça da Matriz', 's/n', 'Centro', 'Alpinópolis', 'MG')
  returning id into local_escola_sala;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, logradouro, numero, bairro, cidade, uf)
  values (org, escola, 'Diretoria', 'Praça da Matriz', 's/n', 'Centro', 'Alpinópolis', 'MG')
  returning id into local_escola_diretoria;

  insert into public.locais_atendimento (organizacao_id, cliente_id, nome, cep, logradouro, numero, complemento, bairro, cidade, uf)
  values (org, residencia, 'Residência', '37903000', 'Rua das Acácias', '88', 'Casa 2', 'Jardim Califórnia', 'Passos', 'MG')
  returning id into local_casa;

  -- Equipamentos --------------------------------------------------------------

  insert into public.equipamentos
    (organizacao_id, local_id, identificacao, tipo, marca, modelo, capacidade_btu, numero_serie, patrimonio, data_instalacao, periodicidade_dias, observacoes)
  values
    (org, local_recepcao, 'Split Recepção 1', 'split', 'Springer Midea', 'Xtreme Save Connect', 24000, 'SPM24-0001', 'HEP-0101', '2022-05-10', 30, null),
    (org, local_recepcao, 'Split Recepção 2', 'split', 'Springer Midea', 'Xtreme Save Connect', 24000, 'SPM24-0002', 'HEP-0102', '2022-05-10', 30, null),
    (org, local_uti, 'Fancoil UTI', 'fancoil', 'Trane', 'Hi-Wall Fancoil 5 TR', 60000, 'TRN-FC-7781', 'HEP-0201', '2020-11-03', 30,
     'Filtro G4 + F7. Conferir dreno a cada visita.'),
    (org, local_uti, 'Split UTI leito 3', 'split', 'LG', 'Dual Inverter Voice', 18000, 'LG18-55210', 'HEP-0203', '2023-02-20', 30, null),
    (org, local_centro_cirurgico, 'Self-contained Centro Cirúrgico', 'self_contained', 'Carrier', '50BV', 120000, 'CRR-50BV-112', 'HEP-0301', '2019-08-15', 30,
     'Ambiente crítico: manutenção só fora do horário de cirurgias.'),
    (org, local_centro_cirurgico, 'Chiller Central', 'chiller', 'York', 'YCAL 30', null, 'YRK-30-9921', 'HEP-0302', '2018-03-01', 90, null),
    (org, local_clinica_terreo, 'Split Sala de espera', 'split', 'Samsung', 'WindFree', 18000, 'SMG-18-3321', null, '2021-09-12', 90, null),
    (org, local_clinica_andar, 'Cassete Consultórios', 'cassete', 'Daikin', 'Sky Air', 36000, 'DKN-36-1180', null, '2021-09-12', 90, null),
    (org, local_padaria_loja, 'Balcão refrigerado de frios', 'balcao_refrigerado', 'Gelopar', 'GPEA-200', null, 'GLP-200-55', null, '2020-01-20', 90,
     'Gás R-404A.'),
    (org, local_padaria_fundos, 'Câmara fria', 'camara_fria', 'Elgin', 'Unidade condensadora 3 HP', null, 'ELG-3HP-778', null, '2019-06-05', 90, null),
    (org, local_escola_sala, 'Split Sala 3', 'split', 'Gree', 'Eco Garden', 12000, 'GRE-12-0450', 'PMA-1203', '2023-07-01', 180, null),
    (org, local_escola_diretoria, 'Split 9.000 Diretoria', 'split', 'Gree', 'Eco Garden', 9000, 'GRE-09-0451', 'PMA-1204', '2023-07-01', 180, null),
    (org, local_casa, 'Split Quarto casal', 'split', 'Electrolux', 'Color Adapt', 12000, null, null, '2022-12-10', 180, null),
    (org, local_casa, 'Split Sala', 'split', 'Electrolux', 'Color Adapt', 18000, null, null, '2022-12-10', 180, null);

  raise notice 'Dados de exemplo inseridos: 5 clientes, 10 locais e 14 equipamentos.';
end
$$;
