SET time_zone = "+00:00";

CREATE TABLE `legacy_accounts` (
  `server` enum('api.digi-rise.com','digirige-os-api.channel.or.jp') CHARACTER SET ascii NOT NULL,
  `user_id` int(11) NOT NULL,
  `uuid` char(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `friend_code` char(9) COLLATE utf8mb4_bin NOT NULL,
  `password` varchar(30) COLLATE utf8mb4_bin NOT NULL,
  `new_password` varchar(30) COLLATE utf8mb4_bin DEFAULT NULL,
  `language_code_type` tinyint(4) NOT NULL,
  `voice_language_type` tinyint(4) DEFAULT NULL,
  `os_type` tinyint(4) NOT NULL,
  `first_attempt` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_attempt` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `tamer_name` text COLLATE utf8mb4_bin DEFAULT NULL,
  `consentFormItemData` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `user_getAll` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `home_statusEvery` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `profile_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `challenge_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `mission_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `present_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `userRaidCatalogList` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `weekly_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `shop_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `friend_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `clan_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `bp2_top` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `dpoint_getPurchaseHistory` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `raid_getEventTop` longtext COLLATE utf8mb4_bin DEFAULT NULL,
  `failed` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`server`, `friend_code`, `password`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `legacy_raid_ranking_record` (
  `server` enum('api.digi-rise.com','digirige-os-api.channel.or.jp') CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `user_id` int(11) NOT NULL,
  `event_id` int(11) NOT NULL,
  `period_id` int(11) NOT NULL,
  `response` longtext COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`server`, `user_id`, `event_id`, `period_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE `user` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `uuid` char(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `language_code_type` tinyint(4) NOT NULL,
  `voice_type` tinyint(4) DEFAULT NULL,
  `os_type` tinyint(4) NOT NULL,
  `consent_form_item_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `tamer_name` varchar(10) NOT NULL,
  `greetings` varchar(40) NOT NULL,
  `first_tutorial_state` smallint(6) NOT NULL,
  `last_user_login` timestamp NOT NULL DEFAULT current_timestamp(),
  `partner_digimon_id` int(11) NOT NULL DEFAULT -1,
  `home_digimon_0` int(11) NOT NULL DEFAULT -1,
  `home_digimon_1` int(11) NOT NULL DEFAULT -1,
  `home_digimon_2` int(11) NOT NULL DEFAULT -1,
  `home_digimon_3` int(11) NOT NULL DEFAULT -1,
  `home_digimon_4` int(11) NOT NULL DEFAULT -1,
  `home_digimon_5` int(11) NOT NULL DEFAULT -1,
  `home_digimon_6` int(11) NOT NULL DEFAULT -1,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


ALTER TABLE `legacy_accounts`
  ADD KEY `server_user_id` (`server`,`user_id`,`last_attempt`) USING BTREE,
  ADD KEY `friend_code` (`friend_code`),
  ADD KEY `tamer_name` (`tamer_name`(10));

ALTER TABLE `user`
  ADD UNIQUE KEY `user_uuid` (`user_id`,`uuid`);
