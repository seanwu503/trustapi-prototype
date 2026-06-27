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
    wallet_age_days       integer,
    first_activity_at     timestamptz,
    daily_transfer_counts jsonb not null default '{"out":{},"in":{}}'::jsonb,
    fetched_at            timestamptz not null default now()
);

create index if not exists wallet_snapshots_wallet_id_idx
    on wallet_snapshots (wallet_id, fetched_at desc);

create table if not exists wallet_features (
    id                  serial primary key,
    wallet_id           integer not null references wallets(id) on delete cascade,
    snapshot_id         integer not null references wallet_snapshots(id) on delete cascade,
    wallet_age_days     integer,
    activity_frequency  numeric not null,
    burst_score         numeric not null,
    computed_at         timestamptz not null default now()
);

create index if not exists wallet_features_wallet_id_idx
    on wallet_features (wallet_id, computed_at desc);

-- Safe to re-run on existing databases
alter table wallet_snapshots add column if not exists wallet_age_days integer;
alter table wallet_snapshots add column if not exists first_activity_at timestamptz;
alter table wallet_snapshots add column if not exists daily_transfer_counts jsonb not null default '{"out":{},"in":{}}'::jsonb;
