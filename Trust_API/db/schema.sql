create table if not exists wallets (
    id          serial primary key,
    address     text not null,
    chain       text not null default 'ethereum',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (address, chain)
);

create table if not exists wallet_snapshots (
    id                    serial primary key,
    wallet_id             integer not null references wallets(id) on delete cascade,
    transaction_count     integer not null,
    balance_eth           numeric not null,
    transfer_from_count   integer not null,
    transfer_to_count     integer not null,
    transfer_window_days  integer not null default 30,
    fetched_at            timestamptz not null default now()
);

create index if not exists wallet_snapshots_wallet_id_idx
    on wallet_snapshots (wallet_id, fetched_at desc);
