create table if not exists wallet_checks (
    id bigserial primary key,
    wallet text not null,
    status text not null default 'success',
    human_likelihood text not null default 'unknown',
    trust_tier text not null default 'unknown',
    created_at timestamptz not null default now()
);

create index if not exists wallet_checks_created_at_idx
    on wallet_checks (created_at desc);

create index if not exists wallet_checks_wallet_idx
    on wallet_checks (wallet);

create table if not exists wallets (
    id bigserial primary key,
    wallet text not null,
    chain text not null,
    ingestion_status text not null default 'ingested',
    source text not null default 'manual',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (wallet, chain)
);

create index if not exists wallets_created_at_idx
    on wallets (created_at desc);

create index if not exists wallets_chain_idx
    on wallets (chain);
