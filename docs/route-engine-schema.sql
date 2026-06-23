-- Real-Time Route Engine durable storage schema.
--
-- This file is documentation and deployment input only. It is not executed by
-- the middleware and no migration has been run as part of this implementation.
--
-- Default DID reuse protection scope is client-level:
--   same client_id + normalized_destination_phone + did + service_date
-- must not be used more than once per day.
--
-- Future campaign/global modes should use did_destination_usage.reuse_scope and
-- scope_id:
--   campaign scope: reuse_scope='campaign', scope_id=campaign_id
--   global scope:   reuse_scope='global',   scope_id='global'

CREATE TABLE IF NOT EXISTS route_decisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  route_id VARCHAR(80) NOT NULL,
  request_id VARCHAR(128) NULL,
  direction ENUM('outbound','inbound') NOT NULL,
  decision VARCHAR(64) NOT NULL,
  route_engine_mode VARCHAR(32) NULL,
  campaign_id VARCHAR(128) NULL,
  client_id VARCHAR(128) NULL,
  lead_id VARCHAR(128) NULL,
  agent_id VARCHAR(128) NULL,
  list_id VARCHAR(128) NULL,
  call_type VARCHAR(64) NULL,
  destination_phone VARCHAR(32) NULL,
  normalized_destination_phone VARCHAR(32) NULL,
  called_did VARCHAR(32) NULL,
  dnis VARCHAR(32) NULL,
  selected_did VARCHAR(32) NULL,
  strategy VARCHAR(64) NULL,
  fallback_used TINYINT(1) NOT NULL DEFAULT 0,
  reason VARCHAR(512) NULL,
  reuse_scope ENUM('client','campaign','global') NULL,
  service_date DATE NULL,
  reuse_blocked TINYINT(1) NOT NULL DEFAULT 0,
  reuse_reason VARCHAR(255) NULL,
  asterisk_uniqueid VARCHAR(128) NULL,
  raw_request JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_route_decisions_route_id (route_id),
  KEY idx_route_decisions_created_at (created_at),
  KEY idx_route_decisions_campaign_created (campaign_id, created_at),
  KEY idx_route_decisions_client_created (client_id, created_at),
  KEY idx_route_decisions_destination_day (normalized_destination_phone, service_date),
  KEY idx_route_decisions_selected_did_day (selected_did, service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  route_id VARCHAR(80) NULL,
  request_id VARCHAR(128) NULL,
  asterisk_uniqueid VARCHAR(128) NULL,
  linkedid VARCHAR(128) NULL,
  result VARCHAR(64) NULL,
  status VARCHAR(64) NULL,
  duration_sec INT UNSIGNED NULL,
  hangup_cause VARCHAR(64) NULL,
  raw_result JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_route_results_route_id (route_id),
  KEY idx_route_results_asterisk_uniqueid (asterisk_uniqueid),
  KEY idx_route_results_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS did_reservations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  reservation_id VARCHAR(80) NOT NULL,
  route_id VARCHAR(80) NOT NULL,
  request_id VARCHAR(128) NULL,
  campaign_id VARCHAR(128) NULL,
  client_id VARCHAR(128) NULL,
  lead_id VARCHAR(128) NULL,
  agent_id VARCHAR(128) NULL,
  list_id VARCHAR(128) NULL,
  call_type VARCHAR(64) NULL,
  destination_phone VARCHAR(32) NOT NULL,
  normalized_destination_phone VARCHAR(32) NOT NULL,
  did VARCHAR(32) NOT NULL,
  reuse_scope ENUM('client','campaign','global') NOT NULL DEFAULT 'client',
  scope_id VARCHAR(128) NOT NULL,
  service_date DATE NOT NULL,
  asterisk_uniqueid VARCHAR(128) NULL,
  reservation_status ENUM('reserved','used','released','expired','failed') NOT NULL DEFAULT 'reserved',
  expires_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_did_reservations_reservation_id (reservation_id),
  UNIQUE KEY uq_did_reservations_route_did (route_id, did),
  KEY idx_did_reservations_scope_day (reuse_scope, scope_id, service_date),
  KEY idx_did_reservations_destination_day (normalized_destination_phone, service_date),
  KEY idx_did_reservations_status_expiry (reservation_status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS did_destination_usage (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  route_id VARCHAR(80) NULL,
  reservation_id VARCHAR(80) NULL,
  campaign_id VARCHAR(128) NULL,
  client_id VARCHAR(128) NOT NULL,
  lead_id VARCHAR(128) NULL,
  agent_id VARCHAR(128) NULL,
  call_type VARCHAR(64) NULL,
  normalized_destination_phone VARCHAR(32) NOT NULL,
  did VARCHAR(32) NOT NULL,
  reuse_scope ENUM('client','campaign','global') NOT NULL DEFAULT 'client',
  scope_id VARCHAR(128) NOT NULL,
  service_date DATE NOT NULL,
  asterisk_uniqueid VARCHAR(128) NULL,
  reservation_status ENUM('reserved','used','released','expired','failed') NOT NULL DEFAULT 'reserved',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),

  -- Default client-level protection. client_id is NOT NULL here so MySQL cannot
  -- allow duplicate NULL client rows. Unresolved clients should be written as a
  -- deliberate sentinel such as '__unscoped__' until client mapping is complete.
  UNIQUE KEY uq_did_destination_client_day (
    client_id,
    normalized_destination_phone,
    did,
    service_date
  ),

  -- Generic future protection key for campaign/global modes. In client mode,
  -- scope_id should match client_id. In campaign mode, it should match
  -- campaign_id. In global mode, it should be 'global'.
  UNIQUE KEY uq_did_destination_scope_day (
    reuse_scope,
    scope_id,
    normalized_destination_phone,
    did,
    service_date
  ),

  KEY idx_did_destination_route_id (route_id),
  KEY idx_did_destination_campaign_day (campaign_id, service_date),
  KEY idx_did_destination_did_day (did, service_date),
  KEY idx_did_destination_phone_day (normalized_destination_phone, service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
